/**
 * API 01 - Auth, Roles & Permission Constants
 */

const PERMISSIONS = {
  // Auth & Profile
  AUTH_PROFILE_VIEW: "auth.profile.view",
  AUTH_TOKEN_REFRESH: "auth.token.refresh",

  // Users
  USER_VIEW: "user.view",
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_DELETE: "user.delete",

  // Employees
  EMPLOYEE_VIEW: "employee.view",
  EMPLOYEE_CREATE: "employee.create",
  EMPLOYEE_UPDATE: "employee.update",
  EMPLOYEE_DELETE: "employee.delete",

  // Roles & Permissions
  ROLE_VIEW: "role.view",
  ROLE_CREATE: "role.create",
  ROLE_UPDATE: "role.update",
  ROLE_DELETE: "role.delete",
  PERMISSION_VIEW: "permission.view",
};

const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  DESIGNER: "designer",
  OPERATOR: "operator",
  CASHIER: "cashier",
  DELIVERY: "delivery",
};

const SCOPES = {
  SELF: "SELF",
  ASSIGNED: "ASSIGNED",
  BRANCH: "BRANCH",
  ALL: "ALL",
};

module.exports = {
  PERMISSIONS,
  ROLES,
  SCOPES,
};
