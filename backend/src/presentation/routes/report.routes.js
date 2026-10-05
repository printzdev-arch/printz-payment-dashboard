const express = require("express");
const router = express.Router();
const reportController = require("../controllers/report.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.use(authenticate);

router.get("/dashboard-summary", reportController.getDashboardSummary);
router.get("/monthly-revenue", reportController.getMonthlyRevenue);

module.exports = router;
