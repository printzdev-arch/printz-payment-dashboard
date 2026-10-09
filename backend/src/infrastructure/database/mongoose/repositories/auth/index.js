/**
 * API 01 - Auth & Master Concrete Mongoose Repositories
 */

const MongoUserRepository = require("../MongoUserRepository");
const MongoEmployeeRepository = require("../MongoEmployeeRepository");
const MongoRoleRepository = require("../MongoRoleRepository");
const MongoPermissionRepository = require("../MongoPermissionRepository");
const MongoBranchRepository = require("../MongoBranchRepository");
const MongoCategoryRepository = require("../MongoCategoryRepository");

module.exports = {
  MongoUserRepository,
  MongoEmployeeRepository,
  MongoRoleRepository,
  MongoPermissionRepository,
  MongoBranchRepository,
  MongoCategoryRepository,
};
