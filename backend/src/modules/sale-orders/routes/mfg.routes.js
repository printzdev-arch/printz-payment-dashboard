const express = require("express");
const router = express.Router();
const controller = require("../controllers/saleOrder.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { requirePermission } = require("../../../middleware/security/permission.middleware");
const PERMISSIONS = require("../../../utils/constants/permissions");

router.use(authenticate);

// Manufacturing unit portal: everyone at the unit sees the same dashboard and queue (admins see every unit)
router.get("/dashboard", requirePermission(PERMISSIONS.MFG.DESIGN_WORK), controller.mfgDashboard);
router.get("/queue", requirePermission(PERMISSIONS.MFG.DESIGN_WORK), controller.mfgQueue);

module.exports = router;
