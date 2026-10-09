const express = require("express");
const router = express.Router();
const roleController = require("../controllers/role.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/permission.middleware");
const PERMISSIONS = require("../../shared/constants/permissions");

router.use(authenticate);

// 1. Specific sub-routes (Registered BEFORE `/:id`)
router.get("/permissions/catalogue", roleController.getPermissionsCatalogue);
router.get("/permissions", roleController.getPermissionsCatalogue);
router.get(
  "/matrix",
  requirePermission(PERMISSIONS.ADMIN.ROLE_VIEW, "ALL"),
  roleController.getRolesMatrix
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

router.patch(
  "/:id",
  requirePermission(PERMISSIONS.ADMIN.ROLE_MANAGE, "ALL"),
  roleController.updateRole
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
