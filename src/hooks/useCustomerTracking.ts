import { useState, useEffect, useCallback } from 'react';
import { trackingService } from '../lib/tracking-service';
import { auth } from '../lib/firebase';

export const useCustomerTracking = () => {
  const [trackedDrivers, setTrackedDrivers] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const trackDriver = useCallback(async (driverId: string) => {
    const customerId = auth.currentUser?.uid;
    if (!customerId) throw new Error('User not authenticated');

    // Check if customer can track this driver
    const canTrack = await trackingService.canCustomerTrackDriver(driverId, customerId);
    if (!canTrack) {
      throw new Error('You do not have permission to track this driver');
    }

    setLoading(true);
    try {
      const unsubscribe = await trackingService.subscribeToSharedDriver(
        driverId, 
        customerId, 
        (locationData) => {
          setTrackedDrivers(prev => ({
            ...prev,
            [driverId]: { ...locationData, unsubscribe }
          }));
        }
      );
    } catch (error) {
      console.error('Failed to track driver:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const stopTrackingDriver = useCallback((driverId: string) => {
    if (trackedDrivers[driverId]?.unsubscribe) {
      trackedDrivers[driverId].unsubscribe();
      setTrackedDrivers(prev => {
        const newTracked = { ...prev };
        delete newTracked[driverId];
        return newTracked;
      });
    }
  }, [trackedDrivers]);

  const cleanup = useCallback(() => {
    Object.values(trackedDrivers).forEach((driver: any) => {
      if (driver.unsubscribe) {
        driver.unsubscribe();
      }
    });
    setTrackedDrivers({});
  }, [trackedDrivers]);

  return {
    trackedDrivers,
    trackDriver,
    stopTrackingDriver,
    loading,
    cleanup
  };
};
