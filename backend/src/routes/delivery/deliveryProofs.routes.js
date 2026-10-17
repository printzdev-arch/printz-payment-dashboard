const express = require("express");
const router = express.Router();
const deliveryProofController = require("../../controllers/delivery/deliveryProof.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authorizePermission } = require("../../middleware/permission.middleware");
const { idParamValidator } = require("../../middleware/validators/delivery/delivery.validator");

router.use(authenticate);

// List delivery proofs
router.get(
  "/",
  authorizePermission("production", "read"),
  deliveryProofController.getDeliveryProofs
);

// Get single delivery proof by ID
router.get(
  "/:id",
  idParamValidator("id"),
  authorizePermission("production", "read"),
  deliveryProofController.getDeliveryProofById
);

// Get proofs by delivery order ID
router.get(
  "/order/:deliveryOrderId",
  idParamValidator("deliveryOrderId"),
  authorizePermission("production", "read"),
  deliveryProofController.getProofsByDeliveryOrderId
);

// Record delivery proof directly
router.post(
  "/",
  authorizePermission("production", "update"),
  deliveryProofController.createDeliveryProof
);

module.exports = router;
