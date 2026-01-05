import { useState } from "react";
import { 
  LayoutDashboard, 
  Truck, 
  Package, 
  MapPin, 
  Users, 
  Settings,
  LogOut
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/lib/logger';

// Role-based navigation items
const getNavigationItems = (role: string) => {
  const commonItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Profile", url: "/profile", icon: Users },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  if (role === 'admin') {
    return [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Admin Panel", url: "/admin", icon: Settings },
      { title: "Vehicles", url: "/vehicles", icon: Truck },
      { title: "Shipments", url: "/shipments", icon: Package },
      { title: "Tracking", url: "/tracking", icon: MapPin },
      { title: "Drivers", url: "/drivers", icon: Users },
      { title: "Profile", url: "/profile", icon: Users },
      { title: "Settings", url: "/settings", icon: Settings },
    ];
  }

  if (role === 'driver') {
    return [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "My Deliveries", url: "/my-deliveries", icon: Package },
      { title: "Tracking", url: "/tracking", icon: MapPin },
      { title: "Profile", url: "/profile", icon: Users },
      { title: "Settings", url: "/settings", icon: Settings },
    ];
  }

  // customer role
  return [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "New Booking", url: "/new-booking", icon: Truck },
    { title: "My Shipments", url: "/shipments", icon: Package },
    { title: "Tracking", url: "/tracking", icon: MapPin },
    { title: "Profile", url: "/profile", icon: Users },
    { title: "Settings", url: "/settings", icon: Settings },
  ];
};

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const collapsed = state === "collapsed";
  
  const navigationItems = user ? getNavigationItems(user.role) : [];

  const handleLogout = async () => {
    try {
      logger.processing('User initiated logout');
      
      // Show immediate feedback
      toast({
        title: "Signing Out",
        description: "Please wait while we sign you out...",
      });
      
      // Perform logout
      await logout();
      
      // Show success message
      toast({
        title: "Logged Out Successfully",
        description: "You have been logged out safely.",
      });
      
      // Navigate to login
      navigate('/login');
      
      logger.completed('Logout process completed');
    } catch (error) {
      logger.failed('Logout failed', error instanceof Error ? error.message : 'Unknown error');
      
      toast({
        title: "Logout Error",
        description: "There was an issue signing you out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-lg font-bold text-primary">LogiTech</h2>
              <p className="text-xs text-muted-foreground">Logistics Management</p>
            </div>
          )}
        </div>
        {!collapsed && <Separator className="mt-4" />}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-muted"
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && user && (
          <div className="mb-4">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
        )}
        <Button 
          variant="outline" 
          onClick={handleLogout}
          className="w-full justify-start"
          size={collapsed ? "icon" : "default"}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
        <SidebarTrigger className="mt-2 w-full" />
      </SidebarFooter>
    </Sidebar>
  );
}