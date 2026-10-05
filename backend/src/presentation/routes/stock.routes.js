const express = require("express");
const router = express.Router();
const stockController = require("../controllers/stock.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.use(authenticate);

// Stock Inventory Items
router.get("/items", stockController.getStockItems);
router.get("/items/:id", stockController.getStockItemById);
router.post("/items", stockController.saveStockItem);
router.put("/items/:id", stockController.updateStockItem);
router.delete("/items/:id", stockController.deleteStockItem);

// Daily Stock Readings
router.get("/readings", stockController.getStockReadings);
router.get("/readings/:id", stockController.getStockReadingById);
router.post("/readings", stockController.saveStockReading);
router.put("/readings/:id", stockController.updateStockReading);
router.delete("/readings/:id", stockController.deleteStockReading);

module.exports = router;

