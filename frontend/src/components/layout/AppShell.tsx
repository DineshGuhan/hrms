import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import type { Role } from '../../hooks/useAuth';

export interface NavItem {
  label: string;
  path: string;
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', roles: ['admin', 'hr', 'manager', 'employee'] },
  { label: 'Employees', path: '/employees', roles: ['admin', 'hr', 'manager'] },
  { label: 'Departments', path: '/departments', roles: ['admin', 'hr'] },
  { label: 'Leave', path: '/leave', roles: ['admin', 'hr', 'manager', 'employee'] },
  { label: 'Attendance', path: '/attendance', roles: ['admin', 'hr', 'manager', 'employee'] },
  { label: 'Payroll', path: '/payroll', roles: ['admin', 'hr'] },
];

/** Returns only the nav items the user's roles can see. */
export function visibleNav(userRoles: Role[] | null): NavItem[] {
  if (!userRoles) return [];
  return NAV_ITEMS.filter((item) => item.roles.some((r) => userRoles.includes(r)));
}

export interface AppShellProps {
  userRoles: Role[] | null;
  userEmail?: string;
  onLogout?: () => void;
  children: ReactNode;
}

function initials(email?: string): string {
  if (!email) return '?';
  const part = email.split('@')[0];
  const letters = part.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
  return letters || part.slice(0, 2).toUpperCase();
}

export function AppShell({ userRoles, userEmail, onLogout, children }: AppShellProps) {
  const items = visibleNav(userRoles);
  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-brand-900 text-white">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold">
            H
          </span>
          <span className="text-base font-semibold tracking-tight">HRMS</span>
        </div>
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm transition ${
                      isActive
                        ? 'bg-brand-600/60 font-medium text-white'
                        : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold">
              {initials(userEmail)}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-brand-100/80" title={userEmail}>
              {userEmail ?? 'Not signed in'}
            </span>
          </div>
        </div>
      </aside>

      <div className="ml-60 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-end gap-4 border-b border-line bg-surface px-6 py-3">
          {onLogout ? (
            <button
              type="button"
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink shadow-sm transition hover:bg-gray-50"
              onClick={onLogout}
            >
              Log out
            </button>
          ) : null}
        </header>
        <main className="flex-1 px-6 py-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
