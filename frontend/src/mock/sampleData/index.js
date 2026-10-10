/**
 * PrintZ Master Sample Data Index
 * Aligned with Master Production-Grade MongoDB Architecture (printz_db)
 */

import { sampleBranches } from "./branches.sample.js";
import { sampleUsers, sampleRoles, sampleEmployees } from "./users.sample.js";
import { sampleCategories } from "./categories.sample.js";
import { samplePrinters } from "./printers.sample.js";
import {
  sampleInventoryItems,
  sampleStockItems,
  sampleInventoryBalances,
  sampleInventoryTransactions,
  sampleInventoryMovements
} from "./stockItems.sample.js";
import { samplePrinterReadings } from "./printerReadings.sample.js";
import { sampleJumboMachines, sampleJumboReadings } from "./jumboReadings.sample.js";
import { sampleStockReadings } from "./stockReadings.sample.js";
import { sampleTotalAmounts } from "./totalAmounts.sample.js";
import { samplePastDateRequests, sampleFinalizedDates } from "./pastDateRequests.sample.js";
import { sampleCustomers } from "./customers.sample.js";
const sampleCustomerRequests = [];
import { sampleJobs } from "./jobs.sample.js";
const sampleJobOrders = sampleJobs;
const sampleJobItems = sampleJobs.flatMap((j) => j.items || []);
const sampleJobApprovals = [];
const sampleJobAssignments = [];
const sampleJobSamples = [];
const sampleSlaConfigurations = [];
const sampleDesignerRatings = [];
import { sampleEstimates } from "./estimates.sample.js";
import { sampleDesignAssignments } from "./designAssignments.sample.js";
import { samplePosProducts, samplePosCategories } from "./posProducts.sample.js";
import { samplePayments } from "./payments.sample.js";
import {
  sampleInvoices,
  sampleReceipts,
  sampleSales,
  sampleHeldBills,
  sampleReturns
} from "./sales.sample.js";
const sampleCustomerLedgerEntries = [];
const sampleSaleReceipts = [];
import {
  sampleMachines,
  sampleProductionOrders,
  sampleEligibleJobsForPlanning
} from "./production.sample.js";
const sampleProductionOperations = [];
const sampleDeliveryOrders = [];
import {
  sampleQualityChecks,
  sampleReprintRequests,
  defaultQcChecklistTemplate,
  sampleDefectCatalogue
} from "./quality.sample.js";

export const initialData = {
  // Customers & Organization
  customers: sampleCustomers,
  customerRequests: sampleCustomerRequests,
  branches: sampleBranches,
  users: sampleUsers,
  roles: sampleRoles,
  employees: sampleEmployees,
  categories: sampleCategories,

  // Jobs, Estimates & Design (Unified Single Source of Truth)
  jobOrders: sampleJobOrders,
  jobs: sampleJobs,
  jobItems: sampleJobItems,
  jobApprovals: sampleJobApprovals,
  jobAssignments: sampleJobAssignments,
  jobSamples: sampleJobSamples,
  slaConfigurations: sampleSlaConfigurations,
  designerRatings: sampleDesignerRatings,
  estimates: sampleEstimates,
  designAssignments: sampleDesignAssignments,

  // Production, Quality & Delivery
  productionMachines: sampleMachines,
  productionOrders: sampleProductionOrders,
  productionOperations: sampleProductionOperations,
  deliveryOrders: sampleDeliveryOrders,
  eligibleJobsForPlanning: sampleEligibleJobsForPlanning,
  qualityChecks: sampleQualityChecks,
  reprintRequests: sampleReprintRequests,
  qcChecklistTemplate: defaultQcChecklistTemplate,
  defectCatalogue: sampleDefectCatalogue,

  // POS, Invoices & Finance
  posProducts: samplePosProducts,
  posCategories: samplePosCategories,
  invoices: sampleInvoices,
  payments: samplePayments,
  customerLedgerEntries: sampleCustomerLedgerEntries,
  saleReceipts: sampleSaleReceipts,
  sales: sampleSales,
  heldBills: sampleHeldBills,
  returns: sampleReturns,

  // Inventory & Stock
  inventoryItems: sampleInventoryItems,
  stockItems: sampleStockItems,
  inventoryBalances: sampleInventoryBalances,
  inventoryTransactions: sampleInventoryTransactions,
  inventoryMovements: sampleInventoryMovements,
  stockReadings: sampleStockReadings,

  // Machines & Day-End Reconciliations
  printers: samplePrinters,
  printerReadings: samplePrinterReadings,
  jumboMachines: sampleJumboMachines,
  jumboReadings: sampleJumboReadings,
  totalAmounts: sampleTotalAmounts,
  finalizedDates: sampleFinalizedDates,
  pastDateRequests: samplePastDateRequests
};

export {
  sampleBranches,
  sampleUsers,
  sampleRoles,
  sampleEmployees,
  sampleCategories,
  samplePrinters,
  samplePrinterReadings,
  sampleJumboMachines,
  sampleJumboReadings,
  sampleInventoryItems,
  sampleStockItems,
  sampleInventoryBalances,
  sampleInventoryTransactions,
  sampleInventoryMovements,
  sampleStockReadings,
  sampleTotalAmounts,
  samplePastDateRequests,
  sampleFinalizedDates,
  sampleCustomers,
  sampleCustomerRequests,
  sampleJobOrders,
  sampleJobs,
  sampleJobItems,
  sampleJobApprovals,
  sampleJobAssignments,
  sampleJobSamples,
  sampleSlaConfigurations,
  sampleDesignerRatings,
  sampleEstimates,
  sampleDesignAssignments,
  samplePosProducts,
  samplePosCategories,
  sampleInvoices,
  samplePayments,
  sampleCustomerLedgerEntries,
  sampleSaleReceipts,
  sampleReceipts,
  sampleSales,
  sampleHeldBills,
  sampleReturns,
  sampleMachines,
  sampleProductionOrders,
  sampleProductionOperations,
  sampleDeliveryOrders,
  sampleEligibleJobsForPlanning,
  sampleQualityChecks,
  sampleReprintRequests,
  defaultQcChecklistTemplate,
  sampleDefectCatalogue
};

export default initialData;
