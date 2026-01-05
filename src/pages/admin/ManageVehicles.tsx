import { useState, useEffect } from "react";
import { vehicleService, userService } from "@/lib/firebase-utils";
import { Vehicle, User } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Truck, CheckCircle, XCircle, Loader2, User as UserIcon, Search } from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from '@/lib/logger';
import { Skeleton } from "@/components/ui/skeleton";

export default function ManageVehicles() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    model: "",
    type: "truck" as Vehicle['type'],
    capacity: "",
    pricePerKm: 0,
    available: true,
    fuelType: "",
    maxWeight: "",
    dimensions: "",
    imageUrl: "",
    driverId: "unassigned",
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      loadVehicles();
      loadDrivers();
    }
  }, [user]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const vehicleList = await vehicleService.getAllVehicles();
      setVehicles(vehicleList);
    } catch (error) {
      logger.error('Error loading vehicles', error.message || 'Unknown error');
      toast({
        title: "Error",
        description: "Failed to load vehicles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDrivers = async () => {
    try {
      const driverList = await userService.getDrivers();
      setDrivers(driverList);
    } catch (error) {
      logger.error('Error loading drivers', error.message || 'Unknown error');
      toast({
        title: "Error",
        description: "Failed to load drivers",
        variant: "destructive",
      });
    }
  };

  const handleAddVehicle = () => {
    setEditingVehicle(null);
    setFormData({
      name: "",
      model: "",
      type: "truck",
      capacity: "",
      pricePerKm: 0,
      available: true,
      fuelType: "",
      maxWeight: "",
      dimensions: "",
      imageUrl: "",
      driverId: "unassigned",
    });
    setIsDialogOpen(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name || "",
      model: vehicle.model || "",
      type: vehicle.type || "truck",
      capacity: vehicle.capacity || "",
      pricePerKm: vehicle.pricePerKm || 0,
      available: vehicle.available ?? true,
      fuelType: vehicle.specifications?.fuelType || "",
      maxWeight: vehicle.specifications?.maxWeight || "",
      dimensions: vehicle.specifications?.dimensions || "",
      imageUrl: vehicle.imageUrl || "",
      driverId: vehicle.driverId || "unassigned",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    
    try {
      await vehicleService.deleteVehicle(vehicleId);
      setVehicles(vehicles.filter(v => v.id !== vehicleId));
      toast({
        title: "Vehicle Deleted",
        description: "Vehicle has been removed successfully.",
      });
    } catch (error) {
      logger.error('Error deleting vehicle', error.message || 'Unknown error');
      toast({
        title: "Error",
        description: "Failed to delete vehicle",
        variant: "destructive",
      });
    }
  };

  const handleSaveVehicle = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Vehicle name is required",
        variant: "destructive",
      });
      return;
    }
  
    if (!formData.capacity.trim()) {
      toast({
        title: "Validation Error",
        description: "Capacity is required",
        variant: "destructive",
      });
      return;
    }
  
    if (!formData.fuelType.trim()) {
      toast({
        title: "Validation Error",
        description: "Fuel type is required",
        variant: "destructive",
      });
      return;
    }
  
    if (!formData.maxWeight.trim()) {
      toast({
        title: "Validation Error",
        description: "Max weight is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const vehicleData: Partial<Vehicle> & { id?: string } = {
        name: formData.name.trim(),
        model: formData.model.trim(),
        type: formData.type,
        capacity: formData.capacity.trim(),
        pricePerKm: parseFloat(formData.pricePerKm.toString()) || 0,
        available: formData.available,
        imageUrl: formData.imageUrl.trim(), // Ensure URL is included
        driverId: formData.driverId === "unassigned" ? null : formData.driverId,
        specifications: {
          fuelType: formData.fuelType.trim(),
          maxWeight: formData.maxWeight.trim(),
          dimensions: formData.dimensions.trim(),
        },
      };

      // Log the data being saved
      logger.info('Saving vehicle data', `Vehicle: ${formData.name} ${formData.model}`);

      let vehicleId: string;
      
      if (editingVehicle) {
        vehicleData.id = editingVehicle.id;
        vehicleId = await vehicleService.saveVehicle(vehicleData);
        
        // Update driver assignment
        if (formData.driverId === "unassigned") {
          // Unassign if no driver selected
          await vehicleService.assignDriver(vehicleId, null);
        } else if (vehicleData.driverId) {
          await vehicleService.assignDriver(vehicleId, vehicleData.driverId);
        }
        
        toast({
          title: "Vehicle Updated",
          description: "Vehicle information has been updated successfully.",
        });
      } else {
        vehicleId = await vehicleService.saveVehicle(vehicleData);
        if (vehicleData.driverId) {
          await vehicleService.assignDriver(vehicleId, vehicleData.driverId);
        }
        toast({
          title: "Vehicle Added",
          description: "New vehicle has been added successfully.",
        });
      }
      
      setIsDialogOpen(false);
      loadVehicles();
    } catch (error: any) {
      logger.error('Error saving vehicle', error.message || 'Unknown error');
      toast({
        title: "Error",
        description: error.message || "Failed to save vehicle",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle image upload completion
  const handleImageUploadComplete = (url: string) => {
    logger.info('Image upload completed', 'Vehicle image uploaded successfully');
    setFormData(prev => ({ ...prev, imageUrl: url }));
  };

  const filteredVehicles = vehicles.filter(vehicle =>
    (vehicle.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (vehicle.model?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (vehicle.type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (vehicle.specifications?.fuelType?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return "Unassigned";
    const driver = drivers.find(d => d.id === driverId);
    return driver ? (driver.name || 'Unknown Driver') : "Unassigned";
  };

  if (user && user.role !== 'admin') {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Manage Vehicles</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Add, edit, and manage vehicle fleet</p>
        </div>
        <Button onClick={handleAddVehicle} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>All Vehicles</CardTitle>
              <CardDescription>Total: {vehicles.length} vehicles</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search vehicles..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
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
                        <TableHead className="min-w-[150px]">Vehicle</TableHead>
                        <TableHead className="min-w-[100px]">Type</TableHead>
                        <TableHead className="min-w-[120px]">Capacity</TableHead>
                        <TableHead className="min-w-[120px]">Price/km</TableHead>
                        <TableHead className="min-w-[120px] hidden md:table-cell">Fuel Type</TableHead>
                        <TableHead className="min-w-[120px] hidden sm:table-cell">Driver</TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="min-w-[100px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVehicles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No vehicles found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredVehicles.map((vehicle) => (
                          <TableRow key={vehicle.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {vehicle.imageUrl ? (
                                  <img 
                                    src={vehicle.imageUrl} 
                                    alt={vehicle.name || 'Vehicle'}
                                    className="w-12 h-12 rounded-md object-cover border"
                                    onError={(e) => {
                                      // Handle broken images
                                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9IiNFQkVCRUIiLz48cGF0aCBkPSJNMTIgMTZIMzZWMzJIMTJWMTZaIiBmaWxsPSIjQ0VDQ0NDIi8+PHBhdGggZD0iTTE2IDIwSDMyVjI4SDE2VjIwWiIgZmlsbD0iIzk3OTc5NyIvPjxwYXRoIGQ9Ik0yMCAyNEgyOFYyNkgyMFYyNFoiIGZpbGw9IiM2OTY5NjkiLz48L3N2Zz4=';
                                    }}
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                                    <Truck className="w-6 h-6 text-muted-foreground" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium">{vehicle.name || 'Unnamed Vehicle'}</div>
                                  <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                    {vehicle.model || 'No model'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize whitespace-nowrap">
                                {vehicle.type || 'unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell>{vehicle.capacity || 'N/A'}</TableCell>
                            <TableCell>₹{(vehicle.pricePerKm || 0).toFixed(2)}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              {vehicle.specifications?.fuelType || "-"}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <div className="flex items-center gap-2">
                                <UserIcon className="w-3 h-3 text-muted-foreground" />
                                <span className="truncate max-w-[120px]">
                                  {getDriverName(vehicle.driverId)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {vehicle.available ? (
                                <Badge variant="default" className="gap-1 whitespace-nowrap">
                                  <CheckCircle className="w-3 h-3" />
                                  Available
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1 whitespace-nowrap">
                                  <XCircle className="w-3 h-3" />
                                  In Use
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 sm:gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEditVehicle(vehicle)}
                                  className="h-8 w-8 p-0 sm:h-9 sm:w-9 sm:p-2"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeleteVehicle(vehicle.id)}
                                  className="h-8 w-8 p-0 sm:h-9 sm:w-9 sm:p-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
            <DialogDescription>
              {editingVehicle ? 'Update vehicle information' : 'Enter vehicle details'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Vehicle Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Express Truck"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="2024 Model"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select 
                value={formData.type || "truck"}
                onValueChange={(value: Vehicle['type']) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  <SelectItem value="cargo">Cargo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity *</Label>
              <Input
                id="capacity"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder="5 tons"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price per Km (₹) *</Label>
              <Input
                id="price"
                type="number"
                step="0.1"
                min="0"
                value={formData.pricePerKm}
                onChange={(e) => setFormData({ ...formData, pricePerKm: parseFloat(e.target.value) || 0 })}
                placeholder="2.5"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuelType">Fuel Type *</Label>
              <Input
                id="fuelType"
                value={formData.fuelType}
                onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                placeholder="Diesel"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxWeight">Max Weight *</Label>
              <Input
                id="maxWeight"
                value={formData.maxWeight}
                onChange={(e) => setFormData({ ...formData, maxWeight: e.target.value })}
                placeholder="5000 kg"
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="dimensions">Dimensions</Label>
              <Input
                id="dimensions"
                value={formData.dimensions}
                onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                placeholder="6m x 2.5m x 3m"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="driver">Assign Driver</Label>
              <Select
                value={formData.driverId || "unassigned"}
                onValueChange={(value) => setFormData({ ...formData, driverId: value })}
              >
                <SelectTrigger id="driver">
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {drivers.map((driver) => (
                    <SelectItem 
                      key={driver.id} 
                      value={driver.id}
                      disabled={driver.assignedVehicleId && driver.assignedVehicleId !== editingVehicle?.id}
                    >
                      {driver.name || 'Unknown Driver'} 
                      {driver.assignedVehicleId && driver.assignedVehicleId !== editingVehicle?.id && 
                        ` (Already assigned)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.driverId !== "unassigned" && drivers.find(d => d.id === formData.driverId && d.assignedVehicleId && d.assignedVehicleId !== editingVehicle?.id) && (
                <p className="text-xs text-amber-600 mt-1">
                  This driver is already assigned to another vehicle. Assigning will override previous assignment.
                </p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="image">Vehicle Image</Label>
              <ImageUploader
                currentImageUrl={formData.imageUrl}
                onUploadComplete={handleImageUploadComplete}
              />
              {formData.imageUrl && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Current image: {formData.imageUrl.substring(0, 40)}...
                </p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={formData.available ?? true}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="available" className="!m-0">
                  Available for booking
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)} 
              className="w-full sm:w-auto"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveVehicle} 
              className="w-full sm:w-auto"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {editingVehicle ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                editingVehicle ? 'Update Vehicle' : 'Add Vehicle'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}