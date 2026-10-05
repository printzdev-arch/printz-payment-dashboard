const tokenService = require("../../infrastructure/auth/JwtTokenService");
const tokenBlacklistService = require("../../infrastructure/auth/TokenBlacklistService");
const userRepository = require("../../infrastructure/database/mongoose/repositories/MongoUserRepository");
const ErrorHelper = require("../../shared/errors/ErrorHelper");

const authenticate = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(ErrorHelper.unauthorized("Authentication token is missing."));
  }

  if (tokenBlacklistService.isBlacklisted(token)) {
    return next(ErrorHelper.unauthorized("Authentication token has been revoked. Please log in again."));
  }

  try {
    const decoded = tokenService.verifyToken(token);
    const user = await userRepository.findById(decoded.userId);

    if (!user) {
      return next(ErrorHelper.unauthorized("The user belonging to this token no longer exists."));
    }

    if (!user.isActive) {
      return next(ErrorHelper.forbidden("Your account has been deactivated. Please contact an admin."));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(error);
  }
};

const optionalAuthenticate = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token && req.body?.accessToken) {
    token = req.body.accessToken;
  }

  if (!token) {
    return next();
  }

  if (tokenBlacklistService.isBlacklisted(token)) {
    return next();
  }

  try {
    const decoded = tokenService.verifyToken(token);
    const user = await userRepository.findById(decoded.userId);
    if (user && user.isActive) {
      req.user = user;
    }
  } catch (error) {
    // Gracefully proceed without error for optional authentication
  }

  next();
};

module.exports = {
  authenticate,
  optionalAuthenticate,
};
