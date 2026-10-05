const express = require("express");
const router = express.Router();
const generalController = require("../controllers/general.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.use(authenticate);

// Categories
router.get("/categories", generalController.getCategories);
router.post("/categories", generalController.createCategory);

// Finalized dates
router.get("/finalized-dates", generalController.getFinalizedDates);
router.post("/finalized-dates", generalController.finalizeDate);

// Inventory movements
router.get("/inventory-movements", generalController.getInventoryMovements);
router.post("/inventory-movements", generalController.createInventoryMovement);

// Sales
router.get("/sales", generalController.getSales);
router.get("/sales/:id", generalController.getSaleById);
router.post("/sales", generalController.createSale);

module.exports = router;
