import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

/** Manager workspace — organizers only (admins use /admin). */
export default function RequireManager({ children }) {
    const user = useSelector((state) => state.auth.user);
    if (!user) return <Navigate to="/manager/login" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role !== 'organizer') return <Navigate to="/manager/login" replace />;
    return children;
}
