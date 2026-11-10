const express = require("express");
const router = express.Router();

const productionOrdersRoutes = require("./productionOrders.routes");
const productionOperationsRoutes = require("./productionOperations.routes");
const productionQueueRoutes = require("./productionQueue.routes");
const qualityChecksRoutes = require("./qualityChecks.routes");
const reprintRequestsRoutes = require("./reprintRequests.routes");
const deliveryOrdersRoutes = require("./deliveryOrders.routes");
const productionResourcesRoutes = require("./productionResources.routes");
const productionReportsRoutes = require("./productionReports.routes");
const productionDashboardRoutes = require("./productionDashboard.routes");

const productionOrderController = require("../controllers/productionOrder.controller");
const reprintRequestController = require("../controllers/reprintRequest.controller");
const { authenticate } = require("../../../middleware/security/auth.middleware");
const { authorizePermission } = require("../../../middleware/security/permission.middleware");
const {
  planProductionValidator,
  reprintRequestValidator,
} = require("./production.validator");

// Planning endpoints: GET /production/planning & GET /production/planning/:id
router.get("/planning", authenticate, authorizePermission("production", "read"), productionOrderController.getPlanningJobs);
router.get("/planning/:id", authenticate, authorizePermission("production", "read"), productionOrderController.getPlanningJobById);
router.post("/plan/:id", authenticate, planProductionValidator, authorizePermission("production", "create"), productionOrderController.planProduction);

// NOTE: there is no "create production order" endpoint. Production orders are
// generated automatically when a job order is approved for production.

// Mount sub-routers with clean aliases
router.use("/orders", productionOrdersRoutes);
router.use("/operations", productionOperationsRoutes);
router.use("/queue", productionQueueRoutes);
router.use("/production-orders", productionOrdersRoutes);
router.use("/production-operations", productionOperationsRoutes);
router.use("/production-queue", productionQueueRoutes);
router.use("/quality-checks", qualityChecksRoutes);
router.use("/reprint-requests", reprintRequestsRoutes);
router.use("/reprints", reprintRequestsRoutes);
router.use("/delivery-orders", deliveryOrdersRoutes);
router.use("/production-resources", productionResourcesRoutes);
router.use("/production-reports", productionReportsRoutes);
router.use("/production-dashboard", productionDashboardRoutes);

// Job Order Production & Reprint endpoints (POST /job-orders/:id/production/plan & POST /job-orders/:id/reprint-requests)
router.post(
  "/job-orders/:id/production/plan",
  authenticate,
  planProductionValidator,
  authorizePermission("production", "create"),
  productionOrderController.planProduction
);

router.post(
  "/job-orders/:id/reprint-requests",
  authenticate,
  reprintRequestValidator,
  authorizePermission("production", "create"),
  reprintRequestController.createReprintRequest
);

module.exports = {
  router,
  productionOrdersRoutes,
  productionOperationsRoutes,
  productionQueueRoutes,
  qualityChecksRoutes,
  reprintRequestsRoutes,
  deliveryOrdersRoutes,
  productionResourcesRoutes,
  productionReportsRoutes,
  productionDashboardRoutes,
};