/**
 * Centralized Mongoose Models Barrel Export
 * Clean Architecture - Infrastructure Layer
 */

// Auth & Master
const User = require("./User");
const Role = require("./Role");
const Permission = require("./Permission");
const Employee = require("./Employee");
const EmployeeBranchAssignment = require("./EmployeeBranchAssignment");
const Branch = require("./Branch");
const Category = require("./Category");
const Department = require("./Department");
const Designation = require("./Designation");

// Common & Audit
const AuditLog = require("./AuditLog");
const NumberSequence = require("./common/NumberSequence");
const Notification = require("./Notification");

// Inventory Master & Ledger
const InventoryItem = require("./inventory/InventoryItem");
const InventoryBalance = require("./inventory/InventoryBalance");
const InventoryTransaction = require("./inventory/InventoryTransaction");
const StockTransfer = require("./product-order/StockTransfer");
const PurchaseReceipt = require("./inventory/PurchaseReceipt");
const Customer = require("./customer/Customer");

// POS
const SaleReceipt = require("./pos/SaleReceipt");
const SaleReceiptItem = require("./pos/SaleReceiptItem");
const Sale = require("./Sale");

// Product Order
const ProductOrder = require("./product-order/ProductOrder");
const ProductOrderItem = require("./product-order/ProductOrderItem");

// Job Order Lifecycle
const JobOrder = require("./job-order/JobOrder");
const { JobItem } = require("./job-order/JobItem");
const JobAssignment = require("./design/JobAssignment");
const JobSample = require("./design/JobSample");
const JobWorkflowEvent = require("./job-order/JobWorkflowEvent");
const JobFile = require("./job-order/JobFile");

// Production & QC
const ProductionOrder = require("./production/ProductionOrder");
const ProductionOperation = require("./production/ProductionOperation");
const QualityCheck = require("./production/QualityCheck");
const ReprintRequest = require("./production/ReprintRequest");
const DeliveryOrder = require("./production/DeliveryOrder");

// SLA & Rating
const SlaConfiguration = require("./sla/SlaConfiguration");
const DesignerRating = require("./sla/DesignerRating");
const DesignApprovalToken = require("./design/DesignApprovalToken");

module.exports = {
  // Auth & Master
  User,
  Role,
  Permission,
  Employee,
  EmployeeBranchAssignment,
  Branch,
  Category,
  Department,
  Designation,

  // Common & Audit
  AuditLog,
  NumberSequence,
  Notification,

  // Inventory
  InventoryItem,
  InventoryBalance,
  InventoryTransaction,
  StockTransfer,
  PurchaseReceipt,
  Customer,

  // POS
  SaleReceipt,
  SaleReceiptItem,
  Sale,

  // Product Order
  ProductOrder,
  ProductOrderItem,

  // Job Order
  JobOrder,
  JobItem,
  JobAssignment,
  JobSample,
  JobWorkflowEvent,
  JobFile,
  DesignApprovalToken,

  // Production & QC
  ProductionOrder,
  ProductionOperation,
  QualityCheck,
  ReprintRequest,
  DeliveryOrder,

  // SLA & Rating
  SlaConfiguration,
  DesignerRating,
};
