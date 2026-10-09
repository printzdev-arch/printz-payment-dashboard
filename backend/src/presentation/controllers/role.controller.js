const GetRoles = require("../../application/use-cases/roles/GetRoles");
const GetRoleById = require("../../application/use-cases/roles/GetRoleById");
const CreateRole = require("../../application/use-cases/roles/CreateRole");
const UpdateRole = require("../../application/use-cases/roles/UpdateRole");
const DeleteRole = require("../../application/use-cases/roles/DeleteRole");
const DeactivateRole = require("../../application/use-cases/roles/DeactivateRole");
const GetRolesMatrix = require("../../application/use-cases/roles/GetRolesMatrix");
const GetPermissionsCatalogue = require("../../application/use-cases/roles/GetPermissionsCatalogue");
const { CreateRoleDto, UpdateRoleDto } = require("../../application/dto");
const roleRepository = require("../../infrastructure/database/mongoose/repositories/MongoRoleRepository");
const permissionRepository = require("../../infrastructure/database/mongoose/repositories/MongoPermissionRepository");
const { asyncHandler, ResponseHelper } = require("../../shared");

// Instantiate use cases
const getRolesUseCase = new GetRoles({ roleRepository });
const getRoleByIdUseCase = new GetRoleById({ roleRepository });
const createRoleUseCase = new CreateRole({ roleRepository });
const updateRoleUseCase = new UpdateRole({ roleRepository });
const deleteRoleUseCase = new DeleteRole({ roleRepository });
const deactivateRoleUseCase = new DeactivateRole({ roleRepository });
const getRolesMatrixUseCase = new GetRolesMatrix({ roleRepository, permissionRepository });
const getPermissionsCatalogueUseCase = new GetPermissionsCatalogue({ permissionRepository });

/**
 * GET /api/roles
 */
const getRoles = asyncHandler(async (req, res) => {
  const roles = await getRolesUseCase.execute();
  return ResponseHelper.success(res, roles, "Roles retrieved successfully.");
});

/**
 * GET /api/roles/matrix
 */
const getRolesMatrix = asyncHandler(async (req, res) => {
  const matrix = await getRolesMatrixUseCase.execute();
  return ResponseHelper.success(res, matrix, "Roles permission matrix retrieved.");
});

/**
 * GET /api/roles/permissions/catalogue & GET /api/permissions
 */
const getPermissionsCatalogue = asyncHandler(async (req, res) => {
  const result = await getPermissionsCatalogueUseCase.execute();
  return ResponseHelper.success(res, result, "Permissions catalogue retrieved.");
});

/**
 * GET /api/roles/:id
 */
const getRoleById = asyncHandler(async (req, res) => {
  const role = await getRoleByIdUseCase.execute(req.params.id);
  return ResponseHelper.success(res, role, "Role retrieved successfully.");
});

/**
 * POST /api/roles
 */
const createRole = asyncHandler(async (req, res) => {
  const dto = CreateRoleDto.fromRequest ? CreateRoleDto.fromRequest(req) : req.body;
  const requestContext = {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers["user-agent"],
  };
  const role = await createRoleUseCase.execute(dto, req.user, requestContext);
  return ResponseHelper.created(res, role, "Role created successfully.");
});

/**
 * PATCH & PUT /api/roles/:id
 */
const updateRole = asyncHandler(async (req, res) => {
  const dto = UpdateRoleDto.fromRequest ? UpdateRoleDto.fromRequest(req) : req.body;
  const requestContext = {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers["user-agent"],
  };
  const role = await updateRoleUseCase.execute(req.params.id, dto, req.user, requestContext);
  return ResponseHelper.success(res, role, "Role updated successfully.");
});

/**
 * POST /api/roles/:id/deactivate
 */
const deactivateRole = asyncHandler(async (req, res) => {
  const requestContext = {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers["user-agent"],
  };
  const role = await deactivateRoleUseCase.execute(req.params.id, req.user, requestContext);
  return ResponseHelper.success(res, role, "Role deactivated successfully.");
});

/**
 * DELETE /api/roles/:id
 */
const deleteRole = asyncHandler(async (req, res) => {
  await deleteRoleUseCase.execute(req.params.id);
  return ResponseHelper.success(res, null, "Role deleted successfully.");
});

module.exports = {
  getRoles,
  getRolesMatrix,
  getRoleById,
  createRole,
  updateRole,
  deactivateRole,
  deleteRole,
  getPermissionsCatalogue,
};
