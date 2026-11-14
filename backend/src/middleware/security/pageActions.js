const { permissionPrefixesFor } = require("../../modules/auth/constants/pageCatalog");

/**
 * Per-page actions (view / create / edit / delete).
 *
 * A person's pages come from their employee record or role (user.pageAccess), and what they may do on each page
 * from user.pageActions ({ pageKey: ["view", "edit", ...] }). A page with no entry keeps every action, so nothing
 * changes until an admin limits a page.
 */

const normalizeAction = (action) => {
  const a = String(action || "").toLowerCase().trim();
  if (["read", "get", "list", "view", "show", "search", "export"].includes(a)) return "view";
  if (["create", "add", "new", "post"].includes(a)) return "create";
  if (["delete", "remove", "destroy"].includes(a)) return "delete";
  return "edit"; // update, edit, approve, process ... all change data
};

const methodAction = (method) => {
  const m = String(method || "GET").toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return "view";
  if (m === "POST") return "create";
  if (m === "DELETE") return "delete";
  return "edit"; // PUT, PATCH
};

const covers = (prefix, code) => {
  const pre = String(prefix).toLowerCase();
  const c = String(code).toLowerCase();
  return c === pre || c.startsWith(pre + ".") || pre.startsWith(c + ".");
};

/** True when the person's per-page actions rule this action out for the API area (permission code or resource). */
const isActionBlocked = (user, code, action) => {
  if (!user || !Array.isArray(user.pageAccess) || user.pageAccess.length === 0) return false;
  const actions = user.pageActions;
  if (!actions || typeof actions !== "object") return false;
  const wanted = normalizeAction(action);

  const covering = user.pageAccess.filter((key) => permissionPrefixesFor([key], { admin: false }).some((pre) => covers(pre, code)));
  if (covering.length === 0) return false; // no listed page owns this area, so page actions do not apply
  const limited = covering.filter((key) => Array.isArray(actions[key]));
  if (limited.length < covering.length) return false; // some page covering it has no limit: allowed
  if (wanted === "view") return false; // a page on the list can always be viewed
  return !limited.some((key) => actions[key].includes(wanted));
};

module.exports = { isActionBlocked, normalizeAction, methodAction };
