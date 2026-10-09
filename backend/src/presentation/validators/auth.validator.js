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
  body()
    .custom((body) => {
      const id = body.email || body.username || body.identifier || body.phone;
      if (!id || typeof id !== "string" || !id.trim()) {
        throw new Error("Username, email, or phone number is required");
      }
      return true;
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
