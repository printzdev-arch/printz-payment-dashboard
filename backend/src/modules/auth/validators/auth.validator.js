const { body, validationResult } = require("express-validator");
const ErrorHelper = require("../../../utils/ApiError");

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
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),
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
