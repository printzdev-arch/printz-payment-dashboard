/**
 * API 01 - Auth & Master Repository Interfaces
 */

const IUserRepository = require("../IUserRepository");
const IEmployeeRepository = require("../IEmployeeRepository");
const IRoleRepository = require("../IRoleRepository");
const IPermissionRepository = require("../IPermissionRepository");
const IBranchRepository = require("../IBranchRepository");
const ICategoryRepository = require("../ICategoryRepository");

module.exports = {
  IUserRepository,
  IEmployeeRepository,
  IRoleRepository,
  IPermissionRepository,
  IBranchRepository,
  ICategoryRepository,
};
