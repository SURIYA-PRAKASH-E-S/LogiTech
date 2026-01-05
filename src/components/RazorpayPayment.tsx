import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { paymentService } from '@/lib/firebase-utils';
import { API_ENDPOINTS, apiCall, RazorpayOrderResponse, RazorpayVerifyResponse } from '@/lib/api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayPaymentProps {
  amount: number;
  bookingId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function RazorpayPayment({ amount, bookingId, onSuccess, onError }: RazorpayPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load Razorpay script dynamically
  useEffect(() => {
    const loadRazorpayScript = () => {
      return new Promise((resolve, reject) => {
        // Check if Razorpay is already loaded
        if (window.Razorpay) {
          setRazorpayLoaded(true);
          resolve(true);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => {
          setRazorpayLoaded(true);
          resolve(true);
        };
        script.onerror = () => {
          reject(new Error('Failed to load Razorpay script'));
        };
        document.body.appendChild(script);
      });
    };

    loadRazorpayScript().catch((error) => {
      console.error('Error loading Razorpay:', error);
      toast({
        title: 'Payment System Error',
        description: 'Unable to load payment system. Please refresh the page.',
        variant: 'destructive',
      });
    });
  }, [toast]);

  const handlePayment = async () => {
    if (!user) {
      onError('User not authenticated');
      return;
    }

    if (!razorpayLoaded) {
      toast({
        title: 'Payment System Loading',
        description: 'Please wait while the payment system loads...',
        variant: 'default',
      });
      return;
    }

    if (!window.Razorpay) {
      onError('Payment system not available. Please refresh the page.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create order on your server
      const orderResponse = await apiCall<RazorpayOrderResponse>(API_ENDPOINTS.RAZORPAY_CREATE_ORDER, {
        method: 'POST',
        body: JSON.stringify({
          amount: amount,
          currency: 'INR',
        }),
      });

      const orderData = await orderResponse;

      if (!orderData.success || !orderData.data) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      // Extract actual order data from the response
      const order = orderData.data;

      // Step 2: Initialize Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'LogiTech Logistics',
        description: `Booking Payment - ${bookingId}`,
        order_id: order.orderId,
        handler: async (response: any) => {
          try {
            // Verify payment on your server
            const verifyResponse = await apiCall<RazorpayVerifyResponse>(API_ENDPOINTS.RAZORPAY_VERIFY_PAYMENT, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse;

            if (verifyData.success && verifyData.data && verifyData.data.verified) {
              // Extract verification data
              const verification = verifyData.data;
              // Save successful payment
              await paymentService.savePayment(user.id, {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                amount: amount,
                status: 'success',
                currency: 'INR',
                bookingId: bookingId,
              });

              toast({
                title: 'Payment Successful!',
                description: 'Your booking has been confirmed!',
              });

              onSuccess();
            } else {
              // Save failed payment
              await paymentService.savePayment(user.id, {
                orderId: response.razorpay_order_id || '',
                paymentId: response.razorpay_payment_id || '',
                amount: amount,
                status: 'failed',
                currency: 'INR',
                bookingId: bookingId,
              });

              onError('Payment verification failed');
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            
            // Even if verification fails, save the payment attempt
            try {
              await paymentService.savePayment(user.id, {
                orderId: response.razorpay_order_id || '',
                paymentId: response.razorpay_payment_id || '',
                amount: amount,
                status: 'failed',
                currency: 'INR',
                bookingId: bookingId,
              });
            } catch (saveError) {
              console.error('Failed to save payment record:', saveError);
            }
            
            onError(error.message || 'Payment verification failed');
          }
        },
        prefill: {
          name: user.name || 'Customer',
          email: user.email || '',
          contact: user.phone || '',
        },
        theme: {
          color: '#4F46E5',
        },
        modal: {
          ondismiss: async () => {
            // Handle payment modal dismissal
            try {
              await paymentService.savePayment(user.id, {
                orderId: order.orderId,
                paymentId: '',
                amount: amount,
                status: 'failed',
                currency: 'INR',
                bookingId: bookingId,
              });
            } catch (error) {
              console.error('Failed to save cancelled payment:', error);
            }
            setLoading(false);
          }
        },
        notes: {
          bookingId: bookingId,
          userId: user.id,
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      console.error('Payment initialization error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to initialize payment',
        variant: 'destructive',
      });
      
      // Save failed payment attempt
      try {
        await paymentService.savePayment(user.id, {
          orderId: '',
          paymentId: '',
          amount: amount,
          status: 'failed',
          currency: 'INR',
          bookingId: bookingId,
        });
      } catch (saveError) {
        console.error('Failed to save payment record:', saveError);
      }
      
      onError(error.message || 'Payment initialization failed');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handlePayment}
        disabled={loading || !razorpayLoaded}
        className="w-full bg-gradient-primary hover:bg-primary-dark"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : !razorpayLoaded ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading Payment...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Pay ₹{amount.toFixed(2)}
          </>
        )}
      </Button>
      
      {!razorpayLoaded && (
        <p className="text-xs text-muted-foreground text-center">
          Loading payment system...
        </p>
      )}
    </div>
  );
}