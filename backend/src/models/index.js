/**
 * Centralized Models Barrel Export
 * MVC Architecture - Models Layer
 */

// auth
const User = require("./auth/User");
const Role = require("./auth/Role");
const Employee = require("./auth/Employee");
const Permission = require("./auth/Permission");
const EmployeeBranchAssignment = require("./auth/EmployeeBranchAssignment");

// common
const Approval = require("./common/Approval");
const Attachment = require("./common/Attachment");
const AuditLog = require("./common/AuditLog");
const NumberSequence = require("./common/NumberSequence");
const Branch = require("./common/Branch");
const Category = require("./common/Category");
const Department = require("./common/Department");
const Designation = require("./common/Designation");
const FinalizedDate = require("./common/FinalizedDate");
const JumboXerox = require("./common/JumboXerox");
const JumboXeroxReading = require("./common/JumboXeroxReading");
const Notification = require("./common/Notification");
const PastDateRequest = require("./common/PastDateRequest");
const Printer = require("./common/Printer");
const PrinterReading = require("./common/PrinterReading");
const Sequence = require("./common/Sequence");
const StockItem = require("./common/StockItem");
const StockReading = require("./common/StockReading");
const TotalAmountReading = require("./common/TotalAmountReading");
const Stock = require("./common/Stock");

// customer
const Customer = require("./customer/Customer");
const CustomerRequest = require("./customer/CustomerRequest");

// delivery
const DeliveryOrder = require("./delivery/DeliveryOrder");
const DeliveryProof = require("./delivery/DeliveryProof");

// design
const DesignAllocationLock = require("./design/DesignAllocationLock");
const DesignApprovalToken = require("./design/DesignApprovalToken");
const JobAssignment = require("./design/JobAssignment");
const JobSample = require("./design/JobSample");
const RoundRobinPointer = require("./design/RoundRobinPointer");

// estimate
const Estimate = require("./estimate/Estimate");
const EstimateApproval = require("./estimate/EstimateApproval");

// inventory
const InventoryBalance = require("./inventory/InventoryBalance");
const InventoryItem = require("./inventory/InventoryItem");
const InventoryMovement = require("./inventory/InventoryMovement");
const InventoryTransaction = require("./inventory/InventoryTransaction");
const PurchaseReceipt = require("./inventory/PurchaseReceipt");

// invoice
const Invoice = require("./invoice/Invoice");
const InvoiceReminder = require("./invoice/InvoiceReminder");
const PaymentToBeCollected = require("./invoice/PaymentToBeCollected");
const Payment = require("./invoice/Payment");

// job-order
const JobApproval = require("./job-order/JobApproval");
const JobFile = require("./job-order/JobFile");
const JobItem = require("./job-order/JobItem");
const JobOrder = require("./job-order/JobOrder");
const JobWorkflowEvent = require("./job-order/JobWorkflowEvent");

// pos
const Sale = require("./pos/Sale");
const SaleReceipt = require("./pos/SaleReceipt");
const SaleReceiptItem = require("./pos/SaleReceiptItem");
const Product = require("./Product");

// product-order
const ProductOrder = require("./product-order/ProductOrder");
const ProductOrderItem = require("./product-order/ProductOrderItem");
const StockTransfer = require("./product-order/StockTransfer");

// production
const ProductionOperation = require("./production/ProductionOperation");
const ProductionOrder = require("./production/ProductionOrder");
const ProductionState = require("./production/ProductionState");
const QualityCheck = require("./production/QualityCheck");
const ReprintRequest = require("./production/ReprintRequest");

// sla
const DesignerRating = require("./sla/DesignerRating");
const SlaConfiguration = require("./sla/SlaConfiguration");

module.exports = {
  // auth
  User,
  Role,
  Employee,
  Permission,
  EmployeeBranchAssignment,
  // common
  Approval,
  Attachment,
  AuditLog,
  NumberSequence,
  Branch,
  Category,
  Department,
  Designation,
  FinalizedDate,
  JumboXerox,
  JumboXeroxReading,
  Notification,
  PastDateRequest,
  Printer,
  PrinterReading,
  Sequence,
  StockItem,
  StockReading,
  TotalAmountReading,
  Stock,
  // customer
  Customer,
  CustomerRequest,
  // delivery
  DeliveryOrder,
  DeliveryProof,
  // design
  DesignAllocationLock,
  DesignApprovalToken,
  JobAssignment,
  JobSample,
  RoundRobinPointer,
  // estimate
  Estimate,
  EstimateApproval,
  // inventory
  InventoryBalance,
  InventoryItem,
  InventoryMovement,
  InventoryTransaction,
  PurchaseReceipt,
  // invoice
  Invoice,
  InvoiceReminder,
  PaymentToBeCollected,
  Payment,
  // job-order
  JobApproval,
  JobFile,
  JobItem,
  JobOrder,
  JobWorkflowEvent,
  // pos
  Sale,
  SaleReceipt,
  SaleReceiptItem,
  Product,
  // product-order
  ProductOrder,
  ProductOrderItem,
  StockTransfer,
  // production
  ProductionOperation,
  ProductionOrder,
  ProductionState,
  QualityCheck,
  ReprintRequest,
  // sla
  DesignerRating,
  SlaConfiguration,
};
