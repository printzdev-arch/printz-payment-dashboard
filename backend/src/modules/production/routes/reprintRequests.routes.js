const express = require("express");
const router = express.Router();
const reprintRequestController = require("../controllers/reprintRequest.controller");
const ApiError = require("../../../utils/errors/ApiError");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { authorizePermission } = require("../../../middleware/security/permission.middleware");
const {
  idParamValidator,
  rejectReprintValidator,
} = require("./production.validator");

/**
 * Approving or rejecting a reprint is a manager decision. Operators and
 * other staff can request a reprint but cannot decide it.
 */
const MANAGER_ROLES = [
  "admin",
  "super_admin",
  "superadmin",
  "owner",
  "internal_admin",
  "manager",
  "branch_manager",
];
const requireManager = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  const roleCode = String(req.user?.roleCode || "").toLowerCase();
  if (MANAGER_ROLES.includes(role) || MANAGER_ROLES.includes(roleCode)) return next();
  return next(ApiError.forbidden("Only a manager can approve or reject a reprint request."));
};

router.use(authenticate);

// Reprint Requests endpoints
router.get(
  "/",
  authorizePermission("production", "read"),
  reprintRequestController.getReprintRequests
);

router.get(
  "/:id",
  idParamValidator("id"),
  authorizePermission("production", "read"),
  reprintRequestController.getReprintRequestById
);

router.post(
  "/:id/approve",
  idParamValidator("id"),
  authorizePermission("production", "update"),
  requireManager,
  reprintRequestController.approveReprintRequest
);

router.post(
  "/:id/reject",
  rejectReprintValidator,
  authorizePermission("production", "update"),
  requireManager,
  reprintRequestController.rejectReprintRequest
);

module.exports = router;