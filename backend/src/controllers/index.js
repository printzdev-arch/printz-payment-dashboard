/**
 * Centralized Controllers Barrel Export
 * MVC Architecture - Controllers Layer
 */

// Auth
const authController = require("./auth/auth.controller");
const userController = require("./auth/user.controller");
const roleController = require("./auth/role.controller");
const employeeController = require("./auth/employee.controller");

// Common
const branchController = require("./common/branch.controller");
const departmentController = require("./common/department.controller");
const designationController = require("./common/designation.controller");
const printerController = require("./common/printer.controller");
const printerReadingController = require("./common/printerReading.controller");
const jumboXeroxController = require("./common/jumboXerox.controller");
const pastDateRequestController = require("./common/pastDateRequest.controller");
const stockController = require("./common/stock.controller");
const totalAmountController = require("./common/totalAmount.controller");
const reportController = require("./common/report.controller");
const generalController = require("./common/general.controller");
const approvalController = require("./common/approval.controller");
const attachmentController = require("./common/attachment.controller");
const auditLogController = require("./common/auditLog.controller");
const numberSequenceController = require("./common/numberSequence.controller");

// Customer
const customerController = require("./customer/customer.controller");
const customerRequestController = require("./customer/customerRequest.controller");

// Delivery
const deliveryOrderController = require("./delivery/deliveryOrder.controller");
const deliveryProofController = require("./delivery/deliveryProof.controller");

// Design
const designAllocationController = require("./design/designAllocation.controller");
const designSampleController = require("./design/designSample.controller");
const designWorkController = require("./design/designWork.controller");

// Inventory
const inventoryBalanceController = require("./inventory/inventoryBalance.controller");
const inventoryItemController = require("./inventory/inventoryItem.controller");
const inventoryTransactionController = require("./inventory/inventoryTransaction.controller");
const purchaseReceiptController = require("./inventory/purchaseReceipt.controller");

// Invoice
const invoiceController = require("./invoice/invoice.controller");
const paymentController = require("./invoice/payment.controller");

// Job Order
const jobOrderController = require("./job-order/jobOrder.controller");
const jobEstimateController = require("./job-order/jobEstimate.controller");
const jobFileController = require("./job-order/jobFile.controller");
const jobInvoiceController = require("./job-order/jobInvoice.controller");

// POS
const saleReceiptController = require("./pos/saleReceipt.controller");

// Product Order
const productOrderController = require("./product-order/productOrderController");
const stockTransferController = require("./product-order/stockTransferController");

// Production
const productionPlanningDeliveryOrderController = require("./production/deliveryOrder.controller");
const productionOperationController = require("./production/productionOperation.controller");
const productionOrderController = require("./production/productionOrder.controller");
const productionQueueController = require("./production/productionQueue.controller");
const qualityCheckController = require("./production/qualityCheck.controller");
const reprintRequestController = require("./production/reprintRequest.controller");

// Public
const publicDesignApprovalController = require("./public/publicDesignApproval.controller");
const publicJobRequestController = require("./public/publicJobRequest.controller");

// Settlement
const customerFeedbackController = require("./settlement/customerFeedback.controller");
const jobClosureController = require("./settlement/jobClosure.controller");
const settlementController = require("./settlement/settlement.controller");
const settlementReportController = require("./settlement/settlementReport.controller");

// SLA
const designerPerformanceController = require("./sla/designerPerformance.controller");
const designerRatingController = require("./sla/designerRating.controller");
const slaController = require("./sla/sla.controller");
const slaConfigurationController = require("./sla/slaConfiguration.controller");

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

  // Product Order
  productOrderController,
  stockTransferController,

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
};
