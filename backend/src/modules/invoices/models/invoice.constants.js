/**
 * Invoice Module Constants
 */

const INVOICE_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  FINALIZED: "FINALIZED",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
});

const INVOICE_TYPE = Object.freeze({
  STANDARD: "STANDARD",
  TAX_INVOICE: "TAX_INVOICE",
  PROFORMA: "PROFORMA",
});

const VARIANCE_POLICY = Object.freeze({
  DEFAULT_TOLERANCE_PERCENT: 5, // 5% allowed variance before approval required
  DEFAULT_TOLERANCE_ABSOLUTE: 500, // or 500 currency units
});

const INVOICE_PERMISSIONS = Object.freeze({
  VIEW: "invoice.view",
  CREATE: "invoice.create",
  UPDATE: "invoice.update",
  CALCULATE: "invoice.calculate",
  SUBMIT: "invoice.submit",
  APPROVE: "invoice.approve",
  FINALIZE: "invoice.finalize",
  PDF: "invoice.pdf",
  SHARE: "invoice.share",
  AUDIT_VIEW: "invoice.audit.view",
});

module.exports = {
  INVOICE_STATUS,
  INVOICE_TYPE,
  VARIANCE_POLICY,
  INVOICE_PERMISSIONS,
};
