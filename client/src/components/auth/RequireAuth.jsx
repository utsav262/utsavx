import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

export default function RequireAuth({ children }) {
  const { token, user } = useSelector((s) => s.auth);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!user) {
    // Token present but profile still loading (AppRoutes fetches /auth/me).
    return <main className="mx-auto max-w-7xl px-5 py-20 text-sm text-ink/50">Loading…</main>;
  }
  return children;
}
