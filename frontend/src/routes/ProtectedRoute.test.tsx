import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';

function renderGuard(props: Partial<React.ComponentProps<typeof ProtectedRoute>>) {
  return render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/" element={<p>dashboard</p>} />
        <Route
          path="/secret"
          element={
            <ProtectedRoute isAuthenticated={false} userRoles={null} {...props}>
              <p>secret content</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when unauthenticated', () => {
    renderGuard({ isAuthenticated: false });
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });

  it('allows access when authenticated', () => {
    renderGuard({ isAuthenticated: true, userRoles: ['employee'] });
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });

  it('allows access when the user has an allowed role', () => {
    renderGuard({ isAuthenticated: true, userRoles: ['hr'], allowedRoles: ['hr', 'admin'] });
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });

  it('blocks access and redirects to dashboard when the role is not allowed', () => {
    renderGuard({ isAuthenticated: true, userRoles: ['employee'], allowedRoles: ['admin'] });
    expect(screen.getByText('dashboard')).toBeInTheDocument();
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });
});
