const express = require("express");
const router = express.Router();
const printerController = require("../controllers/printer.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorizePermission } = require("../middleware/permission.middleware");

router.use(authenticate);

router.get("/", authorizePermission("printers", "read"), printerController.getAllPrinters);
router.get("/:id", authorizePermission("printers", "read"), printerController.getPrinterById);
router.post("/", authorizePermission("printers", "create"), printerController.createPrinter);
router.put("/:id", authorizePermission("printers", "update"), printerController.updatePrinter);
router.delete("/:id", authorizePermission("printers", "delete"), printerController.deletePrinter);

module.exports = router;
