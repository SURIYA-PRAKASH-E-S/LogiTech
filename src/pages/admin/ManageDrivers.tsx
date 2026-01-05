import { useEffect, useState } from "react";
import { User, Vehicle } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, Truck, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { vehicleService, userService } from "@/lib/firebase-utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { logger } from '@/lib/logger';

export default function ManageDrivers() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      logger.processing('Loading drivers and vehicles data');
      const [driverList, vehicleList] = await Promise.all([
        userService.getDrivers(),
        vehicleService.getAllVehicles(),
      ]);
      setDrivers(driverList);
      setVehicles(vehicleList);
      logger.loaded('Drivers and vehicles data loaded');
    } catch (error: any) {
      logger.failed('Error loading drivers', error.message || 'Failed to load drivers or vehicles');
      toast({
        title: "Error",
        description: error.message || "Failed to load drivers or vehicles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    }
  }, [user]);

  const handleAssignVehicle = async (driverId: string, vehicleId: string) => {
    try {
      if (vehicleId === 'unassigned') {
        // Find vehicle currently assigned to this driver
        const currentVehicle = vehicles.find(v => v.driverId === driverId);
        if (currentVehicle) {
          // Unassign driver from current vehicle
          await vehicleService.assignDriver(currentVehicle.id, null);
          logger.assigned('Driver', 'unassigned from vehicle');
          toast({
            title: "Driver unassigned",
            description: "Driver has been removed from the vehicle",
          });
        } else {
          toast({
            title: "No assignment",
            description: "This driver is not assigned to any vehicle",
            variant: "default",
          });
        }
      } else {
        // Assign driver to new vehicle
        await vehicleService.assignDriver(vehicleId, driverId);
        logger.assigned('Driver', 'vehicle');
        toast({
          title: "Driver assigned",
          description: "Driver has been assigned to the vehicle",
        });
      }
      
      // Refresh data after a short delay to allow Firebase to update
      setTimeout(() => {
        loadData();
      }, 500);
    } catch (error: any) {
      logger.failed('Error assigning vehicle', error.message || 'Failed to update assignment');
      toast({
        title: "Error",
        description: error.message || "Failed to update assignment",
        variant: "destructive",
      });
    }
  };

  const getDriverVehicleName = (driver: User) => {
    if (!driver.assignedVehicleId) return "Not assigned";
    const vehicle = vehicles.find((v) => v.id === driver.assignedVehicleId);
    return vehicle ? vehicle.name : "Not assigned";
  };

  const getAssignedDriver = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle || !vehicle.driverId) return "Unassigned";
    
    const driver = drivers.find(d => d.id === vehicle.driverId);
    return driver ? driver.name : "Unassigned";
  };

  const getAvailableVehicles = (driver: User) => {
    return vehicles.filter(vehicle => 
      !vehicle.driverId || vehicle.driverId === driver.id
    );
  };

  const handleRemoveDriver = async (driverId: string, driverName: string) => {
    try {
      // Check if driver is assigned to any vehicle
      const assignedVehicle = vehicles.find(v => v.driverId === driverId);
      if (assignedVehicle) {
        // Unassign driver from vehicle first
        await vehicleService.assignDriver(assignedVehicle.id, null);
        logger.assigned('Driver', 'unassigned from vehicle before removal');
      }

      // Remove driver from database
      await userService.deleteUser(driverId);
      logger.deleted(`Driver ${driverName}`);
      
      toast({
        title: "Driver Removed",
        description: `Driver ${driverName} has been removed from the system`,
      });
      
      // Refresh data
      setTimeout(() => {
        loadData();
      }, 500);
    } catch (error: any) {
      logger.failed('Error removing driver', error.message || 'Failed to remove driver');
      toast({
        title: "Error",
        description: error.message || "Failed to remove driver",
        variant: "destructive",
      });
    }
  };

  if (user && user.role !== 'admin') {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Manage Drivers</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Assign drivers to vehicles and view their details</p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadData} 
          disabled={loading} 
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Drivers</CardTitle>
          <CardDescription>Total: {drivers.length} drivers</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <div className="inline-block min-w-full align-middle">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Name</TableHead>
                        <TableHead className="min-w-[180px]">Contact</TableHead>
                        <TableHead className="min-w-[100px]">Role</TableHead>
                        <TableHead className="min-w-[250px]">Assigned Vehicle</TableHead>
                        <TableHead className="min-w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drivers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No drivers found
                          </TableCell>
                        </TableRow>
                      ) : (
                        drivers.map((driver) => (
                          <TableRow key={driver.id}>
                            <TableCell className="font-medium">{driver.name}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{driver.email}</span>
                                </div>
                                {driver.phone && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Phone className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{driver.phone}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className="whitespace-nowrap">Driver</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <Truck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  <Select
                                    value={driver.assignedVehicleId || "unassigned"}
                                    onValueChange={(val) => handleAssignVehicle(driver.id, val)}
                                  >
                                    <SelectTrigger className="w-full sm:w-[220px]">
                                      <SelectValue placeholder="Assign vehicle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">Unassigned</SelectItem>
                                      {vehicles.map((vehicle) => {
                                        const isAssignedToOtherDriver = vehicle.driverId && vehicle.driverId !== driver.id;
                                        const assignedDriverName = isAssignedToOtherDriver ? getAssignedDriver(vehicle.id) : "";
                                        
                                        return (
                                          <SelectItem 
                                            key={vehicle.id} 
                                            value={vehicle.id}
                                            disabled={isAssignedToOtherDriver}
                                          >
                                            {vehicle.name}
                                            {isAssignedToOtherDriver && ` (Assigned to ${assignedDriverName})`}
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="text-xs text-muted-foreground sm:mt-1">
                                  {getDriverVehicleName(driver)}
                                  {driver.assignedVehicleId && (
                                    <div className="text-[10px] mt-0.5">
                                      {getAssignedDriver(driver.assignedVehicleId) !== "Unassigned" && 
                                       getAssignedDriver(driver.assignedVehicleId) !== driver.name && 
                                       "⚠️ Vehicle may be assigned to another driver"}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    className="gap-1"
                                    disabled={loading}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Remove</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2">
                                      <AlertTriangle className="w-5 h-5 text-destructive" />
                                      Remove Driver
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove <strong>{driver.name}</strong> from the system?
                                      <br />
                                      <br />
                                      This action will:
                                      <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>Remove the driver from the database</li>
                                        <li>Unassign them from any vehicle</li>
                                        <li>Delete all their booking history</li>
                                      </ul>
                                      <br />
                                      <strong className="text-destructive">This action cannot be undone.</strong>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleRemoveDriver(driver.id, driver.name)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Remove Driver
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}