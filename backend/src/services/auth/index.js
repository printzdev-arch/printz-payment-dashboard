/**
 * Services Module: auth
 */
const AuthService = require("./auth.service");
const userService = require("./user.service");
const roleService = require("./role.service");
const employeeService = require("./employee.service");

module.exports = {
  AuthService,
  authService: AuthService,
  userService,
  roleService,
  employeeService,
};
