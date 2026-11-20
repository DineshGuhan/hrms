import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { tokenStore } from '../../services/tokenStore';
import type { Role } from '../../hooks/useAuth';
import * as api from './auth.api';
import type { SessionUser } from './auth.api';

interface SessionValue {
  user: SessionUser | null;
  /** True only when restore() has finished; prevents protected routes from flashing. */
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (...allowed: Role[]) => boolean;
}

const SessionContext = createContext<SessionValue | null>(null);

interface SessionProviderProps {
  children: ReactNode;
  /** Injectable for tests. */
  apiModule?: typeof api;
}

export function SessionProvider({ children, apiModule: apiOverride }: SessionProviderProps) {
  const apiM = apiOverride ?? api;
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  // Restore the session from the refresh cookie once on mount.
  useEffect(() => {
    let cancelled = false;
    apiM
      .refreshSession()
      .then((restored) => {
        if (!cancelled) {
          setUser(restored?.user ?? null);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [apiM]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await apiM.login(email, password);
      tokenStore.set(result.token);
      setUser(result.user);
    },
    [apiM],
  );

  const signOut = useCallback(async () => {
    await apiM.logout();
    setUser(null);
  }, [apiM]);

  const hasRole = useCallback(
    (...allowed: Role[]) => (user ? allowed.some((r) => user.roles.includes(r)) : false),
    [user],
  );

  const value = useMemo(
    () => ({ user, ready, signIn, signOut, hasRole }),
    [user, ready, signIn, signOut, hasRole],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
