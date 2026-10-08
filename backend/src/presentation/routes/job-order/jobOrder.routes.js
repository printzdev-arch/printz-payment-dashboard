const express = require("express");
const router = express.Router();
const jobOrderController = require("../../controllers/job-order/jobOrder.controller");
const jobEstimateController = require("../../controllers/job-order/jobEstimate.controller");
const jobFileController = require("../../controllers/job-order/jobFile.controller");
const jobInvoiceController = require("../../controllers/job-order/jobInvoice.controller");
const designAllocationController = require("../../controllers/design/designAllocation.controller");
const designWorkController = require("../../controllers/design/designWork.controller");
const designSampleController = require("../../controllers/design/designSample.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authorizePermission } = require("../../middleware/permission.middleware");
const {
  createJobValidator,
  updateJobValidator,
  replaceItemsValidator,
  estimateValidator,
  approveEstimateValidator,
  rejectEstimateValidator,
  skipDesignValidator,
  holdCancelValidator,
  fileUploadValidator,
} = require("../../validators/job-order/jobOrder.validator");
const {
  assignValidator,
  reassignValidator,
  rejectAssignmentValidator,
  sampleDecisionValidator,
} = require("../../validators/design/design.validator");

// All routes require authentication
router.use(authenticate);

// Job Order counts & summary (both /counts and /status-counts supported)
router.get(
  "/counts",
  authorizePermission("job", "read"),
  jobOrderController.getStatusCounts
);

router.get(
  "/status-counts",
  authorizePermission("job", "read"),
  jobOrderController.getStatusCounts
);

// Job Order CRUD & listing
router.post(
  "/",
  createJobValidator,
  authorizePermission("job", "create"),
  jobOrderController.createJobOrder
);

router.get(
  "/",
  authorizePermission("job", "read"),
  jobOrderController.getJobOrders
);

router.get(
  "/:id",
  authorizePermission("job", "read"),
  jobOrderController.getJobOrderById
);

router.patch(
  "/:id",
  updateJobValidator,
  authorizePermission("job", "update"),
  jobOrderController.updateJobOrder
);

router.put(
  "/:id/items",
  replaceItemsValidator,
  authorizePermission("job", "update"),
  jobOrderController.replaceItems
);

// Estimation & Estimate Approvals
router.post(
  "/:id/estimate",
  estimateValidator,
  authorizePermission("job", "update"),
  jobEstimateController.estimate
);

router.post(
  "/:id/estimate/approve",
  approveEstimateValidator,
  authorizePermission("job", "update"),
  jobEstimateController.approveEstimate
);

router.post(
  "/:id/estimate/reject",
  rejectEstimateValidator,
  authorizePermission("job", "update"),
  jobEstimateController.rejectEstimate
);

// Workflow controls (Skip Design, Hold, Resume, Cancel)
router.post(
  "/:id/skip-design",
  skipDesignValidator,
  authorizePermission("job", "update"),
  jobOrderController.skipDesign
);

router.post(
  "/:id/hold",
  holdCancelValidator,
  authorizePermission("job", "update"),
  jobOrderController.holdJobOrder
);

router.post(
  "/:id/resume",
  holdCancelValidator,
  authorizePermission("job", "update"),
  jobOrderController.resumeJobOrder
);

router.post(
  "/:id/cancel",
  holdCancelValidator,
  authorizePermission("job", "delete"),
  jobOrderController.cancelJobOrder
);

// Workflow history & Approvals
router.get(
  "/:id/workflow-events",
  authorizePermission("job", "read"),
  jobOrderController.getWorkflowEvents
);

router.get(
  "/:id/approvals",
  authorizePermission("job", "read"),
  jobOrderController.getApprovalHistory
);

// Files
router.post(
  "/:id/files",
  fileUploadValidator,
  authorizePermission("job", "update"),
  jobFileController.uploadFile
);

router.get(
  "/:id/files",
  authorizePermission("job", "read"),
  jobFileController.listFiles
);

// Final Invoice
router.post(
  "/:id/invoice",
  authorizePermission("job", "update"),
  jobInvoiceController.createInvoice
);

router.get(
  "/:id/invoice",
  authorizePermission("job", "read"),
  jobInvoiceController.getInvoice
);

// ──────────────── Design Assignment Sub-resources (Spec Parity) ────────────────
router.post(
  "/:id/assignments",
  assignValidator,
  authorizePermission("design", "update"),
  designAllocationController.assignDesigner
);

router.get(
  "/:id/assignments",
  authorizePermission("design", "read"),
  designAllocationController.getAssignmentHistory
);

router.post(
  "/:id/assignments/reassign",
  reassignValidator,
  authorizePermission("design", "update"),
  designAllocationController.reassignDesigner
);

router.post(
  "/:id/assignments/current/accept",
  authorizePermission("design", "update"),
  designWorkController.accept
);

router.post(
  "/:id/assignments/current/reject",
  rejectAssignmentValidator,
  authorizePermission("design", "update"),
  designWorkController.reject
);

router.post(
  "/:id/design/start",
  authorizePermission("design", "update"),
  designWorkController.start
);

// ──────────────── Design Samples Sub-resources (Spec Parity) ────────────────
router.post(
  "/:id/samples",
  authorizePermission("design", "update"),
  designSampleController.uploadSample
);

router.get(
  "/:id/samples",
  authorizePermission("design", "read"),
  designSampleController.listSamples
);

router.patch(
  "/:id/samples/:sampleId",
  authorizePermission("design", "update"),
  designSampleController.patchSample
);

router.post(
  "/:id/samples/:sampleId/submit",
  authorizePermission("design", "update"),
  designSampleController.submitSample
);

router.post(
  "/:id/samples/:sampleId/decision",
  sampleDecisionValidator,
  authorizePermission("design", "update"),
  designSampleController.decide
);

const slaController = require("../../controllers/sla/sla.controller");
const designerRatingController = require("../../controllers/sla/designerRating.controller");
const { createDesignerRatingValidator } = require("../../validators/sla/sla.validator");

// ──────────────── SLA & Designer Rating Sub-resources (Spec Parity) ────────────────
router.get(
  "/:id/sla",
  authorizePermission("job", "read"),
  slaController.getJobOrderSla
);

router.post(
  "/:id/designer-ratings",
  createDesignerRatingValidator,
  authorizePermission("design", "update"),
  designerRatingController.createRating
);

module.exports = router;
