import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Role } from '../hooks/useAuth';

export interface ProtectedRouteProps {
  isAuthenticated: boolean;
  userRoles: Role[] | null;
  /** If omitted, any authenticated user may access the route. */
  allowedRoles?: Role[];
  children: ReactNode;
}

/**
 * Route guard:
 * - unauthenticated -> redirect to /login (remembering where the user was going)
 * - authenticated but wrong role -> redirect to the dashboard
 */
export function ProtectedRoute({
  isAuthenticated,
  userRoles,
  allowedRoles,
  children,
}: ProtectedRouteProps) {
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (allowedRoles && !allowedRoles.some((r) => userRoles?.includes(r))) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
