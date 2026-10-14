import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const PrivateRoute = ({ component: Component, children, roles }) => {
  const { currentUser, role } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to="/" />;
  }
  
  if (children) return children;
  if (typeof Component === 'function') return Component();
  return Component || null;
};

export default PrivateRoute;
