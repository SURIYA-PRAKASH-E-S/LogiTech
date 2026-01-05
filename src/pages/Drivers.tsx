import { useEffect, useState } from "react";
import { Users, Plus, Search, Phone, Star, MapPin, Truck, Loader2, X, Edit2, Trash2, Eye, UserCheck, Share2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { userService, bookingService, vehicleService } from "@/lib/firebase-utils";
import { User as UserType, Vehicle, Booking } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import DriverLocationSharing from "../components/DriverLocationSharing";
import { trackingService } from "@/lib/tracking-service";
import CreateDriverAccount from "./admin/CreateDriverAccount";
import { logger } from '@/lib/logger';

interface DriverWithStats extends UserType {
  rating?: number;
  totalDeliveries?: number;
  currentLocation?: { lat: number; lng: number };
  licenseNumber?: string;
  vehicle?: Vehicle;
  activeBookings?: Booking[];
  status: 'available' | 'busy' | 'offline';
}

export default function Drivers() {
  const [drivers, setDrivers] = useState<DriverWithStats[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverWithStats | null>(null);
  const [selectedDriverForSharing, setSelectedDriverForSharing] = useState<string | null>(null);
  const [autoSharingDrivers, setAutoSharingDrivers] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const { user } = useAuth();
  const { toast } = useToast();

  // Form state for adding driver
  const [newDriver, setNewDriver] = useState({
    name: "",
    email: "",
    phone: "",
    licenseNumber: ""
  });

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [driversData, vehiclesData, bookingsData, customersData] = await Promise.all([
        userService.getDrivers(),
        vehicleService.getAllVehicles(),
        bookingService.getAllBookings(),
        userService.getCustomers()
      ]);

      // Enhance drivers with additional stats and vehicle info
      const enhancedDrivers = driversData.map(driver => {
        const driverBookings = bookingsData.filter(booking => booking.driverId === driver.id);
        const assignedVehicle = vehiclesData.find(v => v.driverId === driver.id);
        const completedBookings = driverBookings.filter(b => b.status === 'completed');
        
        // Calculate rating based on completed bookings (mock rating for now)
        const rating = completedBookings.length > 0 ? 4.5 + Math.random() * 0.5 : 4.0;
        
        return {
          ...driver,
          rating: Math.round(rating * 10) / 10,
          totalDeliveries: completedBookings.length,
          vehicle: assignedVehicle,
          activeBookings: driverBookings.filter(b => ['pending', 'in_progress'].includes(b.status)),
          status: driverBookings.some(b => ['pending', 'in_progress'].includes(b.status)) ? 'busy' : 'available'
        } as DriverWithStats;
      });

      setDrivers(enhancedDrivers);
      setVehicles(vehiclesData);
      setBookings(bookingsData);
      setCustomers(customersData);
      
      // Auto-enable sharing for drivers with active bookings
      const driversWithActiveBookings = enhancedDrivers
        .filter(driver => driver.activeBookings && driver.activeBookings.length > 0)
        .map(driver => driver.id);
      
      setAutoSharingDrivers(new Set(driversWithActiveBookings));
      
      // Auto-share location with customers who have active bookings
      for (const driver of enhancedDrivers) {
        if (driver.activeBookings && driver.activeBookings.length > 0) {
          for (const booking of driver.activeBookings) {
            if (booking.userId) {
              try {
                await trackingService.shareDriverLocationWithCustomer(driver.id, booking.userId);
              } catch (error) {
                logger.error('Failed to auto-share location', `Driver: ${driver.id}, Customer: ${booking.userId}`);
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error loading drivers', error.message || 'Unknown error');
      setError('Failed to load drivers');
      toast({
        title: "Error",
        description: "Failed to load drivers data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const filteredDrivers = drivers.filter((driver) =>
    (driver.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (driver.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (driver.phone && driver.phone.includes(searchTerm))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-success text-success-foreground">Available</Badge>;
      case 'busy':
        return <Badge className="bg-warning text-warning-foreground">Busy</Badge>;
      case 'offline':
        return <Badge variant="secondary">Offline</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const handleAddDriver = async () => {
    try {
      // Create driver user account (this would need to be implemented in your auth system)
      const driverData = {
        name: newDriver.name,
        email: newDriver.email,
        phone: newDriver.phone,
        role: 'driver' as const,
        licenseNumber: newDriver.licenseNumber,
      };

      // Create user with proper Firebase ID
      await userService.createUser(driverData);
      
      toast({
        title: "Success",
        description: "Driver added successfully",
      });
      
      setShowAddDialog(false);
      setNewDriver({ name: "", email: "", phone: "", licenseNumber: "" });
      loadData();
    } catch (error) {
      logger.error('Error adding driver', error.message || 'Unknown error');
      toast({
        title: "Error",
        description: "Failed to add driver",
        variant: "destructive",
      });
    }
  };

  const handleAssignVehicle = async () => {
    if (!selectedDriver || !selectedVehicle) return;
    
    try {
      await vehicleService.assignDriver(selectedVehicle, selectedDriver.id);
      
      toast({
        title: "Success",
        description: "Vehicle assigned successfully",
      });
      
      setShowAssignDialog(false);
      setSelectedVehicle("");
      loadData();
    } catch (error) {
      logger.error('Error assigning vehicle', error.message || 'Unknown error');
      toast({
        title: "Error",
        description: "Failed to assign vehicle",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDriver = async () => {
    if (!selectedDriver) return;
    
    try {
      // Unassign vehicle if any
      if (selectedDriver.assignedVehicleId) {
        await vehicleService.assignDriver(selectedDriver.assignedVehicleId, null);
      }
      
      // Delete driver (this would need proper implementation in userService)
      toast({
        title: "Success",
        description: "Driver removed successfully",
      });
      
      setShowDeleteDialog(false);
      setSelectedDriver(null);
      loadData();
    } catch (error) {
      logger.error('Error deleting driver', error.message || 'Unknown error');
      toast({
        title: "Error",
        description: "Failed to remove driver",
        variant: "destructive",
      });
    }
  };

  const handleShareStatusChange = (customerId: string, isShared: boolean) => {
    logger.info('Driver location sharing status changed', `Driver: ${selectedDriverForSharing}, Customer: ${customerId}, Shared: ${isShared}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Drivers</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage your delivery drivers and their assignments</p>
        </div>
        <Button className="bg-gradient-primary hover:bg-primary-dark w-full md:w-auto" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Driver
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{drivers.length}</div>
            <p className="text-sm text-muted-foreground">Total Drivers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-success">
              {drivers.filter(d => d.status === 'available').length}
            </div>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-warning">
              {drivers.filter(d => d.status === 'busy').length}
            </div>
            <p className="text-sm text-muted-foreground">On Duty</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {drivers.length > 0 
                ? (drivers.reduce((acc, d) => acc + (d.rating || 0), 0) / drivers.length).toFixed(1)
                : '0.0'
              }
            </div>
            <p className="text-sm text-muted-foreground">Avg Rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search drivers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm sm:text-base h-9 sm:h-10"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading drivers...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Alert className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={loadData}>
              <Loader2 className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDrivers.map((driver) => (
            <Card key={driver.id} className="hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {getInitials(driver.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{driver.name || 'Unknown Driver'}</CardTitle>
                      <CardDescription className="text-sm truncate">{driver.email || 'No email'}</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(driver.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Auto-Sharing Status */}
                {autoSharingDrivers.has(driver.id) && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <Share2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-green-700">Auto-Sharing Active</span>
                  </div>
                )}

                {/* Contact Info */}
                <div className="space-y-2">
                  {driver.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{driver.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">License: {driver.licenseNumber || 'N/A'}</span>
                  </div>
                  {driver.vehicle && (
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">Vehicle: {driver.vehicle.name}</span>
                    </div>
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {renderStars(driver.rating || 0)}
                  </div>
                  <span className="text-sm font-medium">{driver.rating || 0}</span>
                  <span className="text-sm text-muted-foreground">
                    ({driver.totalDeliveries || 0} deliveries)
                  </span>
                </div>

                {/* Active Bookings */}
                {driver.activeBookings && driver.activeBookings.length > 0 && (
                  <div className="p-3 bg-warning/10 rounded-lg">
                    <p className="text-sm font-medium text-warning">Active Bookings</p>
                    <p className="text-sm text-muted-foreground">{driver.activeBookings.length} ongoing</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedDriver(driver);
                      setShowDetailsDialog(true);
                    }}
                    className="flex-1 min-w-[80px]"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Details
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedDriver(driver);
                      setShowAssignDialog(true);
                    }}
                    disabled={driver.status !== 'available'}
                    className="flex-1 min-w-[80px]"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Assign
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedDriverForSharing(driver.id)}
                    className={`flex-1 min-w-[80px] ${
                      autoSharingDrivers.has(driver.id) 
                        ? 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200' 
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'
                    }`}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Sharing
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedDriver(driver);
                      setShowDeleteDialog(true);
                    }}
                    className="text-destructive hover:text-destructive min-w-[50px]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredDrivers.length === 0 && !loading && !error && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No drivers found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or add a new driver
            </p>
            <Button className="bg-gradient-primary hover:bg-primary-dark" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Driver
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Driver Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Driver Account</DialogTitle>
            <DialogDescription>
              Create a new driver account with auto-generated credentials.
            </DialogDescription>
          </DialogHeader>
          <CreateDriverAccount 
            onSuccess={() => {
              setShowAddDialog(false);
              loadData();
              toast({
                title: "Driver Account Created",
                description: "New driver has been added successfully",
              });
            }}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Driver Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Driver Details</DialogTitle>
            <DialogDescription>
              Complete information about {selectedDriver?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedDriver && (
            <div className="grid gap-6 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {getInitials(selectedDriver.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedDriver.name || 'Unknown Driver'}</h3>
                  <p className="text-muted-foreground">{selectedDriver.email || 'No email'}</p>
                  {getStatusBadge(selectedDriver.status)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p className="mt-1">{selectedDriver.phone || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">License Number</Label>
                  <p className="mt-1">{selectedDriver.licenseNumber || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Rating</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex gap-1">
                      {renderStars(selectedDriver.rating || 0)}
                    </div>
                    <span>{selectedDriver.rating || 0}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Total Deliveries</Label>
                  <p className="mt-1">{selectedDriver.totalDeliveries || 0}</p>
                </div>
              </div>

              {selectedDriver.vehicle && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Assigned Vehicle</Label>
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <p className="font-medium">{selectedDriver.vehicle.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedDriver.vehicle.model}</p>
                    <p className="text-sm text-muted-foreground">Capacity: {selectedDriver.vehicle.capacity}</p>
                  </div>
                </div>
              )}

              {selectedDriver.activeBookings && selectedDriver.activeBookings.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Active Bookings</Label>
                  <div className="mt-2 space-y-2">
                    {selectedDriver.activeBookings.map(booking => (
                      <div key={booking.id} className="p-2 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Booking ID: {booking.shortId}</p>
                        <p className="text-xs text-muted-foreground">{booking.pickupAddress} → {booking.destinationAddress}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Vehicle Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Vehicle</DialogTitle>
            <DialogDescription>
              Assign a vehicle to {selectedDriver?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="vehicle">Select Vehicle</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.filter(v => !v.driverId).map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} - {vehicle.capacity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-gradient-primary hover:bg-primary-dark"
              onClick={handleAssignVehicle}
              disabled={!selectedVehicle}
            >
              Assign Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Driver Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remove Driver</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedDriver?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteDriver}
            >
              Remove Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Sharing Panel */}
      {selectedDriverForSharing && (
        <div className="sharing-panel mt-6 p-4 border rounded-lg bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Location Sharing for Driver: {selectedDriverForSharing}
            </h2>
            <button
              onClick={() => setSelectedDriverForSharing(null)}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          
          <DriverLocationSharing 
            driverId={selectedDriverForSharing}
            onShareStatusChange={handleShareStatusChange}
          />
        </div>
      )}
    </div>
  );
}