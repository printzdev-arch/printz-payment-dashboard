/**
 * Centralized Models Barrel Export
 * MVC Architecture - Models Layer
 */

// auth
const User = require("./auth/models/User");
const Role = require("./auth/models/Role");
const Employee = require("./employees/models/Employee");
const Permission = require("./auth/models/Permission");
const EmployeeBranchAssignment = require("./employees/models/EmployeeBranchAssignment");

// common
const Approval = require("./approvals/models/Approval");
const Attachment = require("./attachments/models/Attachment");
const NumberSequence = require("./number-sequences/models/NumberSequence");
const Branch = require("./branches/models/Branch");
const Category = require("./categories/models/Category");
const FinalizedDate = require("./past-date-requests/models/FinalizedDate");
const JumboXerox = require("./printers/models/JumboXerox");
const JumboXeroxReading = require("./printers/models/JumboXeroxReading");
const Notification = require("./notifications/models/Notification");
const PastDateRequest = require("./past-date-requests/models/PastDateRequest");
const Printer = require("./printers/models/Printer");
const PrinterReading = require("./printers/models/PrinterReading");
const Sequence = require("./number-sequences/models/Sequence");
const StockItem = require("./stocks/models/StockItem");
const StockReading = require("./stocks/models/StockReading");
const TotalAmountReading = require("./printers/models/TotalAmountReading");
const Stock = require("./stocks/models/StockItem");

// customer
const Customer = require("./customers/models/Customer");
const CustomerRequest = require("./customers/models/CustomerRequest");

// delivery
const DeliveryOrder = require("./delivery/models/DeliveryOrder");
const DeliveryProof = require("./delivery/models/DeliveryProof");

// design
const DesignAllocationLock = require("./design/models/DesignAllocationLock");
const DesignApprovalToken = require("./design/models/DesignApprovalToken");
const JobAssignment = require("./design/models/JobAssignment");
const JobSample = require("./design/models/JobSample");
const RoundRobinPointer = require("./design/models/RoundRobinPointer");

// estimate
const Estimate = require("./estimates/models/Estimate");
const EstimateApproval = require("./estimates/models/EstimateApproval");

// inventory
const InventoryBalance = require("./inventory/models/InventoryBalance");
const InventoryItem = require("./inventory/models/InventoryItem");
const InventoryMovement = require("./inventory/models/InventoryMovement");
const InventoryTransaction = require("./inventory/models/InventoryTransaction");
const PurchaseReceipt = require("./inventory/models/PurchaseReceipt");

// invoice
const Invoice = require("./invoices/models/Invoice");
const InvoiceReminder = require("./invoices/models/InvoiceReminder");
const PaymentToBeCollected = require("./invoices/models/PaymentToBeCollected");
const Payment = require("./invoices/models/Payment");

// job-order
const JobApproval = require("./job-orders/models/JobApproval");
const JobFile = require("./job-orders/models/JobFile");
const JobItem = require("./job-orders/models/JobItem");
const JobOrder = require("./job-orders/models/JobOrder");
const JobWorkflowEvent = require("./job-orders/models/JobWorkflowEvent");

// pos
const Sale = require("./pos/models/Sale");
const SaleReceipt = require("./pos/models/SaleReceipt");
const SaleReceiptItem = require("./pos/models/SaleReceiptItem");
const Product = require("./inventory/models/Product");

// production
const ProductionOperation = require("./production/models/ProductionOperation");
const ProductionOperator = require("./production/models/ProductionOperator");
const ProductionOrder = require("./production/models/ProductionOrder");
const ProductionState = require("./production/models/ProductionState");
const QualityCheck = require("./production/models/QualityCheck");
const ReprintRequest = require("./production/models/ReprintRequest");

// saleOrder (Branch -> Manufacturing Unit)
const saleOrderModels = require("./sale-orders/models");

module.exports = {
  ...saleOrderModels,
  // auth
  User,
  Role,
  Employee,
  Permission,
  EmployeeBranchAssignment,
  // common
  Approval,
  Attachment,
  NumberSequence,
  Branch,
  Category,
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
  // production
  ProductionOperation,
  ProductionOperator,
  ProductionOrder,
  ProductionState,
  QualityCheck,
  ReprintRequest,
  // settings
  MasterSetting: require("./settings/models/MasterSetting"),
  MasterDefault: require("./settings/models/MasterDefault"),
  MasterCategory: require("./settings/models/MasterCategory"),
  // attendance
  AttendancePolicy: require("./attendance/models/AttendancePolicy"),
  HolidayCalendar: require("./attendance/models/HolidayCalendar"),
  DailyAttendance: require("./attendance/models/DailyAttendance"),
  LeaveType: require("./attendance/models/LeaveType"),
  AttendancePermission: require("./attendance/models/AttendancePermission"),
  // salary & payroll
  SalaryComponent: require("./salary/models/SalaryComponent"),
  EmployeeSalaryStructure: require("./salary/models/EmployeeSalaryStructure"),
  SalaryRun: require("./salary/models/SalaryRun"),
  SalaryRecord: require("./salary/models/SalaryRecord"),
  SalaryAdjustment: require("./salary/models/SalaryAdjustment"),
  EmployeeLoan: require("./salary/models/EmployeeLoan"),
  LoanRepayment: require("./salary/models/LoanRepayment"),
};
