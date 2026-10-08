const asyncHandler = require("../../../shared/asyncHandler");
const ResponseHelper = require("../../../shared/response/ResponseHelper");
const JobOrderService = require("../../../application/services/job-order/jobOrder.service");

/**
 * Job Order Controller
 */
const createJobOrder = asyncHandler(async (req, res) => {
  const job = await JobOrderService.create(req.body, req.user);
  return ResponseHelper.created(res, job, "Job Order created successfully");
});

const getJobOrders = asyncHandler(async (req, res) => {
  const { data, items, total, page, limit } = await JobOrderService.list(req.query, req.user);
  return ResponseHelper.paginated(
    res,
    data || items || [],
    total,
    page,
    limit,
    "Job Orders retrieved successfully"
  );
});

const getJobOrderById = asyncHandler(async (req, res) => {
  const job = await JobOrderService.get(req.params.id, req.user);
  return ResponseHelper.ok(res, "Job Order retrieved successfully", job);
});

const updateJobOrder = asyncHandler(async (req, res) => {
  const updated = await JobOrderService.update(req.params.id, req.body, req.user);
  return ResponseHelper.ok(res, "Job Order updated successfully", updated);
});

const replaceItems = asyncHandler(async (req, res) => {
  const items = await JobOrderService.replaceItems(req.params.id, req.body, req.user);
  return ResponseHelper.ok(res, "Job Order items updated successfully", items);
});

const skipDesign = asyncHandler(async (req, res) => {
  const reason = req.body.reason || "Direct print-ready artwork provided";
  const updated = await JobOrderService.skipDesign(req.params.id, reason, req.user);
  return ResponseHelper.ok(res, "Design skipped; Job Order moved to PRODUCTION_PLANNING", updated);
});

const holdJobOrder = asyncHandler(async (req, res) => {
  const held = await JobOrderService.hold(req.params.id, req.body.reason, req.user);
  return ResponseHelper.ok(res, "Job Order placed on hold", held);
});

const resumeJobOrder = asyncHandler(async (req, res) => {
  const resumed = await JobOrderService.resume(req.params.id, req.user);
  return ResponseHelper.ok(res, "Job Order resumed successfully", resumed);
});

const cancelJobOrder = asyncHandler(async (req, res) => {
  const cancelled = await JobOrderService.cancel(req.params.id, req.body.reason, req.user);
  return ResponseHelper.ok(res, "Job Order cancelled successfully", cancelled);
});

const getStatusCounts = asyncHandler(async (req, res) => {
  const counts = await JobOrderService.statusCounts(req.user);
  return ResponseHelper.ok(res, "Job Order counts retrieved successfully", counts);
});

const getWorkflowEvents = asyncHandler(async (req, res) => {
  const events = await JobOrderService.workflowEvents(req.params.id, req.user);
  return ResponseHelper.ok(res, "Workflow timeline events retrieved successfully", events);
});

const getApprovalHistory = asyncHandler(async (req, res) => {
  const approvals = await JobOrderService.approvalHistory(req.params.id, req.user, req.query.type);
  return ResponseHelper.ok(res, "Approval history retrieved successfully", approvals);
});

module.exports = {
  createJobOrder,
  getJobOrders,
  getJobOrderById,
  updateJobOrder,
  replaceItems,
  skipDesign,
  holdJobOrder,
  resumeJobOrder,
  cancelJobOrder,
  getStatusCounts,
  getWorkflowEvents,
  getApprovalHistory,
};
