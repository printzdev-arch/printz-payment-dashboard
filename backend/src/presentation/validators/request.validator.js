const { param, query } = require("express-validator");
const { validate } = require("./auth.validator");

const mongoIdParamValidator = (paramName = "id") => [
  param(paramName)
    .notEmpty()
    .withMessage(`${paramName} is required`),
  validate,
];

module.exports = {
  mongoIdParamValidator,
};
