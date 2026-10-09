/**
 * API 01 - Auth & Master Request Validators
 */

const authValidator = require("../auth.validator");
const userValidator = require("../user.validator");

module.exports = {
  ...authValidator,
  ...userValidator,
};
