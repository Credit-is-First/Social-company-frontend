import React from 'react';
import { Route, Redirect, RouteProps, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthRoute: React.FC<RouteProps> = ({ children, ...rest }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve the current path using location state
    return <Redirect to={{
      pathname: '/login',
      state: { from: location.pathname + location.search }
    }} />;
  }

  return <Route {...rest}>{children}</Route>;
};

export default AuthRoute;

