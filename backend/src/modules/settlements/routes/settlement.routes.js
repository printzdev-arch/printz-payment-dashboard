const express = require("express");
const router = express.Router();

const SettlementController = require("../controllers/settlement.controller");
const JobClosureController = require("../controllers/jobClosure.controller");
const SettlementReportController = require("../controllers/settlementReport.controller");

const { authenticate } = require("../../../middleware/security/auth.middleware");
const { authorizePermission } = require("../../../middleware/security/permission.middleware");
const {
  collectPaymentValidator,
  voidPaymentValidator,
  createReminderValidator,
  closeJobValidator,
  reopenJobValidator,
} = require("./settlement.validator");

router.use(authenticate);

// ── Invoices Settlement & Payments ──
router.get(
  "/invoices/outstanding",
  authorizePermission("payment", "read"),
  SettlementReportController.getOutstandingInvoices
);

router.get(
  "/invoices/:id/settlement",
  authorizePermission("payment", "read"),
  SettlementController.getSettlement
);

router.post(
  "/invoices/:id/payments",
  collectPaymentValidator,
  authorizePermission("payment", "create"),
  SettlementController.collectPayment
);

router.get(
  "/invoices/:id/payments",
  authorizePermission("payment", "read"),
  SettlementController.getPaymentsByInvoice
);

router.post(
  "/invoices/:id/reminders",
  createReminderValidator,
  authorizePermission("payment", "create"),
  SettlementReportController.createReminder
);

router.get(
  "/invoices/:id/reminders",
  authorizePermission("payment", "read"),
  SettlementReportController.getReminders
);

// ── Payments Management ──
router.get(
  "/payments/:id",
  authorizePermission("payment", "read"),
  SettlementController.getPaymentById
);

router.get(
  "/payments/:id/receipt",
  authorizePermission("payment", "read"),
  SettlementController.getReceipt
);

router.post(
  "/payments/:id/void",
  voidPaymentValidator,
  authorizePermission("payment", "delete"),
  SettlementController.voidPayment
);

// ── Job Closure ──
router.post(
  "/job-orders/:id/close",
  closeJobValidator,
  authorizePermission("job", "update"),
  JobClosureController.closeJob
);

router.get(
  "/job-orders/:id/closure",
  authorizePermission("job", "read"),
  JobClosureController.getClosureDetails
);

router.post(
  "/job-orders/:id/reopen",
  reopenJobValidator,
  authorizePermission("job", "update"),
  JobClosureController.reopenJob
);

// ── Settlement Reports ──
router.get(
  "/reports/collection-summary",
  authorizePermission("report", "read"),
  SettlementReportController.getCollectionSummary
);

router.get(
  "/reports/aging",
  authorizePermission("report", "read"),
  SettlementReportController.getInvoiceAgingReport
);

module.exports = router;
