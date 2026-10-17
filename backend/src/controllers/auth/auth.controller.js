const authService = require("../../services/auth/auth.service");
const { LoginDto, RefreshTokenDto, LogoutDto, UserResponseDto } = require("../../utils/dto");
const { asyncHandler, ResponseHelper } = require("../../utils");

const login = asyncHandler(async (req, res) => {
  const loginDto = LoginDto.fromRequest(req);
  const requestContext = {
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers["user-agent"],
  };
  const result = await authService.login(loginDto, requestContext);
  if (result && result.user) {
    result.user = UserResponseDto.fromEntity(result.user);
  }
  return ResponseHelper.success(res, result, "Login successful");
});

const refreshToken = asyncHandler(async (req, res) => {
  const refreshTokenDto = RefreshTokenDto.fromRequest(req);
  const result = await authService.refreshToken(refreshTokenDto);
  return ResponseHelper.success(res, result, "Token refreshed successfully");
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user._id || req.user.id || req.user.userId);
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
  const result = await authService.logout(payload);
  return ResponseHelper.success(res, result, "Logged out successfully");
});

const sendResetEmail = asyncHandler(async (req, res) => {
  const { email, userId } = req.body || {};
  const targetEmail = email || (req.body && req.body.emailAddress);
  const result = await authService.sendPasswordResetEmail({ email: targetEmail, userId });
  return ResponseHelper.success(res, result, result.message);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, token, newPassword, password } = req.body || {};
  const result = await authService.resetPasswordWithToken({
    email,
    token,
    newPassword: newPassword || password,
  });
  return ResponseHelper.success(res, result, result.message);
});

const getDesignersList = asyncHandler(async (req, res) => {
  const DesignAllocationService = require("../../services/design/designAllocation.service");
  const pool = await DesignAllocationService.pool();
  const designers = pool.designers || [];
  return ResponseHelper.success(res, designers, "Designers list retrieved successfully");
});

module.exports = {
  login,
  refreshToken,
  getMe,
  logout,
  sendResetEmail,
  resetPassword,
  getDesignersList,
};
