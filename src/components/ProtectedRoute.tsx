import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'customer' | 'worker' | 'manager' | 'admin' | 'super_admin' | 'owner';
  requireAnyRole?: Array<'customer' | 'worker' | 'manager' | 'admin' | 'super_admin' | 'owner'>;
}

export const ProtectedRoute = ({ children, requireRole, requireAnyRole }: ProtectedRouteProps) => {
  // Note: hasRole() is for UX only - actual security is enforced via RLS policies on the backend
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireRole && !hasRole(requireRole)) {
    return <Navigate to="/" replace />;
  }

  if (requireAnyRole && !requireAnyRole.some(role => hasRole(role))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
