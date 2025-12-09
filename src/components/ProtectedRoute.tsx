import React from 'react';
import { Route, Redirect, RouteProps } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps extends RouteProps {
  roles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles, ...rest }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (roles && user && user.roles) {
    const userRoleNames = user.roles.map(role => role.name);
    const hasRequiredRole = roles.some(role => userRoleNames.includes(role));
    if (!hasRequiredRole) {
      return <Redirect to="/" />;
    }
  }

  return <Route {...rest}>{children}</Route>;
};

export default ProtectedRoute;

