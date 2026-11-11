const dayEndService = require("../services/dayEnd.service");
const { asyncHandler, ResponseHelper } = require("../../../utils");

const closeDay = asyncHandler(async (req, res) => {
  const result = await dayEndService.closeDayAndEmail(req.user);
  const message = result.delivered
    ? `Day end report emailed to ${result.sentTo}`
    : "Day end report generated, but email is NOT delivered: SMTP is not configured on the server";
  return ResponseHelper.success(res, result, message);
});

module.exports = { closeDay };
