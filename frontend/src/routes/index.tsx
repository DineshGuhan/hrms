import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import type { Role } from '../hooks/useAuth';

// Pages are lazy-loaded (BRD NFR-PERF: code-split routes).
const Home = lazy(() => import('../pages/Home'));
const Login = lazy(() => import('../pages/Login'));
const NotFound = lazy(() => import('../pages/NotFound'));

export interface AuthContext {
  isAuthenticated: boolean;
  userRoles: Role[] | null;
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<p>Loading…</p>}>{element}</Suspense>;
}

/** Route table. Add new feature routes here, each lazy-loaded behind ProtectedRoute. */
export function buildRoutes(auth: AuthContext): RouteObject[] {
  return [
    { path: '/login', element: withSuspense(<Login />) },
    {
      path: '/',
      element: (
        <ProtectedRoute isAuthenticated={auth.isAuthenticated} userRoles={auth.userRoles}>
          <Outlet />
        </ProtectedRoute>
      ),
      children: [{ index: true, element: withSuspense(<Home />) }],
    },
    { path: '/home', element: <Navigate to="/" replace /> },
    { path: '*', element: withSuspense(<NotFound />) },
  ];
}

export function createAppRouter(auth: AuthContext) {
  return createBrowserRouter(buildRoutes(auth));
}
