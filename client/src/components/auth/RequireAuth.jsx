import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

export default function RequireAuth({ children }) {
  const { token, user } = useSelector((s) => s.auth);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!user) {
    return <Navigate to="/login" replace />; // profile load nahi hua
  }
  return children;
}
