const express = require("express");
const router = express.Router();
const productionReportController = require("../controllers/productionReport.controller");
const { authenticate } = require("../../../middleware/auth.middleware");
const { authorizePermission } = require("../../../middleware/permission.middleware");

router.use(authenticate);

// GET /production-reports                       -> list of available reports
// GET /production-reports/:type                 -> report data (?from=&to=&branchId=&machineId=&operatorId=&priority=&jobNo=)
// GET /production-reports/:type/export          -> same data as a CSV file (opens in Excel)
router.get("/", authorizePermission("production", "read"), productionReportController.listReports);
router.get("/:type/export", authorizePermission("production", "read"), productionReportController.exportReport);
router.get("/:type", authorizePermission("production", "read"), productionReportController.getReport);

module.exports = router;