const express = require("express");
const router = express.Router();
const designAllocationController = require("../../controllers/design/designAllocation.controller");
const designWorkController = require("../../controllers/design/designWork.controller");
const designSampleController = require("../../controllers/design/designSample.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authorizePermission } = require("../../middleware/permission.middleware");
const {
  assignValidator,
  reassignValidator,
  rejectAssignmentValidator,
  sampleDecisionValidator,
} = require("../../middleware/validators/design/design.validator");

// All routes require authentication
router.use(authenticate);

// ──────────────── Queue & Designer Pool & Workload ────────────────
router.get(
  "/queue",
  authorizePermission("design", "read"),
  designAllocationController.getDesignQueue
);

router.post(
  "/queue/auto-assign",
  authorizePermission("design", "update"),
  designAllocationController.autoAssignQueue
);

router.get(
  "/pool",
  authorizePermission("design", "read"),
  designAllocationController.getDesignerPool
);

router.post(
  "/pool/designer",
  authorizePermission("design", "update"),
  designAllocationController.addDesigner
);

router.patch(
  "/pool/designer/:id",
  authorizePermission("design", "update"),
  designAllocationController.updateDesigner
);

router.patch(
  "/settings/max-load",
  authorizePermission("design", "update"),
  designAllocationController.updateGlobalMaxLoad
);

router.get(
  "/workload",
  authorizePermission("design", "read"),
  designAllocationController.getWorkload
);

router.get(
  "/recent-assignments",
  authorizePermission("design", "read"),
  designAllocationController.getRecentAssignments
);

router.get(
  "/rejected-assignments",
  authorizePermission("design", "read"),
  designAllocationController.getRejectedAssignments
);

// ──────────────── Designer Personal Workspace ────────────────
router.get(
  "/my-jobs",
  authorizePermission("design", "read"),
  designWorkController.getMyJobs
);

// ──────────────── Allocation / Reallocation Per Job ────────────────
router.post(
  "/jobs/:id/auto-allocate",
  authorizePermission("design", "update"),
  designAllocationController.autoAllocate
);

router.post(
  "/jobs/:id/assign",
  assignValidator,
  authorizePermission("design", "update"),
  designAllocationController.assignDesigner
);

router.post(
  "/jobs/:id/reassign",
  reassignValidator,
  authorizePermission("design", "update"),
  designAllocationController.reassignDesigner
);

router.get(
  "/jobs/:id/assignments",
  authorizePermission("design", "read"),
  designAllocationController.getAssignmentHistory
);

// ──────────────── Designer Work Lifecycle (Accept, Reject, Start) ────────────────
router.post(
  "/jobs/:id/accept",
  authorizePermission("design", "update"),
  designWorkController.accept
);

router.post(
  "/jobs/:id/reject",
  rejectAssignmentValidator,
  authorizePermission("design", "update"),
  designWorkController.reject
);

router.post(
  "/jobs/:id/start",
  authorizePermission("design", "update"),
  designWorkController.start
);

const { optionalUpload } = require("../../middleware/upload.middleware");

// ──────────────── Samples & Approvals ────────────────
router.post(
  "/jobs/:id/samples",
  optionalUpload("file"),
  authorizePermission("design", "update"),
  designSampleController.uploadSample
);

router.get(
  "/samples",
  authorizePermission("design", "read"),
  designSampleController.listAllSamples
);

router.post(
  "/jobs/:id/submit-proof",
  authorizePermission("design", "update"),
  designSampleController.submitProofDirect
);

router.get(
  "/jobs/:id/samples",
  authorizePermission("design", "read"),
  designSampleController.listSamples
);

router.post(
  "/jobs/:id/reject-sample",
  authorizePermission("design", "update"),
  designSampleController.rejectSampleDesign
);

router.patch(
  "/jobs/:id/samples/:sampleId",
  optionalUpload("file"),
  authorizePermission("design", "update"),
  designSampleController.patchSample
);

router.post(
  "/jobs/:id/samples/:sampleId/submit",
  authorizePermission("design", "update"),
  designSampleController.submitSample
);

router.post(
  "/jobs/:id/samples/:sampleId/decide",
  sampleDecisionValidator,
  authorizePermission("design", "update"),
  designSampleController.decide
);

router.post(
  "/jobs/:id/approve",
  authorizePermission("design", "update"),
  designSampleController.approveDesign
);

router.post(
  "/jobs/:id/approve-proof",
  authorizePermission("design", "update"),
  designSampleController.approveDesign
);

router.post(
  "/jobs/:id/complete",
  authorizePermission("design", "update"),
  designSampleController.approveDesign
);

module.exports = router;
