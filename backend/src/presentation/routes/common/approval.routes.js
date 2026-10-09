const express = require("express");
const router = express.Router();
const approvalController = require("../../controllers/common/approval.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requirePermission } = require("../../middleware/permission.middleware");
const PERMISSIONS = require("../../../shared/constants/permissions");

router.use(authenticate);

// Aggregated counts by status and referenceType
router.get(
  "/counts",
  requirePermission(PERMISSIONS.COMMON.APPROVAL_VIEW, { branchField: "branchId" }),
  approvalController.getCounts
);

// List approvals
router.get(
  "/",
  requirePermission(PERMISSIONS.COMMON.APPROVAL_VIEW, { branchField: "branchId" }),
  approvalController.getApprovals
);

// Get approval details
router.get(
  "/:id",
  requirePermission(PERMISSIONS.COMMON.APPROVAL_VIEW, { branchField: "branchId" }),
  approvalController.getApprovalById
);

// Approve approval request
router.post(
  "/:id/approve",
  requirePermission(PERMISSIONS.COMMON.APPROVAL_DECIDE, { branchField: "branchId" }),
  approvalController.approve
);

// Reject approval request
router.post(
  "/:id/reject",
  requirePermission(PERMISSIONS.COMMON.APPROVAL_DECIDE, { branchField: "branchId" }),
  approvalController.reject
);

// Cancel approval request (requester or admin)
router.post(
  "/:id/cancel",
  approvalController.cancel
);

module.exports = router;
