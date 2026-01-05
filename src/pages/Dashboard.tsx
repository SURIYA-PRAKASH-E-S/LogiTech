// Dashboard.tsx - Unified with role-based content
import { Package, Truck, MapPin, TrendingUp, Clock, CheckCircle, AlertCircle, Users, BarChart, Navigation, User, Shield, Loader2, DollarSign, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { vehicleService, shipmentService, bookingService, userService } from "@/lib/firebase-utils";
import { Vehicle, Shipment, Booking, User as UserType } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";
import { useCustomerTracking } from "@/hooks/useCustomerTracking";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState, useCallback } from "react";
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { logger } from '@/lib/logger';

// Simple chart components using CSS (no external library needed)
const SimpleBarChart = ({ data, title }: { data: { label: string; value: number; color?: string }[], title: string }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20 truncate">{item.label}</span>
            <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${item.color || 'bg-primary'}`}
                style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {item.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SimpleLineChart = ({ data, title }: { data: { label: string; value: number }[], title: string }) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = maxValue > 0 ? 100 - (d.value / maxValue) * 100 : 50;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="h-32 relative">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0" y1={y} x2="100" y2={y}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth="0.5"
            />
          ))}
          {/* Data line */}
          <polyline
            points={points}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
          {/* Data points */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = maxValue > 0 ? 100 - (d.value / maxValue) * 100 : 50;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill="hsl(var(--primary))"
              />
            );
          })}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground px-1">
          {data.map((d, i) => (
            <span key={i} className="truncate max-w-[20px]">{d.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

// GPS Status Component
function GpsStatusIndicator() {
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'acquired' | 'timeout' | 'denied' | 'unavailable'>('searching');
  const [lastLocation, setLastLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    // Simulate GPS status check - in real app, get from DriverLocationUpdater
    const checkGPS = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGpsStatus('acquired');
            setLastLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          (err) => {
            if (err.code === 1) setGpsStatus('denied');
            else if (err.code === 2) setGpsStatus('unavailable');
            else setGpsStatus('timeout');
          },
          { timeout: 5000 }
        );
      } else {
        setGpsStatus('unavailable');
      }
    };

    checkGPS();
    const interval = setInterval(checkGPS, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    searching: { icon: <Clock className="w-4 h-4" />, text: 'Searching GPS', variant: 'secondary' as const, color: 'text-amber-600' },
    acquired: { icon: <CheckCircle className="w-4 h-4" />, text: 'GPS Active', variant: 'default' as const, color: 'text-green-600' },
    timeout: { icon: <Clock className="w-4 h-4" />, text: 'GPS Timeout', variant: 'outline' as const, color: 'text-amber-600' },
    denied: { icon: <AlertCircle className="w-4 h-4" />, text: 'Location Denied', variant: 'destructive' as const, color: 'text-red-600' },
    unavailable: { icon: <Navigation className="w-4 h-4" />, text: 'No GPS', variant: 'outline' as const, color: 'text-gray-600' },
  };

  const config = statusConfig[gpsStatus];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant={config.variant} className="gap-1">
          {config.icon}
          <span className={config.color}>{config.text}</span>
        </Badge>
        {lastLocation && (
          <span className="text-xs text-muted-foreground">
            {lastLocation.lat.toFixed(4)}, {lastLocation.lng.toFixed(4)}
          </span>
        )}
      </div>
      {gpsStatus === 'timeout' && (
        <p className="text-xs text-amber-600">Using IP-based location. Move outdoors for better accuracy.</p>
      )}
    </div>
  );
}

// Stats based on user role
const getRoleStats = (role: string, realData: { 
  vehicles?: Vehicle[], 
  shipments?: Shipment[], 
  bookings?: Booking[], 
  drivers?: UserType[] 
}) => {
  switch(role) {
    case 'admin': {
      const totalRevenue = realData.bookings?.reduce((sum, booking) => {
        return booking.paymentStatus === 'paid' ? sum + booking.amount : sum;
      }, 0) || 0;
      const availableVehicles = realData.vehicles?.filter(v => v.available).length || 0;
      const availableDrivers = realData.drivers?.filter(d => {
        const driverBookings = realData.bookings?.filter(b => b.driverId === d.id) || [];
        return !driverBookings.some(b => ['pending', 'in_progress'].includes(b.status));
      }).length || 0;
      
      return [
        {
          title: "Total Shipments",
          value: realData.bookings?.length.toString() || "0",
          change: "+12%",
          icon: Package,
          color: "text-blue-600",
          bgColor: "bg-blue-100"
        },
        {
          title: "Available Vehicles",
          value: availableVehicles.toString(),
          change: `${realData.vehicles?.length ? Math.round((availableVehicles / realData.vehicles.length) * 100) : 0}%`,
          icon: Truck,
          color: "text-green-600",
          bgColor: "bg-green-100"
        },
        {
          title: "Active Drivers",
          value: availableDrivers.toString(),
          change: "+5%",
          icon: Users,
          color: "text-purple-600",
          bgColor: "bg-purple-100"
        },
        {
          title: "Revenue (INR)",
          value: `₹${totalRevenue.toLocaleString('en-IN')}`,
          change: "+18%",
          icon: TrendingUp,
          color: "text-yellow-600",
          bgColor: "bg-yellow-100"
        }
      ];
    }

    case 'driver': {
      const driverBookings = realData.bookings || [];
      const driverShipments = realData.shipments || [];
      const completedDeliveries = driverBookings.filter(b => b.status === 'completed').length;
      const activeDeliveries = driverBookings.filter(b => ['pending', 'in_progress'].includes(b.status)).length;
      const totalEarnings = driverBookings
        .filter(b => b.status === 'completed' && b.paymentStatus === 'paid')
        .reduce((sum, b) => sum + b.amount, 0);
      
      return [
        {
          title: "My Deliveries",
          value: completedDeliveries.toString(),
          change: "+2",
          icon: Package,
          color: "text-blue-600",
          bgColor: "bg-blue-100"
        },
        {
          title: "Active Tasks",
          value: activeDeliveries.toString(),
          change: activeDeliveries > 0 ? "On Duty" : "Available",
          icon: Truck,
          color: activeDeliveries > 0 ? "text-green-600" : "text-gray-600",
          bgColor: activeDeliveries > 0 ? "bg-green-100" : "bg-gray-100"
        },
        {
          title: "Earnings (INR)",
          value: `₹${totalEarnings.toLocaleString('en-IN')}`,
          change: "+₹" + (totalEarnings * 0.1).toLocaleString('en-IN'),
          icon: TrendingUp,
          color: "text-yellow-600",
          bgColor: "bg-yellow-100"
        },
        {
          title: "Completion Rate",
          value: driverBookings.length > 0 
            ? `${Math.round((completedDeliveries / driverBookings.length) * 100)}%`
            : "100%",
          change: completedDeliveries > 0 ? "+5%" : "N/A",
          icon: CheckCircle,
          color: "text-purple-600",
          bgColor: "bg-purple-100"
        }
      ];
    }

    case 'customer': {
      const customerBookings = realData.bookings || [];
      const customerShipments = realData.shipments || [];
      
      // Combine bookings and shipments as the same thing for customers
      const allBookings = [
        ...customerBookings.map(b => ({...b, type: 'booking', source: 'booking'})),
        ...customerShipments.map(s => ({...s, type: 'shipment', source: 'shipment'}))
      ];
      
      // Filter for active bookings/shipments (in_progress for bookings, in_transit or pending for shipments)
      const activeBookings = allBookings.filter(item => {
        if (item.type === 'booking') {
          return (item as Booking).status === 'in_progress';
        } else {
          return ['in_transit', 'pending'].includes((item as Shipment).status);
        }
      });
      
      // Filter out cancelled shipments from total count
      const nonCancelledBookings = allBookings.filter(item => {
        if (item.type === 'shipment') {
          return (item as Shipment).status !== 'cancelled';
        } else {
          return true; // Bookings don't have cancelled status that should be excluded
        }
      });
      
      // Get last booked shipment/booking
      const lastBookedShipment = nonCancelledBookings.length > 0
        ? nonCancelledBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        : null;
      
      // Total count (excluding cancelled shipments)
      const totalCount = nonCancelledBookings.length;
      
      // Total spent (all time, excluding cancelled shipments)
      const totalSpent = nonCancelledBookings
        .filter(item => (item as any).paymentStatus === 'paid')
        .reduce((sum, item) => {
          if (item.type === 'booking') {
            return sum + (item as Booking).amount;
          } else {
            return sum + (item as Shipment).totalCost;
          }
        }, 0);
      
      return [
        {
          title: "My Bookings",
          value: totalCount.toString(),
          change: lastBookedShipment ? "Latest" : "None",
          icon: Package,
          color: "text-green-600",
          bgColor: "bg-green-100"
        },
        {
          title: "Active Bookings",
          value: activeBookings.length.toString(),
          change: activeBookings.length > 0 ? "In Progress" : "None",
          icon: Activity,
          color: activeBookings.length > 0 ? "text-blue-600" : "text-gray-600", 
          bgColor: activeBookings.length > 0 ? "bg-blue-100" : "bg-gray-100"
        },
        {
          title: "Total Spent (INR)",
          value: `₹${totalSpent.toLocaleString('en-IN')}`,
          change: totalSpent > 0 ? "All Time" : "No Spending",
          icon: TrendingUp,
          color: "text-yellow-600",
          bgColor: "bg-yellow-100"
        }
      ];
    }

    default:
      return [];
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'delivered':
      return <Badge className="bg-success text-success-foreground">Delivered</Badge>;
    case 'in_transit':
    case 'in-transit':
      return <Badge className="bg-info text-info-foreground">In Transit</Badge>;
    case 'pending':
      return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
    case 'completed':
      return <Badge className="bg-success text-success-foreground">Completed</Badge>;
    case 'in_progress':
      return <Badge className="bg-info text-info-foreground">In Progress</Badge>;
    case 'cancelled':
      return <Badge className="bg-destructive text-destructive-foreground">Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackedDrivers, trackDriver, stopTrackingDriver, loading: trackingLoading, cleanup } = useCustomerTracking();
  const [realVehicles, setRealVehicles] = useState<Vehicle[]>([]);
  const [realShipments, setRealShipments] = useState<Shipment[]>([]);
  const [realBookings, setRealBookings] = useState<Booking[]>([]);
  const [realDrivers, setRealDrivers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realTimeLoading, setRealTimeLoading] = useState(false);

  const activeDriverBooking = useMemo(() => {
    if (user?.role !== 'driver') return null;
    if (realBookings.length === 0) return null;

    const priority: Record<Booking['status'], number> = {
      pending: 2,
      pending_payment: 3,
      in_progress: 1,
      completed: 4,
      cancelled: 5,
      converted: 6,
    } as const;

    return [...realBookings]
      .sort((a, b) => (priority[a.status] || 10) - (priority[b.status] || 10) || b.updatedAt - a.updatedAt)
      .find((booking) => ['in_progress', 'pending'].includes(booking.status)) ?? realBookings[0];
  }, [realBookings, user]);

  const activeVehicleId = useMemo(() => {
    if (user?.role !== 'driver') return null;
    return activeDriverBooking?.vehicleId || user?.assignedVehicleId || null;
  }, [activeDriverBooking, user]);

  const {
    location: driverLocation,
    loading: driverLocationLoading,
    error: driverLocationError,
  } = useRealtimeLocation(activeVehicleId ?? null);

  // Debounced update function to prevent excessive re-renders
  const debouncedUpdate = useCallback((setter: Function, data: any) => {
    setRealTimeLoading(true);
    setter(data);
    setTimeout(() => setRealTimeLoading(false), 100);
  }, []);

  // Retry mechanism for failed data loads
  const retryLoadData = useCallback(async () => {
    setError(null);
    setLoading(true);
    
    try {
      if (user?.role === 'admin') {
        const [vehicles, shipments, bookings, drivers] = await Promise.all([
          vehicleService.getAllVehicles(),
          shipmentService.getAllShipments(),
          bookingService.getAllBookings(),
          userService.getDrivers()
        ]);
        setRealVehicles(vehicles);
        setRealShipments(shipments);
        setRealBookings(bookings);
        setRealDrivers(drivers);
      } else if (user?.role === 'customer' && user.id) {
        const [shipments, bookings] = await Promise.all([
          shipmentService.getShipmentsByUser(user.id),
          bookingService.getBookingsByUser(user.id)
        ]);
        setRealShipments(shipments);
        setRealBookings(bookings);
      } else if (user?.role === 'driver' && user.id) {
        const [bookings, shipments] = await Promise.all([
          bookingService.getBookingsByDriver(user.id),
          shipmentService.getAllShipments()
        ]);
        setRealBookings(bookings);
        setRealShipments(shipments.filter(s => s.driverId === user.id));
      }
      
      toast({
        title: "Success",
        description: "Dashboard data refreshed successfully",
        variant: "default",
      });
    } catch (error) {
      logger.failed('Retry failed', 'Dashboard data refresh failed');
      setError('Failed to refresh dashboard data');
      toast({
        title: "Error",
        description: "Failed to refresh dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Load real data based on user role
        if (user?.role === 'admin') {
          logger.processing('Loading admin dashboard data');
          const [vehicles, shipments, bookings, drivers] = await Promise.all([
            vehicleService.getAllVehicles(),
            shipmentService.getAllShipments(),
            bookingService.getAllBookings(),
            userService.getDrivers()
          ]);
          // Set all data for admin dashboard
          setRealVehicles(vehicles);
          setRealShipments(shipments);
          setRealBookings(bookings);
          setRealDrivers(drivers);
          logger.loaded('Admin dashboard data');
        } else if (user?.role === 'customer' && user.id) {
          logger.processing('Loading customer dashboard data');
          const [shipments, bookings] = await Promise.all([
            shipmentService.getShipmentsByUser(user.id),
            bookingService.getBookingsByUser(user.id)
          ]);
          // Use bookings database for active shipments and last booked shipment
          setRealShipments(shipments);
          setRealBookings(bookings);
          logger.loaded('Customer dashboard data');
        } else if (user?.role === 'driver' && user.id) {
          logger.processing('Loading driver dashboard data');
          const [bookings, shipments] = await Promise.all([
            bookingService.getBookingsByDriver(user.id),
            shipmentService.getAllShipments() // Filter later by driverId
          ]);
          setRealBookings(bookings);
          setRealShipments(shipments.filter(s => s.driverId === user.id));
          logger.loaded('Driver dashboard data');
        }
      } catch (error) {
        logger.failed('Error loading dashboard data', 'Failed to load dashboard data');
        setError('Failed to load dashboard data');
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, toast, debouncedUpdate]);

  // Add real-time listeners for admin dashboard
  useEffect(() => {
    if (!user || user?.role !== 'admin') return;

    const listeners: (() => void)[] = [];

    // Real-time listener for vehicles
    const vehiclesRef = ref(database, 'vehicles');
    const vehiclesUnsubscribe = onValue(vehiclesRef, (snapshot) => {
      if (snapshot.exists()) {
        logger.info('Real-time vehicles data updated');
        const data = snapshot.val();
        const vehicles = Object.entries(data).map(([id, vehicle]: [string, any]) => ({
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
        debouncedUpdate(setRealVehicles, vehicles);
      }
    });
    listeners.push(vehiclesUnsubscribe);

    // Real-time listener for bookings
    const bookingsRef = ref(database, 'bookings');
    const bookingsUnsubscribe = onValue(bookingsRef, (snapshot) => {
      if (snapshot.exists()) {
        logger.info('Real-time bookings data updated');
        const data = snapshot.val();
        const bookings = Object.entries(data)
          .map(([id, booking]: [string, any]) => ({ id, ...booking }))
          .sort((a, b) => b.createdAt - a.createdAt);
        debouncedUpdate(setRealBookings, bookings);
      }
    });
    listeners.push(bookingsUnsubscribe);

    // Real-time listener for shipments
    const shipmentsRef = ref(database, 'shipments');
    const shipmentsUnsubscribe = onValue(shipmentsRef, (snapshot) => {
      if (snapshot.exists()) {
        logger.info('Real-time shipments data updated');
        const data = snapshot.val();
        const shipments = Object.entries(data)
          .map(([id, shipment]: [string, any]) => ({ id, ...shipment }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        debouncedUpdate(setRealShipments, shipments);
      }
    });
    listeners.push(shipmentsUnsubscribe);

    // Real-time listener for users (to get drivers)
    const usersRef = ref(database, 'users');
    const usersUnsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        logger.info('Real-time drivers data updated');
        const data = snapshot.val();
        const drivers = Object.entries(data)
          .filter(([_, user]: [string, any]) => user.role === 'driver')
          .map(([id, user]: [string, any]) => ({ 
            id, 
            ...user,
            assignedVehicleId: user.assignedVehicleId || null 
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        debouncedUpdate(setRealDrivers, drivers);
      }
    });
    listeners.push(usersUnsubscribe);

    // Cleanup listeners on unmount
    return () => {
      listeners.forEach(unsubscribe => unsubscribe());
    };
  }, [user]);

  // Cleanup tracking subscriptions when component unmounts
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const stats = getRoleStats(user?.role || 'customer', {
    vehicles: realVehicles,
    shipments: realShipments,
    bookings: realBookings,
    drivers: realDrivers
  });

  // Chart data preparation
  const vehicleTypeData = useMemo(() => {
    const typeCount: Record<string, number> = {};
    realVehicles.forEach(vehicle => {
      typeCount[vehicle.type] = (typeCount[vehicle.type] || 0) + 1;
    });
    return Object.entries(typeCount).map(([type, count]) => ({
      label: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
      color: type === 'truck' ? 'bg-blue-500' : type === 'van' ? 'bg-green-500' : 'bg-yellow-500'
    }));
  }, [realVehicles]);

  const bookingTrendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });
    
    return last7Days.map(date => {
      const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = new Date(date.setHours(23, 59, 59, 999)).getTime();
      const dayBookings = realBookings.filter(b => 
        b.createdAt >= dayStart && b.createdAt <= dayEnd
      ).length;
      
      return {
        label: date.toLocaleDateString('en', { weekday: 'short' }),
        value: dayBookings
      };
    });
  }, [realBookings]);

  const revenueData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });
    
    return last7Days.map(date => {
      const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = new Date(date.setHours(23, 59, 59, 999)).getTime();
      const dayRevenue = realBookings
        .filter(b => b.paymentStatus === 'paid' && b.createdAt >= dayStart && b.createdAt <= dayEnd)
        .reduce((sum, b) => sum + b.amount, 0);
      
      return {
        label: date.toLocaleDateString('en', { weekday: 'short' }),
        value: dayRevenue
      };
    });
  }, [realBookings]);

  const recentShipments = useMemo(() => {
    let items: any[] = [];
    
    if (user?.role === 'admin') {
      // For admin, combine both bookings and shipments, show most recent
      items = [...realBookings.map(b => ({...b, type: 'booking'})), 
               ...realShipments.map(s => ({...s, type: 'shipment'}))];
    } else if (user?.role === 'customer') {
      // For customer, show their bookings and shipments
      items = [...realBookings.map(b => ({...b, type: 'booking'})), 
               ...realShipments.map(s => ({...s, type: 'shipment'}))];
    } else if (user?.role === 'driver') {
      // For driver, show their assigned bookings and shipments
      items = [...realBookings.map(b => ({...b, type: 'booking'})), 
               ...realShipments.map(s => ({...s, type: 'shipment'}))];
    }
    
    // Sort by creation time (all timestamps are now numbers)
    items.sort((a, b) => {
      const timeA = a.createdAt || 0;
      const timeB = b.createdAt || 0;
      return timeB - timeA;
    });
    
    return items.slice(0, user?.role === 'admin' ? 3 : 5);
  }, [realBookings, realShipments, user]);

  const displayVehicles = user?.role === 'admin' 
    ? realVehicles.slice(0, 3)
    : [];

  const RoleIcon = user?.role === 'admin' ? Shield : 
                   user?.role === 'driver' ? Navigation : User;

  // Loading State - Responsive Design
  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2 sm:px-0">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Loading your dashboard...</p>
          </div>
        </div>
        <Card className="mx-2 sm:mx-0">
          <CardContent className="p-4 sm:p-8 text-center">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">Loading dashboard data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error State - Responsive Design
  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2 sm:px-0">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Unable to load dashboard</p>
          </div>
        </div>
        <Card className="mx-2 sm:mx-0">
          <CardContent className="p-4 sm:p-8 text-center">
            <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-destructive mx-auto mb-4" />
            <p className="text-sm sm:text-base text-destructive mb-4 break-words">{error}</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={retryLoadData} className="w-full sm:w-auto">Retry</Button>
              <Button variant="outline" onClick={() => window.location.reload()} className="w-full sm:w-auto">Refresh Page</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header with Role Badge - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 break-words">
            Welcome back{user?.name ? `, ${user.name}` : ''}! Here's your {user?.role || 'user'} overview.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          {user?.role === 'admin' && realTimeLoading && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground w-full sm:w-auto justify-start sm:justify-center">
              <Loader2 className="w-3 h-3 animate-spin" />
              Live updating...
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={retryLoadData}
            disabled={loading}
            className="gap-1 w-full sm:w-auto"
          >
            <Loader2 className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant="outline" className="gap-1 w-full sm:w-auto justify-center">
            <RoleIcon className="w-3 h-3" />
            {user?.role?.toUpperCase() || 'USER'}
          </Badge>
          {user?.role === 'driver' && <GpsStatusIndicator />}
        </div>
      </div>

      {/* Stats Grid - Responsive */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium truncate flex-1">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor} flex-shrink-0`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold break-words">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={stat.change.includes('+') ? 'text-green-600' : 'text-amber-600'}>
                  {stat.change}
                </span>
                {user?.role === 'customer' ? '' : ' from last month'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role-Specific Content - Responsive */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Common: Recent Shipments/Bookings */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Package className="w-5 h-5" />
              <span className="truncate">
                {user?.role === 'customer' ? 'My Recent Bookings' : 
                 user?.role === 'driver' ? 'My Deliveries' : 'Recent Shipments'}
              </span>
            </CardTitle>
            <CardDescription className="text-sm">
              {user?.role === 'customer' ? 'Your latest booking activities' : 
               user?.role === 'driver' ? 'Your assigned deliveries' : 'Latest shipment activities'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentShipments.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium truncate">
                      {item.type === 'booking' ? item.shortId : item.trackingNumber}
                    </span>
                    {getStatusBadge(item.status)}
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {item.type === 'booking' ? 'Booking' : 'Shipment'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.type === 'booking' 
                      ? `${item.pickupAddress} → ${item.destinationAddress}`
                      : `${item.pickupLocation.address} → ${item.destination.address}`
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.distance}km • ₹{item.type === 'booking' ? item.amount.toLocaleString('en-IN') : item.totalCost.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex flex-col sm:text-right gap-2 sm:gap-1">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {item.type === 'booking' ? item.estimatedTime : item.estimatedTime}
                  </div>
                  {user?.role === 'customer' && (item.type === 'booking' && item.status === 'in_progress' || item.type === 'shipment' && item.status === 'in_transit') && (
                    <div className="flex flex-col sm:flex-row gap-1">
                      <Button size="sm" variant="ghost" className="text-xs w-full sm:w-auto" asChild>
                        <Link to={item.vehicleId ? `/track/${item.vehicleId}` : `/tracking?reference=${item.type === 'booking' ? item.shortId : item.trackingNumber}`}>
                          Track
                        </Link>
                      </Button>
                      {item.type === 'booking' && item.driverId && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs w-full sm:w-auto"
                            onClick={() => trackDriver(item.driverId)}
                            disabled={trackedDrivers[item.driverId] || trackingLoading}
                          >
                            {trackedDrivers[item.driverId] ? '🟢 Tracking Driver' : 'Track Driver'}
                          </Button>
                          {trackedDrivers[item.driverId] && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-red-600 w-full sm:w-auto"
                              onClick={() => stopTrackingDriver(item.driverId)}
                            >
                              Stop
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tracked Drivers Section for Customers */}
        {user?.role === 'customer' && Object.keys(trackedDrivers).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                📍 Tracked Drivers
              </CardTitle>
              <CardDescription>Real-time driver location tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.values(trackedDrivers).map((driver: any) => (
                  driver.location && (
                    <div key={driver.driverId} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium text-gray-800">Driver: {driver.driverId}</p>
                          <p className="text-sm text-gray-600">Vehicle: {driver.assignedVehicleId || 'N/A'}</p>
                          <p className="text-sm text-gray-600">
                            Status: {driver.online ? '🟢 Online' : '🔴 Offline'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            Location: {driver.location.lat?.toFixed(6)}, {driver.location.lng?.toFixed(6)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Last Update: {new Date(driver.updatedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role-Specific Second Card */}
        {user?.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Fleet Status
              </CardTitle>
              <CardDescription>Current vehicle availability</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayVehicles.map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{vehicle.name}</span>
                      <Badge variant={vehicle.available ? "default" : "secondary"}>
                        {vehicle.available ? "Available" : "In Use"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">
                      {vehicle.type} • {vehicle.capacity} • ₹{vehicle.pricePerKm}/km
                    </p>
                  </div>
                  <div className="text-right">
                    {vehicle.available ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-warning" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {user?.role === 'driver' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                Driver Information
              </CardTitle>
              <CardDescription>Your current status and assignments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <GpsStatusIndicator />
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Assigned Vehicle
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {activeVehicleId ? activeVehicleId : 'No vehicle assigned'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Active deliveries today: {realBookings.filter((b) => b.status === 'in_progress').length}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current Location</p>
                  {driverLocationLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating live location...
                    </div>
                  ) : driverLocation ? (
                    <div>
                      <p className="text-sm font-medium">
                        {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(driverLocation.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {driverLocationError && driverLocationError !== 'Vehicle ID is required'
                        ? driverLocationError
                        : 'Location data unavailable. Ensure tracking is active.'}
                    </p>
                  )}
                </div>
              </div>

              {activeDriverBooking ? (
                <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      <p className="text-sm font-semibold">Active Booking</p>
                    </div>
                    <Badge variant={activeDriverBooking.status === 'in_progress' ? 'default' : 'secondary'}>
                      {activeDriverBooking.status === 'in_progress' ? 'In Transit' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Pickup</p>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-success mt-0.5" />
                        <span>{activeDriverBooking.pickupAddress}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Drop</p>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-destructive mt-0.5" />
                        <span>{activeDriverBooking.destinationAddress}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 text-xs text-muted-foreground">
                    <span>Distance: <strong className="text-foreground">{activeDriverBooking.distance.toFixed(1)} km</strong></span>
                    <span>ETA: <strong className="text-foreground">{activeDriverBooking.estimatedTime}</strong></span>
                    <span>Amount: <strong className="text-foreground">₹{activeDriverBooking.amount.toLocaleString('en-IN')}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No active deliveries right now. New assignments will appear here.
                </div>
              )}

              <div className="pt-3 border-t">
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/my-deliveries">View All Deliveries</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {user?.role === 'customer' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="w-5 h-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks for customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button className="h-20 flex flex-col gap-2" asChild>
                  <Link to="/new-booking">
                    <Truck className="w-5 h-5" />
                    <span className="text-xs">New Shipment</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2" asChild>
                  <Link to="/tracking">
                    <MapPin className="w-5 h-5" />
                    <span className="text-xs">Track Package</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2" asChild>
                  <Link to="/shipments">
                    <Package className="w-5 h-5" />
                    <span className="text-xs">View History</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2" asChild>
                  <Link to="/vehicles">
                    <TrendingUp className="w-5 h-5" />
                    <span className="text-xs">Get Quote</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Section (Admin only) */}
      {user?.role === 'admin' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Vehicle Types
              </CardTitle>
              <CardDescription>Fleet composition by type</CardDescription>
            </CardHeader>
            <CardContent>
              {vehicleTypeData.length > 0 ? (
                <SimpleBarChart data={vehicleTypeData} title="Vehicles by Type" />
              ) : (
                <p className="text-muted-foreground text-center py-8">No vehicle data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Booking Trends
              </CardTitle>
              <CardDescription>Daily booking activity (last 7 days)</CardDescription>
            </CardHeader>
            <CardContent>
              {bookingTrendData.some(d => d.value > 0) ? (
                <SimpleBarChart data={bookingTrendData.map(d => ({...d, color: 'bg-blue-500'}))} title="Bookings per Day" />
              ) : (
                <p className="text-muted-foreground text-center py-8">No booking data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Revenue Overview
              </CardTitle>
              <CardDescription>Daily revenue trends (last 7 days)</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueData.some(d => d.value > 0) ? (
                <SimpleBarChart data={revenueData.map(d => ({...d, color: 'bg-green-500'}))} title="Revenue per Day (INR)" />
              ) : (
                <p className="text-muted-foreground text-center py-8">No revenue data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}