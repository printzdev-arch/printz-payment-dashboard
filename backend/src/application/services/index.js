/**
 * Centralized Application Services Barrel Export
 * Clean Architecture - Application Layer (All 9 Modules)
 */

// API 01 - Auth & Master
const { AuthService } = require("./auth");

// API 02 - Common & Audit
const ApprovalEngineService = require("./common/approvalEngine.service");
const NumberSequenceService = require("./common/numberSequence.service");

// API 03 - Inventory & Ledger
const InventoryBalanceService = require("./inventory/inventoryBalance.service");
const StockTransferService = require("./inventory/stockTransfer.service");

// API 04 - POS & Sales
const SaleReceiptService = require("./pos/saleReceipt.service");

// API 05 - Product Orders
const ProductOrderService = require("./product-order/productOrder.service");

// API 06 - Job Orders Lifecycle
const JobOrderService = require("./job-order/jobOrder.service");
const JobEstimateService = require("./job-order/jobEstimate.service");
const JobWorkflowService = require("./job-order/jobWorkflow.service");
const JobFileService = require("./job-order/jobFile.service");
const JobInvoiceService = require("./job-order/jobInvoice.service");

// API 07 - Design Queue & Proofing
const DesignAllocationService = require("./design/designAllocation.service");
const DesignQueueService = require("./design/designQueue.service");
const DesignRevisionService = require("./design/designRevision.service");
const SampleApprovalService = require("./design/sampleApproval.service");

// API 08 - Production, QC & Delivery
const ProductionPlanningService = require("./production/productionPlanning.service");
const ProductionExecutionService = require("./production/productionExecution.service");
const QualityCheckService = require("./production/qualityCheck.service");
const ReworkService = require("./production/rework.service");
const ReprintService = require("./production/reprint.service");
const DeliveryOrderService = require("./production/deliveryOrder.service");
const RoundRobinService = require("./production/roundRobin.service");

// API 09 - SLA & Ratings
const SlaService = require("./sla/sla.service");
const DesignerRatingService = require("./sla/designerRating.service");

module.exports = {
  // API 01
  AuthService,

  // API 02
  ApprovalEngineService,
  NumberSequenceService,

  // API 03
  InventoryBalanceService,
  StockTransferService,

  // API 04
  SaleReceiptService,

  // API 05
  ProductOrderService,

  // API 06
  JobOrderService,
  JobEstimateService,
  JobWorkflowService,
  JobFileService,
  JobInvoiceService,

  // API 07
  DesignAllocationService,
  DesignQueueService,
  DesignRevisionService,
  SampleApprovalService,

  // API 08
  ProductionPlanningService,
  ProductionExecutionService,
  QualityCheckService,
  ReworkService,
  ReprintService,
  DeliveryOrderService,
  RoundRobinService,

  // API 09
  SlaService,
  DesignerRatingService,
};
