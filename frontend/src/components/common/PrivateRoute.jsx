import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const PrivateRoute = ({ component: Component, children, roles }) => {
  const { currentUser, role } = useAuth();

  const storedUser = (() => {
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("printz_user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  })();
  const storedRole = (localStorage.getItem("userRole") || storedUser?.role || "").toLowerCase();
  const effectiveRole = (role || currentUser?.role || storedRole || "").toLowerCase();
  const effectiveUser = currentUser || storedUser;
  const effectiveName = (effectiveUser?.name || localStorage.getItem("userName") || "").toLowerCase();

  const isDesigner =
    effectiveRole === "designer" ||
    ["ali hassan", "siti rahman", "kumar anil", "john lee", "nur aisyah"].some((name) =>
      effectiveName.includes(name)
    );

  const hasToken = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("printz_auth_token");

  if (!effectiveUser && !hasToken) {
    return <Navigate to={isDesigner ? "/designer/login" : "/login"} replace />;
  }

  // Strictly lock designer users inside Design routes
  if (isDesigner) {
    const isAllowed = !roles || roles.includes("designer");
    if (!isAllowed) {
      return <Navigate to="/jobflow/design?view=my-jobs" replace />;
    }
  }

  if (roles && !roles.includes(role || effectiveRole)) {
    if (isDesigner) {
      return <Navigate to="/jobflow/design?view=my-jobs" replace />;
    }
    return <Navigate to="/" replace />;
  }

  if (children) return children;
  if (typeof Component === 'function') return Component();
  return Component || null;
};

export default PrivateRoute;
