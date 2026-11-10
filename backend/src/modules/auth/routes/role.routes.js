const express = require("express");
const router = express.Router();
const roleController = require("../controllers/role.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { requirePermission } = require("../../../middleware/security/permission.middleware");
const PERMISSIONS = require("../../../utils/constants/permissions");

router.use(authenticate);

// 1. Specific sub-routes (Registered BEFORE `/:id`)
router.get(
  "/matrix",
  requirePermission(PERMISSIONS.ADMIN.ROLE_VIEW, "ALL"),
  roleController.getRolesMatrix
);

router.get(
  "/page-catalog",
  requirePermission(PERMISSIONS.ADMIN.ROLE_VIEW, "ALL"),
  roleController.getPageCatalog
);

// 2. Roles Collection Endpoints
router.get(
  "/",
  requirePermission(PERMISSIONS.ADMIN.ROLE_VIEW, "ALL"),
  roleController.getRoles
);

router.post(
  "/",
  requirePermission(PERMISSIONS.ADMIN.ROLE_MANAGE, "ALL"),
  roleController.createRole
);

// 3. Specific Role by ID Operations
router.get(
  "/:id",
  requirePermission(PERMISSIONS.ADMIN.ROLE_VIEW, "ALL"),
  roleController.getRoleById
);

router.put(
  "/:id",
  requirePermission(PERMISSIONS.ADMIN.ROLE_MANAGE, "ALL"),
  roleController.updateRole
);

router.post(
  "/:id/deactivate",
  requirePermission(PERMISSIONS.ADMIN.ROLE_MANAGE, "ALL"),
  roleController.deactivateRole
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.ADMIN.ROLE_MANAGE, "ALL"),
  roleController.deleteRole
);

module.exports = router;
