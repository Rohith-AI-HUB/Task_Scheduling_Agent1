import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useStore';

/**
 * ProtectedRoute Component
 *
 * Protects routes from unauthorized access.
 * Redirects to login page if user is not authenticated.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the protected component
  return children;
}
