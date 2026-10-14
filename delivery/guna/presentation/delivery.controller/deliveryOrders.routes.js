const express = require("express");
const router = express.Router();
const deliveryOrderController = require("../../controllers/delivery/deliveryOrder.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authorizeRoles } = require("../../middleware/role.middleware");
const { authorizePermission } = require("../../middleware/permission.middleware");
const {
  idParamValidator,
  createDeliveryOrderValidator,
  updateDeliveryDetailsValidator,
  reviewJobValidator,
  assignDeliveryValidator,
  packDeliveryValidator,
  dispatchDeliveryValidator,
  recordHandoverValidator,
  deliverValidator,
  verifyOtpValidator,
} = require("../../validators/delivery/delivery.validator");

router.use(authenticate);

// ── STEP 1: Manager Reviews Job (READY_FOR_DELIVERY — MANAGER ONLY) ──
router.get(
  "/ready-jobs",
  authorizeRoles("admin", "manager", "SUPER_ADMIN", "ADMIN", "MANAGER"),
  deliveryOrderController.getReadyJobsForDelivery
);

router.post(
  "/review-job/:jobOrderId",
  authorizeRoles("admin", "manager", "SUPER_ADMIN", "ADMIN", "MANAGER"),
  reviewJobValidator,
  deliveryOrderController.reviewJob
);

// ── STEP 2: Enter Delivery Details (DO-xxxxx) ──
router.post(
  "/",
  authorizePermission("production", "create"),
  createDeliveryOrderValidator,
  deliveryOrderController.createDeliveryOrder
);

// List & Retrieve Delivery Orders
router.get(
  "/",
  authorizePermission("production", "read"),
  deliveryOrderController.getDeliveryOrders
);

router.get(
  "/:id",
  idParamValidator("id"),
  authorizePermission("production", "read"),
  deliveryOrderController.getDeliveryOrderById
);

router.put(
  "/:id",
  updateDeliveryDetailsValidator,
  authorizePermission("production", "update"),
  deliveryOrderController.updateDeliveryDetails
);

// ── STEP 3: Assign and Send Details (Status: ASSIGNED + WhatsApp/Notification) ──
router.post(
  "/:id/assign",
  assignDeliveryValidator,
  authorizePermission("production", "update"),
  deliveryOrderController.assignDeliveryOrder
);

// ── STEP 4: Pack and Verify Goods (Stage: PACKED) ──
router.post(
  "/:id/pack",
  packDeliveryValidator,
  authorizePermission("production", "update"),
  deliveryOrderController.packDeliveryOrder
);

// ── STEP 5: Dispatch or Counter Pickup (Stage: OUT_FOR_DELIVERY) ──
router.post(
  "/:id/dispatch",
  dispatchDeliveryValidator,
  authorizePermission("production", "update"),
  deliveryOrderController.dispatchDeliveryOrder
);

// Handover OTP Generation & Verification
router.post(
  "/:id/generate-otp",
  idParamValidator("id"),
  authorizePermission("production", "update"),
  deliveryOrderController.generateOtp
);

router.post(
  "/:id/verify-otp",
  verifyOtpValidator,
  authorizePermission("production", "update"),
  deliveryOrderController.verifyOtp
);

// ── STEP 6 & 7: Record Handover Evidence & STAGE DELIVERED ──
router.post(
  "/:id/proof",
  recordHandoverValidator,
  authorizePermission("production", "update"),
  deliveryOrderController.recordHandoverEvidence
);

router.post(
  "/:id/deliver",
  deliverValidator,
  authorizePermission("production", "update"),
  deliveryOrderController.deliverDeliveryOrder
);

router.get(
  "/:id/proof",
  idParamValidator("id"),
  authorizePermission("production", "read"),
  deliveryOrderController.getDeliveryProof
);

module.exports = router;
