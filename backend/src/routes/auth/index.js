/**
 * Routes Module: auth
 */
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const employeeRoutes = require("./employee.routes");
const roleRoutes = require("./role.routes");
const permissionRoutes = require("./permission.routes");

module.exports = {
  authRoutes,
  userRoutes,
  employeeRoutes,
  roleRoutes,
  permissionRoutes,
};
