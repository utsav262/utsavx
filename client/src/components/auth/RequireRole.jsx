import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

export default function RequireRole({ roles, children }) {
  const { token, user } = useSelector((s) => s.auth);
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  const userRole = user.role;
  const isAllowed = roles.includes(userRole) || 
    (roles.includes('manager') && userRole === 'organizer') || 
    (roles.includes('organizer') && userRole === 'manager');

  if (!isAllowed) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}
