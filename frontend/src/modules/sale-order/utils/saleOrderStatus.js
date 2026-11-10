// Status definitions for the sale order workflow (Branch -> Manufacturing Unit).
// tone maps to a badge colour in sale-order.css (so-badge.<tone>).
export const STATUS_META = {
  DRAFT: { label: "Draft", tone: "slate" },
  PLACED: { label: "Placed", tone: "blue" },
  WAITING_FOR_DESIGNER: { label: "Waiting for Designer", tone: "amber" },
  ASSIGNED: { label: "Assigned", tone: "indigo" },
  IN_DESIGN: { label: "In Design", tone: "violet" },
  SENT_FOR_APPROVAL: { label: "Sent for Approval", tone: "orange" },
  CHANGES_REQUESTED: { label: "Changes Requested", tone: "red" },
  APPROVED: { label: "Approved", tone: "green" },
  PRINTING: { label: "Printing", tone: "teal" },
  DISPATCHED: { label: "Dispatched", tone: "cyan" },
  RECEIVED_AT_BRANCH: { label: "Received at Branch", tone: "lime" },
  DELIVERED: { label: "Delivered", tone: "green" },
  CANCELLED: { label: "Cancelled", tone: "gray" },
};

export const statusLabel = (status) => STATUS_META[status]?.label || String(status || "").replace(/_/g, " ");

// Main journey shown in the progress stepper
export const LIFECYCLE = [
  { key: "DRAFT", label: "Draft", desc: "Order created" },
  { key: "PLACED", label: "Placed", desc: "Advance collected" },
  { key: "ASSIGNED", label: "Assigned", desc: "Designer allotted" },
  { key: "IN_DESIGN", label: "In Design", desc: "Design in progress" },
  { key: "SENT_FOR_APPROVAL", label: "Customer Approval", desc: "Design sent to customer" },
  { key: "APPROVED", label: "Approved", desc: "Customer confirmed" },
  { key: "PRINTING", label: "Printing", desc: "At manufacturing unit" },
  { key: "DISPATCHED", label: "Dispatched", desc: "On the way to branch" },
  { key: "RECEIVED_AT_BRANCH", label: "Received", desc: "Arrived at branch" },
  { key: "DELIVERED", label: "Delivered", desc: "Handed to customer" },
];

// Where an order sits in the stepper. Side states are mapped onto the nearest main step.
export const stageIndexOf = (status) => {
  const map = { WAITING_FOR_DESIGNER: "PLACED", CHANGES_REQUESTED: "SENT_FOR_APPROVAL" };
  const key = map[status] || status;
  return LIFECYCLE.findIndex((s) => s.key === key);
};

export const LIST_STATUS_FILTERS = [
  { value: "", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "PLACED,WAITING_FOR_DESIGNER", label: "Placed / Waiting" },
  { value: "ASSIGNED,IN_DESIGN", label: "Assigned / In Design" },
  { value: "SENT_FOR_APPROVAL", label: "Sent for Approval" },
  { value: "CHANGES_REQUESTED", label: "Changes Requested" },
  { value: "APPROVED", label: "Approved" },
  { value: "PRINTING,DISPATCHED,RECEIVED_AT_BRANCH", label: "In Production / Transit" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const PRODUCT_TYPES = [
  "VISITING_CARD",
  "FLEX_BANNER",
  "BROCHURE",
  "STICKER",
  "MUG",
  "T_SHIRT",
  "PHOTO_FRAME",
  "OTHER",
];

export const UNITS = ["PCS", "SQFT", "SET", "NOS", "BOX"];

export const PAYMENT_MODES = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
];

export const APPROVAL_CHANNELS = [
  { value: "CALL_TO_BRANCH", label: "Customer called the branch" },
  { value: "CALL_TO_DESIGNER", label: "Customer called the designer" },
  { value: "WHATSAPP_REPLY", label: "Customer replied on WhatsApp" },
  { value: "IN_PERSON", label: "Customer visited in person" },
];

export const typeLabel = (v) =>
  String(v || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Roles
export const BRANCH_ROLES = ["manager", "branch_manager", "branch_manager1", "operator", "branch_staff"];
export const MFG_ROLES = ["mfg_designer", "mfg_manager"];
export const ADMIN_ROLES = ["admin", "super_admin"];
