const CreateUser = require("../../application/use-cases/users/CreateUser");
const GetAllUsers = require("../../application/use-cases/users/GetAllUsers");
const GetUserById = require("../../application/use-cases/users/GetUserById");
const UpdateUser = require("../../application/use-cases/users/UpdateUser");
const DeleteUser = require("../../application/use-cases/users/DeleteUser");
const LockUser = require("../../application/use-cases/users/LockUser");
const UnlockUser = require("../../application/use-cases/users/UnlockUser");
const DisableUser = require("../../application/use-cases/users/DisableUser");
const EnableUser = require("../../application/use-cases/users/EnableUser");
const {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
} = require("../../application/dto");
const userRepository = require("../../infrastructure/database/mongoose/repositories/MongoUserRepository");
const { asyncHandler, ResponseHelper } = require("../../shared");
const ErrorHelper = require("../../shared/errors/ErrorHelper");

const createUserUseCase = new CreateUser({ userRepository });
const getAllUsersUseCase = new GetAllUsers({ userRepository });
const getUserByIdUseCase = new GetUserById({ userRepository });
const updateUserUseCase = new UpdateUser({ userRepository });
const deleteUserUseCase = new DeleteUser({ userRepository });
const lockUserUseCase = new LockUser({ userRepository });
const unlockUserUseCase = new UnlockUser({ userRepository });
const disableUserUseCase = new DisableUser({ userRepository });
const enableUserUseCase = new EnableUser({ userRepository });

const extractCallerAndContext = (req) => {
  const user = req.user || {};
  const userBranchIds = (user.branchIds || [])
    .map((b) => (b && b._id ? b._id.toString() : (b ? b.toString() : "")))
    .filter(Boolean);

  if (user.branchId) {
    const sId = user.branchId._id ? user.branchId._id.toString() : user.branchId.toString();
    if (!userBranchIds.includes(sId)) userBranchIds.push(sId);
  }

  const isSuperAdmin = Boolean(
    req.authz?.isSuperAdmin ||
    user.role === "admin" ||
    user.role === "SUPER_ADMIN" ||
    user.roleCode === "SUPER_ADMIN" ||
    user.roleCode === "ADMIN" ||
    user.roleCode === "INTERNAL_ADMIN"
  );

  const caller = {
    _id: user._id || user.id || user.uid,
    id: user._id || user.id || user.uid,
    userId: user._id || user.id || user.uid,
    email: user.email,
    role: user.role,
    roleCode: user.roleCode,
    isSuperAdmin,
    userBranchIds,
  };

  const requestContext = {
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers["user-agent"],
  };

  return { caller, requestContext };
};

const createUser = asyncHandler(async (req, res) => {
  const { caller, requestContext } = extractCallerAndContext(req);
  const createUserDto = CreateUserDto.fromRequest(req);
  createUserDto.validate();
  const user = await createUserUseCase.execute(createUserDto, caller, requestContext);
  return ResponseHelper.created(
    res,
    UserResponseDto.fromEntity(user),
    `Successfully created ${user.role} ${user.name}`
  );
});

const getAllUsers = asyncHandler(async (req, res) => {
  const { caller } = extractCallerAndContext(req);
  const filters = { ...req.query };

  // Enforce branch scoping for non-super-admins
  if (!caller.isSuperAdmin) {
    if (caller.userBranchIds.length === 0) {
      return ResponseHelper.success(res, [], "Users retrieved successfully");
    }
    // Limit to caller's branches
    filters.branchId = caller.userBranchIds[0];
  }

  const users = await getAllUsersUseCase.execute(filters);
  return ResponseHelper.success(
    res,
    UserResponseDto.fromEntities(users),
    "Users retrieved successfully"
  );
});

const getUserById = asyncHandler(async (req, res) => {
  const { caller } = extractCallerAndContext(req);
  const targetId = (req.params.id === "profile" || req.params.id === "me")
    ? (caller.userId || "").toString()
    : req.params.id;

  const user = await getUserByIdUseCase.execute(targetId);
  if (!user) {
    throw ErrorHelper.notFound("User not found");
  }

  // Check branch scope if not self and not super admin
  if (!caller.isSuperAdmin && targetId !== caller.userId?.toString()) {
    const userBranchStr = user.branchId ? user.branchId.toString() : null;
    if (!userBranchStr || !caller.userBranchIds.includes(userBranchStr)) {
      throw ErrorHelper.notFound("User not found");
    }
  }

  return ResponseHelper.success(
    res,
    UserResponseDto.fromEntity(user),
    "User retrieved successfully"
  );
});

const getProfile = asyncHandler(async (req, res) => {
  const { caller } = extractCallerAndContext(req);
  const user = await getUserByIdUseCase.execute(caller.userId);
  return ResponseHelper.success(
    res,
    UserResponseDto.fromEntity(user),
    "User profile retrieved successfully"
  );
});

const updateUser = asyncHandler(async (req, res) => {
  const { caller, requestContext } = extractCallerAndContext(req);
  const targetId = (req.params.id === "profile" || req.params.id === "me")
    ? (caller.userId || "").toString()
    : req.params.id;

  const updateUserDto = UpdateUserDto.fromRequest(req);
  updateUserDto.validate();
  const user = await updateUserUseCase.execute(targetId, updateUserDto, caller, requestContext);
  return ResponseHelper.success(
    res,
    UserResponseDto.fromEntity(user),
    "User updated successfully"
  );
});

const deleteUser = asyncHandler(async (req, res) => {
  const result = await deleteUserUseCase.execute(req.params.id, true);
  return ResponseHelper.success(res, result, "User deleted successfully");
});

const lockUser = asyncHandler(async (req, res) => {
  const { caller, requestContext } = extractCallerAndContext(req);
  const result = await lockUserUseCase.execute(req.params.id, req.body || {}, caller, requestContext);
  return ResponseHelper.success(res, UserResponseDto.fromEntity(result), "User account locked successfully");
});

const unlockUser = asyncHandler(async (req, res) => {
  const { caller, requestContext } = extractCallerAndContext(req);
  const result = await unlockUserUseCase.execute(req.params.id, req.body || {}, caller, requestContext);
  return ResponseHelper.success(res, UserResponseDto.fromEntity(result), "User account unlocked successfully");
});

const disableUser = asyncHandler(async (req, res) => {
  const { caller, requestContext } = extractCallerAndContext(req);
  const result = await disableUserUseCase.execute(req.params.id, req.body || {}, caller, requestContext);
  return ResponseHelper.success(res, UserResponseDto.fromEntity(result), "User account disabled successfully");
});

const enableUser = asyncHandler(async (req, res) => {
  const { caller, requestContext } = extractCallerAndContext(req);
  const result = await enableUserUseCase.execute(req.params.id, req.body || {}, caller, requestContext);
  return ResponseHelper.success(res, UserResponseDto.fromEntity(result), "User account enabled successfully");
});

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  getProfile,
  updateUser,
  deleteUser,
  lockUser,
  unlockUser,
  disableUser,
  enableUser,
};


