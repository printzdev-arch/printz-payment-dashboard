const express = require("express");
const router = express.Router();
const deliveryOrderController = require("../../controllers/production/deliveryOrder.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authorizePermission } = require("../../middleware/permission.middleware");
const {
  idParamValidator,
  deliveryDeliverValidator,
} = require("../../validators/production/production.validator");

router.use(authenticate);

// Delivery Orders endpoints
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

router.post(
  "/:id/pack",
  idParamValidator("id"),
  authorizePermission("production", "update"),
  deliveryOrderController.packDeliveryOrder
);

router.post(
  "/:id/dispatch",
  idParamValidator("id"),
  authorizePermission("production", "update"),
  deliveryOrderController.dispatchDeliveryOrder
);

router.post(
  "/:id/deliver",
  deliveryDeliverValidator,
  authorizePermission("production", "update"),
  deliveryOrderController.deliverDeliveryOrder
);

module.exports = router;
