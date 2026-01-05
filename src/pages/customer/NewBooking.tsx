import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Vehicle } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Package, Bike, Container, CheckCircle, ArrowRight, Loader2, User, Search, Filter } from "lucide-react";
import { vehicleService, userService } from "@/lib/firebase-utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/lib/logger';

export default function NewBooking() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [vehicleList, driverList] = await Promise.all([
          vehicleService.getAllVehicles(),
          userService.getDrivers(),
        ]);
        
        // Customers can only see available vehicles that are assigned to a driver
        const availableVehicles = vehicleList.filter((v) => v.available && v.driverId);
        setVehicles(availableVehicles);
        setDrivers(driverList);
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
    loadData();
  }, [toast]);

  // Filter vehicles based on search and type
  useEffect(() => {
    const filtered = vehicles.filter((vehicle) => {
      const matchesSearch = vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vehicle.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || vehicle.type === typeFilter;
      return matchesSearch && matchesType;
    });
    setFilteredVehicles(filtered);
  }, [vehicles, searchTerm, typeFilter]);

  const getVehicleIcon = (type: Vehicle['type']) => {
    switch (type) {
      case 'truck': return Truck;
      case 'van': return Package;
      case 'motorcycle': return Bike;
      case 'cargo': return Container;
      default: return Truck;
    }
  };

  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : 'Unknown Driver';
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!vehicle.driverId) {
      toast({
        title: "Cannot Select",
        description: "This vehicle has no driver assigned",
        variant: "destructive",
      });
      return;
    }

    // Store selected vehicle and navigate to map page
    localStorage.setItem('selectedVehicle', JSON.stringify(vehicle));
    navigate('/map');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">New Booking</h1>
          <p className="text-muted-foreground">Select a vehicle to start your booking</p>
        </div>
        <Button variant="outline" onClick={() => {
          setTypeFilter("all");
          setSearchTerm("");
        }}>
          <Filter className="w-4 h-4 mr-2" />
          Reset Filters
        </Button>
      </div>

      {/* Filters */}
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
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((vehicle) => {
            const Icon = getVehicleIcon(vehicle.type);
            return (
              <Card key={vehicle.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {vehicle.imageUrl ? (
                        <img
                          src={vehicle.imageUrl}
                          alt={vehicle.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">{vehicle.name}</CardTitle>
                        <CardDescription className="capitalize">{vehicle.type}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Available
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Capacity:</span>
                      <span className="font-medium">{vehicle.capacity}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Price per km:</span>
                      <span className="font-medium">₹{vehicle.pricePerKm.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fuel Type:</span>
                      <span className="font-medium">{vehicle.specifications.fuelType}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Max Weight:</span>
                      <span className="font-medium">{vehicle.specifications.maxWeight}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Driver:</span>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="font-medium">{getDriverName(vehicle.driverId || '')}</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleSelectVehicle(vehicle)}
                    className="w-full gap-2"
                  >
                    Select Vehicle
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Next: Select pickup and drop locations
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredVehicles.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No vehicles available</h3>
            <p className="text-muted-foreground">
              All vehicles are currently in use or not assigned to drivers
            </p>
            <Button 
              className="mt-4 bg-gradient-primary hover:bg-primary-dark"
              onClick={() => navigate('/vehicles')}
            >
              Browse All Vehicles
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}