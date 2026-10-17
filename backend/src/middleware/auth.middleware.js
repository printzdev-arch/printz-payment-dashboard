const tokenService = require("../utils/JwtTokenService");
const tokenBlacklistService = require("../utils/TokenBlacklistService");
const User = require("../models/User");
const ErrorHelper = require("../utils/errors/ErrorHelper");

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
    const userId = decoded.userId || decoded.id;
    let user;
    if (typeof User.findByIdEnriched === "function") {
      user = await User.findByIdEnriched(userId);
    } else {
      user = await User.findById(userId).populate("roleIds");
    }

    if (!user) {
      return next(ErrorHelper.unauthorized("The user belonging to this token no longer exists."));
    }

    if (!user.isActive || user.status === "DISABLED") {
      return next(ErrorHelper.forbidden("Your account has been deactivated or disabled. Please contact an admin."));
    }

    if (user.status === "LOCKED") {
      if (!user.lockoutEnd || new Date(user.lockoutEnd) > new Date()) {
        const remainingMinutes = user.lockoutEnd
          ? Math.ceil((new Date(user.lockoutEnd) - new Date()) / 60000)
          : 15;
        return next(
          ErrorHelper.locked(
            `Account is temporarily locked due to consecutive failed attempts. Please try again in ${remainingMinutes} minute(s).`
          )
        );
      }
    }

    if (user.employee && (user.employee.employmentStatus !== "ACTIVE" || !user.employee.isActive)) {
      return next(
        ErrorHelper.forbidden(
          "Account access denied: Linked employee profile is inactive or departed."
        )
      );
    }

    // Restrict accounts with mandatory password change pending
    if (user.mustChangePassword) {
      const allowedPaths = [
        "/change-password",
        "/auth/change-password",
        "/users/change-password",
        "/logout",
        "/auth/logout",
        "/me",
        "/auth/me",
        "/profile",
      ];

      const reqPath = (req.path || "").toLowerCase();
      const reqUrl = (req.originalUrl || "").toLowerCase();

      const isAllowed = allowedPaths.some(
        (p) => reqPath === p || reqPath.endsWith(p) || reqUrl.includes(p)
      );

      if (!isAllowed) {
        const AppError = require("../utils/errors/AppError");
        return next(
          new AppError(
            "Mandatory password change required. You must change your temporary password before accessing the application.",
            403,
            "PASSWORD_CHANGE_REQUIRED"
          )
        );
      }
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
    const userId = decoded.userId || decoded.id;
    let user;
    if (typeof User.findByIdEnriched === "function") {
      user = await User.findByIdEnriched(userId);
    } else {
      user = await User.findById(userId).populate("roleIds");
    }

    if (
      user &&
      user.isActive &&
      user.status !== "DISABLED" &&
      user.status !== "LOCKED" &&
      (!user.employee || (user.employee.employmentStatus === "ACTIVE" && user.employee.isActive))
    ) {
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
