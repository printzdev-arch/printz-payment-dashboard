const LoginUser = require("../../application/use-cases/auth/LoginUser");
const GetCurrentUser = require("../../application/use-cases/auth/GetCurrentUser");
const RefreshToken = require("../../application/use-cases/auth/RefreshToken");
const LogoutUser = require("../../application/use-cases/auth/LogoutUser");
const { LoginDto, RefreshTokenDto, LogoutDto, UserResponseDto } = require("../../application/dto");
const userRepository = require("../../infrastructure/database/mongoose/repositories/MongoUserRepository");
const tokenService = require("../../infrastructure/auth/JwtTokenService");
const tokenBlacklistService = require("../../infrastructure/auth/TokenBlacklistService");
const passwordService = require("../../infrastructure/auth/BcryptPasswordService");
const { asyncHandler, ResponseHelper } = require("../../shared");

// Instantiate use cases with injected dependencies
const loginUserUseCase = new LoginUser({ userRepository, tokenService, passwordService });
const getCurrentUserUseCase = new GetCurrentUser({ userRepository });
const refreshTokenUseCase = new RefreshToken({ userRepository, tokenService, tokenBlacklistService });
const logoutUserUseCase = new LogoutUser({ userRepository, tokenBlacklistService });

const login = asyncHandler(async (req, res) => {
  const loginDto = LoginDto.fromRequest(req);
  const requestContext = {
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers["user-agent"],
  };
  const result = await loginUserUseCase.execute(loginDto, requestContext);
  if (result && result.user) {
    result.user = UserResponseDto.fromEntity(result.user);
  }
  return ResponseHelper.success(res, result, "Login successful");
});

const refreshToken = asyncHandler(async (req, res) => {
  const refreshTokenDto = RefreshTokenDto.fromRequest(req);
  const result = await refreshTokenUseCase.execute(refreshTokenDto);
  return ResponseHelper.success(res, result, "Token refreshed successfully");
});

const getMe = asyncHandler(async (req, res) => {
  const user = await getCurrentUserUseCase.execute(req.user._id || req.user.id || req.user.userId);
  return ResponseHelper.success(res, UserResponseDto.fromEntity(user), "User profile retrieved successfully");
});

const logout = asyncHandler(async (req, res) => {
  const logoutDto = LogoutDto.fromRequest(req);
  const payload = {
    ...(typeof logoutDto === "object" ? logoutDto : {}),
    userId: req.user?._id || req.user?.id || req.user?.userId,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers["user-agent"],
  };
  const result = await logoutUserUseCase.execute(payload);
  return ResponseHelper.success(res, result, "Logged out successfully");
});

const sendPasswordResetEmailUseCase = require("../../application/use-cases/auth/SendPasswordResetEmail");
const resetPasswordWithTokenUseCase = require("../../application/use-cases/auth/ResetPasswordWithToken");

const sendResetEmail = asyncHandler(async (req, res) => {
  const { email, userId } = req.body || {};
  const targetEmail = email || (req.body && req.body.emailAddress);
  const result = await sendPasswordResetEmailUseCase.execute({ email: targetEmail, userId });
  return ResponseHelper.success(res, result, result.message);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, token, newPassword, password } = req.body || {};
  const result = await resetPasswordWithTokenUseCase.execute({
    email,
    token,
    newPassword: newPassword || password,
  });
  return ResponseHelper.success(res, result, result.message);
});

module.exports = {
  login,
  refreshToken,
  getMe,
  logout,
  sendResetEmail,
  resetPassword,
};
