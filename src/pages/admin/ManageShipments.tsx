import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Package, Search, User, MapPin, Calendar, DollarSign, Truck, Eye, Filter, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { bookingService, userService, vehicleService } from "@/lib/firebase-utils";
import { Booking, User as UserType, Vehicle } from "@/types";
import { logger } from '@/lib/logger';

interface ShipmentWithDetails extends Booking {
  customer?: UserType;
  driver?: UserType;
  vehicle?: Vehicle;
}

export default function ManageShipments() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [shipments, setShipments] = useState<ShipmentWithDetails[]>([]);
  const [customers, setCustomers] = useState<UserType[]>([]);
  const [drivers, setDrivers] = useState<UserType[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedShipment, setSelectedShipment] = useState<ShipmentWithDetails | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bookingsData, customersData, driversData, vehiclesData] = await Promise.all([
        bookingService.getAllBookings(),
        userService.getCustomers(),
        userService.getDrivers(),
        vehicleService.getAllVehicles()
      ]);

      // Enhance bookings with customer, driver, and vehicle details
      const enhancedShipments = bookingsData.map(booking => {
        const customer = customersData.find(c => c.id === booking.userId);
        const driver = driversData.find(d => d.id === booking.driverId);
        const vehicle = vehiclesData.find(v => v.id === booking.vehicleId);

        return {
          ...booking,
          customer,
          driver,
          vehicle
        } as ShipmentWithDetails;
      });

      setShipments(enhancedShipments);
      setCustomers(customersData);
      setDrivers(driversData);
      setVehicles(vehiclesData);
    } catch (error) {
      logger.error('Error loading shipments', error.message || 'Unknown error');
      toast({
        title: "Error",
        description: "Failed to load shipments data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return <Badge className="bg-yellow-100 text-yellow-800">Payment Pending</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
      case 'in_progress':
        return <Badge className="bg-green-100 text-green-800">In Transit</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'converted':
        return <Badge className="bg-purple-100 text-purple-800">Converted</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch = 
      shipment.shortId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.vehicle?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || shipment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading shipments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Shipments Management</h2>
          <p className="text-muted-foreground">View and manage all shipments with customer details</p>
        </div>
        <Button onClick={loadData} variant="outline">
          <Loader2 className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{shipments.length}</div>
            <p className="text-sm text-muted-foreground">Total Shipments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {shipments.filter(s => s.status === 'in_progress').length}
            </div>
            <p className="text-sm text-muted-foreground">In Transit</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {shipments.filter(s => s.status === 'pending').length}
            </div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">
              {shipments.filter(s => s.status === 'completed').length}
            </div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, customer, driver, or vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending_payment">Payment Pending</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Transit</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Shipments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Shipments ({filteredShipments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.map((shipment) => (
                  <TableRow key={shipment.id}>
                    <TableCell>
                      <div className="font-mono text-sm">{shipment.shortId}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{shipment.customer?.name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{shipment.customer?.email}</div>
                        <div className="text-xs text-muted-foreground">{shipment.customer?.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{shipment.driver?.name || 'Unassigned'}</div>
                        {shipment.driver?.phone && (
                          <div className="text-xs text-muted-foreground">{shipment.driver.phone}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{shipment.vehicle?.name || 'N/A'}</div>
                        {shipment.vehicle && (
                          <div className="text-xs text-muted-foreground">{shipment.vehicle.model}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 max-w-48">
                        <div className="text-xs truncate">{shipment.pickupAddress}</div>
                        <div className="text-xs text-muted-foreground">↓</div>
                        <div className="text-xs truncate">{shipment.destinationAddress}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                    <TableCell>{getPaymentStatusBadge(shipment.paymentStatus)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        <span className="font-medium">{shipment.amount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(shipment.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedShipment(shipment);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredShipments.length === 0 && (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No shipments found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or filters
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipment Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shipment Details</DialogTitle>
            <DialogDescription>
              Complete information about shipment {selectedShipment?.shortId}
            </DialogDescription>
          </DialogHeader>
          
          {selectedShipment && (
            <div className="grid gap-6 py-4">
              {/* Customer Details */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Customer Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-sm">Name</Label>
                    <p className="font-medium">{selectedShipment.customer?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm">Email</Label>
                    <p className="font-medium">{selectedShipment.customer?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm">Phone</Label>
                    <p className="font-medium">{selectedShipment.customer?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm">User ID</Label>
                    <p className="font-mono text-xs">{selectedShipment.customer?.id || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Driver & Vehicle Details */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Driver & Vehicle</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-sm">Driver Name</Label>
                    <p className="font-medium">{selectedShipment.driver?.name || 'Unassigned'}</p>
                  </div>
                  <div>
                    <Label className="text-sm">Driver Phone</Label>
                    <p className="font-medium">{selectedShipment.driver?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm">Vehicle</Label>
                    <p className="font-medium">{selectedShipment.vehicle?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm">Vehicle Model</Label>
                    <p className="font-medium">{selectedShipment.vehicle?.model || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Route Details */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Route Information</h4>
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-sm">Pickup Address</Label>
                    <p className="font-medium">{selectedShipment.pickupAddress}</p>
                  </div>
                  <div>
                    <Label className="text-sm">Destination Address</Label>
                    <p className="font-medium">{selectedShipment.destinationAddress}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Distance</Label>
                      <p className="font-medium">{selectedShipment.distance} km</p>
                    </div>
                    <div>
                      <Label className="text-sm">Estimated Time</Label>
                      <p className="font-medium">{selectedShipment.estimatedTime}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Payment */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Status & Payment</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-sm">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedShipment.status)}</div>
                  </div>
                  <div>
                    <Label className="text-sm">Payment Status</Label>
                    <div className="mt-1">{getPaymentStatusBadge(selectedShipment.paymentStatus)}</div>
                  </div>
                  <div>
                    <Label className="text-sm">Amount</Label>
                    <p className="font-medium">${selectedShipment.amount}</p>
                  </div>
                  <div>
                    <Label className="text-sm">Created</Label>
                    <p className="font-medium text-sm">{formatDate(selectedShipment.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
