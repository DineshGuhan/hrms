import { useCallback, useState } from 'react';
import { tokenStore } from '../services/tokenStore';

export type Role = 'admin' | 'hr' | 'manager' | 'employee';

export interface SessionUser {
  id: string;
  email: string;
  roles: Role[];
}

/** Auth state for the UI. Real login (HRM-3) will populate the user; this scaffold reads the token. */
export function useAuth(initialUser: SessionUser | null = null) {
  const [user, setUser] = useState<SessionUser | null>(initialUser);

  const isAuthenticated = user !== null && tokenStore.get() !== null;

  const hasRole = useCallback(
    (...allowed: Role[]) => (user ? allowed.some((r) => user.roles.includes(r)) : false),
    [user],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  return { user, setUser, isAuthenticated, hasRole, logout };
}
