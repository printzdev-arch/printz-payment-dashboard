/**
 * API 02 - Common Services Validators
 */

const { body, query, param } = require("express-validator");

const idParamValidator = [
  param("id").isMongoId().withMessage("Valid MongoDB ID is required in URL path."),
];

module.exports = {
  idParamValidator,
};
