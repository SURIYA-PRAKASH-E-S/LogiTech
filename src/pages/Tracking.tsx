import { useState, useEffect } from "react";
import { MapPin, Search, Package, Clock, CheckCircle, Truck, Navigation, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { bookingService, vehicleService, userService } from "@/lib/firebase-utils";
import { Booking, Vehicle, User } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
// CHANGE: Import VehicleLiveMap component
import { VehicleLiveMap } from '@/components/VehicleLiveMap';
import { logger } from '@/lib/logger';

export default function Tracking() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [driver, setDriver] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // CHANGE: Added for debugging purposes as requested
  useEffect(() => {
    if (selectedBooking && vehicle) {
      logger.info('Tracking page loaded', `Booking ID: ${selectedBooking?.id}`);
    }
  }, [selectedBooking, vehicle]);

  const handleSearch = async () => {
    if (!trackingNumber.trim()) return;
    
    setLoading(true);
    // CHANGE: Added for debugging
    logger.info('Searching for booking', trackingNumber);
    try {
      // Search by booking ID
      const booking = await bookingService.getBookingById(trackingNumber);
      if (booking) {
        setSelectedBooking(booking);
        
        // Load vehicle details
        const vehicleData = await vehicleService.getVehicleById(booking.vehicleId);
        setVehicle(vehicleData);
        
        // Load driver details
        if (booking.driverId) {
          const driverData = await userService.getUser(booking.driverId);
          setDriver(driverData);
        }
      } else {
        setSelectedBooking(null);
        setVehicle(null);
        setDriver(null);
        // CHANGE: Added for debugging
        logger.warning('Booking not found', trackingNumber);
      }
    } catch (error) {
      logger.error('Error searching booking', error.message || 'Unknown error');
      setSelectedBooking(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-success';
      case 'in_progress': return 'text-info';
      case 'pending': return 'text-warning';
      case 'pending_payment': return 'text-warning';
      case 'cancelled': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'completed': return 'Delivered';
      case 'in_progress': return 'In Transit';
      case 'pending': return 'Pending';
      case 'pending_payment': return 'Payment Pending';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getTrackingSteps = (status: Booking['status']) => {
    const steps = [
      { id: 1, title: 'Order Placed', description: 'Your shipment has been registered', icon: Package },
      { id: 2, title: 'Payment Processed', description: 'Payment has been confirmed', icon: CheckCircle },
      { id: 3, title: 'Picked Up', description: 'Item collected from pickup location', icon: CheckCircle },
      { id: 4, title: 'In Transit', description: 'On the way to destination', icon: Truck },
      { id: 5, title: 'Delivered', description: 'Successfully delivered', icon: MapPin },
    ];

    let activeStep = 1;
    switch (status) {
      case 'pending_payment': activeStep = 1; break;
      case 'pending': activeStep = 2; break;
      case 'in_progress': activeStep = 4; break;
      case 'completed': activeStep = 5; break;
      case 'cancelled': activeStep = 1; break;
      default: activeStep = 1;
    }

    return steps.map(step => ({
      ...step,
      completed: step.id <= activeStep,
      active: step.id === activeStep
    }));
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Shipment Tracking</h1>
        <p className="text-muted-foreground">Track your shipments in real-time</p>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Track Your Shipment
          </CardTitle>
          <CardDescription>
            Enter your booking ID to get real-time updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter booking ID"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={loading}
              className="bg-gradient-primary hover:bg-primary-dark"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Track
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Note: Use your booking ID found in the shipments page
          </p>
        </CardContent>
      </Card>

      {selectedBooking && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Tracking Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Booking #{selectedBooking.id.substring(0, 8)}...</span>
                  <Badge className={getStatusColor(selectedBooking.status)}>
                    {getStatusDisplay(selectedBooking.status)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">PICKUP LOCATION</h4>
                    <p className="text-sm">{selectedBooking.pickupAddress}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">DESTINATION</h4>
                    <p className="text-sm">{selectedBooking.destinationAddress}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Distance:</span>
                    <span className="ml-2 font-medium">{selectedBooking.distance.toFixed(1)} km</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Est. Time:</span>
                    <span className="ml-2 font-medium">{selectedBooking.estimatedTime}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="ml-2 font-medium">₹{selectedBooking.amount.toFixed(2)}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{formatDate(selectedBooking.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span>{formatDate(selectedBooking.updatedAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tracking Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Tracking Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {getTrackingSteps(selectedBooking.status).map((step, index) => (
                    <div key={step.id} className="flex items-start gap-4">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center border-2
                        ${step.completed 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : step.active
                          ? 'bg-secondary border-secondary text-secondary-foreground'
                          : 'bg-background border-muted text-muted-foreground'
                        }
                      `}>
                        <step.icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1">
                        <h4 className={`font-medium ${step.completed || step.active ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        {step.active && (
                          <Badge variant="secondary" className="mt-1">Current Status</Badge>
                        )}
                      </div>
                      
                      {index < getTrackingSteps(selectedBooking.status).length - 1 && (
                        <div className={`
                          absolute left-5 mt-10 w-0.5 h-6
                          ${step.completed ? 'bg-primary' : 'bg-muted'}
                        `} style={{ marginLeft: '1.25rem' }} />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Map and Additional Info */}
          <div className="space-y-6">
            {/* CHANGE: Replaced placeholder with VehicleLiveMap component */}
            {vehicle ? (
              <VehicleLiveMap 
                vehicleId={vehicle.id} 
                vehicleName={vehicle.name}
                height="400px" 
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Live Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                      <p className="text-sm text-muted-foreground">Loading vehicle data...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Driver Info */}
            {driver && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Driver Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
                      {driver.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{driver.name}</p>
                      <p className="text-sm text-muted-foreground">{driver.phone || 'No phone'}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{driver.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role:</span>
                      <span className="capitalize">{driver.role}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vehicle Info */}
            {vehicle && (
              <Card>
                <CardHeader>
                  <CardTitle>Vehicle Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Truck className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{vehicle.name}</h4>
                        <p className="text-sm text-muted-foreground capitalize">{vehicle.type}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Capacity:</span>
                        <span className="ml-2">{vehicle.capacity}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fuel:</span>
                        <span className="ml-2">{vehicle.specifications.fuelType}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max Weight:</span>
                        <span className="ml-2">{vehicle.specifications.maxWeight}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Price/km:</span>
                        <span className="ml-2">₹{vehicle.pricePerKm.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {selectedBooking === null && trackingNumber && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Booking Not Found</h3>
            <p className="text-muted-foreground">
              Please check your booking ID and try again
            </p>
          </CardContent>
        </Card>
      )}

      {!trackingNumber && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Enter Booking ID</h3>
            <p className="text-muted-foreground mb-4">
              Use the search box above to track your shipment
            </p>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">How to find your Booking ID:</p>
              <ol className="list-decimal pl-5 text-left space-y-1">
                <li>Go to Shipments page</li>
                <li>Find your booking in the list</li>
                <li>Copy the Booking ID</li>
                <li>Paste it in the search box above</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}