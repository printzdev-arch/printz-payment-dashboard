const express = require("express");
const router = express.Router();

// Module 01: Auth, Users, Roles, Permissions, Employees
const {
  authRoutes,
  userRoutes,
  employeeRoutes,
  roleRoutes,
  permissionRoutes,
} = require("./auth");

// Module 02: Common & Master Services
const {
  approvalRoutes,
  attachmentRoutes,
  auditLogRoutes,
  numberSequenceRoutes,
  branchRoutes,
  departmentRoutes,
  designationRoutes,
  generalRoutes,
  jumboXeroxRoutes,
  pastDateRequestRoutes,
  printerRoutes,
  printerReadingRoutes,
  reportRoutes,
  stockRoutes,
  totalAmountRoutes,
} = require("./common");

// Module 03: Inventory & Customers
const inventoryItemRoutes = require("./inventory/inventoryItem.routes");
const inventoryBalanceRoutes = require("./inventory/inventoryBalance.routes");
const inventoryTransactionRoutes = require("./inventory/inventoryTransaction.routes");
const purchaseReceiptRoutes = require("./inventory/purchaseReceipt.routes");
const customerRoutes = require("./customer/customer.routes");
const customerRequestRoutes = require("./customer/customerRequest.routes");

// Module 04: POS
const saleReceiptRoutes = require("./pos/saleReceipt.routes");

// Module 05: Product Orders & Stock Transfers
const productOrderRoutes = require("./product-order/productOrderRoutes");
const stockTransferRoutes = require("./product-order/stockTransferRoutes");

// Module 08: Production & Delivery
const {
  router: productionModuleRouter,
  productionOrdersRoutes,
  productionOperationsRoutes,
  productionQueueRoutes,
  qualityChecksRoutes,
  reprintRequestsRoutes,
} = require("./production");

const {
  router: deliveryModuleRouter,
  deliveryOrdersRoutes,
  deliveryProofsRoutes,
} = require("./delivery");

// Modules 06 & 07: Job Order & Design workflow
const { jobOrderRoutes } = require("./job-order");
const { designRoutes } = require("./design");
const publicRoutes = require("./public/public.routes");
const estimateRoutes = require("./estimate/estimate.routes");
const customerPortalRoutes = require("./customerPortal/customerPortal.routes");

// Module 10: Invoicing & Settlement
const { invoiceRoutes, paymentRoutes } = require("./invoice");
const settlementRoutes = require("./settlement/settlement.routes");

// Module 09: SLA & Performance
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
} = require("../middleware/validators/production/production.validator");

// Mount Module 01: Auth, Users, Roles, Permissions, Employees
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/employees", employeeRoutes);
router.use("/roles", roleRoutes);
router.use("/permissions", permissionRoutes);

// Mount Common & Master Services
router.use("/departments", departmentRoutes);
router.use("/designations", designationRoutes);
router.use("/branches", branchRoutes);
router.use("/printers", printerRoutes);
router.use("/printer-readings", printerReadingRoutes);
router.use("/jumbo-xerox", jumboXeroxRoutes);
router.use("/total-amounts", totalAmountRoutes);
router.use("/stocks", stockRoutes);
router.use("/past-date-requests", pastDateRequestRoutes);
router.use("/reports", reportRoutes);
router.use("/general", generalRoutes);
router.use("/audit-logs", auditLogRoutes);
router.use("/approvals", approvalRoutes);
router.use("/attachments", attachmentRoutes);
router.use("/number-sequences", numberSequenceRoutes);

// Mount Inventory & Customer (with legacy dash aliases)
router.use("/inventory/items", inventoryItemRoutes);
router.use("/inventory-items", inventoryItemRoutes);
router.use("/inventory/balances", inventoryBalanceRoutes);
router.use("/inventory-balances", inventoryBalanceRoutes);
router.use("/inventory/transactions", inventoryTransactionRoutes);
router.use("/inventory-transactions", inventoryTransactionRoutes);
router.use("/inventory/receipts", purchaseReceiptRoutes);
router.use("/purchase-receipts", purchaseReceiptRoutes);
router.use("/customers", customerRoutes);
router.use("/customer-requests", customerRequestRoutes);

// Mount POS & Product Order
router.use("/sale-receipts", saleReceiptRoutes);
router.use("/product-orders", productOrderRoutes);
router.use("/stock-transfers", stockTransferRoutes);

// Mount Payments
router.use("/payments", paymentRoutes);

// Mount Public & Customer Portal
router.use("/public", publicRoutes);
router.use("/customer", customerPortalRoutes);
router.use("/estimates", estimateRoutes);

// Mount Job Orders & Design
router.use("/job-orders", jobOrderRoutes);
router.use("/jobs", jobOrderRoutes);
router.use("/design", designRoutes);

// Mount SLA
router.use("/sla-configurations", slaConfigurationRoutes);
router.use("/sla", slaRoutes);
router.use("/designer-ratings", designerRatingRoutes);
router.use("/designers", designerPerformanceRoutes);

// Mount Production & Delivery
router.use("/production-orders", productionOrdersRoutes);
router.use("/production-operations", productionOperationsRoutes);
router.use("/production-queue", productionQueueRoutes);
router.use("/quality-checks", qualityChecksRoutes);
router.use("/quality-control", qualityChecksRoutes);
router.use("/reprint-requests", reprintRequestsRoutes);
router.use("/delivery-orders", deliveryOrdersRoutes);
router.use("/delivery-proofs", deliveryProofsRoutes);
router.use("/delivery", deliveryModuleRouter);
router.use("/production", productionModuleRouter);
router.use("/production-planning", productionModuleRouter);

// Mount Invoices & Settlement
router.use("/invoices", invoiceRoutes);
router.use("/invoice", invoiceRoutes);
router.use("/settlement", settlementRoutes);
router.use("/settlements", settlementRoutes);
router.use("/", settlementRoutes);

// Job Order Production Plan & Reprint endpoints
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
