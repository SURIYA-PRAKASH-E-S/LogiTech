import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, Shield, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { userService } from "@/lib/firebase-utils";
import { logger } from '@/lib/logger';

export default function Profile() {
  const { user, refreshUser, updateEmail, checkAndCompleteEmailChange, canChangeCredentials } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    licenseNumber: user?.licenseNumber || "",
  });

  // Check for pending email verification on component mount
  useEffect(() => {
    if (user) {
      checkAndCompleteEmailChange();
    }
  }, [user]);

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      logger.info('User data updated successfully');
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        licenseNumber: user.licenseNumber || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      if (!user?.id) {
        toast({
          title: "Error",
          description: "User not found.",
          variant: "destructive",
        });
        return;
      }

      // Prepare update data - only include fields that should be updated
      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
        updatedAt: Date.now(),
      };

      // Only include licenseNumber for drivers
      if (user.role === 'driver') {
        updateData.licenseNumber = formData.licenseNumber;
      }

      // Update user data in database
      await userService.updateUser(user.id, updateData);

      // Refresh user data to get latest from database
      await refreshUser();

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    } catch (error) {
      logger.error('Error updating profile', error.message || 'Unknown error');
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };


  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'driver': return 'secondary';
      case 'customer': return 'outline';
      default: return 'outline';
    }
  };

  if (!user) return null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">Manage your account information</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Overview Card */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="w-24 h-24">
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle>{user.name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
            <Badge variant={getRoleBadgeVariant(user.role)} className="mt-2 w-fit mx-auto">
              <Shield className="w-3 h-3 mr-1" />
              {user.role.toUpperCase()}
            </Badge>
          </CardHeader>
        </Card>

        {/* Profile Details Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </div>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
              ) : (
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button onClick={handleSave}>Save Changes</Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isEditing}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* License Number - Only for drivers */}
              {user.role === 'driver' && (
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10"
                      placeholder="Enter your license number"
                    />
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={user.role.toUpperCase()} disabled />
              </div>

              <div className="space-y-2">
                <Label>User ID</Label>
                <Input value={user.id} disabled className="font-mono text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
