import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Moon, Globe, Lock, Truck, MapPin, Users, Settings as SettingsIcon, Eye, EyeOff } from "lucide-react";
import { logger } from '@/lib/logger';

export default function Settings() {
  const { user, changePassword, canChangeCredentials } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    darkMode: false,
    language: "en",
    distanceUnit: "km",
    autoAssignDrivers: true,
    locationTracking: true,
    realTimeUpdates: true,
    customerNotifications: true,
    driverAvailability: true,
    adminAnalytics: true,
    bulkOperations: false,
  });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Apply dark mode changes
  useEffect(() => {
    if (preferences.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [preferences.darkMode]);

  const handleSave = () => {
    // Save preferences to localStorage or backend
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
    
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const handlePasswordChange = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill in all password fields",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Validation Error", 
        description: "New password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (currentPassword === newPassword) {
      toast({
        title: "Validation Error",
        description: "New password must be different from current password",
        variant: "destructive"
      });
      return;
    }

    setIsChangingPassword(true);
    logger.processing('Password change attempt in settings');

    const success = await changePassword(currentPassword, newPassword);
    
    if (success) {
      toast({
        title: "Password Changed Successfully",
        description: "Your password has been updated.",
      });
      
      logger.completed('Password change process completed in settings');
      
      // Reset form and close dialog
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordDialog(false);
    } else {
      toast({
        title: "Password Change Failed",
        description: "Current password is incorrect or new password is too weak. Please try again.",
        variant: "destructive"
      });
      
      logger.failed('Password change form submission failed in settings', 'Validation or authentication error');
    }
    
    setIsChangingPassword(false);
  };

  // Load preferences on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('userPreferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        logger.error('Error loading preferences', error.message || 'Unknown error');
      }
    }
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Notifications Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure how you receive alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, emailNotifications: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive browser notifications</p>
              </div>
              <Switch
                id="push-notifications"
                checked={preferences.pushNotifications}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, pushNotifications: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Enable dark theme</p>
              </div>
              <Switch
                id="dark-mode"
                checked={preferences.darkMode}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, darkMode: checked })
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select 
                value={preferences.language}
                onValueChange={(value) => setPreferences({ ...preferences, language: value })}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Regional Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Regional Settings
            </CardTitle>
            <CardDescription>Configure location-based preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="distance-unit">Distance Unit</Label>
              <Select 
                value={preferences.distanceUnit}
                onValueChange={(value) => setPreferences({ ...preferences, distanceUnit: value })}
              >
                <SelectTrigger id="distance-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="km">Kilometers (km)</SelectItem>
                  <SelectItem value="mi">Miles (mi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

      {/* Role-specific settings */}
      {user?.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Admin Settings
            </CardTitle>
            <CardDescription>Manage administrative preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-assign">Auto-assign Drivers</Label>
                <p className="text-sm text-muted-foreground">Automatically assign available drivers</p>
              </div>
              <Switch
                id="auto-assign"
                checked={preferences.autoAssignDrivers}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, autoAssignDrivers: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="admin-analytics">Advanced Analytics</Label>
                <p className="text-sm text-muted-foreground">Enable detailed analytics dashboard</p>
              </div>
              <Switch
                id="admin-analytics"
                checked={preferences.adminAnalytics}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, adminAnalytics: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="bulk-operations">Bulk Operations</Label>
                <p className="text-sm text-muted-foreground">Enable bulk shipment processing</p>
              </div>
              <Switch
                id="bulk-operations"
                checked={preferences.bulkOperations}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, bulkOperations: checked })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {user?.role === 'driver' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Driver Settings
            </CardTitle>
            <CardDescription>Configure driving preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="location-tracking">Location Tracking</Label>
                <p className="text-sm text-muted-foreground">Share real-time location with customers</p>
              </div>
              <Switch
                id="location-tracking"
                checked={preferences.locationTracking}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, locationTracking: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="driver-availability">Auto-availability</Label>
                <p className="text-sm text-muted-foreground">Automatically set availability when online</p>
              </div>
              <Switch
                id="driver-availability"
                checked={preferences.driverAvailability}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, driverAvailability: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="real-time-updates">Real-time Updates</Label>
                <p className="text-sm text-muted-foreground">Instant notifications for new assignments</p>
              </div>
              <Switch
                id="real-time-updates"
                checked={preferences.realTimeUpdates}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, realTimeUpdates: checked })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {user?.role === 'customer' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Customer Settings
            </CardTitle>
            <CardDescription>Configure delivery preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="customer-notifications">Delivery Updates</Label>
                <p className="text-sm text-muted-foreground">Receive notifications about delivery status</p>
              </div>
              <Switch
                id="customer-notifications"
                checked={preferences.customerNotifications}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, customerNotifications: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="real-time-tracking">Real-time Tracking</Label>
                <p className="text-sm text-muted-foreground">Show live tracking for active deliveries</p>
              </div>
              <Switch
                id="real-time-tracking"
                checked={preferences.realTimeUpdates}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, realTimeUpdates: checked })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

        {/* Security Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canChangeCredentials() ? (
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={() => setShowPasswordDialog(true)}
              >
                Change Password
              </Button>
            ) : (
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto"
                  disabled
                >
                  Change Password
                </Button>
                <p className="text-sm text-muted-foreground">
                  {user?.role === 'driver' 
                    ? "Only drivers created by admin can change their password."
                    : "Password change is not available for your account type."
                  }
                </p>
              </div>
            )}
            <Button variant="outline" className="w-full sm:w-auto ml-0 sm:ml-2" disabled>
              Enable Two-Factor Authentication
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Password Change Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your account password for better security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isChangingPassword}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    disabled={isChangingPassword}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isChangingPassword}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    disabled={isChangingPassword}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isChangingPassword}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isChangingPassword}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowPasswordDialog(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={isChangingPassword}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handlePasswordChange}
                  disabled={isChangingPassword}
                  className="flex-1"
                >
                  {isChangingPassword ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
