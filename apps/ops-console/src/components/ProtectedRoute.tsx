import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth';

export function ProtectedRoute({
  children,
  allowedRoles,
  allowPlatformAdmin = false,
  requirePlatformAdmin = false,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  allowPlatformAdmin?: boolean;
  requirePlatformAdmin?: boolean;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#e5e4e0] border-t-[#176b5c]" aria-hidden="true" />
          <p className="text-sm text-[#73736e]">Verifying workspace access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requirePlatformAdmin && !user.is_platform_admin) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && !(allowPlatformAdmin && user.is_platform_admin)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
