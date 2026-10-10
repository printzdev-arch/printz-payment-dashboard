/**
 * PrintZ V3 - Estimate & Quotation Constants (Step 3 & Step 4)
 */

export const ESTIMATE_STATUS = {
  DRAFT: "DRAFT",
  READY: "READY",
  SENT: "SENT",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED"
};

export const ESTIMATE_STATUS_META = {
  DRAFT: {
    label: "Draft Estimate",
    badgeVariant: "neutral",
    description: "Internal draft under preparation"
  },
  READY: {
    label: "Ready for Sending",
    badgeVariant: "business",
    description: "Verified internally, ready to dispatch"
  },
  SENT: {
    label: "Awaiting Customer Approval",
    badgeVariant: "warning",
    description: "Dispatched to customer for commercial review"
  },
  ACCEPTED: {
    label: "Accepted by Customer",
    badgeVariant: "active",
    description: "Approved by customer as the commercial basis for production"
  },
  REJECTED: {
    label: "Revision Requested",
    badgeVariant: "danger",
    description: "Customer requested pricing or specification changes"
  },
  EXPIRED: {
    label: "Estimate Expired",
    badgeVariant: "neutral",
    description: "Quotation validity period has lapsed"
  }
};

export const REJECTION_REASONS = [
  { code: "PRICE_TOO_HIGH", label: "Price exceeds budget / competitor price lower" },
  { code: "QUANTITY_CHANGE", label: "Need to increase / decrease print quantity" },
  { code: "REQUIREMENT_CHANGE", label: "Change in size, substrate or print specs" },
  { code: "DELIVERY_DATE", label: "Promised delivery date does not meet schedule" },
  { code: "MATERIAL_CHANGE", label: "Want different paper stock / finishing finish" },
  { code: "OTHER", label: "Other commercial or design requirements" }
];

export const LINE_ITEM_CATEGORIES = [
  { id: "MATERIAL", label: "Material / Paper Stock", color: "#0284c7" },
  { id: "PRINTING", label: "Printing & Press", color: "#047857" },
  { id: "FINISHING", label: "Post-Press & Finishing", color: "#d97706" },
  { id: "LABOUR", label: "Design / Labour Charge", color: "#7c3aed" },
  { id: "MACHINE", label: "Machine Setup / Plate", color: "#dc2626" },
  { id: "DELIVERY", label: "Delivery / Packaging", color: "#0d9488" },
  { id: "OTHER", label: "Other Commercial Charge", color: "#475569" }
];

export const UNIT_OPTIONS = [
  "PCS",
  "SHEETS",
  "CARDS",
  "SQFT",
  "SQM",
  "METERS",
  "BOXES",
  "ROLLS",
  "SETS",
  "JOB",
  "LOT",
  "HOURS"
];

export const TAX_RATES = [
  { label: "GST 18% (CGST 9% + SGST 9%)", rate: 18, type: "GST" },
  { label: "GST 12% (CGST 6% + SGST 6%)", rate: 12, type: "GST" },
  { label: "GST 5% (CGST 2.5% + SGST 2.5%)", rate: 5, type: "GST" },
  { label: "GST 28% (CGST 14% + SGST 14%)", rate: 28, type: "GST" },
  { label: "IGST 18% (Interstate 18%)", rate: 18, type: "IGST" },
  { label: "Tax Exempt (0%)", rate: 0, type: "GST" }
];

export const DEFAULT_TERMS_AND_CONDITIONS = 
`1. Payment Terms: 50% advance upon quotation confirmation, remaining 50% upon delivery/dispatch.
2. Validity: This estimate is valid for 7 calendar days from the date of issue.
3. Turnaround Time: Production SLA begins only upon receipt of final approved print-ready artwork proof.
4. Color Fidelity: Minor shade variations within standard industry delta-E tolerances may occur across digital and offset runs.
5. Goods once manufactured as per approved proof cannot be returned or cancelled.`;
