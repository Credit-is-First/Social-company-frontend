import React from 'react';
import { Route, Redirect, RouteProps, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RoleProtectedRouteProps extends RouteProps {
  role: string;
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  role, 
  ...rest 
}) => {
  const { isAuthenticated, hasRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to={{
      pathname: '/login',
      state: { from: location.pathname + location.search }
    }} />;
  }

  if (!hasRole(role)) {
    return <Redirect to="/" />;
  }

  return <Route {...rest}>{children}</Route>;
};

export default RoleProtectedRoute;
