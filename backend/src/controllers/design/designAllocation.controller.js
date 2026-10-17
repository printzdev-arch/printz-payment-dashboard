const asyncHandler = require("../../utils/asyncHandler");
const ResponseHelper = require("../../utils/ResponseHelper");
const DesignAllocationService = require("../../services/design/designAllocation.service");

/**
 * Design Allocation Controller
 */
const autoAllocate = asyncHandler(async (req, res) => {
  const result = await DesignAllocationService.autoAllocate(req.params.id);
  if (!result || !result.assigned) {
    return ResponseHelper.conflict(
      res,
      `Could not allocate designer: ${result?.reason || "No eligible designer available"}`
    );
  }
  return ResponseHelper.ok(res, "Designer auto-allocation processed", result);
});

const autoAssignQueue = asyncHandler(async (req, res) => {
  const results = await DesignAllocationService.autoAssignQueue();
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
  const history = await DesignAllocationService.history(req.params.id);
  return ResponseHelper.ok(res, "Assignment history retrieved successfully", history);
});

const getDesignQueue = asyncHandler(async (req, res) => {
  const queue = await DesignAllocationService.queue();
  return ResponseHelper.ok(res, "Design queue retrieved successfully", queue);
});

const getDesignerPool = asyncHandler(async (req, res) => {
  const pool = await DesignAllocationService.pool(req.query.branchId);
  return ResponseHelper.ok(res, "Designer pool retrieved successfully", pool);
});

const getWorkload = asyncHandler(async (req, res) => {
  const workload = await DesignAllocationService.workload(req.query.branchId, req.user);
  return ResponseHelper.ok(res, "Designer workload retrieved successfully", workload);
});

const getRecentAssignments = asyncHandler(async (req, res) => {
  const assignments = await DesignAllocationService.recentAssignments(req.query.limit || 10);
  return ResponseHelper.ok(res, "Recent designer assignments retrieved successfully", assignments);
});

const getRejectedAssignments = asyncHandler(async (req, res) => {
  const rejected = await DesignAllocationService.rejectedAssignments(req.query.limit || 50);
  return ResponseHelper.ok(res, "Rejected assignments retrieved successfully", rejected);
});

const addDesigner = asyncHandler(async (req, res) => {
  const designer = await DesignAllocationService.addDesigner(req.body);
  return ResponseHelper.created(res, "Designer added to pool successfully", designer);
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
