import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { createAppRouter } from './routes';
import { createQueryClient } from './query/queryClient';
import { SessionProvider, useSession } from './features/auth/useSession';
import { RequireReady } from './components/layout/RequireReady';
import './styles.css';

const queryClient = createQueryClient();

/** Bridges the session into the router's auth context on every render. */
function RoutedApp() {
  const { user, ready } = useSession();
  const isAuthenticated = ready && user !== null;
  const router = createAppRouter({
    isAuthenticated,
    userRoles: user?.roles ?? null,
  });
  return (
    <RequireReady>
      <App router={router} queryClient={queryClient} />
    </RequireReady>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <SessionProvider>
      <RoutedApp />
    </SessionProvider>
  </StrictMode>,
);
