import { ref, get, set, push, remove, update, query, orderByChild, equalTo } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { database } from './firebase';
import { Vehicle, VehicleLocation, Booking, User, Payment, Shipment } from '@/types';
import { logger } from '@/lib/logger';

const requireAuth = () => {
  const auth = getAuth();
  const current = auth.currentUser;
  if (!current) {
    throw new Error('Not authenticated');
  }
  return current;
};

// Helper functions
const generateConsistentTrackingId = (vehicleId: string): string => {
  // Create a hash-based consistent tracking ID
  let hash = 0;
  for (let i = 0; i < vehicleId.length; i++) {
    hash = ((hash << 5) - hash) + vehicleId.charCodeAt(i);
    hash = hash & hash;
  }
  
  // Use first 4 characters of vehicle ID + hash
  const shortId = vehicleId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
  const uniqueDigits = Math.abs(hash % 10000).toString().padStart(4, '0');
  
  return `${shortId}${uniqueDigits}`;
};

const generateShortId = (fullId: string): string => {
  return fullId.slice(-6);
};

// Get or create tracking ID for a vehicle
const getOrCreateTrackingId = async (vehicleId: string): Promise<string> => {
  try {
    // Check if tracking ID already exists
    const trackingRef = ref(database, `vehicleTrackingIds/${vehicleId}`);
    const snapshot = await get(trackingRef);
    
    if (snapshot.exists()) {
      // Return existing tracking ID
      const data = snapshot.val();
      logger.info('Using existing tracking ID', `Vehicle: ${vehicleId}`);
      return data.trackingId;
    } else {
      // Create new consistent tracking ID
      const trackingId = generateConsistentTrackingId(vehicleId);
      const trackingData = {
        trackingId,
        vehicleId,
        createdAt: Date.now(),
        createdBy: requireAuth().uid,
      };
      
      // Save tracking ID
      await set(trackingRef, trackingData);
      logger.info('Created new tracking ID', `Vehicle: ${vehicleId}`);
      return trackingId;
    }
  } catch (error) {
    console.error('Error getting tracking ID:', error);
    // Fallback to generated ID
    return generateConsistentTrackingId(vehicleId);
  }
};

// Calculate distance between coordinates (in meters)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

