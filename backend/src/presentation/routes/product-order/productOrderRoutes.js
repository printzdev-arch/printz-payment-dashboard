const express = require("express");
const router = express.Router();
const productOrderController = require("../../controllers/product-order/productOrderController");
const { authenticate } = require("../../middleware/auth.middleware");
const { requirePermission } = require("../../middleware/permission.middleware");
const PERMISSIONS = require("../../../shared/constants/permissions");
const {
  validateCreateOrder,
  validateUpdateItems,
  validateReject,
} = require("../../../shared/validators/product-order/productOrderValidator");

router.use(authenticate);

// List pending approval orders
router.get(
  "/pending-approval",
  requirePermission(PERMISSIONS.POS.PRODUCT_ORDER_APPROVE),
  productOrderController.getPendingApprovals
);

// Create DRAFT product order
router.post(
  "/",
  requirePermission(PERMISSIONS.POS.PRODUCT_ORDER_CREATE, { branchField: "requestingBranchId" }),
  validateCreateOrder,
  productOrderController.createDraft
);

// Update DRAFT line items
router.put(
  "/:id/items",
  requirePermission(PERMISSIONS.POS.PRODUCT_ORDER_CREATE),
  validateUpdateItems,
  productOrderController.updateDraftItems
);

// Update DRAFT header details
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.POS.PRODUCT_ORDER_CREATE),
  productOrderController.updateDraft
);

// Submit order for approval (DRAFT -> SUBMITTED)
router.post(
  "/:id/submit",
  requirePermission(PERMISSIONS.POS.PRODUCT_ORDER_CREATE),
  productOrderController.submitOrder
);

// Cancel order (DRAFT / SUBMITTED -> CANCELLED)
router.post(
  "/:id/cancel",
  requirePermission(PERMISSIONS.POS.PRODUCT_ORDER_CREATE),
  productOrderController.cancelOrder
);

// Approve order (SUBMITTED -> APPROVED / PARTIALLY_APPROVED)
router.post(
  "/:id/approve",
  requirePermission(PERMISSIONS.POS.PRODUCT_ORDER_APPROVE),
  productOrderController.approveOrder
);

// Reject order (SUBMITTED -> REJECTED)
router.post(
  "/:id/reject",
  requirePermission(PERMISSIONS.POS.PRODUCT_ORDER_APPROVE),
  validateReject,
  productOrderController.rejectOrder
);

// Get single order by ID
router.get(
  "/:id",
  requirePermission(PERMISSIONS.POS.PRODUCT_ORDER_VIEW),
  productOrderController.getOrderById
);

// List product orders with filters and branch RBAC
router.get(
  "/",
  requirePermission(PERMISSIONS.POS.PRODUCT_ORDER_VIEW, { branchField: "requestingBranchId" }),
  productOrderController.getOrders
);

module.exports = router;
