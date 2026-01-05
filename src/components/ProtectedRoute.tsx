import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'driver' | 'customer')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, requiresPasswordChange } = useAuth();

  useEffect(() => {
    if (user) {
      logger.info('Protected route access', `User: ${user.email}, Role: ${user.role}`);
    }
  }, [user]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    logger.warning('Unauthorized access attempt', 'Redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Redirect to change password if required and not already on change password page
  if (requiresPasswordChange && window.location.pathname !== '/change-password') {
    logger.warning('Password change required', `User ${user.email} must change password`);
    return <Navigate to="/change-password" replace />;
  }

  // Check role-based access
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    logger.warning('Access denied', `User role ${user.role} not allowed for this route`);
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}