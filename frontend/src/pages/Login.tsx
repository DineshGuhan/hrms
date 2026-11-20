import { Navigate } from 'react-router-dom';
import { LoginForm } from '../features/auth/LoginForm';
import { useSession } from '../features/auth/useSession';

export default function Login() {
  const { user, ready } = useSession();

  // Already signed in? Straight to the dashboard.
  if (ready && user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white">
            H
          </span>
          <p className="text-lg font-semibold tracking-tight text-white">HRMS</p>
          <p className="mt-1 text-sm text-brand-200">Sign in to your workspace</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-6 shadow-xl">
          <h1 className="mb-4 text-lg font-semibold text-ink">Sign in</h1>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
