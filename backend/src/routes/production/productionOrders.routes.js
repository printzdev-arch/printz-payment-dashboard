const express = require("express");
const router = express.Router();
const productionOrderController = require("../../controllers/production/productionOrder.controller");
const qualityCheckController = require("../../controllers/production/qualityCheck.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authorizePermission } = require("../../middleware/permission.middleware");
const {
  idParamValidator,
  updateProductionOrderValidator,
  holdResumeCancelValidator,
  qualityCheckValidator,
  planProductionValidator,
} = require("../../middleware/validators/production/production.validator");

// All production routes require authentication
router.use(authenticate);

// Plan production for a job order: POST /production-orders/plan/:id
router.post(
  "/plan/:id",
  planProductionValidator,
  authorizePermission("production", "create"),
  productionOrderController.planProduction
);

// Production Orders CRUD and lifecycle
router.get(
  "/",
  authorizePermission("production", "read"),
  productionOrderController.getProductionOrders
);

router.post(
  "/",
  authorizePermission("production", "create"),
  productionOrderController.createProductionOrder
);

router.get(
  "/:id",
  idParamValidator("id"),
  authorizePermission("production", "read"),
  productionOrderController.getProductionOrderById
);

router.patch(
  "/:id",
  updateProductionOrderValidator,
  authorizePermission("production", "update"),
  productionOrderController.updateProductionOrder
);

router.put(
  "/:id/operations",
  idParamValidator("id"),
  authorizePermission("production", "update"),
  productionOrderController.updateOperations
);

router.post(
  "/:id/hold",
  holdResumeCancelValidator,
  authorizePermission("production", "update"),
  productionOrderController.holdProductionOrder
);

router.post(
  "/:id/resume",
  holdResumeCancelValidator,
  authorizePermission("production", "update"),
  productionOrderController.resumeProductionOrder
);

router.post(
  "/:id/cancel",
  holdResumeCancelValidator,
  authorizePermission("production", "delete"),
  productionOrderController.cancelProductionOrder
);

// Perform Quality Check on a production order
router.post(
  "/:id/quality-checks",
  qualityCheckValidator,
  authorizePermission("production", "update"),
  qualityCheckController.performQualityCheck
);

// Get QC history for a production order
router.get(
  "/:id/qc-history",
  authorizePermission("production", "read"),
  productionOrderController.getQcHistory
);

module.exports = router;
