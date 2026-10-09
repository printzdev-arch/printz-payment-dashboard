const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/department.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/permission.middleware");
const PERMISSIONS = require("../../shared/constants/permissions");

router.use(authenticate);

router.get("/", departmentController.getDepartments);
router.get("/:id", departmentController.getDepartmentById);

router.post(
  "/",
  requirePermission(PERMISSIONS.ADMIN.MASTER_MANAGE),
  departmentController.createDepartment
);

router.put(
  "/:id",
  requirePermission(PERMISSIONS.ADMIN.MASTER_MANAGE),
  departmentController.updateDepartment
);

router.patch(
  "/:id",
  requirePermission(PERMISSIONS.ADMIN.MASTER_MANAGE),
  departmentController.updateDepartment
);

router.post(
  "/:id/deactivate",
  requirePermission(PERMISSIONS.ADMIN.MASTER_MANAGE),
  departmentController.deactivateDepartment
);

router.post(
  "/:id/activate",
  requirePermission(PERMISSIONS.ADMIN.MASTER_MANAGE),
  departmentController.activateDepartment
);

module.exports = router;
