/**
 * Protected Route Component
 * Middleware to protect routes that require authentication
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: ('super_admin' | 'admin' | 'staff')[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [hasShownToast, setHasShownToast] = useState(false);

  // Check if user has required role
  const hasAccess = !requiredRole || (user && requiredRole.includes(user.role));

  // Show toast when access is denied (only once)
  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !hasAccess && !hasShownToast) {
      toast({
        title: 'Access Denied',
        description: "You don't have permission to access this page.",
        variant: 'destructive',
      });
      setHasShownToast(true);
    }
  }, [isLoading, isAuthenticated, user, hasAccess, hasShownToast]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to home if user doesn't have required role
  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
