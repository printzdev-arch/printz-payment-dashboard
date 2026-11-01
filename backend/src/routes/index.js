const express = require("express");
const router = express.Router();

// Module 01: Auth, Users, Roles, Permissions, Employees
const {
  authRoutes,
  userRoutes,
  employeeRoutes,
  roleRoutes,
  permissionRoutes,
} = require("../modules/auth/routes");

// Module 02: Common & Master Services
const approvalRoutes = require("../modules/approvals/routes/approval.routes");
const attachmentRoutes = require("../modules/attachments/routes/attachment.routes");
const auditLogRoutes = require("../modules/audit-logs/routes/auditLog.routes");
const numberSequenceRoutes = require("../modules/number-sequences/routes/numberSequence.routes");
const branchRoutes = require("../modules/branches/routes/branch.routes");
const departmentRoutes = require("../modules/departments/routes/department.routes");
const designationRoutes = require("../modules/designations/routes/designation.routes");
const generalRoutes = require("../modules/general/routes/general.routes");
const jumboXeroxRoutes = require("../modules/printers/routes/jumboXerox.routes");
const pastDateRequestRoutes = require("../modules/past-date-requests/routes/pastDateRequest.routes");
const printerRoutes = require("../modules/printers/routes/printer.routes");
const printerReadingRoutes = require("../modules/printers/routes/printerReading.routes");
const reportRoutes = require("../modules/reports/routes/report.routes");
const stockRoutes = require("../modules/stocks/routes/stock.routes");
const totalAmountRoutes = require("../modules/printers/routes/totalAmount.routes");

// Module 03: Inventory & Customers
const inventoryItemRoutes = require("../modules/inventory/routes/inventoryItem.routes");
const inventoryBalanceRoutes = require("../modules/inventory/routes/inventoryBalance.routes");
const inventoryTransactionRoutes = require("../modules/inventory/routes/inventoryTransaction.routes");
const purchaseReceiptRoutes = require("../modules/inventory/routes/purchaseReceipt.routes");
const customerRoutes = require("../modules/customers/routes/customer.routes");
const customerRequestRoutes = require("../modules/customers/routes/customerRequest.routes");

// Module 04: POS
const saleReceiptRoutes = require("../modules/pos/routes/saleReceipt.routes");

// Module 08: Production & Delivery
const {
  router: productionModuleRouter,
  productionOrdersRoutes,
  productionOperationsRoutes,
  productionQueueRoutes,
  qualityChecksRoutes,
  reprintRequestsRoutes,
  productionResourcesRoutes,
  productionReportsRoutes,
  productionDashboardRoutes,
} = require("../modules/production/routes");

const {
  router: deliveryModuleRouter,
  deliveryOrdersRoutes,
  deliveryProofsRoutes,
} = require("../modules/delivery/routes");

// Modules 06 & 07: Job Order & Design workflow
const { jobOrderRoutes } = require("../modules/job-orders/routes");
const { designRoutes } = require("../modules/design/routes");
const publicRoutes = require("../modules/public/routes/public.routes");
const estimateRoutes = require("../modules/estimates/routes/estimate.routes");
const customerPortalRoutes = require("../modules/customer-portal/routes/customerPortal.routes");

// Module 10: Invoicing & Settlement
const { invoiceRoutes, paymentRoutes } = require("../modules/invoices/routes");
const settlementRoutes = require("../modules/settlements/routes/settlement.routes");

// Master Settings & Defaults
const masterSettingRoutes = require("../modules/settings/routes/masterSetting.routes");

// Module 09: SLA & Performance
const {
  slaConfigurationRoutes,
  slaRoutes,
  designerRatingRoutes,
  designerPerformanceRoutes,
} = require("../modules/sla/routes");

// Module 11: HR Configuration & Daily Attendance
const {
  attendancePolicyRoutes,
  holidayCalendarRoutes,
  dailyAttendanceRoutes,
  attendancePermissionRoutes,
} = require("../modules/attendance/routes");

// Sale Order (Branch -> Manufacturing Unit)
const { saleOrderRoutes, mfgRoutes } = require("../modules/sale-orders/routes");

