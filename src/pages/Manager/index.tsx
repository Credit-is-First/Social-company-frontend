import React from 'react';
import { Redirect } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Manager: React.FC = () => {
  const { hasRole } = useAuth();

  // Redirect to first available manager page based on roles
  if (hasRole('role:read')) {
    return <Redirect to="/manager/roles" />;
  }
  if (hasRole('group:read')) {
    return <Redirect to="/manager/groups" />;
  }
  if (hasRole('user:read')) {
    return <Redirect to="/manager/users" />;
  }
  if (hasRole('book:read')) {
    return <Redirect to="/manager/books" />;
  }
  if (hasRole('book_lending:read')) {
    return <Redirect to="/manager/lending" />;
  }

  // If no roles, redirect to home
  return <Redirect to="/" />;
};

export default Manager;