// Vehicle operations
export const vehicleService = {
  // Get all vehicles
  getAllVehicles: async (): Promise<Vehicle[]> => {
    const currentUser = requireAuth();
    const vehiclesRef = ref(database, 'vehicles');
    const snapshot = await get(vehiclesRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data).map(([id, vehicle]: [string, any]) => ({
        id,
        ...vehicle,
        driverId: vehicle.driverId || null,
        specifications: vehicle.specifications || {
          fuelType: '',
          maxWeight: '',
          dimensions: '',
        },
        createdAt: vehicle.createdAt || Date.now(),
        updatedAt: vehicle.updatedAt || Date.now(),
      }));
    }
    return [];
  },

  // Get vehicle by ID
  getVehicleById: async (vehicleId: string): Promise<Vehicle | null> => {
    const vehicleRef = ref(database, `vehicles/${vehicleId}`);
    const snapshot = await get(vehicleRef);
    if (snapshot.exists()) {
      return { id: vehicleId, ...snapshot.val() };
    }
    return null;
  },

  // Get vehicles by driver ID
  getVehiclesByDriver: async (driverId: string): Promise<Vehicle[]> => {
    const vehiclesRef = ref(database, 'vehicles');
    const snapshot = await get(vehiclesRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data)
        .filter(([_, vehicle]: [string, any]) => vehicle.driverId === driverId)
        .map(([id, vehicle]: [string, any]) => ({
          id,
          ...vehicle,
        }));
    }
    return [];
  },

  // Create or update vehicle
  saveVehicle: async (vehicle: Partial<Vehicle> & { id?: string }): Promise<string> => {
    const currentUser = requireAuth();
    
    const vehicleData: any = {
      name: vehicle.name || '',
      model: vehicle.model || '',
      type: vehicle.type || 'truck',
      capacity: vehicle.capacity || '',
      pricePerKm: vehicle.pricePerKm || 0,
      available: vehicle.available ?? true,
      imageUrl: vehicle.imageUrl || '',
      specifications: vehicle.specifications || {
        fuelType: '',
        maxWeight: '',
        dimensions: '',
      },
      driverId: vehicle.driverId || null,
      updatedAt: Date.now(),
    };

    if (vehicle.id) {
      // Update existing
      vehicleData.createdAt = vehicle.createdAt || Date.now();
      await set(ref(database, `vehicles/${vehicle.id}`), vehicleData);
      return vehicle.id;
    } else {
      // Create new
      vehicleData.createdAt = Date.now();
      const newRef = push(ref(database, 'vehicles'));
      const newId = newRef.key || '';
      await set(newRef, vehicleData);
      return newId;
    }
  },

  // Delete vehicle
  deleteVehicle: async (vehicleId: string): Promise<void> => {
    const currentUser = requireAuth();
    // Also delete tracking ID when vehicle is deleted
    await Promise.all([
      remove(ref(database, `vehicles/${vehicleId}`)),
      remove(ref(database, `vehicleLocations/${vehicleId}`)),
      remove(ref(database, `vehicleTrackingIds/${vehicleId}`)),
    ]);
  },

  // Assign driver to vehicle
  assignDriver: async (vehicleId: string, driverId: string | null): Promise<void> => {
    const currentUser = requireAuth();
    
    if (!vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    try {
      const vehicleRef = ref(database, `vehicles/${vehicleId}`);
      const vehicleSnapshot = await get(vehicleRef);
      
      if (!vehicleSnapshot.exists()) {
        throw new Error(`Vehicle not found: ${vehicleId}`);
      }
      
      const vehicleData = vehicleSnapshot.val();
      const currentDriverId = vehicleData?.driverId || null;
      
      // If driver is being assigned
      if (driverId) {
        // Check if driver exists
        const driverRef = ref(database, `users/${driverId}`);
        const driverSnapshot = await get(driverRef);
        
        if (!driverSnapshot.exists()) {
          throw new Error(`Driver not found: ${driverId}`);
        }
        
        const driverData = driverSnapshot.val();
        if (driverData.role !== 'driver') {
          throw new Error('User is not a driver');
        }
        
        // Check if driver is already assigned to another vehicle
        if (driverData.assignedVehicleId && driverData.assignedVehicleId !== vehicleId) {
          // Remove driver from previous vehicle
          await update(ref(database, `vehicles/${driverData.assignedVehicleId}`), {
            driverId: null,
            updatedAt: Date.now(),
          });
        }
        
        // Update driver's assigned vehicle
        await update(driverRef, {
          assignedVehicleId: vehicleId,
          updatedAt: Date.now(),
        });
        
        // If there was a previous driver, remove their assignment
        if (currentDriverId && currentDriverId !== driverId) {
          const previousDriverRef = ref(database, `users/${currentDriverId}`);
          await update(previousDriverRef, {
            assignedVehicleId: null,
            updatedAt: Date.now(),
          });
        }
      } else {
        // If driver is being unassigned
        if (currentDriverId) {
          const previousDriverRef = ref(database, `users/${currentDriverId}`);
          await update(previousDriverRef, {
            assignedVehicleId: null,
            updatedAt: Date.now(),
          });
        }
      }
      
      // Update vehicle's driver
      await update(vehicleRef, {
        driverId,
        updatedAt: Date.now(),
      });
      
    } catch (error: any) {
      logger.error('Error in assignDriver', error.message || 'Unknown error');
      throw new Error(`Failed to assign driver: ${error.message}`);
    }
  },

  // Mark vehicle as unavailable (in use)
  markVehicleAsInUse: async (vehicleId: string): Promise<void> => {
    const vehicleRef = ref(database, `vehicles/${vehicleId}`);
    await update(vehicleRef, {
      available: false,
      updatedAt: Date.now(),
    });
  },

  // Mark vehicle as available
  markVehicleAsAvailable: async (vehicleId: string): Promise<void> => {
    const vehicleRef = ref(database, `vehicles/${vehicleId}`);
    await update(vehicleRef, {
      available: true,
      updatedAt: Date.now(),
    });
  },
};
// Vehicle location operations
export const locationService = {
  // Update vehicle location with consistent tracking ID
  updateLocation: async (
    vehicleId: string,
    lat: number,
    lng: number,
    options?: {
      forceUpdate?: boolean;
      previousLocation?: { lat: number; lng: number };
      source?: 'gps' | 'ip';
      accuracy?: number;
      heading?: number;
      speed?: number;
    }
  ): Promise<{ updated: boolean; trackingId: string }> => {
    const currentUser = requireAuth();

    // Get or create consistent tracking ID
    const trackingId = await getOrCreateTrackingId(vehicleId);

    // When no coordinates provided (NaN/undefined), skip update
    if (!isFinite(lat) || !isFinite(lng)) {
      logger.warning('Invalid location update ignored', `Vehicle: ${vehicleId}`);
      return { updated: false, trackingId };
    }

    const previousLocation = options?.previousLocation;
    const source = options?.source ?? 'gps';

    if (!options?.forceUpdate && previousLocation) {
      const distanceMoved = calculateDistance(
        previousLocation.lat,
        previousLocation.lng,
        lat,
        lng
      );

      const minDistance = source === 'gps' ? 5 : 75; // tighter threshold for GPS, looser for IP

      if (distanceMoved < minDistance) {
        logger.info('Location update skipped', `Source: ${source.toUpperCase()}, Distance: ${distanceMoved.toFixed(1)}m < ${minDistance}m`);
        return { updated: false, trackingId };
      }
    }

    const locationData: VehicleLocation = {
      vehicleId,
      trackingId,
      lat,
      lng,
      timestamp: Date.now(),
      updatedBy: currentUser.uid,
    };

    if (source) {
      locationData.source = source;
    }

    if (typeof options?.accuracy === 'number' && Number.isFinite(options.accuracy)) {
      locationData.accuracy = options.accuracy;
    }

    if (typeof options?.heading === 'number' && Number.isFinite(options.heading)) {
      locationData.heading = options.heading;
    }

    if (typeof options?.speed === 'number' && Number.isFinite(options.speed)) {
      locationData.speed = options.speed;
    }

    // Update the location (this will overwrite previous data)
    await set(ref(database, `vehicleLocations/${vehicleId}`), locationData);
    
    logger.info('Location updated', `Vehicle: ${vehicleId}, Tracking: ${trackingId}`);
    return { updated: true, trackingId };
  },

  // Get vehicle location by vehicle ID
  getLocation: async (vehicleId: string): Promise<VehicleLocation | null> => {
    const locationRef = ref(database, `vehicleLocations/${vehicleId}`);
    const snapshot = await get(locationRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  },

  // Get vehicle location by tracking ID
  getLocationByTrackingId: async (trackingId: string): Promise<VehicleLocation | null> => {
    try {
      // First, find which vehicle has this tracking ID
      const trackingIdsRef = ref(database, 'vehicleTrackingIds');
      const snapshot = await get(trackingIdsRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const entry = Object.entries(data)
          .find(([_, trackingData]: [string, any]) => trackingData.trackingId === trackingId);
        
        if (entry) {
          const [vehicleId] = entry;
          return locationService.getLocation(vehicleId);
        }
      }
      return null;
    } catch (error) {
      logger.error('Error getting location by tracking ID', error.message || 'Unknown error');
      return null;
    }
  },

  // Get all vehicle locations
  getAllLocations: async (): Promise<Record<string, VehicleLocation>> => {
    const locationsRef = ref(database, 'vehicleLocations');
    const snapshot = await get(locationsRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return {};
  },

  // Get tracking ID for a vehicle
  getTrackingId: async (vehicleId: string): Promise<string | null> => {
    try {
      const trackingRef = ref(database, `vehicleTrackingIds/${vehicleId}`);
      const snapshot = await get(trackingRef);
      if (snapshot.exists()) {
        return snapshot.val().trackingId;
      }
      return null;
    } catch (error) {
      logger.error('Error getting tracking ID', error.message || 'Unknown error');
      return null;
    }
  },

  // Get all tracking IDs
  getAllTrackingIds: async (): Promise<Record<string, { trackingId: string; vehicleId: string }>> => {
    const trackingRef = ref(database, 'vehicleTrackingIds');
    const snapshot = await get(trackingRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return {};
  },
};

// Payment operations
export const paymentService = {
  // Save payment
  savePayment: async (
    userId: string,
    payment: {
      orderId: string;
      paymentId: string;
      amount: number;
      status: 'pending' | 'success' | 'failed';
      currency?: string;
      bookingId?: string;
    }
  ): Promise<string> => {
    const newRef = push(ref(database, `payments/${userId}`));
    const paymentId = newRef.key || '';
    
    // Prepare payment data
    const paymentData: Payment = {
      id: paymentId,
      orderId: payment.orderId || '',
      paymentId: payment.paymentId || '',
      amount: payment.amount || 0,
      currency: payment.currency || 'INR',
      status: payment.status || 'pending',
      timestamp: Date.now(),
      userId: userId,
      bookingId: payment.bookingId || '',
    };

    await set(newRef, paymentData);

    // If linked to booking, update booking payment status
    if (payment.bookingId) {
      const bookingRef = ref(database, `bookings/${payment.bookingId}`);
      const bookingSnapshot = await get(bookingRef);
      if (bookingSnapshot.exists()) {
        const bookingData = bookingSnapshot.val();
        
        const bookingUpdate: Partial<Booking> = {
          paymentStatus: payment.status === 'success' ? 'paid' : 
                       payment.status === 'failed' ? 'failed' : 'pending',
          updatedAt: Date.now(),
        };
        
        if (payment.status === 'success' && payment.paymentId) {
          bookingUpdate.paymentId = payment.paymentId;
        }
        
        if (payment.status === 'success') {
          bookingUpdate.status = 'pending';
        }
        
        await update(bookingRef, bookingUpdate);
      }
    }

    return paymentData.id;
  },

  // Get payments by user
  getPaymentsByUser: async (userId: string): Promise<Payment[]> => {
    const paymentsRef = ref(database, `payments/${userId}`);
    const snapshot = await get(paymentsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data)
        .map(([id, payment]: [string, any]) => ({ id, ...payment }))
        .sort((a, b) => b.timestamp - a.timestamp);
    }
    return [];
  },

  // Get payment by ID
  getPaymentById: async (userId: string, paymentId: string): Promise<Payment | null> => {
    const paymentRef = ref(database, `payments/${userId}/${paymentId}`);
    const snapshot = await get(paymentRef);
    if (snapshot.exists()) {
      return { id: paymentId, ...snapshot.val() };
    }
    return null;
  },
};

// Booking operations
export const bookingService = {
  createBooking: async (bookingData: {
    userId: string;
    vehicleId: string;
    driverId: string;
    pickupAddress: string;
    destinationAddress: string;
    pickupLat: number;
    pickupLng: number;
    destinationLat: number;
    destinationLng: number;
    distance: number;
    estimatedTime: string;
    amount: number;
  }): Promise<string> => {
    const newRef = push(ref(database, 'bookings'));
    const now = Date.now();
    const bookingId = newRef.key || '';
    const shortBookingId = generateShortId(bookingId);
    
    const booking: Booking = {
      id: bookingId,
      shortId: shortBookingId,
      userId: bookingData.userId,
      vehicleId: bookingData.vehicleId,
      driverId: bookingData.driverId,
      pickupAddress: bookingData.pickupAddress,
      destinationAddress: bookingData.destinationAddress,
      pickupLat: bookingData.pickupLat,
      pickupLng: bookingData.pickupLng,
      destinationLat: bookingData.destinationLat,
      destinationLng: bookingData.destinationLng,
      distance: bookingData.distance,
      estimatedTime: bookingData.estimatedTime,
      amount: bookingData.amount,
      status: 'pending_payment',
      paymentStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await set(newRef, booking);
    
    // Mark vehicle as unavailable
    await vehicleService.markVehicleAsInUse(bookingData.vehicleId);
    
    logger.info('Booking created', `ID: ${bookingId}, Short: ${shortBookingId}`);
    return bookingId;
  },

  updateBooking: async (bookingId: string, updates: Partial<Booking>): Promise<void> => {
    const now = Date.now();
    const bookingRef = ref(database, `bookings/${bookingId}`);
    const snapshot = await get(bookingRef);
    if (!snapshot.exists()) throw new Error('Booking not found');
    
    const current = snapshot.val();
    
    // Prepare update data
    const updateData: Partial<Booking> = {
      ...updates,
      updatedAt: now,
    };
    
    await update(bookingRef, updateData);

    // If status changed to completed or cancelled, mark vehicle as available
    if ((updates.status === 'completed' || updates.status === 'cancelled') && current.vehicleId) {
      await vehicleService.markVehicleAsAvailable(current.vehicleId);
    }
  },

  getBookingById: async (bookingId: string): Promise<Booking | null> => {
    const bookingRef = ref(database, `bookings/${bookingId}`);
    const snapshot = await get(bookingRef);
    if (snapshot.exists()) {
      return { id: bookingId, ...snapshot.val() };
    }
    return null;
  },

  getBookingsByUser: async (userId: string): Promise<Booking[]> => {
    const bookingsRef = ref(database, 'bookings');
    const snapshot = await get(bookingsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data)
        .filter(([_, booking]: [string, any]) => booking.userId === userId)
        .map(([id, booking]: [string, any]) => ({ id, ...booking }))
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    return [];
  },

  getBookingsByDriver: async (driverId: string): Promise<Booking[]> => {
    const bookingsRef = ref(database, 'bookings');
    const snapshot = await get(bookingsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data)
        .filter(([_, booking]: [string, any]) => booking.driverId === driverId)
        .map(([id, booking]: [string, any]) => ({ id, ...booking }))
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    return [];
  },

  getAllBookings: async (): Promise<Booking[]> => {
    const currentUser = requireAuth();
    const bookingsRef = ref(database, 'bookings');
    const snapshot = await get(bookingsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data)
        .map(([id, booking]: [string, any]) => ({ id, ...booking }))
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    return [];
  },

  // Convert booking to shipment
  convertToShipment: async (bookingId: string): Promise<string> => {
    const booking = await bookingService.getBookingById(bookingId);
    if (!booking) throw new Error('Booking not found');
    
    const shipmentId = await shipmentService.createShipment({
      customerId: booking.userId,
      vehicleId: booking.vehicleId,
      driverId: booking.driverId,
      pickupLocation: {
        address: booking.pickupAddress,
        lat: booking.pickupLat,
        lng: booking.pickupLng,
      },
      destination: {
        address: booking.destinationAddress,
        lat: booking.destinationLat,
        lng: booking.destinationLng,
      },
      distance: booking.distance,
      estimatedTime: booking.estimatedTime,
      totalCost: booking.amount,
      items: [],
    });

    // Update booking status
    await bookingService.updateBooking(bookingId, {
      status: 'converted',
      shipmentId: shipmentId,
    });

    return shipmentId;
  },
};

// User utilities
export const userService = {
  getDrivers: async (): Promise<User[]> => {
    const currentUser = requireAuth();
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data)
        .filter(([_, user]: [string, any]) => user.role === 'driver')
        .map(([id, user]: [string, any]) => ({ 
          id, 
          ...user,
          assignedVehicleId: user.assignedVehicleId || null 
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  },

  getCustomers: async (): Promise<User[]> => {
    const currentUser = requireAuth();
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data)
        .filter(([_, user]: [string, any]) => user.role === 'customer')
        .map(([id, user]: [string, any]) => ({ id, ...user }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  },

  getUser: async (userId: string): Promise<User | null> => {
    const currentUser = requireAuth();
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      return { id: userId, ...snapshot.val() };
    }
    return null;
  },

  updateUser: async (userId: string, updates: Partial<User>): Promise<void> => {
    const userRef = ref(database, `users/${userId}`);
    await update(userRef, updates);
  },

  createUser: async (userData: Omit<User, 'id'>): Promise<string> => {
    const newRef = push(ref(database, 'users'));
    const userId = newRef.key || '';
    
    const user: User = {
      id: userId,
      ...userData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await set(newRef, user);
    return userId;
  },

  // Get all users
  getAllUsers: async (): Promise<User[]> => {
    const currentUser = requireAuth();
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data)
        .map(([id, user]: [string, any]) => ({ id, ...user }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  },

  // Delete user from database
  deleteUser: async (userId: string): Promise<void> => {
    const currentUser = requireAuth();
    const userRef = ref(database, `users/${userId}`);
    await remove(userRef);
  },
};

// Shipment operations
export const shipmentService = {
  createShipment: async (shipmentData: {
    customerId: string;
    vehicleId: string;
    driverId?: string;
    pickupLocation: {
      address: string;
      lat: number;
      lng: number;
    };
    destination: {
      address: string;
      lat: number;
      lng: number;
    };
    distance: number;
    estimatedTime: string;
    totalCost: number;
    items: Array<{
      name: string;
      quantity: number;
      weight?: number;
      dimensions?: string;
      value?: number;
    }>;
  }): Promise<string> => {
    const newRef = push(ref(database, 'shipments'));
    const now = Date.now();
    const shipmentId = newRef.key || '';
    
    const shipment: Shipment = {
      id: shipmentId,
      customerId: shipmentData.customerId,
      vehicleId: shipmentData.vehicleId,
      driverId: shipmentData.driverId || '',
      pickupLocation: shipmentData.pickupLocation,
      destination: shipmentData.destination,
      distance: shipmentData.distance,
      estimatedTime: shipmentData.estimatedTime,
      totalCost: shipmentData.totalCost,
      status: 'pending',
      createdAt: now, // Use number timestamp for consistency
      updatedAt: now,
      trackingNumber: `TRK${now.toString().slice(-8)}`,
      items: shipmentData.items.map((item, index) => ({
        id: `${shipmentId}-item-${index + 1}`,
        name: item.name,
        quantity: item.quantity,
        weight: item.weight || 0,
        dimensions: item.dimensions || '',
        value: item.value || 0,
      })),
    };

    await set(newRef, shipment);
    return shipmentId;
  },

  updateShipment: async (shipmentId: string, updates: Partial<Shipment>): Promise<void> => {
    const shipmentRef = ref(database, `shipments/${shipmentId}`);
    const snapshot = await get(shipmentRef);
    if (!snapshot.exists()) throw new Error('Shipment not found');
    
    const updateData = {
      ...updates,
      updatedAt: Date.now(), // Use number timestamp for consistency
    };
    
    await update(shipmentRef, updateData);
  },

  getShipmentById: async (shipmentId: string): Promise<Shipment | null> => {
    const shipmentRef = ref(database, `shipments/${shipmentId}`);
    const snapshot = await get(shipmentRef);
    if (snapshot.exists()) {
      return { id: shipmentId, ...snapshot.val() };
    }
    return null;
  },

  getShipmentsByUser: async (userId: string): Promise<Shipment[]> => {
    const shipmentsRef = ref(database, 'shipments');
    const snapshot = await get(shipmentsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data)
        .filter(([_, shipment]: [string, any]) => shipment.customerId === userId)
        .map(([id, shipment]: [string, any]) => ({ id, ...shipment }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  },

  getAllShipments: async (): Promise<Shipment[]> => {
    const shipmentsRef = ref(database, 'shipments');
    const snapshot = await get(shipmentsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data)
        .map(([id, shipment]: [string, any]) => ({ id, ...shipment }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  },

  getShipmentByTrackingNumber: async (trackingNumber: string): Promise<Shipment | null> => {
    const shipmentsRef = ref(database, 'shipments');
    const snapshot = await get(shipmentsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const shipmentEntry = Object.entries(data)
        .find(([_, shipment]: [string, any]) => shipment.trackingNumber === trackingNumber);
      
      if (shipmentEntry) {
        const [id, shipment] = shipmentEntry;
        return { id, ...shipment as Shipment };
      }
    }
    return null;
  },
};