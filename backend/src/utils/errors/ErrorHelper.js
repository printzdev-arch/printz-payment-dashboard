const AppError = require("./AppError");

/**
 * ErrorHelper
 * Centralized static factory for creating standard Application Errors.
 */
class ErrorHelper {
  static badRequest(message = "Bad Request", details = null) {
    return new AppError(message, 400, "BAD_REQUEST", details);
  }

  static unauthorized(message = "Authentication required. Please log in.", details = null) {
    return new AppError(message, 401, "UNAUTHORIZED", details);
  }

  static forbidden(message = "Access denied. You do not have permission to perform this action.", details = null) {
    return new AppError(message, 403, "FORBIDDEN", details);
  }

  static notFound(message = "Resource not found", details = null) {
    return new AppError(message, 404, "NOT_FOUND", details);
  }

  static conflict(message = "Resource already exists", details = null) {
    return new AppError(message, 409, "CONFLICT", details);
  }

  static validation(message = "Request validation failed", details = null) {
    return new AppError(message, 400, "VALIDATION_ERROR", details);
  }

  static unprocessableEntity(message = "Unprocessable Entity", details = null) {
    return new AppError(message, 422, "UNPROCESSABLE_ENTITY", details);
  }

  static database(message = "Database operation failed", details = null) {
    return new AppError(message, 500, "DATABASE_ERROR", details);
  }

  static internal(message = "Internal server error", details = null) {
    return new AppError(message, 500, "INTERNAL_SERVER_ERROR", details);
  }

  static locked(message = "Account is locked. Please try again later or contact an administrator.", details = null) {
    return new AppError(message, 423, "LOCKED", details);
  }
}

module.exports = ErrorHelper;
