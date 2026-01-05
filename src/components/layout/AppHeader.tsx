import { Bell, CheckCircle2, Loader2, MapPin, Search, Truck, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useDriverNotifications } from "@/hooks/useDriverNotifications";
import { useNavigate } from "react-router-dom";

export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isDriver = user?.role === "driver";
  const { notifications, unreadCount, loading } = useDriverNotifications();

  const handleNotificationClick = (notificationId: string, vehicleId: string, status: string) => {
    if (status === "completed") {
      navigate("/my-deliveries");
      return;
    }
    navigate(`/track/${vehicleId}`);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4 px-4">
        <SidebarTrigger className="md:hidden" />
        
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search shipments, drivers..." 
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDriver ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {loading ? (
                      <Loader2 className="absolute -top-1 -right-1 w-4 h-4 text-muted-foreground animate-spin" />
                    ) : unreadCount > 0 ? (
                      <Badge className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 flex items-center justify-center px-1 text-[0.65rem] bg-destructive">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Badge>
                    ) : null}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-0">
                  <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-semibold text-sm">Driver Notifications</p>
                      <p className="text-xs text-muted-foreground">Updates from dispatch & customers</p>
                    </div>
                    {unreadCount > 0 && (
                      <Badge variant="outline" className="text-[0.65rem]">
                        {unreadCount} active
                      </Badge>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 && !loading && (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-success" />
                        You're all caught up.
                      </div>
                    )}
                    {notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={`flex items-start gap-3 px-4 py-3 text-sm ${
                          notification.status === "completed" ? "opacity-70" : ""
                        }`}
                        onSelect={(event) => {
                          event.preventDefault();
                          handleNotificationClick(notification.id, notification.vehicleId, notification.status);
                        }}
                      >
                        <div className="mt-1">
                          {notification.status === "completed" ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <Truck className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium leading-none">{notification.title}</p>
                            <Badge
                              variant={notification.type === "user" ? "secondary" : "outline"}
                              className="text-[0.65rem] uppercase"
                            >
                              {notification.type === "user" ? "Customer" : "Admin"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {notification.description}
                          </p>
                          <p className="text-[0.65rem] text-muted-foreground">
                            From {notification.fromName}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="px-4 py-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate("/my-deliveries")}
                    >
                      View My Deliveries
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user?.name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile Settings</DropdownMenuItem>
                <DropdownMenuItem>Preferences</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}