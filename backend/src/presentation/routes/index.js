const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const employeeRoutes = require("./employee.routes");
const roleRoutes = require("./role.routes");
const permissionRoutes = require("./permission.routes");
const departmentRoutes = require("./department.routes");
const designationRoutes = require("./designation.routes");
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

// Common services (Module 02)
const approvalRoutes = require("./common/approval.routes");
const attachmentRoutes = require("./common/attachment.routes");
const auditLogRoutes = require("./common/auditLog.routes");
const numberSequenceRoutes = require("./common/numberSequence.routes");

// Inventory routes (Module 03)
const inventoryItemRoutes = require("./inventory/inventoryItem.routes");
const inventoryBalanceRoutes = require("./inventory/inventoryBalance.routes");
const inventoryTransactionRoutes = require("./inventory/inventoryTransaction.routes");
const purchaseReceiptRoutes = require("./inventory/purchaseReceipt.routes");

// POS routes (Module 04)
const saleReceiptRoutes = require("./pos/saleReceipt.routes");

// Product order & warehouse transfer routes (Module 05)
const productOrderRoutes = require("./product-order/productOrderRoutes");
const stockTransferRoutes = require("./product-order/stockTransferRoutes");

// Production module routes (Module 08)
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

// Mount Module 01: Auth, Users, Roles, Permissions, Employees, Departments, Designations
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/employees", employeeRoutes);
router.use("/roles", roleRoutes);
router.use("/permissions", permissionRoutes);
router.use("/departments", departmentRoutes);
router.use("/designations", designationRoutes);

// Mount Module 02: Common Services
router.use("/audit-logs", auditLogRoutes);
router.use("/approvals", approvalRoutes);
router.use("/attachments", attachmentRoutes);
router.use("/number-sequences", numberSequenceRoutes);

// Mount Module 03: Inventory & Masters
router.use("/inventory-items", inventoryItemRoutes);
router.use("/inventory-balances", inventoryBalanceRoutes);
router.use("/inventory-transactions", inventoryTransactionRoutes);
router.use("/purchase-receipts", purchaseReceiptRoutes);

// Mount Module 04: POS Sale Receipts
router.use("/sale-receipts", saleReceiptRoutes);

// Mount Module 05: Product Orders & Stock Transfers
router.use("/product-orders", productOrderRoutes);
router.use("/stock-transfers", stockTransferRoutes);

// Legacy / Support routers
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

// Mount Modules 06 & 07: Job Order & Design sub-routers
router.use("/job-orders", jobOrderRoutes);
router.use("/design", designRoutes);

// Mount Module 09: SLA & Designer Performance sub-routers
router.use("/sla-configurations", slaConfigurationRoutes);
router.use("/sla", slaRoutes);
router.use("/designer-ratings", designerRatingRoutes);
router.use("/designers", designerPerformanceRoutes);

// Mount Module 08: Production sub-routers at standard endpoints
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
