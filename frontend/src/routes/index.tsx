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
  return <Suspense fallback={<p aria-busy="true">Loading…</p>}>{element}</Suspense>;
}

/** Route table. One AppShell at the root layout; nested routes add guards only. */
export function buildRoutes(auth: AuthContext): RouteObject[] {
  const guard = (allowedRoles?: Role[]) => (
    <ProtectedRoute isAuthenticated={auth.isAuthenticated} userRoles={auth.userRoles} allowedRoles={allowedRoles}>
      <Outlet />
    </ProtectedRoute>
  );

  return [
    { path: '/login', element: withSuspense(<Login />) },
    {
      path: '/',
      element: guard(), // any authenticated user
      children: [
        {
          path: '',
          element: (
            <ConnectedAppShell>
              {withSuspense(<Home />)}
            </ConnectedAppShell>
          ),
        },
        {
          // HR/Admin/Manager for everything under /employees
          path: 'employees',
          element: guard(['admin', 'hr', 'manager']),
          children: [
            {
              path: '',
              element: <ConnectedAppShell>{withSuspense(<EmployeeListPage />)}</ConnectedAppShell>,
            },
            {
              path: 'new',
              element: guard(['admin', 'hr']),
              children: [
                {
                  path: '',
                  element: <ConnectedAppShell>{withSuspense(<EmployeeFormRoute />)}</ConnectedAppShell>,
                },
              ],
            },
            {
              path: ':id',
              element: <ConnectedAppShell>{withSuspense(<EmployeeProfileRoute />)}</ConnectedAppShell>,
            },
            {
              path: ':id/edit',
              element: guard(['admin', 'hr']),
              children: [
                {
                  path: '',
                  element: <ConnectedAppShell>{withSuspense(<EmployeeFormRoute />)}</ConnectedAppShell>,
                },
              ],
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
