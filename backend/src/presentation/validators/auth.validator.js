const { body, validationResult } = require("express-validator");
const ErrorHelper = require("../../shared/errors/ErrorHelper");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));
    return next(ErrorHelper.validation("Request validation failed", formattedErrors));
  }
  next();
};

const loginValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email or phone number is required")
    .customSanitizer((val) => {
      if (typeof val === "string") {
        const trimmed = val.trim();
        return trimmed.includes("@") ? trimmed.toLowerCase() : trimmed;
      }
      return val;
    }),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
  validate,
];

const refreshTokenValidator = [
  body("refreshToken")
    .notEmpty()
    .withMessage("Refresh token is required"),
  validate,
];

module.exports = {
  validate,
  loginValidator,
  refreshTokenValidator,
};
