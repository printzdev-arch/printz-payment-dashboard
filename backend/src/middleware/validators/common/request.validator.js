const { param, query } = require("express-validator");
const { validate } = require("../../validation.middleware");

const mongoIdParamValidator = (paramName = "id") => [
  param(paramName)
    .notEmpty()
    .withMessage(`${paramName} is required`),
  validate,
];

module.exports = {
  mongoIdParamValidator,
};
