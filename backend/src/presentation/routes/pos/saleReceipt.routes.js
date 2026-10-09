const express = require("express");
const router = express.Router();
const saleReceiptController = require("../../controllers/pos/saleReceipt.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { requirePermission } = require("../../middleware/permission.middleware");
const PERMISSIONS = require("../../../shared/constants/permissions");

router.use(authenticate);

// Cart calculation preview (does not deduct inventory)
router.post(
  "/calculate",
  requirePermission(PERMISSIONS.POS.SALE_RECEIPT_VIEW),
  saleReceiptController.calculate
);

// Fast counter-billing direct checkout
router.post(
  "/checkout",
  requirePermission(PERMISSIONS.POS.SALE_RECEIPT_CREATE, { branchField: "branchId" }),
  saleReceiptController.checkout
);

// Create DRAFT sale receipt
router.post(
  "/",
  requirePermission(PERMISSIONS.POS.SALE_RECEIPT_CREATE, { branchField: "branchId" }),
  saleReceiptController.createDraft
);

// Update DRAFT line items
router.put(
  "/:id/items",
  requirePermission(PERMISSIONS.POS.SALE_RECEIPT_CREATE),
  saleReceiptController.updateDraftItems
);

// Update DRAFT header
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.POS.SALE_RECEIPT_CREATE),
  saleReceiptController.updateDraft
);

// Complete DRAFT sale and post inventory
router.post(
  "/:id/complete",
  requirePermission(PERMISSIONS.POS.SALE_RECEIPT_CREATE),
  saleReceiptController.completeSale
);

// Void completed sale and reverse inventory
router.post(
  "/:id/void",
  requirePermission(PERMISSIONS.POS.SALE_RECEIPT_VOID),
  saleReceiptController.voidSale
);

// Record payment settlement against CREDIT/PARTIAL receipt
router.post(
  "/:id/payments",
  requirePermission(PERMISSIONS.POS.SALE_RECEIPT_CREATE),
  saleReceiptController.recordPayment
);

// Delete DRAFT receipt
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.POS.SALE_RECEIPT_CREATE),
  saleReceiptController.deleteDraft
);

// Print view (thermal or A4 template)
router.get(
  "/:id/print",
  requirePermission(PERMISSIONS.POS.SALE_RECEIPT_VIEW),
  saleReceiptController.printReceipt
);

// Share receipt via WhatsApp / SMS / Email
router.post(
  "/:id/share",
  requirePermission(PERMISSIONS.POS.SALE_RECEIPT_VIEW),
  saleReceiptController.shareReceipt
);

// Export receipt
router.get(
  "/:id/export",
  requirePermission(PERMISSIONS.POS.SALE_RECEIPT_VIEW),
  saleReceiptController.exportReceipt
);

// Get receipt by ID
router.get(
  "/:id",
  requirePermission(PERMISSIONS.POS.SALE_RECEIPT_VIEW),
  saleReceiptController.getReceiptById
);

// List receipts with filters and branch RBAC
router.get(
  "/",
  requirePermission(PERMISSIONS.POS.SALE_RECEIPT_VIEW, { branchField: "branchId" }),
  saleReceiptController.getReceipts
);

module.exports = router;
