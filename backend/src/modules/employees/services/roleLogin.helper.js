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

  const role = await Role.findById(String(ref)).select("code name").lean();
  if (!role) return { noLogin: false, name: "" };

  const code = String(role.code || "").toUpperCase();
  if (ALWAYS_NO_LOGIN.includes(code)) return { noLogin: true, name: role.name };

  const item = await MasterDefault.findOne({ category: "employeeRoles", code, isActive: true }).select("name config").lean();
  if (item && String(item.config || "").trim().toUpperCase() === NO_LOGIN_FLAG) {
    return { noLogin: true, name: item.name || role.name };
  }
  return { noLogin: false, name: role.name };
}

module.exports = { roleDisallowsLogin, NO_LOGIN_FLAG };
