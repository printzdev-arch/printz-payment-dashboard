const numberSequenceService = require("../../../application/services/common/numberSequence.service");
const { asyncHandler, ResponseHelper } = require("../../../shared");

const getNumberSequences = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, sequenceKey, branchId } = req.query;

  const filters = {};
  if (sequenceKey) filters.sequenceKey = String(sequenceKey).trim().toUpperCase();
  if (branchId) filters.branchId = String(branchId).trim();

  const pagination = { page: Number(page), limit: Number(limit) };
  const result = await numberSequenceService.listSequences(filters, pagination, { user: req.user });

  return ResponseHelper.success(res, result, "Number sequences retrieved successfully");
});

module.exports = {
  getNumberSequences,
};
