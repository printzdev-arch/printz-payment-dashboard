const CreateUser = require("../../application/use-cases/users/CreateUser");
const GetAllUsers = require("../../application/use-cases/users/GetAllUsers");
const GetUserById = require("../../application/use-cases/users/GetUserById");
const UpdateUser = require("../../application/use-cases/users/UpdateUser");
const DeleteUser = require("../../application/use-cases/users/DeleteUser");
const {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
} = require("../../application/dto");
const userRepository = require("../../infrastructure/database/mongoose/repositories/MongoUserRepository");
const { asyncHandler, ResponseHelper } = require("../../shared");

const createUserUseCase = new CreateUser({ userRepository });
const getAllUsersUseCase = new GetAllUsers({ userRepository });
const getUserByIdUseCase = new GetUserById({ userRepository });
const updateUserUseCase = new UpdateUser({ userRepository });
const deleteUserUseCase = new DeleteUser({ userRepository });

const createUser = asyncHandler(async (req, res) => {
  const createUserDto = CreateUserDto.fromRequest(req);
  createUserDto.validate();
  const user = await createUserUseCase.execute(createUserDto);
  return ResponseHelper.created(
    res,
    UserResponseDto.fromEntity(user),
    `Successfully created ${user.role} ${user.name}`
  );
});

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await getAllUsersUseCase.execute(req.query);
  return ResponseHelper.success(
    res,
    UserResponseDto.fromEntities(users),
    "Users retrieved successfully"
  );
});

const getUserById = asyncHandler(async (req, res) => {
  if (req.params.id === "profile" || req.params.id === "me") {
    const userId = (req.user?._id || req.user?.id || req.user?.uid || "").toString();
    const user = await getUserByIdUseCase.execute(userId);
    return ResponseHelper.success(
      res,
      UserResponseDto.fromEntity(user),
      "User profile retrieved successfully"
    );
  }
  const user = await getUserByIdUseCase.execute(req.params.id);
  return ResponseHelper.success(
    res,
    UserResponseDto.fromEntity(user),
    "User retrieved successfully"
  );
});

const getProfile = asyncHandler(async (req, res) => {
  const userId = (req.user?._id || req.user?.id || req.user?.uid || "").toString();
  const user = await getUserByIdUseCase.execute(userId);
  return ResponseHelper.success(
    res,
    UserResponseDto.fromEntity(user),
    "User profile retrieved successfully"
  );
});

const updateUser = asyncHandler(async (req, res) => {
  const currentUserId = (req.user?._id || req.user?.id || req.user?.uid || "").toString();
  const isAdmin = req.user?.role === "admin";
  const targetId = (req.params.id === "profile" || req.params.id === "me")
    ? currentUserId
    : req.params.id;

  if (!isAdmin && currentUserId !== targetId) {
    return ResponseHelper.forbidden(res, "You are not authorized to update another user's profile");
  }

  const updateUserDto = UpdateUserDto.fromRequest(req);
  if (!isAdmin) {
    delete updateUserDto.role;
    delete updateUserDto.permissions;
    delete updateUserDto.isActive;
  }
  updateUserDto.validate();
  const user = await updateUserUseCase.execute(targetId, updateUserDto);
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

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  getProfile,
  updateUser,
  deleteUser,
};

