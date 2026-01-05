import { useParams } from 'react-router-dom';
import { VehicleLiveMap } from '@/components/VehicleLiveMap';
import { Card, CardContent } from '@/components/ui/card';
import { bookingService, vehicleService } from '@/lib/firebase-utils';
import { useEffect, useState } from 'react';
import { Booking, Vehicle } from '@/types';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function TrackVehicle() {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Vehicle ID is required');
      setLoading(false);
      return;
    }

    const loadVehicle = async () => {
      try {
        const vehicleData = await vehicleService.getVehicleById(id);
        if (!vehicleData) {
          setError(`Vehicle with ID "${id}" not found`);
        }
        setVehicle(vehicleData);

        // Find the most relevant booking for this vehicle (in progress > pending > latest)
        try {
          const allBookings = await bookingService.getAllBookings();
          const related = allBookings
            .filter((b) => b.vehicleId === id)
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

          const active =
            related.find((b) => b.status === 'in_progress') ??
            related.find((b) => b.status === 'pending') ??
            related[0];

          setBooking(active || null);
        } catch (e) {
          logger.warning('Booking lookup failed', e);
        }
      } catch (error) {
        logger.error('Error loading vehicle', error.message || 'Unknown error');
        setError('Failed to load vehicle information');
      } finally {
        setLoading(false);
      }
    };

    loadVehicle();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading vehicle information...</p>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Vehicle Not Found</h3>
              <p className="text-muted-foreground">
                {error || `The vehicle you're looking for doesn't exist or has been removed.`}
              </p>
            </div>
            {id && (
              <p className="text-sm text-muted-foreground">
                Vehicle ID: <code className="bg-muted px-2 py-1 rounded">{id}</code>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Track Vehicle</h1>
        <div className="space-y-1">
          <p className="text-muted-foreground">
            Live location tracking for <span className="font-semibold text-foreground">{vehicle.name}</span>
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {vehicle.model && (
              <span className="inline-flex items-center gap-1">
                <span className="font-medium">Model:</span> {vehicle.model}
              </span>
            )}
            {vehicle.type && (
              <span className="inline-flex items-center gap-1">
                <span className="font-medium">Type:</span> 
                <span className="capitalize">{vehicle.type}</span>
              </span>
            )}
            {vehicle.driverId ? (
              <span className="inline-flex items-center gap-1 text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Driver Assigned
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                No Driver Assigned
              </span>
            )}
          </div>
        </div>
      </div>

      <VehicleLiveMap 
        vehicleId={vehicle.id} 
        vehicleName={`${vehicle.name} ${vehicle.model ? `(${vehicle.model})` : ''}`.trim()}
        autoCenter={true}
        height="600px"
        pickupPoint={
          booking
            ? {
                lat: booking.pickupLat,
                lng: booking.pickupLng,
                label: booking.pickupAddress,
              }
            : undefined
        }
        dropPoint={
          booking
            ? {
                lat: booking.destinationLat,
                lng: booking.destinationLng,
                label: booking.destinationAddress,
              }
            : undefined
        }
      />

      {/* Additional vehicle information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Vehicle Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium">{vehicle.capacity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate</span>
                  <span className="font-medium">₹{vehicle.pricePerKm.toFixed(2)}/km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`font-medium ${vehicle.available ? 'text-green-600' : 'text-amber-600'}`}>
                    {vehicle.available ? 'Available' : 'In Use'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Specifications</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fuel Type</span>
                  <span className="font-medium">{vehicle.specifications.fuelType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Weight</span>
                  <span className="font-medium">{vehicle.specifications.maxWeight}</span>
                </div>
                {vehicle.specifications.dimensions && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dimensions</span>
                    <span className="font-medium">{vehicle.specifications.dimensions}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Tracking Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle ID</span>
                  <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {vehicle.id.slice(0, 8)}...
                  </code>
                </div>
                {vehicle.driverId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Driver ID</span>
                    <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                      {vehicle.driverId.slice(0, 8)}...
                    </code>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-medium">
                    {vehicle.updatedAt 
                      ? new Date(vehicle.updatedAt).toLocaleDateString()
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}