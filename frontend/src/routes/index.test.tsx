import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { buildRoutes } from './index';
import type { RouteObject } from 'react-router-dom';

// Renders the real route table inside a MemoryRouter. The data router (createMemoryRouter)
// is avoided here because its navigation uses AbortSignal, which jsdom and Node disagree on.
function renderAt(path: string, isAuthenticated: boolean) {
  const routes = buildRoutes({ isAuthenticated, userRoles: isAuthenticated ? ['employee'] : null });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>{routes.map(toRoute)}</Routes>
    </MemoryRouter>,
  );
}

function toRoute(route: RouteObject, key: number): JSX.Element {
  const common = { element: route.element, children: route.children?.map(toRoute) };
  if (route.index) {
    return <Route key={`index-${key}`} index element={route.element} />;
  }
  return <Route key={route.path ?? `route-${key}`} path={route.path} {...common} />;
}

describe('route table', () => {
  it('serves the login page publicly', async () => {
    renderAt('/login', false);
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('sends unauthenticated visitors from the dashboard to login', async () => {
    renderAt('/', false);
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('serves the dashboard to an authenticated user', async () => {
    renderAt('/', true);
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('shows the 404 page for unknown routes', async () => {
    renderAt('/does-not-exist', true);
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
