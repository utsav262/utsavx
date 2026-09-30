import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { destinationAfterAuth } from '../../lib/afterAuth.js';

export default function RequireGuest({ children }) {
  const { token, user } = useSelector((s) => s.auth);
  const location = useLocation();

  // Same rule as the sign-in form, so signing in from "Sign in to buy" returns to the event.
  if (token && user) return <Navigate to={destinationAfterAuth(user, location.state?.from)} replace />;
  return children;
}
