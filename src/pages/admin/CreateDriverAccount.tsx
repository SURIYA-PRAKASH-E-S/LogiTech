import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createDriverAccount, generateDriverCredentials } from "@/lib/admin-utils";
import { Copy, UserPlus, Eye, EyeOff } from "lucide-react";
import { logger } from '@/lib/logger';

interface CreateDriverAccountProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateDriverAccount({ onSuccess, onCancel }: CreateDriverAccountProps) {
  const [driverData, setDriverData] = useState({
    name: '',
    phone: '',
    licenseNumber: '',
    assignedVehicleId: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<any>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setDriverData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateDriver = async () => {
    if (!driverData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Driver name is required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    logger.processing('Creating new driver account');

    const result = await createDriverAccount({
      name: driverData.name,
      phone: driverData.phone,
      licenseNumber: driverData.licenseNumber,
      assignedVehicleId: driverData.assignedVehicleId
    });

    if (result.success) {
      setCreatedCredentials({
        email: result.email,
        password: result.tempPassword || '',
        name: driverData.name
      });
      
      // Show credentials immediately after creation
      setShowCredentials(true);
      
      toast({
        title: "Driver Account Created",
        description: `Account created for ${driverData.name}`,
      });
      
      logger.success('Driver account creation completed');
      
      // Don't call onSuccess immediately - let user see credentials first
      // The parent component can handle closing after user acknowledges credentials
      
      // Reset form
      setDriverData({
        name: '',
        phone: '',
        licenseNumber: '',
        assignedVehicleId: ''
      });
      
    } else {
      toast({
        title: "Creation Failed",
        description: result.error || "Failed to create driver account",
        variant: "destructive"
      });
      
      logger.failed('Driver account creation failed', result.error || 'Unknown error');
    }

    setIsLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Credentials copied to clipboard",
    });
  };

  // Only allow admin access
  if (!user || user.role !== 'admin') {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Create Driver Account
          </CardTitle>
          <CardDescription>
            Create a new driver account with temporary credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Driver Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter driver's full name"
                  value={driverData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={driverData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  placeholder="Enter license number"
                  value={driverData.licenseNumber}
                  onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="assignedVehicleId">Assigned Vehicle ID</Label>
                <Input
                  id="assignedVehicleId"
                  placeholder="Enter vehicle ID (optional)"
                  value={driverData.assignedVehicleId}
                  onChange={(e) => handleInputChange('assignedVehicleId', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Account Information</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Internal email and temporary password will be generated automatically
                </p>
                <div className="space-y-2 text-sm">
                  <div><strong>Email Format:</strong> driver_[timestamp]@app.local</div>
                  <div><strong>Password Format:</strong> TempPass[6digits]</div>
                  <div><strong>Password Change:</strong> Required on first login</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleCreateDriver}
              disabled={isLoading || !driverData.name.trim()}
              className="flex-1"
            >
              {isLoading ? "Creating Account..." : "Create Driver Account"}
            </Button>
            {onCancel && (
              <Button 
                variant="outline" 
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {createdCredentials && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Driver Credentials Created</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCredentials(!showCredentials)}
              >
                {showCredentials ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </CardTitle>
            <CardDescription>
              Share these credentials with the driver securely
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showCredentials ? (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p className="font-mono text-sm">{createdCredentials.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm flex-1">{createdCredentials.email}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(createdCredentials.email)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Temporary Password</Label>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm flex-1">{createdCredentials.password}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(createdCredentials.password)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">Important Instructions</h4>
                  <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                    <li>Share these credentials with the driver</li>
                    <li>Driver will login with the temporary password</li>
                    <li>On first login, driver MUST change their password</li>
                    <li>After password change, normal dashboard access is granted</li>
                    <li>Driver will only see their own data and assigned vehicles</li>
                  </ol>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      if (onSuccess) {
                        onSuccess();
                      }
                    }}
                    className="flex-1"
                  >
                    I've Saved the Credentials
                  </Button>
                  {onCancel && (
                    <Button 
                      variant="outline" 
                      onClick={onCancel}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <EyeOff className="w-8 h-8 mx-auto mb-2" />
                <p>Click the eye icon to reveal credentials</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
