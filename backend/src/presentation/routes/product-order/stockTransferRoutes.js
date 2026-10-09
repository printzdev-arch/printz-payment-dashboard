const express = require("express");
const router = express.Router();
const stockTransferController = require("../../controllers/product-order/stockTransferController");
const { authenticate } = require("../../middleware/auth.middleware");
const { requirePermission } = require("../../middleware/permission.middleware");
const PERMISSIONS = require("../../../shared/constants/permissions");
const {
  validateDispatch,
  validateReceive,
} = require("../../../shared/validators/product-order/stockTransferValidator");

router.use(authenticate);

// Dispatch transfer from warehouse
router.post(
  "/:id/dispatch",
  requirePermission(PERMISSIONS.POS.TRANSFER_DISPATCH),
  validateDispatch,
  stockTransferController.dispatchTransfer
);

// Receive transfer at requesting branch
router.post(
  "/:id/receive",
  requirePermission(PERMISSIONS.POS.TRANSFER_RECEIVE),
  validateReceive,
  stockTransferController.receiveTransfer
);

// Cancel transfer before dispatch
router.post(
  "/:id/cancel",
  requirePermission(PERMISSIONS.POS.PRODUCT_ORDER_APPROVE),
  stockTransferController.cancelTransfer
);

// Get transfer by ID
router.get(
  "/:id",
  requirePermission(PERMISSIONS.POS.PRODUCT_ORDER_VIEW),
  stockTransferController.getTransferById
);

// List transfers with filters and branch RBAC
router.get(
  "/",
  requirePermission(PERMISSIONS.POS.PRODUCT_ORDER_VIEW),
  stockTransferController.getTransfers
);

module.exports = router;
