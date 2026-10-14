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
} = require("../../validators/invoice/invoice.validator");

router.use(authenticate);

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

module.exports = router;
