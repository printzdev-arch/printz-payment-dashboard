const JobClosureService = require("../../services/settlement/jobClosure.service");
const ResponseHelper = require("../../utils/ResponseHelper");
const asyncHandler = require("../../utils/asyncHandler");

class JobClosureController {
  static closeJob = asyncHandler(async (req, res) => {
    const result = await JobClosureService.closeJob(req.params.id, req.body, req.user, req.authz);
    return ResponseHelper.ok(res, "Job order administratively closed and locked successfully", result);
  });

  static getClosureDetails = asyncHandler(async (req, res) => {
    const result = await JobClosureService.getClosureDetails(req.params.id, req.user, req.authz);
    return ResponseHelper.ok(res, "Job closure details retrieved successfully", result);
  });

  static reopenJob = asyncHandler(async (req, res) => {
    const result = await JobClosureService.reopenJob(req.params.id, req.body, req.user, req.authz);
    return ResponseHelper.ok(res, "Job order reopened successfully", result);
  });
}

module.exports = JobClosureController;
