/**
 * Controllers Module: auth
 */
const authController = require("./auth.controller");
const userController = require("./user.controller");
const employeeController = require("../../employees/controllers/employee.controller");
const roleController = require("./role.controller");

module.exports = {
  authController,
  userController,
  employeeController,
  roleController,
};
