// Status definitions for the sale order workflow (Branch -> Manufacturing Unit).
// tone maps to a badge colour in sale-order.css (so-badge.<tone>).
export const STATUS_META = {
  DRAFT: { label: "Draft", tone: "slate" },
  PLACED: { label: "Placed", tone: "blue" },
  WAITING_FOR_DESIGNER: { label: "In Queue", tone: "amber" },
  ASSIGNED: { label: "In Queue", tone: "amber" },
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
  { key: "DRAFT", label: "Draft" },
  { key: "PLACED", label: "Placed" },
  { key: "IN_DESIGN", label: "In Design" },
  { key: "SENT_FOR_APPROVAL", label: "Customer Approval" },
  { key: "APPROVED", label: "Approved" },
  { key: "PRINTING", label: "Printing" },
  { key: "DISPATCHED", label: "Dispatched" },
  { key: "RECEIVED_AT_BRANCH", label: "Received" },
  { key: "DELIVERED", label: "Delivered" },
];

// Where an order sits in the stepper. Side states are mapped onto the nearest main step.
export const stageIndexOf = (status) => {
  // WAITING_FOR_DESIGNER and ASSIGNED only exist on older orders: they mean the order is still in the queue
  const map = { WAITING_FOR_DESIGNER: "PLACED", ASSIGNED: "PLACED", CHANGES_REQUESTED: "SENT_FOR_APPROVAL" };
  const key = map[status] || status;
  return LIFECYCLE.findIndex((s) => s.key === key);
};

export const LIST_STATUS_FILTERS = [
  { value: "", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "PLACED,WAITING_FOR_DESIGNER,ASSIGNED", label: "Placed / In Queue" },
  { value: "IN_DESIGN", label: "In Design" },
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
  { value: "CALL_TO_DESIGNER", label: "Customer called the manufacturing unit" },
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
export const ADMIN_ROLES = ["admin", "super_admin"];
