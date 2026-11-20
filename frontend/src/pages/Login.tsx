import { Navigate } from 'react-router-dom';
import { LoginForm } from '../features/auth/LoginForm';
import { useSession } from '../features/auth/useSession';

export default function Login() {
  const { user, ready } = useSession();

  // Already signed in? Straight to the dashboard.
  if (ready && user) return <Navigate to="/" replace />;

  return (
    <section className="login-page">
      <h1>Sign in</h1>
      <LoginForm />
    </section>
  );
}
