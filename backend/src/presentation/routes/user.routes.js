const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/permission.middleware");
const { createUserValidator, updateUserValidator } = require("../validators/user.validator");
const PERMISSIONS = require("../../shared/constants/permissions");

// All user routes require authentication
router.use(authenticate);

// User profile endpoints (accessible to authenticated user)
router.get("/profile", userController.getProfile);
router.get("/me", userController.getProfile);

// User Management endpoints
router.post(
  "/",
  requirePermission(PERMISSIONS.ADMIN.USER_MANAGE, { branchField: "branchId" }),
  createUserValidator,
  userController.createUser
);

router.get(
  "/",
  requirePermission(PERMISSIONS.ADMIN.USER_MANAGE, { branchField: "branchId" }),
  userController.getAllUsers
);

router.get("/:id", userController.getUserById);
router.put("/:id", updateUserValidator, userController.updateUser);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.ADMIN.USER_MANAGE, { branchField: "branchId" }),
  userController.deleteUser
);

// Account Lifecycle endpoints
router.post(
  "/:id/lock",
  requirePermission(PERMISSIONS.ADMIN.USER_MANAGE, { branchField: "branchId" }),
  userController.lockUser
);

router.post(
  "/:id/unlock",
  requirePermission(PERMISSIONS.ADMIN.USER_MANAGE, { branchField: "branchId" }),
  userController.unlockUser
);

router.post(
  "/:id/disable",
  requirePermission(PERMISSIONS.ADMIN.USER_MANAGE, { branchField: "branchId" }),
  userController.disableUser
);

router.post(
  "/:id/enable",
  requirePermission(PERMISSIONS.ADMIN.USER_MANAGE, { branchField: "branchId" }),
  userController.enableUser
);

module.exports = router;

