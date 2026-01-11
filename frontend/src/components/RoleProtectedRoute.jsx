import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, useToast } from '../store/useStore';
import { useEffect, useState } from 'react';

/**
 * RoleProtectedRoute Component
 *
 * Protects routes based on user authentication and role.
 * Redirects unauthorized users to dashboard with an error toast notification.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string[]} props.allowedRoles - Array of allowed roles (e.g., ['teacher'] or ['student', 'teacher'])
 */
export default function RoleProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, user, role } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const [hasShownToast, setHasShownToast] = useState(false);

  // First check authentication
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Then check role authorization
  const isAuthorized = allowedRoles.length === 0 || allowedRoles.includes(role);

  // Show toast notification for unauthorized access (only once)
  useEffect(() => {
    if (!isAuthorized && !hasShownToast) {
      const roleText = allowedRoles.length === 1
        ? `${allowedRoles[0]}s`
        : allowedRoles.join(' or ') + 's';

      toast.error(`This feature is only available to ${roleText}`);
      setHasShownToast(true);
    }
  }, [isAuthorized, hasShownToast, allowedRoles, toast]);

  if (!isAuthorized) {
    // Redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // User is authenticated and authorized
  return children;
}
