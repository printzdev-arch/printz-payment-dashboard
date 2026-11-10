/**
 * DTO Module: auth
 */
const AuthDto = require("./AuthDto");
const UserDto = require("./UserDto");
const RoleDto = require("./RoleDto");
const EmployeeDto = require("../../employees/models/EmployeeDto");

module.exports = {
  ...AuthDto,
  ...UserDto,
  ...RoleDto,
  ...EmployeeDto,
  AuthDto,
  UserDto,
  RoleDto,
  EmployeeDto,
};
