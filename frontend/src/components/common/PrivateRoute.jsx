import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

// loginPath: where to send someone who is not signed in (the manufacturing portal has its own login)
const PrivateRoute = ({ component: Component, children, roles, loginPath }) => {
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
    effectiveRole === "mfg_designer" ||
    ["ali hassan", "siti rahman", "kumar anil", "john lee", "nur aisyah"].some((name) =>
      effectiveName.includes(name)
    );

  // Manufacturing unit staff live in their own portal
  const isMfgStaff = effectiveRole === "mfg_designer" || effectiveRole === "mfg_manager";
  const homeFor = () => (isMfgStaff ? "/mfg/dashboard" : isDesigner ? "/jobflow/design?view=my-jobs" : "/");

  const hasToken = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("printz_auth_token");

  if (!effectiveUser && !hasToken) {
    return <Navigate to={loginPath || "/login"} replace />;
  }

  // Strictly lock designer users inside Design or Manufacturing routes
  if (isDesigner) {
    const isAllowed = !roles || roles.includes("designer") || roles.includes("mfg_designer");
    if (!isAllowed) {
      return <Navigate to={homeFor()} replace />;
    }
  }

  if (roles && !roles.includes(role || effectiveRole)) {
    // If user has designer role and route allows mfg_designer or designer
    if (isDesigner && (roles.includes("designer") || roles.includes("mfg_designer"))) {
      // Allowed
    } else {
      return <Navigate to={homeFor()} replace />;
    }
  }

  if (children) return children;
  if (typeof Component === 'function') return Component();
  return Component || null;
};

export default PrivateRoute;
