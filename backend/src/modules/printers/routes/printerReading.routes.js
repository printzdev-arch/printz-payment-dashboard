const express = require("express");
const requireDeleteApproval = require("../../delete-requests/middleware/requireDeleteApproval");
const router = express.Router();
const printerReadingController = require("../controllers/printerReading.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { authorizePermission } = require("../../../middleware/security/permission.middleware");

router.use(authenticate);

router.get("/", authorizePermission("printerReadings", "read"), printerReadingController.getAllReadings);
router.get("/scan-check", authorizePermission("printerReadings", "read"), printerReadingController.getScanCheck);
router.get("/:id", authorizePermission("printerReadings", "read"), printerReadingController.getReadingById);
router.post("/", authorizePermission("printerReadings", "create"), printerReadingController.saveReading);
router.put("/:id", authorizePermission("printerReadings", "update"), printerReadingController.updateReading);
router.delete("/:id", authorizePermission("printerReadings", "delete"), requireDeleteApproval("printerReading"), printerReadingController.deleteReading);

module.exports = router;
