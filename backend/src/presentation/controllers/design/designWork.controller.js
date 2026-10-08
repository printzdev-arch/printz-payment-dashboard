const asyncHandler = require("../../../shared/asyncHandler");
const ResponseHelper = require("../../../shared/response/ResponseHelper");
const DesignWorkService = require("../../../application/services/design/designWork.service");

/**
 * Designer Work Controller (accept, reject, start, myJobs)
 */
const accept = asyncHandler(async (req, res) => {
  const assignment = await DesignWorkService.accept(req.params.id, req.user);
  return ResponseHelper.ok(res, "Assignment accepted successfully", assignment);
});

const reject = asyncHandler(async (req, res) => {
  const reason = req.body.rejectionReason || req.body.reason || "Designer rejected";
  const result = await DesignWorkService.reject(req.params.id, reason, req.user);
  return ResponseHelper.ok(res, "Assignment rejected and requeued", result);
});

const start = asyncHandler(async (req, res) => {
  const job = await DesignWorkService.start(req.params.id, req.user);
  return ResponseHelper.ok(res, "Design work started; stage moved to DESIGN_IN_PROGRESS", job);
});

const getMyJobs = asyncHandler(async (req, res) => {
  const jobs = await DesignWorkService.myJobs(req.user, req.query.state);
  return ResponseHelper.ok(res, "Designer assignments retrieved successfully", jobs);
});

module.exports = {
  accept,
  reject,
  start,
  getMyJobs,
};
