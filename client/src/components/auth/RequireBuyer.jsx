import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { canPurchase } from '../../lib/roles.js';

export default function RequireBuyer({ children }) {
  const user = useSelector((s) => s.auth.user);
  if (!canPurchase(user)) {
    return <Navigate to={user.role === 'admin' ? '/admin-legacy' : '/dashboard'} replace />;
  }
  return children;
}
