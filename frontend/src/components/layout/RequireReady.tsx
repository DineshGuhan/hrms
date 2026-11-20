import type { ReactNode } from 'react';
import { useSession } from '../../features/auth/useSession';

/**
 * Holds rendering until the session restore attempt finishes, so protected
 * routes don't flash the login page for signed-in users.
 */
export function RequireReady({ children }: { children: ReactNode }) {
  const { ready } = useSession();
  if (!ready) return <p aria-busy="true">Loading…</p>;
  return <>{children}</>;
}
