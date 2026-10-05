const express = require("express");
const router = express.Router();
const printerReadingController = require("../controllers/printerReading.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorizePermission } = require("../middleware/permission.middleware");

router.use(authenticate);

router.get("/", authorizePermission("printerReadings", "read"), printerReadingController.getAllReadings);
router.get("/:id", authorizePermission("printerReadings", "read"), printerReadingController.getReadingById);
router.post("/", authorizePermission("printerReadings", "create"), printerReadingController.saveReading);
router.put("/:id", authorizePermission("printerReadings", "update"), printerReadingController.updateReading);
router.delete("/:id", authorizePermission("printerReadings", "delete"), printerReadingController.deleteReading);

module.exports = router;
