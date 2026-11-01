/**
 * Models Module: auth
 */
const User = require("./User");
const Role = require("./Role");
const Employee = require("../../employees/models/Employee");
const Permission = require("./Permission");
const EmployeeBranchAssignment = require("../../employees/models/EmployeeBranchAssignment");

module.exports = {
  User,
  Role,
  Employee,
  Permission,
  EmployeeBranchAssignment,
};
