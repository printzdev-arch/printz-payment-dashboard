/**
 * Models Module: auth
 */
const User = require("./User");
const Role = require("./Role");
const Employee = require("./Employee");
const Permission = require("./Permission");
const EmployeeBranchAssignment = require("./EmployeeBranchAssignment");

module.exports = {
  User,
  Role,
  Employee,
  Permission,
  EmployeeBranchAssignment,
};
