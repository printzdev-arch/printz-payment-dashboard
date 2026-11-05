/**
 * Centralized Services Barrel Export
 * MVC Architecture - Services Layer
 */

// Auth
const authService = require("./auth/services/auth.service");
const userService = require("./auth/services/user.service");
const roleService = require("./auth/services/role.service");
const employeeService = require("./employees/services/employee.service");

// Common
const branchService = require("./branches/services/branch.service");
const departmentService = require("./departments/services/department.service");
const designationService = require("./designations/services/designation.service");
const printerService = require("./printers/services/printer.service");
const printerReadingService = require("./printers/services/printerReading.service");
const jumboXeroxService = require("./printers/services/jumboXerox.service");
const pastDateRequestService = require("./past-date-requests/services/pastDateRequest.service");
const stockService = require("./stocks/services/stock.service");
const totalAmountService = require("./printers/services/totalAmount.service");
const reportService = require("./reports/services/report.service");
const generalService = require("./general/services/general.service");
const approvalService = require("./approvals/services/approval.service");
const attachmentService = require("./attachments/services/attachment.service");
const auditLogService = require("./audit-logs/services/auditLog.service");
const numberSequenceService = require("./number-sequences/services/numberSequence.service");

// Customer
const customerService = require("./customers/services/customer.service");
const customerMatchingService = require("./customers/services/customerMatching.service");

// Delivery
const deliveryOrderService = require("./delivery/services/deliveryOrder.service");
const deliveryProofService = require("./delivery/services/deliveryProof.service");

// Design
const designAllocationService = require("./design/services/designAllocation.service");
const designSampleService = require("./design/services/designSample.service");
const designWorkService = require("./design/services/designWork.service");

// Inventory
const inventoryService = require("./inventory/services/inventory.service");
const inventoryBalanceService = require("./inventory/services/inventoryBalance.service");
const inventoryItemService = require("./inventory/services/inventoryItem.service");
const inventoryTransactionService = require("./inventory/services/inventoryTransaction.service");
const purchaseReceiptService = require("./inventory/services/purchaseReceipt.service");

// Invoice
const invoiceService = require("./invoices/services/invoice.service");
const paymentService = require("./invoices/services/payment.service");

// Job Order
const jobOrderService = require("./job-orders/services/jobOrder.service");
const jobEstimateService = require("./job-orders/services/jobEstimate.service");
const jobFileService = require("./job-orders/services/jobFile.service");
const jobInvoiceService = require("./job-orders/services/jobInvoice.service");
const jobWorkflowService = require("./job-orders/services/jobWorkflow.service");

// POS
const saleReceiptService = require("./pos/services/saleReceipt.service");

// Production
const productionPlanningService = require("./production/services/productionPlanning.service");
const productionOperationService = require("./production/services/productionOperation.service");
const productionOrderService = require("./production/services/productionOrder.service");
const productionQueueService = require("./production/services/productionQueue.service");
const productionStateService = require("./production/services/productionState.service");
const qualityCheckService = require("./production/services/qualityCheck.service");
const reprintService = require("./production/services/reprint.service");
const reworkService = require("./production/services/rework.service");

// Public
const publicDesignApprovalService = require("./public/services/publicDesignApproval.service");
const publicJobRequestService = require("./public/services/publicJobRequest.service");

// Settlement
const customerFeedbackService = require("./settlements/services/customerFeedback.service");
const jobClosureService = require("./settlements/services/jobClosure.service");
const settlementService = require("./settlements/services/settlement.service");
const collectionReportService = require("./settlements/services/collectionReport.service");
const settlementSlaReportService = require("./settlements/services/settlementSlaReport.service");

// SLA
const designerPerformanceService = require("./sla/services/designerPerformance.service");
const designerRatingService = require("./sla/services/designerRating.service");
const slaService = require("./sla/services/sla.service");
const slaConfigurationService = require("./sla/services/slaConfiguration.service");
const slaSchedulerService = require("./sla/services/slaScheduler.service");

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

  // Production
  productionPlanningService,
  productionOperationService,
  productionOrderService,
  productionQueueService,
  productionStateService,
  qualityCheckService,
  reprintService,
  reworkService,

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

  // Salary & Payroll
  salaryService: require("./salary/services/salary.service"),
};
