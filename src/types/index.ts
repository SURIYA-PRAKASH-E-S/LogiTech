// Types for LogiTech Logistics Management System

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'driver' | 'customer';
  name: string;
  phone?: string;
  avatar?: string;
  assignedVehicleId?: string;
  licenseNumber?: string; // For drivers
  mustChangePassword?: boolean; // For forced password change on first login
  createdAt?: number;
  updatedAt?: number;
}

export interface Vehicle {
  id: string;
  name: string;
  model: string;
  type: 'truck' | 'van' | 'motorcycle' | 'cargo';
  capacity: string;
  pricePerKm: number;
  available: boolean;
  driverId?: string | null; // Made nullable to match Firebase
  imageUrl?: string;
  specifications: {
    fuelType: string;
    maxWeight: string;
    dimensions: string;
  };
  createdAt?: number;
  updatedAt?: number;
}

export interface VehicleLocation {
  vehicleId: string;
  trackingId: string; // Added this field for tracking
  lat: number;
  lng: number;
  timestamp: number;
  updatedBy: string;
  accuracy?: number;
  heading?: number;
  speed?: number;
  source?: 'gps' | 'ip';
}

export interface Shipment {
  id: string;
  customerId: string;
  vehicleId: string;
  driverId: string; // Made non-optional to match Firebase
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
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled'; // Fixed hyphen to underscore
  distance: number;
  estimatedTime: string;
  totalCost: number;
  createdAt: number; // Changed to number for consistency with bookings
  updatedAt: number; // Changed to number for consistency with bookings
  trackingNumber: string;
  items: ShipmentItem[];
}

export interface ShipmentItem {
  id: string;
  name: string;
  quantity: number;
  weight?: number; // Made optional to match Firebase
  description?: string;
  dimensions?: string; // Added to match Firebase
  value?: number; // Added to match Firebase
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  vehicleId?: string;
  status: 'available' | 'busy' | 'offline';
  rating: number;
  totalDeliveries: number;
  currentLocation?: {
    lat: number;
    lng: number;
  };
}

export interface RouteInfo {
  distance: number;
  duration: string;
  coordinates: [number, number][];
}

export interface BookingState {
  selectedVehicle?: Vehicle;
  pickupLocation?: {
    address: string;
    lat: number;
    lng: number;
  };
  destination?: {
    address: string;
    lat: number;
    lng: number;
  };
  routeInfo?: RouteInfo;
  totalCost?: number;
}

export interface Booking {
  id: string;
  shortId: string; // Added short ID for display
  userId: string;
  vehicleId: string;
  driverId: string; // Made non-optional to match Firebase
  amount: number;
  status: 'pending_payment' | 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'converted'; // Added 'converted'
  paymentStatus: 'pending' | 'paid' | 'failed';
  pickupAddress: string;
  destinationAddress: string;
  pickupLat: number;
  pickupLng: number;
  destinationLat: number;
  destinationLng: number;
  distance: number;
  estimatedTime: string;
  createdAt: number;
  updatedAt: number;
  paymentId?: string;
  shipmentId?: string; // Added for linking to shipment
}

export interface Payment {
  id: string;
  orderId: string;
  paymentId: string;
  amount: number;
  currency?: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: number;
  userId: string;
  bookingId?: string;
}

// Additional types for better type safety

export interface LocationData {
  address: string;
  coordinates: { lat: number; lng: number };
}

export interface BookingData {
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

export interface MapRoute {
  distance: number;
  duration: string;
  coordinates: [number, number][];
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export interface ToastData {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

// // Types for Mappls integration
// export interface MapplsMapConfig {
//   center: [number, number];
//   zoom: number;
//   container: HTMLElement;
// }

export interface MapplsMarkerConfig {
  position: { lat: number; lng: number };
  map: any;
  icon?: {
    url: string;
    scaledSize: { width: number; height: number };
  };
  fitbounds?: boolean;
  popupOptions?: boolean;
  popupHtml?: string;
}