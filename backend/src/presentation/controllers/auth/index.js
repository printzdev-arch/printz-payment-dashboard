/**
 * API 01 - Auth & Master Presentation Controllers
 */

const authController = require("../auth.controller");
const userController = require("../user.controller");
const employeeController = require("../employee.controller");
const roleController = require("../role.controller");

module.exports = {
  authController,
  userController,
  employeeController,
  roleController,
};
