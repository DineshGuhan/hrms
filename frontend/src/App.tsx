import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterProvider, type createBrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';

export interface AppProps {
  router: ReturnType<typeof createBrowserRouter>;
  queryClient: QueryClient;
}

export function App({ router, queryClient }: AppProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
