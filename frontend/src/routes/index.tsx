import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { ConnectedAppShell } from '../components/layout/ConnectedAppShell';
import type { Role } from '../hooks/useAuth';

// Pages are lazy-loaded (BRD NFR-PERF: code-split routes).
const Home = lazy(() => import('../pages/Home'));
const Login = lazy(() => import('../pages/Login'));
const NotFound = lazy(() => import('../pages/NotFound'));
const EmployeeListPage = lazy(() => import('../pages/EmployeeListPage'));
const EmployeeProfileRoute = lazy(() => import('../pages/EmployeeProfileRoute'));
const EmployeeFormRoute = lazy(() => import('../pages/EmployeeFormRoute'));

export interface AuthContext {
  isAuthenticated: boolean;
  userRoles: Role[] | null;
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<p>Loading…</p>}>{element}</Suspense>;
}

/** Route table. Add new feature routes here, each lazy-loaded behind ProtectedRoute. */
export function buildRoutes(auth: AuthContext): RouteObject[] {
  const guard = (allowedRoles?: Role[]) => (
    <ProtectedRoute isAuthenticated={auth.isAuthenticated} userRoles={auth.userRoles} allowedRoles={allowedRoles}>
      <ConnectedAppShell>
        <Outlet />
      </ConnectedAppShell>
    </ProtectedRoute>
  );

  return [
    { path: '/login', element: withSuspense(<Login />) },
    {
      path: '/',
      element: guard(),
      children: [
        { index: true, element: withSuspense(<Home />) },
        {
          path: 'employees',
          element: guard(['admin', 'hr', 'manager']),
          children: [
            { index: true, element: withSuspense(<EmployeeListPage />) },
            {
              path: 'new',
              element: guard(['admin', 'hr']),
              children: [{ index: true, element: withSuspense(<EmployeeFormRoute />) }],
            },
            {
              path: ':id',
              element: withSuspense(<EmployeeProfileRoute />),
            },
            {
              path: ':id/edit',
              element: guard(['admin', 'hr']),
              children: [{ index: true, element: withSuspense(<EmployeeFormRoute />) }],
            },
          ],
        },
      ],
    },
    { path: '/home', element: <Navigate to="/" replace /> },
    { path: '*', element: withSuspense(<NotFound />) },
  ];
}

export function createAppRouter(auth: AuthContext) {
  return createBrowserRouter(buildRoutes(auth));
}
