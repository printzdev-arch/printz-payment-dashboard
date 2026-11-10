const express = require("express");
const { requireAdmin } = require("../../../middleware/security/admin.middleware");
const router = express.Router();
const attendancePolicyController = require("../controllers/attendancePolicy.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { requirePermission } = require("../../../middleware/security/permission.middleware");
const PERMISSIONS = require("../../../utils/constants/permissions");
const {
  policyIdParamValidator,
  getPoliciesQueryValidator,
  createPolicyValidator,
  updatePolicyValidator,
  policyStatusValidator,
} = require("./attendancePolicy.validator");

router.use(authenticate);

// ── GET /api/attendance-policies ─────────────────────────────────────────────
router.get(
  "/",
  requirePermission(PERMISSIONS.HR.POLICY_VIEW, { branchField: "branchId" }),
  getPoliciesQueryValidator,
  attendancePolicyController.getPolicies
);

// ── GET /api/attendance-policies/:id ─────────────────────────────────────────
router.get(
  "/:id",
  requirePermission(PERMISSIONS.HR.POLICY_VIEW, { branchField: "branchId" }),
  policyIdParamValidator,
  attendancePolicyController.getPolicyById
);

// ── POST /api/attendance-policies ────────────────────────────────────────────
router.post(
  "/",
  requirePermission(PERMISSIONS.HR.POLICY_MANAGE, { branchField: "branchId" }),
  requireAdmin,
  createPolicyValidator,
  attendancePolicyController.createPolicy
);

// ── PUT /api/attendance-policies/:id ─────────────────────────────────────────
router.put(
  "/:id",
  requirePermission(PERMISSIONS.HR.POLICY_MANAGE, { branchField: "branchId" }),
  requireAdmin,
  updatePolicyValidator,
  attendancePolicyController.updatePolicy
);

// ── PUT /api/attendance-policies/:id/status ──────────────────────────────────
router.put(
  "/:id/status",
  requirePermission(PERMISSIONS.HR.POLICY_MANAGE, { branchField: "branchId" }),
  requireAdmin,
  policyStatusValidator,
  attendancePolicyController.updateStatus
);

// ── DELETE /api/attendance-policies/:id ──────────────────────────────────────
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.HR.POLICY_MANAGE, { branchField: "branchId" }),
  requireAdmin,
  policyIdParamValidator,
  attendancePolicyController.deletePolicy
);

module.exports = router;

