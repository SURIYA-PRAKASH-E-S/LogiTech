import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Filter, Search, MapPin, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { vehicleService } from "@/lib/firebase-utils";
import { Vehicle } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from '@/lib/logger';

export default function Vehicles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        setLoading(true);
        let vehicleList: Vehicle[] = [];
        
        if (user?.role === 'admin') {
          // Admin sees all vehicles
          vehicleList = await vehicleService.getAllVehicles();
        } else if (user?.role === 'driver') {
          // Driver sees only assigned vehicles
          vehicleList = await vehicleService.getVehiclesByDriver(user.id);
        } else {
          // Customer sees all vehicles with drivers (both available and in use)
          vehicleList = await vehicleService.getAllVehicles();
          vehicleList = vehicleList.filter(v => v.driverId);
        }
        
        setVehicles(vehicleList);
      } catch (error) {
        logger.error('Error loading vehicles', error.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadVehicles();
  }, [user]);

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch = (vehicle.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (vehicle.type?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || vehicle.type === typeFilter;
    const matchesAvailability = 
      availabilityFilter === "all" || 
      (availabilityFilter === "available" && vehicle.available) ||
      (availabilityFilter === "unavailable" && !vehicle.available);

    return matchesSearch && matchesType && matchesAvailability;
  });

  const handleSelectVehicle = (vehicle: Vehicle) => {
    if (user?.role === 'customer') {
      // Customers can view all vehicles but can only select available ones
      if (!vehicle.driverId) {
        return;
      }
      if (vehicle.available) {
        // Store selected vehicle in localStorage for booking
        localStorage.setItem('selectedVehicle', JSON.stringify(vehicle));
        navigate('/map');
      } else {
        // Navigate to vehicle details for in-use vehicles
        navigate(`/vehicle/${vehicle.id}`);
      }
    } else if (user?.role === 'driver') {
      navigate(`/vehicle/${vehicle.id}`);
    } else {
      navigate(`/vehicle/${vehicle.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getVehicleIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'truck':
        return '🚛';
      case 'van':
        return '🚐';
      case 'motorcycle':
        return '🏍️';
      case 'cargo':
        return '🚚';
      default:
        return '🚛';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {user?.role === 'driver' ? 'My Assigned Vehicle' : 'All Vehicles'}
          </h1>
          <p className="text-muted-foreground">
            {user?.role === 'driver' 
              ? 'View your assigned vehicle details' 
              : user?.role === 'customer'
              ? 'Browse all vehicles - available vehicles can be selected for booking'
              : 'Manage your vehicle fleet'}
          </p>
        </div>
        {user?.role !== 'driver' && (
          <Button variant="outline" onClick={() => {
            // Reset filters
            setTypeFilter("all");
            setAvailabilityFilter("all");
            setSearchTerm("");
          }}>
            <Filter className="w-4 h-4 mr-2" />
            Reset Filters
          </Button>
        )}
      </div>

      {/* Filters - Only show for non-drivers */}
      {user?.role !== 'driver' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vehicles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  <SelectItem value="cargo">Cargo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="unavailable">In Use</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicle Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredVehicles.map((vehicle) => (
          <Card key={vehicle.id} className={`hover:shadow-lg transition-shadow ${!vehicle.available ? 'opacity-70' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {vehicle.imageUrl ? (
                    <img
                      src={vehicle.imageUrl}
                      alt={vehicle.name || 'Vehicle'}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <span className="text-2xl">{getVehicleIcon(vehicle.type)}</span>
                  )}
                  <div>
                    <CardTitle className="text-lg">{vehicle.name || 'Unnamed Vehicle'}</CardTitle>
                    <CardDescription className="capitalize">{vehicle.type || 'unknown'} Vehicle</CardDescription>
                  </div>
                </div>
                <Badge variant={vehicle.available ? "default" : "secondary"}>
                  {vehicle.available ? "Available" : "In Use"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Capacity</span>
                  <span className="text-sm font-medium">{vehicle.capacity || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Price per km</span>
                  <span className="text-sm font-medium">₹{(vehicle.pricePerKm || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Fuel Type</span>
                  <span className="text-sm font-medium">{vehicle.specifications?.fuelType || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Max Weight</span>
                  <span className="text-sm font-medium">{vehicle.specifications?.maxWeight || 'N/A'}</span>
                </div>
                {!vehicle.driverId && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Driver</span>
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      Not Assigned
                    </Badge>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button 
                  className="w-full bg-gradient-primary hover:bg-primary-dark"
                  disabled={!vehicle.driverId}
                  onClick={() => handleSelectVehicle(vehicle)}
                >
                  {vehicle.available && vehicle.driverId ? (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      {user?.role === 'driver' ? 'View Vehicle' : 'Select Vehicle'}
                    </>
                  ) : !vehicle.driverId ? (
                    "No Driver Assigned"
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      {user?.role === 'driver' ? 'View Vehicle' : 'View Details'}
                    </>
                  )}
                </Button>
              </div>

              {vehicle.driverId && user?.role === 'admin' && (
                <p className="text-xs text-muted-foreground text-center">
                  Assigned to driver {vehicle.driverId}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVehicles.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {user?.role === 'driver' ? 'No Vehicle Assigned' : 'No vehicles found'}
            </h3>
            <p className="text-muted-foreground">
              {user?.role === 'driver' 
                ? 'Contact admin to get a vehicle assigned' 
                : 'Try adjusting your search criteria or filters'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}