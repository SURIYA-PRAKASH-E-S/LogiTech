// hooks/useRealtimeLocation.tsx
import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';
import { VehicleLocation } from '@/types';

const DEMO_MODE_ENABLED = import.meta.env.VITE_TRACKING_DEMO_MODE !== 'false';
const DEMO_ROUTE_FALLBACK: Omit<VehicleLocation, 'timestamp'>[] = [
  {
    vehicleId: 'demo-vehicle',
    trackingId: 'DEMO1234',
    lat: 12.9715987,
    lng: 77.5945627,
    updatedBy: 'demo',
    accuracy: 15,
    heading: 110,
    speed: 20,
    source: 'gps',
  },
];

export function useRealtimeLocation(vehicleId: string | null) {
  const [location, setLocation] = useState<VehicleLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId) {
      setLoading(false);
      setError('Vehicle ID is required');
      return;
    }

    const locationRef = ref(database, `vehicleLocations/${vehicleId}`);
    
    setLoading(true);
    setError(null);

    const unsubscribe = onValue(
      locationRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          // Validate data structure
          if (typeof data.lat === 'number' && typeof data.lng === 'number') {
            setLocation({
              lat: data.lat,
              lng: data.lng,
              timestamp: data.timestamp || Date.now(),
              vehicleId: data.vehicleId || vehicleId,
              updatedBy: data.updatedBy || 'unknown',
              trackingId: data.trackingId || '',
              accuracy: data.accuracy,
              heading: data.heading,
              speed: data.speed,
              source: data.source,
            });
            setError(null);
          } else {
            setError('Invalid location data structure');
            setLocation(null);
          }
        } else if (DEMO_MODE_ENABLED) {
          const fallback = DEMO_ROUTE_FALLBACK[0];
          setLocation({
            ...fallback,
            vehicleId,
            trackingId: fallback.trackingId || 'DEMO1234',
            timestamp: Date.now(),
          });
          setError(null);
        } else {
          setLocation(null);
          setError('No location data available');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to location:', error);
        setError('Failed to load location data');
        setLoading(false);
      }
    );

    return () => {
      off(locationRef, 'value', unsubscribe);
    };
  }, [vehicleId]);

  return { location, loading, error };
}