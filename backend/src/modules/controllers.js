/**
 * Centralized Controllers Barrel Export
 * MVC Architecture - Controllers Layer
 */

// Auth
const authController = require("./auth/controllers/auth.controller");
const userController = require("./auth/controllers/user.controller");
const roleController = require("./auth/controllers/role.controller");
const employeeController = require("./employees/controllers/employee.controller");

// Common
const branchController = require("./branches/controllers/branch.controller");
const departmentController = require("./departments/controllers/department.controller");
const designationController = require("./designations/controllers/designation.controller");
const printerController = require("./printers/controllers/printer.controller");
const printerReadingController = require("./printers/controllers/printerReading.controller");
const jumboXeroxController = require("./printers/controllers/jumboXerox.controller");
const pastDateRequestController = require("./past-date-requests/controllers/pastDateRequest.controller");
const stockController = require("./stocks/controllers/stock.controller");
const totalAmountController = require("./printers/controllers/totalAmount.controller");
const reportController = require("./reports/controllers/report.controller");
const generalController = require("./general/controllers/general.controller");
const approvalController = require("./approvals/controllers/approval.controller");
const attachmentController = require("./attachments/controllers/attachment.controller");
const auditLogController = require("./audit-logs/controllers/auditLog.controller");
const numberSequenceController = require("./number-sequences/controllers/numberSequence.controller");

// Customer
const customerController = require("./customers/controllers/customer.controller");
const customerRequestController = require("./customers/controllers/customerRequest.controller");

// Delivery
const deliveryOrderController = require("./delivery/controllers/deliveryOrder.controller");
const deliveryProofController = require("./delivery/controllers/deliveryProof.controller");

// Design
const designAllocationController = require("./design/controllers/designAllocation.controller");
const designSampleController = require("./design/controllers/designSample.controller");
const designWorkController = require("./design/controllers/designWork.controller");

// Inventory
const inventoryBalanceController = require("./inventory/controllers/inventoryBalance.controller");
const inventoryItemController = require("./inventory/controllers/inventoryItem.controller");
const inventoryTransactionController = require("./inventory/controllers/inventoryTransaction.controller");
const purchaseReceiptController = require("./inventory/controllers/purchaseReceipt.controller");

// Invoice
const invoiceController = require("./invoices/controllers/invoice.controller");
const paymentController = require("./invoices/controllers/payment.controller");

// Job Order
const jobOrderController = require("./job-orders/controllers/jobOrder.controller");
const jobEstimateController = require("./job-orders/controllers/jobEstimate.controller");
const jobFileController = require("./job-orders/controllers/jobFile.controller");
const jobInvoiceController = require("./job-orders/controllers/jobInvoice.controller");

// POS
const saleReceiptController = require("./pos/controllers/saleReceipt.controller");

// Production
const productionPlanningDeliveryOrderController = require("./production/controllers/deliveryOrder.controller");
const productionOperationController = require("./production/controllers/productionOperation.controller");
const productionOrderController = require("./production/controllers/productionOrder.controller");
const productionQueueController = require("./production/controllers/productionQueue.controller");
const qualityCheckController = require("./production/controllers/qualityCheck.controller");
const reprintRequestController = require("./production/controllers/reprintRequest.controller");

// Public
const publicDesignApprovalController = require("./public/controllers/publicDesignApproval.controller");
const publicJobRequestController = require("./public/controllers/publicJobRequest.controller");

// Settlement
const customerFeedbackController = require("./settlements/controllers/customerFeedback.controller");
const jobClosureController = require("./settlements/controllers/jobClosure.controller");
const settlementController = require("./settlements/controllers/settlement.controller");
const settlementReportController = require("./settlements/controllers/settlementReport.controller");

// SLA
const designerPerformanceController = require("./sla/controllers/designerPerformance.controller");
const designerRatingController = require("./sla/controllers/designerRating.controller");
const slaController = require("./sla/controllers/sla.controller");
const slaConfigurationController = require("./sla/controllers/slaConfiguration.controller");

module.exports = {
  // Auth
  authController,
  userController,
  roleController,
  employeeController,

  // Common
  branchController,
  departmentController,
  designationController,
  printerController,
  printerReadingController,
  jumboXeroxController,
  pastDateRequestController,
  stockController,
  totalAmountController,
  reportController,
  generalController,
  approvalController,
  attachmentController,
  auditLogController,
  numberSequenceController,

  // Customer
  customerController,
  customerRequestController,

  // Delivery
  deliveryOrderController,
  deliveryProofController,

  // Design
  designAllocationController,
  designSampleController,
  designWorkController,

  // Inventory
  inventoryBalanceController,
  inventoryItemController,
  inventoryTransactionController,
  purchaseReceiptController,

  // Invoice
  invoiceController,
  paymentController,

  // Job Order
  jobOrderController,
  jobEstimateController,
  jobFileController,
  jobInvoiceController,

  // POS
  saleReceiptController,

  // Production
  productionPlanningDeliveryOrderController,
  productionOperationController,
  productionOrderController,
  productionQueueController,
  qualityCheckController,
  reprintRequestController,

  // Public
  publicDesignApprovalController,
  publicJobRequestController,

  // Settlement
  customerFeedbackController,
  jobClosureController,
  settlementController,
  settlementReportController,

  // SLA
  designerPerformanceController,
  designerRatingController,
  slaController,
  slaConfigurationController,

  // Salary & Payroll
  salaryController: require("./salary/controllers/salary.controller"),
};
