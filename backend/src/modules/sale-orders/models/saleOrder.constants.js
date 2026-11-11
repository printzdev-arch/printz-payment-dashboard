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

/**
 * Manufacturing unit work stages. Everyone at the unit sees and works the same orders:
 *  QUEUE  - placed, nobody has taken it yet (WAITING_FOR_DESIGNER / ASSIGNED only exist on older orders)
 *  DESIGN - taken; being designed or waiting for the customer
 *  ACTIVE - every stage the unit still has work to do on
 */
const MFG_QUEUE = [STATUS.PLACED, STATUS.WAITING_FOR_DESIGNER, STATUS.ASSIGNED];
const MFG_DESIGN = [STATUS.IN_DESIGN, STATUS.CHANGES_REQUESTED, STATUS.SENT_FOR_APPROVAL];
const MFG_ACTIVE = [...MFG_QUEUE, ...MFG_DESIGN, STATUS.APPROVED, STATUS.PRINTING];

const ROLE = Object.freeze({
  ADMIN: ["admin", "super_admin", "superadmin", "internal_admin"],
  // Includes the role codes that exist in the database today (BRANCH_MANAGER, BRANCH_MANAGER1, BRANCH_STAFF)
  BRANCH_MANAGER: ["manager", "branch_manager", "branch_manager1"],
  BRANCH_OPERATOR: ["operator", "branch_staff"],
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
  TAKEN: "SALE_ORDER_ASSIGNED",
  NEW_IN_QUEUE: "SALE_ORDER_WAITING",
  DESIGN_SENT: "SALE_ORDER_DESIGN_SENT",
  APPROVED: "SALE_ORDER_APPROVED",
  CHANGES: "SALE_ORDER_CHANGES",
  DISPATCHED: "SALE_ORDER_DISPATCHED",
  DELIVERED: "SALE_ORDER_DELIVERED",
  REMINDER: "SALE_ORDER_REMINDER",
  OVERDUE: "SALE_ORDER_OVERDUE",
  CANCELLED: "SALE_ORDER_CANCELLED",
  CUSTOMER_REPLY: "SALE_ORDER_CUSTOMER_REPLY",
});

module.exports = {
  STATUS,
  CANCELLABLE,
  DESIGN_NOT_STARTED,
  MFG_QUEUE,
  MFG_DESIGN,
  MFG_ACTIVE,
  ROLE,
  NOTIFICATION,
  SALE_ORDER_SETTINGS,
};
