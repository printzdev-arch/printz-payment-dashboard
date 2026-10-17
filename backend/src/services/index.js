/**
 * Centralized Services Barrel Export
 * MVC Architecture - Services Layer
 */

// Auth
const authService = require("./auth/auth.service");
const userService = require("./auth/user.service");
const roleService = require("./auth/role.service");
const employeeService = require("./auth/employee.service");

// Common
const branchService = require("./common/branch.service");
const departmentService = require("./common/department.service");
const designationService = require("./common/designation.service");
const printerService = require("./common/printer.service");
const printerReadingService = require("./common/printerReading.service");
const jumboXeroxService = require("./common/jumboXerox.service");
const pastDateRequestService = require("./common/pastDateRequest.service");
const stockService = require("./common/stock.service");
const totalAmountService = require("./common/totalAmount.service");
const reportService = require("./common/report.service");
const generalService = require("./common/general.service");
const approvalService = require("./common/approval.service");
const attachmentService = require("./common/attachment.service");
const auditLogService = require("./common/auditLog.service");
const numberSequenceService = require("./common/numberSequence.service");

// Customer
const customerService = require("./customer/customer.service");
const customerMatchingService = require("./customer/customerMatching.service");

// Delivery
const deliveryOrderService = require("./delivery/deliveryOrder.service");
const deliveryProofService = require("./delivery/deliveryProof.service");

// Design
const designAllocationService = require("./design/designAllocation.service");
const designSampleService = require("./design/designSample.service");
const designWorkService = require("./design/designWork.service");

// Inventory
const inventoryService = require("./inventory/inventory.service");
const inventoryBalanceService = require("./inventory/inventoryBalance.service");
const inventoryItemService = require("./inventory/inventoryItem.service");
const inventoryTransactionService = require("./inventory/inventoryTransaction.service");
const purchaseReceiptService = require("./inventory/purchaseReceipt.service");

// Invoice
const invoiceService = require("./invoice/invoice.service");
const paymentService = require("./invoice/payment.service");

// Job Order
const jobOrderService = require("./job-order/jobOrder.service");
const jobEstimateService = require("./job-order/jobEstimate.service");
const jobFileService = require("./job-order/jobFile.service");
const jobInvoiceService = require("./job-order/jobInvoice.service");
const jobWorkflowService = require("./job-order/jobWorkflow.service");

// POS
const saleReceiptService = require("./pos/saleReceipt.service");

// Product Order
const productOrderService = require("./product-order/productOrderService");
const stockTransferService = require("./product-order/stockTransferService");

// Production
const productionPlanningService = require("./production/productionPlanning.service");
const productionOperationService = require("./production/productionOperation.service");
const productionOrderService = require("./production/productionOrder.service");
const productionQueueService = require("./production/productionQueue.service");
const productionStateService = require("./production/productionState.service");
const qualityCheckService = require("./production/qualityCheck.service");
const reprintService = require("./production/reprint.service");
const reworkService = require("./production/rework.service");
const roundRobinService = require("./production/roundRobin.service");

// Public
const publicDesignApprovalService = require("./public/publicDesignApproval.service");
const publicJobRequestService = require("./public/publicJobRequest.service");

// Settlement
const customerFeedbackService = require("./settlement/customerFeedback.service");
const jobClosureService = require("./settlement/jobClosure.service");
const settlementService = require("./settlement/settlement.service");
const collectionReportService = require("./settlement/collectionReport.service");
const settlementSlaReportService = require("./settlement/settlementSlaReport.service");

// SLA
const designerPerformanceService = require("./sla/designerPerformance.service");
const designerRatingService = require("./sla/designerRating.service");
const slaService = require("./sla/sla.service");
const slaConfigurationService = require("./sla/slaConfiguration.service");
const slaSchedulerService = require("./sla/slaScheduler.service");

module.exports = {
  // Auth
  authService,
  userService,
  roleService,
  employeeService,

  // Common
  branchService,
  departmentService,
  designationService,
  printerService,
  printerReadingService,
  jumboXeroxService,
  pastDateRequestService,
  stockService,
  totalAmountService,
  reportService,
  generalService,
  approvalService,
  attachmentService,
  auditLogService,
  numberSequenceService,

  // Customer
  customerService,
  customerMatchingService,

  // Delivery
  deliveryOrderService,
  deliveryProofService,

  // Design
  designAllocationService,
  designSampleService,
  designWorkService,

  // Inventory
  inventoryService,
  inventoryBalanceService,
  inventoryItemService,
  inventoryTransactionService,
  purchaseReceiptService,

  // Invoice
  invoiceService,
  paymentService,

  // Job Order
  jobOrderService,
  jobEstimateService,
  jobFileService,
  jobInvoiceService,
  jobWorkflowService,

  // POS
  saleReceiptService,

  // Product Order
  productOrderService,
  stockTransferService,

  // Production
  productionPlanningService,
  productionOperationService,
  productionOrderService,
  productionQueueService,
  productionStateService,
  qualityCheckService,
  reprintService,
  reworkService,
  roundRobinService,

  // Public
  publicDesignApprovalService,
  publicJobRequestService,

  // Settlement
  customerFeedbackService,
  jobClosureService,
  settlementService,
  collectionReportService,
  settlementSlaReportService,

  // SLA
  designerPerformanceService,
  designerRatingService,
  slaService,
  slaConfigurationService,
  slaSchedulerService,
};
