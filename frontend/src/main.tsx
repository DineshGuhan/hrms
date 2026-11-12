import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { createAppRouter } from './routes';
import { createQueryClient } from './query/queryClient';
import './styles.css';

// Auth state is wired to the real login flow in HRM-2/HRM-3. Until then, no user is signed in.
const router = createAppRouter({ isAuthenticated: false, userRoles: null });
const queryClient = createQueryClient();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App router={router} queryClient={queryClient} />
  </StrictMode>,
);
