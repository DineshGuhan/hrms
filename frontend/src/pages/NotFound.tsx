import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section>
      <h1>Page not found</h1>
      <p>
        The page you are looking for does not exist. <Link to="/">Go to dashboard</Link>
      </p>
    </section>
  );
}
