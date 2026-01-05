import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Clock, MapPin, Truck, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapComponent } from '@/components/map/MapComponent';
import { Vehicle } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService } from '@/lib/firebase-utils';
import { RazorpayPayment } from '@/components/RazorpayPayment';
import { logger } from '@/lib/logger';

interface LocationData {
  address: string;
  coordinates: { lat: number; lng: number };
}

interface BookingData {
  pickupAddress: string;
  destinationAddress: string;
  pickupLat: number;
  pickupLng: number;
  destinationLat: number;
  destinationLng: number;
  distance: number;
  estimatedTime: string;
  amount: number;
}

export default function MapPage() {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<string>('');
  const [totalCost, setTotalCost] = useState<number>(0);
  const [pickupData, setPickupData] = useState<LocationData | null>(null);
  const [destinationData, setDestinationData] = useState<LocationData | null>(null);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    // Get selected vehicle from localStorage
    const storedVehicle = localStorage.getItem('selectedVehicle');
    if (storedVehicle) {
      try {
        const vehicle = JSON.parse(storedVehicle);
        setSelectedVehicle(vehicle);
      } catch (error) {
        logger.error('Error parsing vehicle', error.message || 'Unknown error');
        navigate('/vehicles');
      }
    } else {
      // Redirect to vehicles page if no vehicle selected
      navigate('/vehicles');
    }
  }, [navigate]);

  const handleRouteCalculated = (
    calculatedDistance: number, 
    calculatedDuration: string,
    pickup: LocationData,
    destination: LocationData
  ) => {
    setDistance(calculatedDistance);
    setDuration(calculatedDuration);
    setPickupData(pickup);
    setDestinationData(destination);
    
    if (selectedVehicle && calculatedDistance > 0) {
      const cost = calculatedDistance * selectedVehicle.pricePerKm;
      setTotalCost(parseFloat(cost.toFixed(2)));
    }
  };

  const createBooking = async () => {
    if (!selectedVehicle || !pickupData || !destinationData || !user) {
      toast({
        title: "Error",
        description: "Please complete all booking details",
        variant: "destructive"
      });
      return;
    }

    if (!selectedVehicle.driverId) {
      toast({
        title: "Error",
        description: "Selected vehicle has no driver assigned",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingBooking(true);
    try {
      const booking: BookingData = {
        pickupAddress: pickupData.address,
        destinationAddress: destinationData.address,
        pickupLat: pickupData.coordinates.lat,
        pickupLng: pickupData.coordinates.lng,
        destinationLat: destinationData.coordinates.lat,
        destinationLng: destinationData.coordinates.lng,
        distance,
        estimatedTime: duration,
        amount: totalCost,
      };

      setBookingData(booking);

      // Create booking in Firebase
      const newBookingId = await bookingService.createBooking({
        userId: user.id,
        vehicleId: selectedVehicle.id,
        driverId: selectedVehicle.driverId,
        ...booking,
      });

      setBookingId(newBookingId);
      
      toast({
        title: "Booking Created!",
        description: "Please complete payment to confirm your booking",
        duration: 5000
      });

    } catch (error: any) {
      logger.error('Error creating booking', error.message || 'Unknown error');
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking",
        variant: "destructive"
      });
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const handlePaymentSuccess = () => {
    // Clear stored vehicle
    localStorage.removeItem('selectedVehicle');
    
    toast({
      title: "Payment Successful!",
      description: `Booking ${bookingId} has been confirmed`,
      duration: 5000
    });
    
    // Navigate to shipments page
    navigate('/shipments');
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive"
    });
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'truck': return '🚛';
      case 'van': return '🚐';
      case 'motorcycle': return '🏍️';
      case 'cargo': return '🚚';
      default: return '🚛';
    }
  };

  if (!selectedVehicle) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/vehicles')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Vehicles
        </Button>
        <Button variant="outline" onClick={() => navigate('/new-booking')}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Change Vehicle
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Book Your Shipment</h1>
          <p className="text-muted-foreground">Plan your route and complete your booking</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map Section */}
        <div className="lg:col-span-2">
          <MapComponent 
            onRouteCalculated={handleRouteCalculated}
            selectedVehicle={selectedVehicle}
          />
        </div>

        {/* Booking Details */}
        <div className="space-y-6">
          {/* Selected Vehicle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Selected Vehicle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getVehicleIcon(selectedVehicle.type)}</span>
                <div>
                  <h3 className="font-semibold">{selectedVehicle.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {selectedVehicle.type} • {selectedVehicle.capacity}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Price per km</span>
                  <span className="font-medium">₹{selectedVehicle.pricePerKm.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Fuel Type</span>
                  <span className="font-medium">{selectedVehicle.specifications.fuelType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Max Weight</span>
                  <span className="font-medium">{selectedVehicle.specifications.maxWeight}</span>
                </div>
                {selectedVehicle.driverId && (
                  <div className="flex justify-between text-sm">
                    <span>Assigned Driver</span>
                    <Badge variant="outline">Available</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Route Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Route Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {distance > 0 ? (
                <div className="space-y-3">
                  {pickupData?.address && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Pickup Location</p>
                      <p className="text-sm truncate">{pickupData.address}</p>
                    </div>
                  )}
                  
                  {destinationData?.address && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Destination</p>
                      <p className="text-sm truncate">{destinationData.address}</p>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Estimated Time</span>
                    </div>
                    <Badge variant="secondary">{duration}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Distance</span>
                    </div>
                    <Badge variant="secondary">{distance.toFixed(1)} km</Badge>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Distance</span>
                      <span>{distance.toFixed(1)} km</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Rate</span>
                      <span>₹{selectedVehicle.pricePerKm.toFixed(2)}/km</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Cost</span>
                      <span>₹{totalCost.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Create Booking Button */}
                  {!bookingId && (
                    <Button 
                      onClick={createBooking}
                      disabled={!pickupData?.address || !destinationData?.address || isCreatingBooking || !selectedVehicle.driverId}
                      className="w-full mt-4 bg-gradient-primary hover:bg-primary-dark"
                    >
                      {isCreatingBooking ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Booking...
                        </>
                      ) : (
                        'Create Booking'
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Set pickup and destination on the map to calculate route</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Section */}
          {bookingId && bookingData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Complete Payment
                </CardTitle>
                <CardDescription>
                  Booking ID: {bookingId}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Booking Summary:</p>
                  <div className="text-sm space-y-1">
                    <p className="truncate">From: {bookingData.pickupAddress}</p>
                    <p className="truncate">To: {bookingData.destinationAddress}</p>
                    <p>Distance: {bookingData.distance.toFixed(1)} km • Time: {bookingData.estimatedTime}</p>
                  </div>
                </div>
                
                <Separator />
                
                <RazorpayPayment
                  amount={bookingData.amount}
                  bookingId={bookingId}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
                
                <p className="text-xs text-muted-foreground text-center">
                  Complete payment to confirm your booking
                </p>
              </CardContent>
            </Card>
          )}

          {distance > 0 && !bookingId && !selectedVehicle.driverId && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <p className="text-sm text-yellow-800 text-center">
                  ⚠️ This vehicle has no driver assigned. Please select another vehicle.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}