import { useEffect, useMemo, useState } from "react";
import { Package, Filter, Search, Loader2, MapPin, Truck, Calendar, Clock, User, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bookingService, vehicleService, userService } from "@/lib/firebase-utils";
import { Booking, Vehicle, User as UserType } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { RazorpayPayment } from "@/components/RazorpayPayment";
import { Link } from "react-router-dom";
import { logger } from '@/lib/logger';

export default function Shipments() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const vehicleList = await vehicleService.getAllVehicles();
      setVehicles(vehicleList);

      let data: Booking[] = [];
      if (user.role === 'admin') {
        data = await bookingService.getAllBookings();
        const driverList = await userService.getDrivers();
        setDrivers(driverList);
      } else if (user.role === 'driver') {
        data = await bookingService.getBookingsByDriver(user.id);
      } else {
        data = await bookingService.getBookingsByUser(user.id);
      }
      setBookings(data);
    } catch (error) {
      logger.error('Error loading bookings', error.message || 'Unknown error');
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const vehicleName = vehicles.find((v) => v.id === booking.vehicleId)?.name || "";
      const matchesSearch = 
        booking.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.pickupAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.destinationAddress?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, vehicles, searchTerm, statusFilter]);

  const getStatusBadge = (status: Booking['status']) => {
    const variants: Record<Booking['status'], JSX.Element> = {
      pending_payment: <Badge className="bg-warning text-warning-foreground">Payment Pending</Badge>,
      pending: <Badge variant="secondary">Pending</Badge>,
      in_progress: <Badge className="bg-info text-info-foreground">In Progress</Badge>,
      completed: <Badge className="bg-success text-success-foreground">Completed</Badge>,
      cancelled: <Badge className="bg-destructive text-destructive-foreground">Cancelled</Badge>,
      converted: <Badge className="bg-primary text-primary-foreground">Converted</Badge>,
    };
    return variants[status];
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

  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : driverId;
  };

  const renderActions = (booking: Booking) => {
    if (user?.role === 'customer') {
      if (booking.paymentStatus !== 'paid') {
        return (
          <RazorpayPayment
            amount={booking.amount}
            bookingId={booking.id}
            onSuccess={() => loadData()}
            onError={() => loadData()}
          />
        );
      }

      const isCompleted = booking.status === 'completed';
      const isTrackable = ['in_progress', 'pending'].includes(booking.status);

      if (isCompleted) {
        return (
          <Button variant="secondary" size="sm" disabled className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            Delivery Completed
          </Button>
        );
      }

      if (!isTrackable) {
        return (
          <Button variant="outline" size="sm" disabled className="text-muted-foreground">
            Tracking Unavailable
          </Button>
        );
      }

      return (
        <div className="space-y-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/track/${booking.vehicleId}`}>
              <Truck className="w-4 h-4 mr-2" />
              Track Vehicle
            </Link>
          </Button>
        </div>
      );
    }

    if (user?.role === 'driver') {
      return (
        <div className="space-y-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/track/${booking.vehicleId}`}>
              <Truck className="w-4 h-4 mr-2" />
              Track
            </Link>
          </Button>
        </div>
      );
    }

    // Admin
    const isCompleted = booking.status === 'completed';
    
    if (isCompleted) {
      return (
        <Button variant="secondary" size="sm" disabled className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-success" />
          Delivered
        </Button>
      );
    }

    return (
      <div className="space-y-2">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/track/${booking.vehicleId}`}>
            <Truck className="w-4 h-4 mr-2" />
            Track
          </Link>
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Shipments</h1>
          <p className="text-muted-foreground">Manage and track all shipments</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by booking id, vehicle, or address"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending_payment">Payment Pending</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadData}>
              <Loader2 className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipment List</CardTitle>
          <CardDescription>{filteredBookings.length} shipment(s) found</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Vehicle</TableHead>
                    {user?.role === 'admin' && <TableHead>Driver</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => {
                    const vehicle = vehicles.find((v) => v.id === booking.vehicleId);
                    return (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono text-xs">{booking.id.substring(0, 8)}...</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-success" />
                              <span className="text-xs truncate max-w-[120px]">
                                {booking.pickupAddress?.substring(0, 30)}...
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-destructive" />
                              <span className="text-xs truncate max-w-[120px]">
                                {booking.destinationAddress?.substring(0, 30)}...
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">{vehicle?.name || booking.vehicleId}</div>
                              <div className="text-xs text-muted-foreground">
                                {booking.distance} km • {booking.estimatedTime}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        {user?.role === 'admin' && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">
                                {getDriverName(booking.driverId)}
                              </span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>
                        <TableCell>
                          <Badge variant={booking.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                            {booking.paymentStatus || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">₹{booking.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(booking.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-[100px]">
                            {renderActions(booking)}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {filteredBookings.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No shipments found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters or create a new booking
            </p>
            {user?.role === 'customer' && (
              <Button className="bg-gradient-primary hover:bg-primary-dark" asChild>
                <Link to="/new-booking">Create New Booking</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}