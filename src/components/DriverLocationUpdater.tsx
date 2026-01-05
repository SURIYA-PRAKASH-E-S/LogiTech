import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { locationService, vehicleService, bookingService } from '@/lib/firebase-utils';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { logger } from '@/lib/logger';

type DemoWaypoint = { lat: number; lng: number; accuracy?: number; heading?: number; speed?: number };

const DEFAULT_DEMO_ROUTE: DemoWaypoint[] = [
  { lat: 12.9715987, lng: 77.5945627, accuracy: 15, heading: 95, speed: 18 },
  { lat: 12.9744689, lng: 77.5989129, accuracy: 15, heading: 115, speed: 20 },
  { lat: 12.9778203, lng: 77.6036124, accuracy: 18, heading: 140, speed: 22 },
  { lat: 12.9819452, lng: 77.6071421, accuracy: 20, heading: 165, speed: 24 },
  { lat: 12.9860061, lng: 77.6094326, accuracy: 20, heading: 190, speed: 23 },
  { lat: 12.9901034, lng: 77.6073242, accuracy: 18, heading: 220, speed: 21 },
  { lat: 12.9936457, lng: 77.6030127, accuracy: 18, heading: 255, speed: 19 },
  { lat: 12.9948765, lng: 77.5970784, accuracy: 18, heading: 285, speed: 18 },
  { lat: 12.9926284, lng: 77.5920211, accuracy: 18, heading: 315, speed: 18 },
  { lat: 12.9884628, lng: 77.5890846, accuracy: 18, heading: 345, speed: 19 },
];

const DEMO_MODE_ENABLED = import.meta.env.VITE_TRACKING_DEMO_MODE !== 'false';

