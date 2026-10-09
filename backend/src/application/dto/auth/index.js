/**
 * API 01 - Auth & Master DTOs
 */

const AuthDto = require("../AuthDto");
const UserDto = require("../UserDto");
const RoleDto = require("../RoleDto");
const EmployeeDto = require("../EmployeeDto");

module.exports = {
  ...AuthDto,
  ...UserDto,
  ...RoleDto,
  ...EmployeeDto,
};
