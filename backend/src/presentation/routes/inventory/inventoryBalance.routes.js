const express = require("express");
const router = express.Router();
const inventoryBalanceController = require("../../controllers/inventory/inventoryBalance.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requirePermission } = require("../../middleware/permission.middleware");
const PERMISSIONS = require("../../../shared/constants/permissions");

router.use(authenticate);

// Search balances for POS
router.get(
  "/search",
  requirePermission(PERMISSIONS.POS.SALE_RECEIPT_CREATE, { branchField: "branchId" }),
  inventoryBalanceController.searchPosBalances
);

// Warehouse balances listing
router.get(
  "/warehouse",
  requirePermission(PERMISSIONS.POS.PRODUCT_ORDER_CREATE, { branchField: "branchId" }),
  inventoryBalanceController.getWarehouseBalances
);

// Dedicated Low Stock & Reorder Alerts
router.get(
  "/low-stock",
  requirePermission(PERMISSIONS.INVENTORY.BALANCE_VIEW, { branchField: "branchId" }),
  inventoryBalanceController.getLowStockBalances
);

// List inventory balances with filters (branchId, category, lowStock, q)
router.get(
  "/",
  requirePermission(PERMISSIONS.INVENTORY.BALANCE_VIEW, { branchField: "branchId" }),
  inventoryBalanceController.getInventoryBalances
);

module.exports = router;

