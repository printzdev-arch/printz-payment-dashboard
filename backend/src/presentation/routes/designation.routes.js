const express = require("express");
const router = express.Router();
const designationController = require("../controllers/designation.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/permission.middleware");
const PERMISSIONS = require("../../shared/constants/permissions");

router.use(authenticate);

router.get("/", designationController.getDesignations);
router.get("/:id", designationController.getDesignationById);

router.post(
  "/",
  requirePermission(PERMISSIONS.ADMIN.MASTER_MANAGE),
  designationController.createDesignation
);

router.put(
  "/:id",
  requirePermission(PERMISSIONS.ADMIN.MASTER_MANAGE),
  designationController.updateDesignation
);

router.patch(
  "/:id",
  requirePermission(PERMISSIONS.ADMIN.MASTER_MANAGE),
  designationController.updateDesignation
);

router.post(
  "/:id/deactivate",
  requirePermission(PERMISSIONS.ADMIN.MASTER_MANAGE),
  designationController.deactivateDesignation
);

router.post(
  "/:id/activate",
  requirePermission(PERMISSIONS.ADMIN.MASTER_MANAGE),
  designationController.activateDesignation
);

module.exports = router;
