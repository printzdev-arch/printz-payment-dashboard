/**
 * API 02 - Common Services DTOs
 */

const CommonDto = require("../CommonDto");
const PastDateRequestDto = require("../PastDateRequestDto");

module.exports = {
  ...CommonDto,
  ...PastDateRequestDto,
};
