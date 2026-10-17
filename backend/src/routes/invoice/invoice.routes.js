const express = require("express");
const router = express.Router();
const invoiceController = require("../../controllers/invoice/invoice.controller");
const { authenticate } = require("../../middleware/auth.middleware");
const { authorizePermission } = require("../../middleware/permission.middleware");
const {
  createDraftValidator,
  updateDraftValidator,
  calculateValidator,
  submitApprovalValidator,
  approveVarianceValidator,
  shareValidator,
} = require("../../middleware/validators/invoice/invoice.validator");

router.use(authenticate);

const SettlementReportController = require("../../controllers/settlement/settlementReport.controller");

// 1. Eligibility & Retrieval
router.get(
  "/pending",
  authorizePermission("job", "read"),
  invoiceController.getPendingEligibleJobOrders
);

router.get(
  "/pending/:jobOrderId",
  authorizePermission("job", "read"),
  invoiceController.getJobOrderEligibility
);

// Outstanding Invoices (Must be mounted before /:id to prevent route shadowing)
router.get(
  "/outstanding",
  authorizePermission("job", "read"),
  SettlementReportController.getOutstandingInvoices
);

router.get(
  "/outstanding/list",
  authorizePermission("job", "read"),
  SettlementReportController.getOutstandingInvoices
);

router.get(
  "/",
  authorizePermission("job", "read"),
  invoiceController.getInvoices
);

router.get(
  "/:id",
  authorizePermission("job", "read"),
  invoiceController.getInvoiceById
);

// 2. Draft & Calculation
router.post(
  "/draft",
  createDraftValidator,
  authorizePermission("job", "update"),
  invoiceController.createDraft
);

router.patch(
  "/:id",
  updateDraftValidator,
  authorizePermission("job", "update"),
  invoiceController.updateDraft
);

router.post(
  "/:id/calculate",
  calculateValidator,
  authorizePermission("job", "read"),
  invoiceController.calculate
);

// 3. Approval & Finalization
router.post(
  "/:id/submit",
  submitApprovalValidator,
  authorizePermission("job", "update"),
  invoiceController.submitForApproval
);

router.post(
  "/:id/approve-variance",
  approveVarianceValidator,
  authorizePermission("job", "update"),
  invoiceController.approveVariance
);

router.post(
  "/:id/finalize",
  authorizePermission("job", "update"),
  invoiceController.finalize
);

// 4. PDF, Sharing & Audit Logs
router.get(
  "/:id/pdf",
  authorizePermission("job", "read"),
  invoiceController.getPdf
);

router.post(
  "/:id/share",
  shareValidator,
  authorizePermission("job", "read"),
  invoiceController.shareInvoice
);

router.get(
  "/:id/audit-logs",
  authorizePermission("job", "read"),
  invoiceController.getAuditLogs
);

// 5. Invoicing Settlement & Payment Collections
const SettlementController = require("../../controllers/settlement/settlement.controller");
const {
  collectPaymentValidator,
  createReminderValidator,
} = require("../../middleware/validators/settlement/settlement.validator");

router.get(
  "/:id/settlement",
  authorizePermission("job", "read"),
  SettlementController.getSettlement
);

router.post(
  "/:id/payments",
  collectPaymentValidator,
  authorizePermission("payment", "create"),
  SettlementController.collectPayment
);

router.get(
  "/:id/payments",
  authorizePermission("job", "read"),
  SettlementController.getPaymentsByInvoice
);

router.post(
  "/:id/reminders",
  createReminderValidator,
  authorizePermission("payment", "create"),
  SettlementReportController.createReminder
);

router.get(
  "/:id/reminders",
  authorizePermission("job", "read"),
  SettlementReportController.getReminders
);

module.exports = router;
