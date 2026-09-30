import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { canPurchase } from '../../lib/roles.js';

export default function RequireBuyer({ children }) {
  const { token, user } = useSelector((s) => s.auth);
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!user) return <main className="mx-auto max-w-7xl px-5 py-20 text-sm text-ink/50">Loading…</main>;
  if (!canPurchase(user)) {
    return <Navigate to={user.role === 'admin' ? '/admin-legacy' : '/dashboard'} replace />;
  }
  return children;
}
