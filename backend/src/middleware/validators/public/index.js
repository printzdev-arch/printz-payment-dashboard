const publicDesignApproval = require("./publicDesignApproval.validator");
const publicJobRequest = require("./publicJobRequest.validator");

module.exports = {
  ...publicDesignApproval,
  ...publicJobRequest,
};
