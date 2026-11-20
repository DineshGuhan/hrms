import { useNavigate } from 'react-router-dom';
import { AppShell } from './AppShell';
import { useSession } from '../../features/auth/useSession';
import { RequireReady } from './RequireReady';

/** AppShell bound to the session: shows the signed-in user and a working logout. */
export function ConnectedAppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useSession();
  const navigate = useNavigate();

  const onLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <RequireReady>
      <AppShell
        userRoles={user?.roles ?? null}
        userEmail={user?.email}
        onLogout={onLogout}
      >
        {children}
      </AppShell>
    </RequireReady>
  );
}
