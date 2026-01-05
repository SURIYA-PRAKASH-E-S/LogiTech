import { getDatabase, ref, set, update, onValue, off, get } from 'firebase/database';
import { auth } from './firebase';
import { logger } from '@/lib/logger';

export const trackingService = {
  // Driver location sharing with customers
  async shareDriverLocationWithCustomer(driverId: string, customerId: string) {
    const db = getDatabase();
    const driverRef = ref(db, `users/drivers/${driverId}/sharedWith/${customerId}`);
    await set(driverRef, true);
    logger.info('Driver location shared with customer', `Driver: ${driverId}, Customer: ${customerId}`);
  },

  // Stop sharing with customer
  async stopSharingWithCustomer(driverId: string, customerId: string) {
    const db = getDatabase();
    const driverRef = ref(db, `users/drivers/${driverId}/sharedWith/${customerId}`);
    await set(driverRef, null);
    logger.info('Driver stopped sharing location', `Driver: ${driverId}, Customer: ${customerId}`);
  },

  // Customer access to shared driver
  async subscribeToSharedDriver(driverId: string, customerId: string, callback: Function) {
    const db = getDatabase();
    const driverRef = ref(db, `users/drivers/${driverId}`);
    
    return onValue(driverRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.sharedWith?.[customerId]) {
        callback({
          driverId,
          location: data.currentLocation,
          online: data.online,
          updatedAt: data.updatedAt,
          assignedVehicleId: data.assignedVehicleId
        });
      }
    });
  },

  // Enhanced vehicle location updates
  async updateVehicleLocationEnhanced(vehicleId: string, location: any, driverId: string) {
    const db = getDatabase();
    const vehicleRef = ref(db, `vehicleLocations/${vehicleId}`);
    
    const enhancedData = {
      ...location,
      driverId,
      timestamp: Date.now(),
      source: 'gps',
      accuracy: location.accuracy || 10,
      speed: location.speed || 0,
      heading: location.heading || 0
    };
    
    await update(vehicleRef, enhancedData);
  },

  // Real-time driver status monitoring
  subscribeToDriverStatus(driverId: string, callback: Function) {
    const db = getDatabase();
    const driverRef = ref(db, `users/drivers/${driverId}`);
    
    return onValue(driverRef, (snapshot) => {
      const data = snapshot.val();
      callback({
        driverId,
        online: data?.online,
        currentLocation: data?.currentLocation,
        assignedVehicleId: data?.assignedVehicleId,
        lastUpdate: data?.updatedAt
      });
    });
  },

  // Get shared customers for a driver
  async getSharedCustomers(driverId: string): Promise<string[]> {
    const db = getDatabase();
    const driverRef = ref(db, `users/drivers/${driverId}/sharedWith`);
    const snapshot = await get(driverRef);
    const sharedData = snapshot.val();
    
    if (!sharedData) return [];
    
    return Object.keys(sharedData).filter(customerId => sharedData[customerId] === true);
  },

  // Check if customer can track driver
  async canCustomerTrackDriver(driverId: string, customerId: string): Promise<boolean> {
    const db = getDatabase();
    const driverRef = ref(db, `users/drivers/${driverId}/sharedWith/${customerId}`);
    const snapshot = await get(driverRef);
    return snapshot.val() === true;
  }
};
