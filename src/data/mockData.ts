// Mock data for LogiTech system
import { Vehicle, Driver, Shipment, User } from '@/types';

export const mockVehicles: Vehicle[] = [
  {
    id: 'v1',
    name: 'Express Truck',
    model: 'Freightliner Cascadia',
    type: 'truck',
    capacity: '5 tons',
    pricePerKm: 2.5,
    available: true,
    specifications: {
      fuelType: 'Diesel',
      maxWeight: '5000 kg',
      dimensions: '6m x 2.5m x 3m'
    }
  },
  {
    id: 'v2',
    name: 'City Van',
    model: 'Ford Transit',
    type: 'van',
    capacity: '1.5 tons',
    pricePerKm: 1.8,
    available: true,
    specifications: {
      fuelType: 'Petrol',
      maxWeight: '1500 kg',
      dimensions: '4m x 2m x 2.5m'
    }
  },
  {
    id: 'v3',
    name: 'Quick Delivery',
    model: 'Honda CB500X',
    type: 'motorcycle',
    capacity: '50 kg',
    pricePerKm: 0.8,
    available: true,
    specifications: {
      fuelType: 'Petrol',
      maxWeight: '50 kg',
      dimensions: '2m x 0.8m x 1.2m'
    }
  },
  {
    id: 'v4',
    name: 'Heavy Cargo',
    model: 'Volvo FH16',
    type: 'cargo',
    capacity: '10 tons',
    pricePerKm: 4.2,
    available: false,
    driverId: 'd2',
    specifications: {
      fuelType: 'Diesel',
      maxWeight: '10000 kg',
      dimensions: '8m x 3m x 4m'
    }
  }
];

export const mockDrivers: Driver[] = [
  {
    id: 'd1',
    name: 'John Smith',
    email: 'john@logitech.com',
    phone: '+1-555-0101',
    licenseNumber: 'DL123456',
    status: 'available',
    rating: 4.8,
    totalDeliveries: 245,
    currentLocation: { lat: 40.7128, lng: -74.0060 }
  },
  {
    id: 'd2',
    name: 'Sarah Johnson',
    email: 'sarah@logitech.com',
    phone: '+1-555-0102',
    licenseNumber: 'DL789012',
    vehicleId: 'v4',
    status: 'busy',
    rating: 4.9,
    totalDeliveries: 189,
    currentLocation: { lat: 40.7580, lng: -73.9855 }
  },
  {
    id: 'd3',
    name: 'Mike Davis',
    email: 'mike@logitech.com',
    phone: '+1-555-0103',
    licenseNumber: 'DL345678',
    status: 'available',
    rating: 4.7,
    totalDeliveries: 156
  }
];

export const mockShipments: Shipment[] = [
  {
    id: 's1',
    customerId: 'c1',
    vehicleId: 'v1',
    driverId: 'd1',
    pickupLocation: {
      address: '123 Main St, New York, NY',
      lat: 40.7128,
      lng: -74.0060
    },
    destination: {
      address: '456 Broadway, New York, NY',
      lat: 40.7580,
      lng: -73.9855
    },
    status: 'in_transit',
    distance: 5.2,
    estimatedTime: '25 mins',
    totalCost: 13.0,
    createdAt: '2025-01-10T09:00:00Z',
    updatedAt: '2025-01-10T09:30:00Z',
    trackingNumber: 'LT2025001',
    items: [
      {
        id: 'i1',
        name: 'Electronics Package',
        quantity: 1,
        weight: 15,
        description: 'Laptop and accessories'
      }
    ]
  },
  {
    id: 's2',
    customerId: 'c2',
    vehicleId: 'v2',
    driverId: 'd2',
    pickupLocation: {
      address: '789 5th Ave, New York, NY',
      lat: 40.7614,
      lng: -73.9776
    },
    destination: {
      address: '321 Park Ave, New York, NY',
      lat: 40.7505,
      lng: -73.9934
    },
    status: 'pending',
    distance: 3.8,
    estimatedTime: '18 mins',
    totalCost: 6.84,
    createdAt: '2025-01-10T10:15:00Z',
    updatedAt: '2025-01-10T10:15:00Z',
    trackingNumber: 'LT2025002',
    items: [
      {
        id: 'i2',
        name: 'Documents',
        quantity: 1,
        weight: 2,
        description: 'Legal documents'
      }
    ]
  }
];

export const mockUsers: User[] = [
  {
    id: 'admin1',
    email: 'admin@logitech.com',
    role: 'admin',
    name: 'Admin User',
    phone: '+1-555-0001'
  },
  {
    id: 'd1',
    email: 'john@logitech.com',
    role: 'driver',
    name: 'John Smith',
    phone: '+1-555-0101'
  },
  {
    id: 'c1',
    email: 'customer@example.com',
    role: 'customer',
    name: 'Customer One',
    phone: '+1-555-0201'
  }
];