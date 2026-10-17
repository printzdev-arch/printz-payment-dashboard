const userService = require("../../services/auth/user.service");
const {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
} = require("../../utils/dto");
const { asyncHandler, ResponseHelper, ApiError } = require("../../utils");

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
  const user = await userService.createUser(createUserDto, caller, requestContext);
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
    filters.branchId = caller.userBranchIds[0];
  }

  const users = await userService.getAllUsers(filters);
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

  const user = await userService.getUserById(targetId);
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  // Check branch scope if not self and not super admin
  if (!caller.isSuperAdmin && targetId !== caller.userId?.toString()) {
    const userBranchStr = user.branchId ? user.branchId.toString() : null;
    if (!userBranchStr || !caller.userBranchIds.includes(userBranchStr)) {
      throw ApiError.notFound("User not found");
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
  const user = await userService.getUserById(caller.userId);
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
  const user = await userService.updateUser(targetId, updateUserDto, caller, requestContext);
  return ResponseHelper.success(
    res,
    UserResponseDto.fromEntity(user),
    "User updated successfully"
  );
});

const deleteUser = asyncHandler(async (req, res) => {
  const result = await userService.deleteUser(req.params.id, true);
  return ResponseHelper.success(res, result, "User deleted successfully");
});

const lockUser = asyncHandler(async (req, res) => {
  const { caller, requestContext } = extractCallerAndContext(req);
  const result = await userService.lockUser(req.params.id, req.body || {}, caller, requestContext);
  return ResponseHelper.success(res, UserResponseDto.fromEntity(result), "User account locked successfully");
});

const unlockUser = asyncHandler(async (req, res) => {
  const { caller, requestContext } = extractCallerAndContext(req);
  const result = await userService.unlockUser(req.params.id, req.body || {}, caller, requestContext);
  return ResponseHelper.success(res, UserResponseDto.fromEntity(result), "User account unlocked successfully");
});

const disableUser = asyncHandler(async (req, res) => {
  const { caller, requestContext } = extractCallerAndContext(req);
  const result = await userService.disableUser(req.params.id, req.body || {}, caller, requestContext);
  return ResponseHelper.success(res, UserResponseDto.fromEntity(result), "User account disabled successfully");
});

const enableUser = asyncHandler(async (req, res) => {
  const { caller, requestContext } = extractCallerAndContext(req);
  const result = await userService.enableUser(req.params.id, req.body || {}, caller, requestContext);
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
