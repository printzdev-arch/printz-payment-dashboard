const express = require("express");
const router = express.Router();
const controller = require("../controllers/saleOrder.controller");
const { authenticate } = require("../../../middleware/auth.middleware");
const { requirePermission } = require("../../../middleware/permission.middleware");
const PERMISSIONS = require("../../../utils/constants/permissions");

router.use(authenticate);

// Designer / unit manager / admin: the service decides what each role sees
router.get("/dashboard", controller.mfgDashboard);
router.patch("/designers/me/availability", controller.setAvailability);

// Unit manager
router.get("/queue", requirePermission(PERMISSIONS.MFG.ASSIGNMENT_MANAGE), controller.mfgQueue);
router.get("/designers", requirePermission(PERMISSIONS.MFG.ASSIGNMENT_MANAGE), controller.mfgDesigners);

module.exports = router;
