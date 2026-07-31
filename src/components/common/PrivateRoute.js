
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../App';

const PrivateRoute = ({ component: Component, roles }) => {
  const { currentUser, role } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to="/" />;
  }
  
  return <Component />;
};

export default PrivateRoute;
