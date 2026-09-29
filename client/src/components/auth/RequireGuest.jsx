import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

export default function RequireGuest({ children }) {
  const { token, user } = useSelector((s) => s.auth);

  if (token && user) {
    // Redirect by role
    const redirectMap = {
      admin: '/admin-legacy',
      manager: '/manager',
      organizer: '/manager',
      user: '/dashboard',
      customer: '/dashboard',
    };
    return <Navigate to={redirectMap[user.role] || '/dashboard'} replace />;
  }
  return children;
}
