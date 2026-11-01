/**
 * Sale Order (Branch -> Manufacturing Unit) constants and settings.
 * Settings read from the environment with defaults, so they are never hard-coded in the services.
 */
const num = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const STATUS = Object.freeze({
  DRAFT: "DRAFT",
  PLACED: "PLACED",
  WAITING_FOR_DESIGNER: "WAITING_FOR_DESIGNER",
  ASSIGNED: "ASSIGNED",
  IN_DESIGN: "IN_DESIGN",
  SENT_FOR_APPROVAL: "SENT_FOR_APPROVAL",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  APPROVED: "APPROVED",
  PRINTING: "PRINTING",
  DISPATCHED: "DISPATCHED",
  RECEIVED_AT_BRANCH: "RECEIVED_AT_BRANCH",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
});

// Cancel is allowed only before the parcel leaves the unit
const CANCELLABLE = [
  STATUS.DRAFT,
  STATUS.PLACED,
  STATUS.WAITING_FOR_DESIGNER,
  STATUS.ASSIGNED,
  STATUS.IN_DESIGN,
  STATUS.SENT_FOR_APPROVAL,
  STATUS.CHANGES_REQUESTED,
  STATUS.APPROVED,
  STATUS.PRINTING,
];

// A branch manager may cancel only while design work has not started
const DESIGN_NOT_STARTED = [STATUS.DRAFT, STATUS.PLACED, STATUS.WAITING_FOR_DESIGNER, STATUS.ASSIGNED];

// Statuses in which a designer holds a slot (activeOrders)
const DESIGNER_HOLDING = [
  STATUS.ASSIGNED,
  STATUS.IN_DESIGN,
  STATUS.SENT_FOR_APPROVAL,
  STATUS.CHANGES_REQUESTED,
  STATUS.APPROVED,
  STATUS.PRINTING,
];

const REASSIGNABLE = [
  STATUS.ASSIGNED,
  STATUS.IN_DESIGN,
  STATUS.SENT_FOR_APPROVAL,
  STATUS.CHANGES_REQUESTED,
  STATUS.APPROVED,
];

const ROLE = Object.freeze({
  ADMIN: ["admin", "super_admin", "superadmin", "internal_admin"],
  // Includes the role codes that exist in the database today (BRANCH_MANAGER, BRANCH_MANAGER1, BRANCH_STAFF)
  BRANCH_MANAGER: ["manager", "branch_manager", "branch_manager1"],
  BRANCH_OPERATOR: ["operator", "branch_staff"],
  MFG_MANAGER: ["mfg_manager"],
  MFG_DESIGNER: ["mfg_designer"],
});

const SALE_ORDER_SETTINGS = {
  minAdvancePercent: num(process.env.SALE_ORDER_MIN_ADVANCE_PERCENT, 50),
  referenceFileMaxMb: num(process.env.SALE_ORDER_REFERENCE_FILE_MAX_MB, 10),
  maxReferenceFiles: num(process.env.SALE_ORDER_MAX_REFERENCE_FILES, 5),
  previewMaxMb: num(process.env.SALE_ORDER_PREVIEW_MAX_MB, 5),
  printFileMaxMb: num(process.env.SALE_ORDER_PRINT_FILE_MAX_MB, 25),
  duplicateSendSeconds: num(process.env.SALE_ORDER_DUPLICATE_SEND_SECONDS, 120),
  notOpenedReminderMinutes: num(process.env.SALE_ORDER_NOT_OPENED_MINUTES, 30),
  noReplyReminderHours: num(process.env.SALE_ORDER_NO_REPLY_HOURS, 24),
  schedulerIntervalMinutes: num(process.env.SALE_ORDER_SCHEDULER_MINUTES, 15),
  whatsappTemplates: {
    designApproval: process.env.SALE_ORDER_WA_TEMPLATE_DESIGN || "design_approval_v1",
    readyForPickup: process.env.SALE_ORDER_WA_TEMPLATE_PICKUP || "ready_for_pickup_v1",
    paymentReceipt: process.env.SALE_ORDER_WA_TEMPLATE_RECEIPT || "payment_receipt_v1",
  },
};

const NOTIFICATION = Object.freeze({
  ASSIGNED: "SALE_ORDER_ASSIGNED",
  WAITING: "SALE_ORDER_WAITING",
  DESIGN_SENT: "SALE_ORDER_DESIGN_SENT",
  APPROVED: "SALE_ORDER_APPROVED",
  CHANGES: "SALE_ORDER_CHANGES",
  DISPATCHED: "SALE_ORDER_DISPATCHED",
  DELIVERED: "SALE_ORDER_DELIVERED",
  REMINDER: "SALE_ORDER_REMINDER",
  OVERDUE: "SALE_ORDER_OVERDUE",
  REASSIGNED: "SALE_ORDER_REASSIGNED",
  CANCELLED: "SALE_ORDER_CANCELLED",
  CUSTOMER_REPLY: "SALE_ORDER_CUSTOMER_REPLY",
});

module.exports = {
  STATUS,
  CANCELLABLE,
  DESIGN_NOT_STARTED,
  DESIGNER_HOLDING,
  REASSIGNABLE,
  ROLE,
  NOTIFICATION,
  SALE_ORDER_SETTINGS,
};
