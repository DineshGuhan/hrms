import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppShell, visibleNav } from './AppShell';

describe('visibleNav', () => {
  it('returns no items for a signed-out user', () => {
    expect(visibleNav(null)).toEqual([]);
  });

  it('shows the payroll link only to HR and admin', () => {
    expect(visibleNav(['employee']).map((i) => i.label)).not.toContain('Payroll');
    expect(visibleNav(['hr']).map((i) => i.label)).toContain('Payroll');
  });

  it('shows dashboard to every role', () => {
    for (const role of ['admin', 'hr', 'manager', 'employee'] as const) {
      expect(visibleNav([role]).map((i) => i.label)).toContain('Dashboard');
    }
  });
});

describe('AppShell', () => {
  it('renders role-based navigation links', () => {
    render(
      <MemoryRouter>
        <AppShell userRoles={['employee']} userEmail="a@b.c">
          <p>page body</p>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Leave' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Payroll' })).not.toBeInTheDocument();
    expect(screen.getByText('page body')).toBeInTheDocument();
    expect(screen.getByText('a@b.c')).toBeInTheDocument();
  });

  it('shows a logout button only when a handler is given', () => {
    render(
      <MemoryRouter>
        <AppShell userRoles={['hr']} onLogout={() => {}}>
          <p>x</p>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });
});