const productionOrderController = require("../modules/production/controllers/productionOrder.controller");
const reprintRequestController = require("../modules/production/controllers/reprintRequest.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorizePermission } = require("../middleware/permission.middleware");
const {
  planProductionValidator,
  reprintRequestValidator,
} = require("../modules/production/validators/production.validator");

// Loaded last, in the same position as before, so module load order is unchanged
const { dashboardRoutes } = require("../modules/dashboard");
const { salaryRoutes } = require("../modules/salary/routes");

/**
 * API mount table. ORDER MATTERS: Express matches in this order, and the settlement router
 * is mounted at "/" (so it sees every request that reaches it). Add new modules ABOVE the
 * settlement entry unless they must sit behind it.
 * Each entry is [paths, router]; one router can have several paths (legacy aliases).
 */
const MOUNTS = [
  // Auth, users, roles, permissions, employees
  [["/auth"], authRoutes],
  [["/users"], userRoutes],
  [["/employees"], employeeRoutes],
  [["/roles"], roleRoutes],
  [["/permissions"], permissionRoutes],

  // Common & master services
  [["/departments"], departmentRoutes],
  [["/designations"], designationRoutes],
  [["/branches"], branchRoutes],
  [["/printers"], printerRoutes],
  [["/printer-readings"], printerReadingRoutes],
  [["/jumbo-xerox"], jumboXeroxRoutes],
  [["/total-amounts"], totalAmountRoutes],
  [["/stocks"], stockRoutes],
  [["/past-date-requests"], pastDateRequestRoutes],
  [["/reports"], reportRoutes],
  [["/general"], generalRoutes],
  [["/audit-logs"], auditLogRoutes],
  [["/approvals"], approvalRoutes],
  [["/attachments"], attachmentRoutes],
  [["/number-sequences"], numberSequenceRoutes],

  // Inventory & customers (with legacy dash aliases)
  [["/inventory/items", "/inventory-items"], inventoryItemRoutes],
  [["/inventory/balances", "/inventory-balances"], inventoryBalanceRoutes],
  [["/inventory/transactions", "/inventory-transactions"], inventoryTransactionRoutes],
  [["/inventory/receipts", "/purchase-receipts"], purchaseReceiptRoutes],
  [["/customers"], customerRoutes],
  [["/customer-requests"], customerRequestRoutes],

  // POS and payments
  [["/sale-receipts"], saleReceiptRoutes],
  [["/payments"], paymentRoutes],

  // Public & customer portal
  [["/public"], publicRoutes],
  [["/customer"], customerPortalRoutes],
  [["/estimates"], estimateRoutes],

  // Job orders & design
  [["/job-orders", "/jobs"], jobOrderRoutes],
  [["/design"], designRoutes],

  // SLA
  [["/sla-configurations"], slaConfigurationRoutes],
  [["/sla"], slaRoutes],
  [["/designer-ratings"], designerRatingRoutes],
  [["/designers"], designerPerformanceRoutes],

  // Production & delivery
  [["/production-orders"], productionOrdersRoutes],
  [["/production-operations"], productionOperationsRoutes],
  [["/production-queue"], productionQueueRoutes],
  [["/quality-checks", "/quality-control"], qualityChecksRoutes],
  [["/reprint-requests"], reprintRequestsRoutes],
  [["/production-resources"], productionResourcesRoutes],
  [["/production-reports"], productionReportsRoutes],
  [["/production-dashboard"], productionDashboardRoutes],
  [["/delivery-orders"], deliveryOrdersRoutes],
  [["/delivery-proofs"], deliveryProofsRoutes],
  [["/delivery"], deliveryModuleRouter],
  [["/production", "/production-planning"], productionModuleRouter],

  // Sale orders (branch -> manufacturing unit). Must stay above the catch-all settlement mount below.
  [["/sale-orders"], saleOrderRoutes],
  [["/mfg"], mfgRoutes],

  // Invoices & settlement ("/" is a catch-all: everything after it passes through it first)
  [["/invoices", "/invoice"], invoiceRoutes],
  [["/settlement", "/settlements", "/"], settlementRoutes],

  // Master settings, dashboards, attendance, salary
  [["/master-settings"], masterSettingRoutes],
  [["/dashboards", "/dashboard"], dashboardRoutes],
  [["/attendance-policies"], attendancePolicyRoutes],
  [["/holiday-calendars"], holidayCalendarRoutes],
  [["/attendance/permissions"], attendancePermissionRoutes],
  [["/attendance"], dailyAttendanceRoutes],
  [["/salary"], salaryRoutes],
];

MOUNTS.forEach(([paths, moduleRouter]) => paths.forEach((p) => router.use(p, moduleRouter)));

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
// The API reference uses the mount table to treat alias prefixes (for example /jobs and /job-orders) as one
module.exports.MOUNTS = MOUNTS;
