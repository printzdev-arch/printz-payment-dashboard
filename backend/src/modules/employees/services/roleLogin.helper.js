const mongoose = require("mongoose");
const Role = require("../../auth/models/Role");
const MasterDefault = require("../../settings/models/MasterDefault");

// Operators never sign in, whatever the master default says
const ALWAYS_NO_LOGIN = ["OPERATOR"];
// Config value on an "Employee Roles" master default meaning "this role does not sign in"
const NO_LOGIN_FLAG = "NO_LOGIN";

/**
 * Does this role never sign in? (operators, and any role marked NO_LOGIN in master defaults)
 * Returns { noLogin, name } so callers can word their message. An unknown role is treated as one that can sign in.
 */
async function roleDisallowsLogin(roleId) {
  const ref = roleId && (roleId._id || roleId);
  if (!ref || !mongoose.Types.ObjectId.isValid(String(ref))) return { noLogin: false, name: "" };

  const role = await Role.findById(String(ref)).select("code name pageAccess loginAllowed").lean();
  if (!role) return { noLogin: false, name: "" };

  // An explicit "can sign in" setting on the role wins. Allowed still needs at least one page to open.
  if (typeof role.loginAllowed === "boolean") {
    const noPages = Array.isArray(role.pageAccess) && role.pageAccess.length === 0;
    return { noLogin: !role.loginAllowed || noPages, name: role.name };
  }

  // A role set up in Role Management signs in exactly when it has at least one page ticked
  if (Array.isArray(role.pageAccess)) return { noLogin: role.pageAccess.length === 0, name: role.name };

  const code = String(role.code || "").toUpperCase();
  if (ALWAYS_NO_LOGIN.includes(code)) return { noLogin: true, name: role.name };

  const item = await MasterDefault.findOne({ category: "employeeRoles", code, isActive: true }).select("name config").lean();
  if (item && String(item.config || "").trim().toUpperCase() === NO_LOGIN_FLAG) {
    return { noLogin: true, name: item.name || role.name };
  }
  return { noLogin: false, name: role.name };
}

/**
 * Can this employee have a login? Pages saved on the employee decide it (none = no login);
 * without their own list, the role's rule applies.
 */
async function employeeDisallowsLogin(employee) {
  if (employee && Array.isArray(employee.pageAccess)) {
    const role = employee.roleId && typeof employee.roleId === "object" ? employee.roleId : null;
    return { noLogin: employee.pageAccess.length === 0, name: (role && role.name) || "This employee" };
  }
  return roleDisallowsLogin(employee && employee.roleId);
}

module.exports = { roleDisallowsLogin, employeeDisallowsLogin, NO_LOGIN_FLAG };
