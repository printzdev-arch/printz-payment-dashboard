const asyncHandler = require("../../../shared/asyncHandler");
const ResponseHelper = require("../../../shared/response/ResponseHelper");
const ProductionOperationService = require("../../../application/services/production/productionOperation.service");

/**
 * Production Operations Controller
 */
const assignOperation = asyncHandler(async (req, res) => {
  const updated = await ProductionOperationService.assign(
    req.params.id,
    req.body.assignedEmployeeId,
    req.user
  );
  return ResponseHelper.ok(res, "Operation assigned successfully", updated);
});

const claimOperation = asyncHandler(async (req, res) => {
  const claimed = await ProductionOperationService.claim(req.params.id, req.user);
  return ResponseHelper.ok(res, "Operation claimed successfully", claimed);
});

const startOperation = asyncHandler(async (req, res) => {
  const started = await ProductionOperationService.start(
    req.params.id,
    req.body,
    req.user
  );
  return ResponseHelper.ok(res, "Operation started successfully", started);
});

const completeOperation = asyncHandler(async (req, res) => {
  const completed = await ProductionOperationService.complete(
    req.params.id,
    req.body,
    req.user
  );
  return ResponseHelper.ok(res, "Operation completed successfully", completed);
});

const failOperation = asyncHandler(async (req, res) => {
  const failed = await ProductionOperationService.fail(
    req.params.id,
    req.body.remarks,
    req.user
  );
  return ResponseHelper.ok(res, "Operation marked as failed", failed);
});

const retryOperation = asyncHandler(async (req, res) => {
  const retried = await ProductionOperationService.retry(req.params.id, req.user);
  return ResponseHelper.ok(res, "Operation reset for retry in queue", retried);
});

const skipOperation = asyncHandler(async (req, res) => {
  const skipped = await ProductionOperationService.skip(
    req.params.id,
    req.body.remarks,
    req.user
  );
  return ResponseHelper.ok(res, "Operation skipped successfully", skipped);
});

module.exports = {
  assignOperation,
  claimOperation,
  startOperation,
  completeOperation,
  failOperation,
  retryOperation,
  skipOperation,
};
