const express = require("express");
const router = express.Router();
const stockController = require("../controllers/stock.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const requireDeleteApproval = require("../../delete-requests/middleware/requireDeleteApproval");

router.use(authenticate);

// Stock Inventory Items
router.get("/items", stockController.getStockItems);
router.get("/items/:id", stockController.getStockItemById);
router.post("/items", stockController.saveStockItem);
router.put("/items/:id", stockController.updateStockItem);
router.delete("/items/:id", requireDeleteApproval("stockItem"), stockController.deleteStockItem);

// Daily Stock Readings
router.get("/readings", stockController.getStockReadings);
router.get("/readings/:id", stockController.getStockReadingById);
router.post("/readings", stockController.saveStockReading);
router.put("/readings/:id", stockController.updateStockReading);
router.delete("/readings/:id", requireDeleteApproval("stockReading"), stockController.deleteStockReading);

module.exports = router;

