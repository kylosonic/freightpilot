import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth';

export function ProtectedRoute({
  children,
  allowedRoles,
  allowPlatformAdmin = false,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  allowPlatformAdmin?: boolean;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#cbd8d3] border-t-[#087f72]" />
          <p className="text-sm text-[#63766f]">Verifying workspace access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && !(allowPlatformAdmin && user.is_platform_admin)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
