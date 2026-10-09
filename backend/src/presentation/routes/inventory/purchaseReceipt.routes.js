const express = require("express");
const router = express.Router();
const purchaseReceiptController = require("../../controllers/inventory/purchaseReceipt.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requirePermission } = require("../../middleware/permission.middleware");
const PERMISSIONS = require("../../../shared/constants/permissions");

router.use(authenticate);

// Create DRAFT receipt
router.post(
  "/",
  requirePermission(PERMISSIONS.INVENTORY.PURCHASE_CREATE, { branchField: "branchId" }),
  purchaseReceiptController.createDraftReceipt
);

// Update DRAFT receipt
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.INVENTORY.PURCHASE_CREATE, { branchField: "branchId" }),
  purchaseReceiptController.updateDraftReceipt
);

// Post receipt (increments stock and creates PURCHASE ledger transactions)
router.post(
  "/:id/post",
  requirePermission(PERMISSIONS.INVENTORY.PURCHASE_CREATE, { branchField: "branchId" }),
  purchaseReceiptController.postReceipt
);

// Cancel receipt (DRAFT direct cancel; POSTED creates reversal ADJUSTMENT transactions)
router.post(
  "/:id/cancel",
  requirePermission(PERMISSIONS.INVENTORY.PURCHASE_CREATE, { branchField: "branchId" }),
  purchaseReceiptController.cancelReceipt
);

// Get single receipt by ID
router.get(
  "/:id",
  requirePermission(PERMISSIONS.INVENTORY.BALANCE_VIEW, { branchField: "branchId" }),
  purchaseReceiptController.getPurchaseReceiptById
);

// List purchase receipts
router.get(
  "/",
  requirePermission(PERMISSIONS.INVENTORY.BALANCE_VIEW, { branchField: "branchId" }),
  purchaseReceiptController.getPurchaseReceipts
);

module.exports = router;
