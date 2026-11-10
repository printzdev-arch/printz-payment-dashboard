import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthContext.jsx";
import { canAccessPath } from "./pageAccess";

/**
 * Drop-in replacement for NavLink in the sidebars: the link is left out when the signed-in
 * role has a page list that does not include the page.
 */
export default function GuardedNavLink(props) {
  const { currentUser } = useAuth();
  const to = typeof props.to === "string" ? props.to : props.to?.pathname;
  if (!canAccessPath(currentUser, to)) return null;
  return <NavLink {...props} />;
}
