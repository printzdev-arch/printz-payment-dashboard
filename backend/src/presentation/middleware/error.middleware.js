const env = require("../../infrastructure/config/env");
const AppError = require("../../shared/errors/AppError");

/**
 * Central Error Middleware
 * Single authority for converting thrown/caught exceptions into standard JSON error responses.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || "Internal Server Error";
  let code = err.code || "INTERNAL_SERVER_ERROR";
  let details = err.details || null;

  // 1. Handled AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details;
  }
  // 2. Mongoose CastError (Bad/Malformed ObjectId)
  else if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 400;
    code = "BAD_REQUEST";
    const path = err.path || "ID";
    if (path === "_id") {
      message = "Invalid ID format.";
    } else if (path === "branchId") {
      message = "Invalid branch ID format.";
    } else {
      message = `Invalid ${path} format.`;
    }
  }
  // 3. MongoDB Duplicate Key Error (E11000)
  else if (err.code === 11000 || (err.name === "MongoServerError" && err.code === 11000)) {
    statusCode = 409;
    code = "CONFLICT";
    const keyValue = err.keyValue || {};
    if (keyValue.categoryId) {
      message = `Category ID '${keyValue.categoryId}' already exists.`;
    } else if (keyValue.code) {
      message = `Branch code '${keyValue.code}' already exists.`;
    } else if (keyValue.name) {
      message = `Branch name '${keyValue.name}' already exists.`;
    } else {
      const field = Object.keys(keyValue)[0] || "field";
      message = `Duplicate value entered for '${field}'. Please use a unique value.`;
    }
    details = err.keyValue;
  }
  // 4. Mongoose Schema Validation Error
  else if (err.name === "ValidationError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    details = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
  }
  // 5. JWT Invalid Signature
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    code = "INVALID_TOKEN";
    message = "Invalid token. Please authenticate.";
  }
  // 6. JWT Expired Token
  else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    code = "TOKEN_EXPIRED";
    message = "Token expired. Please log in again.";
  }
  // 7. Generic / Unexpected errors
  else if (statusCode === 500) {
    code = "INTERNAL_SERVER_ERROR";
    // Avoid leaking raw internal error messages in production
    if (env.NODE_ENV === "production" && !err.isOperational) {
      message = "An unexpected internal server error occurred.";
    }
  }

  // Construct standard clean error payload
  const responsePayload = {
    success: false,
    message,
    code,
  };

  if (details !== null && details !== undefined) {
    responsePayload.details = details;
  }

  return res.status(statusCode).json(responsePayload);
};

module.exports = errorHandler;
