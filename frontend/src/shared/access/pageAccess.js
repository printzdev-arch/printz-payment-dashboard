/**
 * Page access for roles set up in Role Management.
 *
 * The server sends `allowedPaths` (a list of { path, exact }) only for a role that lists its pages.
 * Everyone else has no list and keeps the access they always had.
 */

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem("user") || localStorage.getItem("printz_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** The page list for this user, or null when the role is not limited to a list. */
export const getAllowedPaths = (user) => {
  const u = user || readStoredUser();
  return Array.isArray(u?.allowedPaths) ? u.allowedPaths : null;
};

const stripQuery = (to) => String(to || "").split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";

/** May this user open this route? Always true for a role without a page list. */
export const canAccessPath = (user, to) => {
  const allowed = getAllowedPaths(user);
  if (!allowed) return true;
  const target = stripQuery(to);
  // Profile and password change must stay reachable
  if (target === "/profile" || target === "/") return true;
  return allowed.some(({ path, exact }) => {
    const base = stripQuery(path);
    return target === base || (!exact && target.startsWith(`${base}/`));
  });
};

/** The first page this user may open, for sending them somewhere useful after sign-in. */
export const firstAllowedPath = (user) => {
  const u = user || readStoredUser();
  if (Array.isArray(u?.pageLinks) && u.pageLinks.length > 0) return u.pageLinks[0].to;
  const allowed = getAllowedPaths(user);
  return allowed && allowed.length > 0 ? allowed[0].path : null;
};
