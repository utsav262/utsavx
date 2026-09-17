import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

/** Admin console — admins only (managers use /manager). */
export default function RequireAdmin({ children }) {
    const user = useSelector((state) => state.auth.user);
    if (!user) return <Navigate to="/admin/login" replace />;
    if (user.role === 'organizer') return <Navigate to="/manager" replace />;
    if (user.role !== 'admin') return <Navigate to="/admin/login" replace />;
    return children;
}
