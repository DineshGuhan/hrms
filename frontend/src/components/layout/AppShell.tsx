import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
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

export function AppShell({ userRoles, userEmail, onLogout, children }: AppShellProps) {
  const items = visibleNav(userRoles);
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <nav>
          <ul>
            {items.map((item) => (
              <li key={item.path}>
                <Link to={item.path}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="main">
        <header className="header">
          <span className="brand">HRMS</span>
          {userEmail ? <span className="user">{userEmail}</span> : null}
          {onLogout ? (
            <button type="button" onClick={onLogout}>
              Log out
            </button>
          ) : null}
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
