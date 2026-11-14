/**
 * What the signed-in person may do on a page: "view", "create", "edit" or "delete".
 * The server is the real gate; this only hides buttons a person could not use anyway.
 *
 * Admins can do everything. A page with no action list (the usual case) allows every action.
 */
const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const ADMIN_ROLES = ["admin", "super_admin", "superadmin", "internal_admin"];

export const canDo = (pageKey, action, user = readUser()) => {
  if (!user) return true;
  const role = String(user.roleCode || user.role || "").toLowerCase();
  if (ADMIN_ROLES.includes(role)) return true;
  const list = user.pageActions && user.pageActions[pageKey];
  if (!Array.isArray(list)) return true;
  return list.includes(String(action).toLowerCase());
};

export default canDo;
