import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ProtectedRouteWithPasswordChange from "@/components/ProtectedRouteWithPasswordChange";
import { AppLayout } from "@/components/layout/AppLayout";
import { DriverLocationUpdater } from "@/components/DriverLocationUpdater";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Vehicles from "./pages/Vehicles";
import VehicleDetail from "./pages/VehicleDetail";
import TrackVehicle from "./pages/TrackVehicle";
import MapPage from "./pages/MapPage";
import Shipments from "./pages/Shipments";
import Tracking from "./pages/Tracking";
import Drivers from "./pages/Drivers";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateDriverAccount from "./pages/admin/CreateDriverAccount";
import MyDeliveries from "./pages/driver/MyDeliveries";
import NewBooking from "./pages/customer/NewBooking";
import PaymentSuccess from "./pages/PaymentSuccess";
import NotFound from "./pages/NotFound";
import TestLocationPage from "./pages/TestLocationPage";
import ChangePassword from "./pages/ChangePassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <DriverLocationUpdater />
        <BrowserRouter>
          <Routes>


            {/* test location routes */}
            <Route path="/test-location" element={<TestLocationPage />} />
            
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/change-password" element={
              <ProtectedRouteWithPasswordChange requirePasswordChange={true}>
                <ChangePassword />
              </ProtectedRouteWithPasswordChange>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/vehicles" element={
              <ProtectedRoute>
                <AppLayout>
                  <Vehicles />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/vehicle/:id" element={
              <ProtectedRoute>
                <AppLayout>
                  <VehicleDetail />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/track/:id" element={
              <ProtectedRoute>
                <AppLayout>
                  <TrackVehicle />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/map" element={
              <ProtectedRoute>
                <AppLayout>
                  <MapPage />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/shipments" element={
              <ProtectedRoute>
                <AppLayout>
                  <Shipments />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/tracking" element={
              <ProtectedRoute>
                <AppLayout>
                  <Tracking />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/drivers" element={
              <ProtectedRoute>
                <AppLayout>
                  <Drivers />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <AppLayout>
                  <Profile />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <AppLayout>
                  <Settings />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppLayout>
                  <AdminDashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/create-driver" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppLayout>
                  <CreateDriverAccount />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/my-deliveries" element={
              <ProtectedRoute>
                <AppLayout>
                  <MyDeliveries />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/new-booking" element={
              <ProtectedRoute>
                <AppLayout>
                  <NewBooking />
                </AppLayout>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
