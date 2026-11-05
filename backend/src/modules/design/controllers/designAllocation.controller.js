const asyncHandler = require("../../../utils/asyncHandler");
const ResponseHelper = require("../../../utils/ResponseHelper");
const DesignAllocationService = require("../services/designAllocation.service");

/**
 * Design Allocation Controller
 */
const autoAllocate = asyncHandler(async (req, res) => {
  const result = await DesignAllocationService.autoAllocate(req.params.id, req.user);
  if (!result || !result.assigned) {
    return ResponseHelper.error(
      res,
      result?.message || `Could not allocate designer: ${result?.reason || "No eligible designer available"}`,
      409,
      "CONFLICT"
    );
  }
  return ResponseHelper.ok(res, "Designer auto-allocation processed", result);
});

const autoAssignQueue = asyncHandler(async (req, res) => {
  const results = await DesignAllocationService.autoAssignQueue(req.user);
  return ResponseHelper.ok(res, "Queue auto-assignment processed", results);
});

const assignDesigner = asyncHandler(async (req, res) => {
  const { method, employeeId } = req.body;
  const result = await DesignAllocationService.assign(
    req.params.id,
    method || "ROUND_ROBIN",
    employeeId,
    req.user
  );
  if (result && result.assigned === false) {
    return ResponseHelper.error(
      res,
      result.message || `Could not assign a designer: ${result.reason || "No eligible designer available"}`,
      409,
      "CONFLICT"
    );
  }
  return ResponseHelper.ok(res, "Designer assigned successfully", result);
});

const reassignDesigner = asyncHandler(async (req, res) => {
  const { target, reason } = req.body;
  const result = await DesignAllocationService.reassign(
    req.params.id,
    target || "ROUND_ROBIN",
    reason || "Reassigned",
    req.user
  );
  return ResponseHelper.ok(res, "Designer reassigned successfully", result);
});

const getAssignmentHistory = asyncHandler(async (req, res) => {
  const history = await DesignAllocationService.history(req.params.id, req.user);
  return ResponseHelper.ok(res, "Assignment history retrieved successfully", history);
});

const getDesignQueue = asyncHandler(async (req, res) => {
  const queue = await DesignAllocationService.queue(req.query, req.user);
  return ResponseHelper.ok(res, "Design queue retrieved successfully", queue);
});

const getDesignerPool = asyncHandler(async (req, res) => {
  const pool = await DesignAllocationService.pool(req.user, {
    includeInactive: String(req.query.includeInactive) === "true",
  });
  return ResponseHelper.ok(res, "Designer pool retrieved successfully", pool);
});

const getWorkload = asyncHandler(async (req, res) => {
  const workload = await DesignAllocationService.workload(req.query.branchId, req.user);
  return ResponseHelper.ok(res, "Designer workload retrieved successfully", workload);
});

const getRecentAssignments = asyncHandler(async (req, res) => {
  const assignments = await DesignAllocationService.recentAssignments(req.query.limit || 10, req.user);
  return ResponseHelper.ok(res, "Recent designer assignments retrieved successfully", assignments);
});

const getRejectedAssignments = asyncHandler(async (req, res) => {
  const rejected = await DesignAllocationService.rejectedAssignments(req.query.limit || 50, req.user);
  return ResponseHelper.ok(res, "Rejected assignments retrieved successfully", rejected);
});

const addDesigner = asyncHandler(async (req, res) => {
  const designer = await DesignAllocationService.addDesigner(req.body);
  return ResponseHelper.ok(res, "Designer added successfully", designer);
});

const updateDesigner = asyncHandler(async (req, res) => {
  const designer = await DesignAllocationService.updateDesigner(req.params.id, req.body);
  return ResponseHelper.ok(res, "Designer updated successfully", designer);
});

const updateGlobalMaxLoad = asyncHandler(async (req, res) => {
  const result = await DesignAllocationService.updateGlobalMaxLoad(req.body.maxLoad);
  return ResponseHelper.ok(res, "Global max load limit updated successfully", result);
});

module.exports = {
  autoAllocate,
  autoAssignQueue,
  assignDesigner,
  reassignDesigner,
  getAssignmentHistory,
  getDesignQueue,
  getDesignerPool,
  getWorkload,
  getRecentAssignments,
  getRejectedAssignments,
  addDesigner,
  updateDesigner,
  updateGlobalMaxLoad,
};
