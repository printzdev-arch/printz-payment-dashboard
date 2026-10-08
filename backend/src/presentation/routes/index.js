const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const printerRoutes = require("./printer.routes");
const printerReadingRoutes = require("./printerReading.routes");
const jumboXeroxRoutes = require("./jumboXerox.routes");
const totalAmountRoutes = require("./totalAmount.routes");
const stockRoutes = require("./stock.routes");
const pastDateRequestRoutes = require("./pastDateRequest.routes");
const paymentRoutes = require("./payment.routes");
const branchRoutes = require("./branch.routes");
const reportRoutes = require("./report.routes");
const generalRoutes = require("./general.routes");

// Production module routes
const {
  router: productionModuleRouter,
  productionOrdersRoutes,
  productionOperationsRoutes,
  productionQueueRoutes,
  qualityChecksRoutes,
  reprintRequestsRoutes,
  deliveryOrdersRoutes,
} = require("./production");

// Job Order & Design workflow routes (Modules 06 & 07)
const { jobOrderRoutes } = require("./job-order");
const { designRoutes } = require("./design");

// SLA & Performance routes (Module 09)
const {
  slaConfigurationRoutes,
  slaRoutes,
  designerRatingRoutes,
  designerPerformanceRoutes,
} = require("./sla");

const productionOrderController = require("../controllers/production/productionOrder.controller");
const reprintRequestController = require("../controllers/production/reprintRequest.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorizePermission } = require("../middleware/permission.middleware");
const {
  planProductionValidator,
  reprintRequestValidator,
} = require("../validators/production/production.validator");

// Mount modular sub-routers
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/printers", printerRoutes);
router.use("/printer-readings", printerReadingRoutes);
router.use("/jumbo-xerox", jumboXeroxRoutes);
router.use("/total-amounts", totalAmountRoutes);
router.use("/stocks", stockRoutes);
router.use("/past-date-requests", pastDateRequestRoutes);
router.use("/payments", paymentRoutes);
router.use("/branches", branchRoutes);
router.use("/reports", reportRoutes);
router.use("/general", generalRoutes);

// Mount Job Order & Design sub-routers
router.use("/job-orders", jobOrderRoutes);
router.use("/design", designRoutes);

// Mount SLA & Designer Performance sub-routers (Module 09)
router.use("/sla-configurations", slaConfigurationRoutes);
router.use("/sla", slaRoutes);
router.use("/designer-ratings", designerRatingRoutes);
router.use("/designers", designerPerformanceRoutes);

// Mount Production sub-routers at standard endpoints
router.use("/production-orders", productionOrdersRoutes);
router.use("/production-operations", productionOperationsRoutes);
router.use("/production-queue", productionQueueRoutes);
router.use("/quality-checks", qualityChecksRoutes);
router.use("/reprint-requests", reprintRequestsRoutes);
router.use("/delivery-orders", deliveryOrdersRoutes);
router.use("/production", productionModuleRouter);

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

module.exports = router;