export function DriverLocationUpdater() {
  const { user } = useAuth();
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastGpsLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'acquired' | 'timeout' | 'denied' | 'unavailable'>('searching');
  const gpsAttemptsRef = useRef(0);
  const [useFallbackLocation, setUseFallbackLocation] = useState(false);
  const vehicleIdRef = useRef<string>('');
  const trackingIdRef = useRef<string>('');

  // Calculate distance between coordinates (in meters)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2 - lat1) * Math.PI/180;
    const Δλ = (lon2 - lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const updateLocation = async (
    vehicleId: string,
    latitude: number,
    longitude: number,
    source: 'gps' | 'ip' = 'gps',
    forceUpdate: boolean = false,
    metadata?: {
      accuracy?: number | null;
      heading?: number | null;
      speed?: number | null;
    }
  ) => {
    try {
      // Prevent IP-based updates from overwriting a valid GPS fix
      if (source === 'ip' && lastGpsLocationRef.current && !forceUpdate) {
        logger.info('Skipping IP update to preserve GPS fix');
        return;
      }

      // Throttle updates based on movement and time
      const now = Date.now();
      
      // Check time-based throttling (minimum 5 seconds between updates)
      if (!forceUpdate && (now - lastUpdateRef.current < 5000)) {
        return;
      }
      
      // Check distance-based throttling (only update if moved significantly)
      if (lastLocationRef.current && !forceUpdate) {
        const distanceMoved = calculateDistance(
          lastLocationRef.current.lat, 
          lastLocationRef.current.lng, 
          latitude, 
          longitude
        );
        
        // Only update if moved more than 10 meters (for GPS) or 100 meters (for IP)
        const minDistance = source === 'gps' ? 10 : 100;
        if (distanceMoved < minDistance) {
          logger.info('Location update skipped', `Moved only ${distanceMoved.toFixed(1)}m`);
          return;
        }
      }
      
      lastUpdateRef.current = now;
      lastLocationRef.current = { lat: latitude, lng: longitude };
      if (source === 'gps') {
        lastGpsLocationRef.current = { lat: latitude, lng: longitude };
      }
      
      // Get previous location for distance calculation
      let previousLocation = null;
      try {
        const locationRef = ref(database, `vehicleLocations/${vehicleId}`);
        const snapshot = await get(locationRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          previousLocation = { lat: data.lat, lng: data.lng };
        }
      } catch (error) {
        logger.info('No previous location found');
      }
      
      // Update location with smart throttling
      const result = await locationService.updateLocation(
        vehicleId,
        latitude,
        longitude,
        {
          forceUpdate: forceUpdate || source === 'ip', // Always force update for IP
          previousLocation,
          source,
          accuracy: metadata?.accuracy ?? undefined,
          heading: metadata?.heading ?? undefined,
          speed: metadata?.speed ?? undefined,
        }
      );
      
      if (result.updated) {
        trackingIdRef.current = result.trackingId;
        const accuracyLog = metadata?.accuracy ? ` ±${metadata.accuracy.toFixed(0)}m` : '';
        logger.info('Location updated', `${source.toUpperCase()}: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}${accuracyLog} (Tracking: ${result.trackingId})`);
        
        if (source === 'gps') {
          setGpsStatus('acquired');
          setUseFallbackLocation(false);
          gpsAttemptsRef.current = 0; // Reset attempts on success
        }
      }
    } catch (error) {
      logger.error('Error updating location', error.message || 'Unknown error');
    }
  };

  const getAssignedVehicle = async (): Promise<string | null> => {
    try {
      // Use cached vehicle ID if available
      if (vehicleIdRef.current) {
        return vehicleIdRef.current;
      }
      
      let vehicleId = user?.assignedVehicleId || "";
      
      if (!vehicleId) {
        const vehicles = await vehicleService.getVehiclesByDriver(user?.id || '');
        if (vehicles.length === 0) {
          console.warn('🚫 No vehicle assigned to driver');
          return null;
        }
        vehicleId = vehicles[0].id;
      }
      
      // Cache the vehicle ID
      vehicleIdRef.current = vehicleId;
      return vehicleId;
    } catch (error) {
      console.error('Error getting assigned vehicle:', error);
      return null;
    }
  };

  const calculateHeadingDegrees = (from: { lat: number; lng: number }, to: { lat: number; lng: number }): number => {
    const φ1 = (from.lat * Math.PI) / 180;
    const φ2 = (to.lat * Math.PI) / 180;
    const Δλ = ((to.lng - from.lng) * Math.PI) / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    return (θ * 180) / Math.PI < 0 ? ((θ * 180) / Math.PI + 360) : (θ * 180) / Math.PI;
  };

  const buildDemoWaypoint = async (): Promise<DemoWaypoint> => {
    if (!user?.id) {
      return DEFAULT_DEMO_ROUTE[0];
    }

    try {
      const driverBookings = await bookingService.getBookingsByDriver(user.id);
      const activeBooking = driverBookings.find((booking) => booking.status === 'in_progress')
        || driverBookings.find((booking) => booking.status === 'pending')
        || driverBookings[0];

      if (!activeBooking) {
        return DEFAULT_DEMO_ROUTE[0];
      }

      const heading = calculateHeadingDegrees(
        { lat: activeBooking.pickupLat, lng: activeBooking.pickupLng },
        { lat: activeBooking.destinationLat, lng: activeBooking.destinationLng }
      );

      return {
        lat: activeBooking.pickupLat,
        lng: activeBooking.pickupLng,
        accuracy: 15,
        heading,
        speed: 18,
      };
    } catch (error) {
      console.warn('⚠️ Failed to build demo waypoint, falling back to default', error);
      return DEFAULT_DEMO_ROUTE[0];
    }
  };

  // Get IP-based fallback location
  const getIPLocation = async (): Promise<{lat: number; lng: number; accuracy?: number} | null> => {
    try {
      // Try multiple IP location services
      const services = [
        'https://ipapi.co/json/',
        'https://ipinfo.io/json/',
        'https://geolocation-db.com/json/'
      ];
      
      for (const service of services) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(service, { 
            signal: controller.signal 
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            if (data.latitude && data.longitude) {
              return { 
                lat: parseFloat(data.latitude), 
                lng: parseFloat(data.longitude),
                accuracy: typeof data.accuracy === 'number' ? data.accuracy : undefined,
              };
            }
          }
        } catch (e) {
          // Try next service
          continue;
        }
      }
      
      console.warn('📍 No IP-based location available');
      return null;
    } catch (error) {
      console.warn('Failed to get IP location:', error);
      return null;
    }
  };

  const pushDemoLocation = async (vehicleId: string) => {
    const waypoint = await buildDemoWaypoint();
    setGpsStatus('acquired');
    setUseFallbackLocation(false);
    gpsAttemptsRef.current = 0;
    lastUpdateRef.current = Date.now();
    lastLocationRef.current = { lat: waypoint.lat, lng: waypoint.lng };
    lastGpsLocationRef.current = { lat: waypoint.lat, lng: waypoint.lng };

    await updateLocation(vehicleId, waypoint.lat, waypoint.lng, 'gps', true, {
      accuracy: waypoint.accuracy ?? null,
      heading: waypoint.heading ?? null,
      speed: waypoint.speed ?? null,
    });
  };

  const handleGeolocationSuccess = async (position: GeolocationPosition, source: 'gps' | 'watch' = 'gps') => {
    const vehicleId = await getAssignedVehicle();
    if (!vehicleId) return;

    if (DEMO_MODE_ENABLED) {
      await pushDemoLocation(vehicleId);
      return;
    }

    const { latitude, longitude } = position.coords;

    // Only use high-accuracy GPS data (< 100m accuracy)
    if (position.coords.accuracy > 100 && source === 'gps') {
      logger.warning('Low GPS accuracy', `Accuracy: ${position.coords.accuracy.toFixed(1)}m`);
      return;
    }

    await updateLocation(vehicleId, latitude, longitude, 'gps', false, {
      accuracy: position.coords.accuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
    });
  };

  const handleGeolocationError = async (error: GeolocationPositionError, retryCount: number = 0) => {
    const vehicleId = await getAssignedVehicle();
    
    switch(error.code) {
      case error.PERMISSION_DENIED:
        console.error('🔒 Location permission denied');
        setGpsStatus('denied');
        setUseFallbackLocation(true);
        
        if (vehicleId) {
          const ipLocation = await getIPLocation();
          if (ipLocation) {
            await updateLocation(vehicleId, ipLocation.lat, ipLocation.lng, 'ip', true, {
              accuracy: ipLocation.accuracy ?? null,
            });
          }
        }
        break;
        
      case error.POSITION_UNAVAILABLE:
        console.error('📡 GPS signal unavailable');
        setGpsStatus('unavailable');
        setUseFallbackLocation(true);
        
        if (vehicleId) {
          const ipLocation = await getIPLocation();
          if (ipLocation) {
            await updateLocation(vehicleId, ipLocation.lat, ipLocation.lng, 'ip', true);
          }
        }
        break;
        
      case error.TIMEOUT:
        logger.warning('GPS timeout', `Attempt ${retryCount + 1}`);
        setGpsStatus('timeout');
        
        // Retry with different settings
        if (retryCount < 2) {
          setTimeout(() => {
            tryGPSLocation(retryCount + 1);
          }, 2000 * (retryCount + 1));
        } else {
          // After 3 attempts, use IP fallback
          setUseFallbackLocation(true);
          if (vehicleId) {
            const ipLocation = await getIPLocation();
            if (ipLocation) {
              await updateLocation(vehicleId, ipLocation.lat, ipLocation.lng, 'ip', true, {
                accuracy: ipLocation.accuracy ?? null,
              });
            }
          }
        }
        break;
    }
  };

  // Try to get GPS location with retry logic
  const tryGPSLocation = async (retryCount = 0): Promise<boolean> => {
    if (retryCount >= 3 || DEMO_MODE_ENABLED) {
      logger.warning('GPS failed after 3 attempts, using IP fallback');
      setGpsStatus('timeout');
      setUseFallbackLocation(true);
      return false;
    }

    return new Promise((resolve) => {
      const gpsTimeout = setTimeout(async () => {
        logger.warning('GPS attempt timed out', `Attempt ${retryCount + 1}`);
        resolve(false);
      }, 10000);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          clearTimeout(gpsTimeout);
          await handleGeolocationSuccess(position);
          setGpsStatus('acquired');
          resolve(true);
        },
        async (error) => {
          clearTimeout(gpsTimeout);
          await handleGeolocationError(error, retryCount);
          resolve(false);
        },
        {
          enableHighAccuracy: retryCount === 0, // High accuracy only on first try
          timeout: 15000,
          maximumAge: retryCount > 0 ? 30000 : 0, // Accept older data on retry
        }
      );
    });
  };

  // Start continuous GPS watching
  const startGPSWatch = () => {
    if (!navigator.geolocation) {
      console.log('❌ Geolocation not supported');
      return;
    }

    // Clear existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    console.log('🛰️ Starting GPS watch...');
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        if (position.coords.accuracy < 50) { // Only update if accuracy < 50m
          await handleGeolocationSuccess(position, 'watch');
        }
      },
      (error) => {
        console.warn('GPS watch error:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000
      }
    );
  };

  // Initialize tracking ID for the vehicle
  const initializeTrackingId = async () => {
    const vehicleId = await getAssignedVehicle();
    if (!vehicleId) return;
    
    try {
      // Try to get existing tracking ID
      const trackingId = await locationService.getTrackingId(vehicleId);
      if (trackingId) {
        trackingIdRef.current = trackingId;
        console.log(`📋 Using existing tracking ID: ${trackingId}`);
      } else {
        console.log('📋 No tracking ID found, one will be created on first location update');
      }
    } catch (error) {
      console.error('Error initializing tracking ID:', error);
    }
  };

  // Main initialization
  const initializeLocationSharing = async () => {
    const vehicleId = await getAssignedVehicle();
    if (!vehicleId) {
      console.log('🚫 No vehicle assigned, location sharing disabled');
      return;
    }

    console.log('🚀 Starting location sharing for vehicle:', vehicleId);
    
    // Initialize tracking ID
    await initializeTrackingId();

    if (DEMO_MODE_ENABLED) {
      await pushDemoLocation(vehicleId);
      return () => {};
    }
    
    // First, try to get GPS
    setGpsStatus('searching');
    const gpsSuccess = await tryGPSLocation();
    
    if (gpsSuccess) {
      // Start continuous GPS watching
      startGPSWatch();
    } else {
      // Use IP location and set interval for updates
      const ipLocation = await getIPLocation();
      if (ipLocation) {
        await updateLocation(vehicleId, ipLocation.lat, ipLocation.lng, 'ip', true, {
          accuracy: ipLocation.accuracy ?? null,
        });
      }
      
      // Try GPS again every 60 seconds
      const gpsRetryInterval = setInterval(async () => {
        if (!useFallbackLocation) return;
        
        console.log('🔄 Retrying GPS...');
        const success = await tryGPSLocation();
        if (success) {
          clearInterval(gpsRetryInterval);
          startGPSWatch();
        }
      }, 60000);
      
      // Update IP location every 5 minutes
      const ipUpdateInterval = setInterval(async () => {
        if (!useFallbackLocation) return;
        
        const ipLocation = await getIPLocation();
        if (ipLocation) {
          await updateLocation(vehicleId, ipLocation.lat, ipLocation.lng, 'ip', true, {
            accuracy: ipLocation.accuracy ?? null,
          });
        }
      }, 300000);
      
      // Cleanup intervals
      return () => {
        clearInterval(gpsRetryInterval);
        clearInterval(ipUpdateInterval);
      };
    }
    
    // Force update every 30 seconds regardless of movement (for safety)
    const safetyInterval = setInterval(async () => {
      const vehicleId = await getAssignedVehicle();
      if (vehicleId && lastLocationRef.current) {
        // Force update with current location
        await updateLocation(
          vehicleId, 
          lastLocationRef.current.lat, 
          lastLocationRef.current.lng, 
          useFallbackLocation ? 'ip' : 'gps',
          true
        );
      }
    }, 30000);
    
    return () => {
      clearInterval(safetyInterval);
    };
  };

  useEffect(() => {
    // Only run for drivers
    if (user?.role !== 'driver') {
      console.log('👤 Not a driver, location sharing disabled');
      return;
    }

    console.log('👤 Driver detected, starting location sharing...');
    
    // Start everything
    let cleanupIntervals: (() => void) | undefined;
    
    const init = async () => {
      cleanupIntervals = await initializeLocationSharing();
    };
    
    init();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up location sharing...');
      
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        console.log('📍 GPS watch stopped');
      }
      
      if (cleanupIntervals) {
        cleanupIntervals();
      }

      // Reset refs
      vehicleIdRef.current = '';
      trackingIdRef.current = '';
      lastLocationRef.current = null;
      lastUpdateRef.current = 0;
      gpsAttemptsRef.current = 0;
    };
  }, [user]);

  // Render nothing (invisible component)
  return null;
}

// Optional: Create a simple status component for debugging
export function LocationSharingStatus() {
  const [status, setStatus] = useState('Initializing...');
  
  useEffect(() => {
    // This would connect to the DriverLocationUpdater's state
    // For now, just show a static status
    setStatus('Location sharing active');
  }, []);
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#10b981',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      zIndex: 1000,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    }}>
      📍 {status}
    </div>
  );
}