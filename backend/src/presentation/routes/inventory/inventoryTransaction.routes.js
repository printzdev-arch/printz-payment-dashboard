const express = require("express");
const router = express.Router();
const inventoryTransactionController = require("../../controllers/inventory/inventoryTransaction.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requirePermission } = require("../../middleware/permission.middleware");
const PERMISSIONS = require("../../../shared/constants/permissions");

router.use(authenticate);

// Post stock adjustment (positive or negative; threshold creates approval)
router.post(
  "/adjustments",
  requirePermission(PERMISSIONS.INVENTORY.ADJUST, { branchField: "branchId" }),
  inventoryTransactionController.recordAdjustment
);

// Post internal stock issue (consumption: PAPER, INK_TONER, etc.)
router.post(
  "/issues",
  requirePermission(PERMISSIONS.INVENTORY.ADJUST, { branchField: "branchId" }),
  inventoryTransactionController.recordIssue
);

// Post initial opening stock lines (only when no prior balance exists)
router.post(
  "/opening",
  requirePermission(PERMISSIONS.INVENTORY.ITEM_MANAGE, { branchField: "branchId" }),
  inventoryTransactionController.recordOpeningStock
);

// Get transaction by ID
router.get(
  "/:id",
  requirePermission(PERMISSIONS.INVENTORY.BALANCE_VIEW, { branchField: "branchId" }),
  inventoryTransactionController.getInventoryTransactionById
);

// List transactions with filters
router.get(
  "/",
  requirePermission(PERMISSIONS.INVENTORY.BALANCE_VIEW, { branchField: "branchId" }),
  inventoryTransactionController.getInventoryTransactions
);

module.exports = router;
