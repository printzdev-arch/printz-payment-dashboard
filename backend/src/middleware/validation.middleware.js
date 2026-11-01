const { validationResult } = require("express-validator");
const ApiError = require("../utils/ApiError");

/**
 * Validate express-validator request rules and throw standardized ApiError if invalid.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));
    return next(ApiError.validation("Request validation failed", formattedErrors));
  }
  next();
};

module.exports = {
  validate,
  validateRequest: validate,
};
