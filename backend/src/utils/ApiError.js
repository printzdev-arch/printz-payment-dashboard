/**
 * ApiError
 * Standard operational HTTP error class for the MVC backend.
 */
class ApiError extends Error {
  constructor(
    message,
    statusCode = 500,
    code = "INTERNAL_SERVER_ERROR",
    details = null
  ) {
    super(message);

    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad Request", details = null) {
    return new ApiError(message, 400, "BAD_REQUEST", details);
  }

  static unauthorized(message = "Authentication required. Please log in.", details = null) {
    return new ApiError(message, 401, "UNAUTHORIZED", details);
  }

  static forbidden(message = "Access denied. You do not have permission to perform this action.", details = null) {
    return new ApiError(message, 403, "FORBIDDEN", details);
  }

  static notFound(message = "Resource not found", details = null) {
    return new ApiError(message, 404, "NOT_FOUND", details);
  }

  static conflict(message = "Resource already exists", details = null) {
    return new ApiError(message, 409, "CONFLICT", details);
  }

  static validation(message = "Request validation failed", details = null) {
    return new ApiError(message, 400, "VALIDATION_ERROR", details);
  }

  static unprocessableEntity(message = "Unprocessable Entity", details = null) {
    return new ApiError(message, 422, "UNPROCESSABLE_ENTITY", details);
  }

  static database(message = "Database operation failed", details = null) {
    return new ApiError(message, 500, "DATABASE_ERROR", details);
  }

  static internal(message = "Internal server error", details = null) {
    return new ApiError(message, 500, "INTERNAL_SERVER_ERROR", details);
  }

  static locked(message = "Account is locked. Please try again later or contact an administrator.", details = null) {
    return new ApiError(message, 423, "LOCKED", details);
  }
}

module.exports = ApiError;
