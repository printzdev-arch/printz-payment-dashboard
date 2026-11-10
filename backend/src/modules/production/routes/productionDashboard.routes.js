const express = require("express");
const router = express.Router();
const productionDashboardController = require("../controllers/productionDashboard.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { authorizePermission } = require("../../../middleware/security/permission.middleware");

router.use(authenticate);

// GET /production-dashboard   (?from=YYYY-MM-DD&to=YYYY-MM-DD&branchId=)
router.get("/", authorizePermission("production", "read"), productionDashboardController.getDashboard);

module.exports = router;