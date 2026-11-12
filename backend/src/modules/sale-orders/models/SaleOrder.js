const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const ORDER_STATUSES = [
  "DRAFT",
  "PLACED",
  "WAITING_FOR_DESIGNER",
  "ASSIGNED",
  "IN_DESIGN",
  "SENT_FOR_APPROVAL",
  "CHANGES_REQUESTED",
  "APPROVED",
  "PRINTING",
  "DISPATCHED",
  "RECEIVED_AT_BRANCH",
  "DELIVERED",
  "CANCELLED",
];
const PAYMENT_STATUSES = ["UNPAID", "ADVANCE_PAID", "PAID", "REFUNDED"];
const APPROVAL_CHANNELS = ["CALL_TO_BRANCH", "CALL_TO_DESIGNER", "WHATSAPP_REPLY", "IN_PERSON"];

const customerSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    whatsappNumber: { type: String, required: true, trim: true },
    whatsappOptIn: { type: Boolean, default: false },
    email: { type: String, default: null, trim: true },
    address: { type: String, default: null, trim: true },
  },
  { _id: false }
);

// Who at the manufacturing unit took the order from the queue. It only records who started it:
// everyone at the unit can still work every step. (AUTO / MANUAL / REASSIGN are on older orders.)
const currentAssignmentSchema = new mongoose.Schema(
  {
    designerUserId: { type: ObjectId, ref: "User", required: true },
    designerName: { type: String, required: true, trim: true },
    assignedAt: { type: Date, required: true },
    method: { type: String, enum: ["TAKEN", "AUTO", "MANUAL", "REASSIGN"], default: "TAKEN" },
  },
  { _id: false }
);

const approvalSchema = new mongoose.Schema(
  {
    approvedAt: { type: Date, required: true },
    channel: { type: String, enum: APPROVAL_CHANNELS, required: true },
    recordedBy: { type: ObjectId, ref: "User", required: true },
    recordedByRole: { type: String, required: true, trim: true },
    remarks: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const printingSchema = new mongoose.Schema(
  {
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    printedQty: { type: Number, default: null, min: 0 },
    spoilageQty: { type: Number, default: 0, min: 0 },
    printedBy: { type: ObjectId, ref: "User", default: null },
    remarks: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const dispatchSchema = new mongoose.Schema(
  {
    dispatchNo: { type: String, required: true, trim: true },
    dispatchedAt: { type: Date, required: true },
    dispatchedBy: { type: ObjectId, ref: "User", required: true },
    mode: { type: String, enum: ["OWN_VEHICLE", "COURIER", "STAFF_HAND_DELIVERY"], required: true },
    carrierDetails: { type: String, default: "", trim: true },
    trackingRef: { type: String, default: "", trim: true },
    packages: { type: Number, default: 1, min: 1 },
    receivedAtBranchAt: { type: Date, default: null },
    receivedAtBranchBy: { type: ObjectId, ref: "User", default: null },
    packagesReceived: { type: Number, default: null, min: 0 },
    receiveRemarks: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const deliverySchema = new mongoose.Schema(
  {
    deliveredAt: { type: Date, required: true },
    deliveredBy: { type: ObjectId, ref: "User", required: true },
    receivedByName: { type: String, required: true, trim: true },
    proofAttachmentId: { type: ObjectId, ref: "CommonAttachment", default: null },
    remarks: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const cancellationSchema = new mongoose.Schema(
  {
    cancelledAt: { type: Date, required: true },
    cancelledBy: { type: ObjectId, ref: "User", required: true },
    reason: { type: String, required: true, trim: true },
    refundApprovedBy: { type: ObjectId, ref: "User", default: null },
  },
  { _id: false }
);

const advanceOverrideSchema = new mongoose.Schema(
  {
    overriddenBy: { type: ObjectId, ref: "User", required: true },
    reason: { type: String, required: true, trim: true },
    overriddenAt: { type: Date, required: true },
  },
  { _id: false }
);

const remindersSchema = new mongoose.Schema(
  {
    notOpenedReminderAt: { type: Date, default: null },
    notOpenedEscalatedAt: { type: Date, default: null },
    noReplyReminderAt: { type: Date, default: null },
    overdueFlaggedAt: { type: Date, default: null },
  },
  { _id: false }
);

/**
 * Sale order header - one document per customer order placed at a branch.
 * Collection: saleOrders
 */
const saleOrderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, trim: true, uppercase: true },
    invoiceNo: { type: String, default: null, trim: true, uppercase: true },
    invoiceDate: { type: Date, default: null },
    orderBranchId: { type: ObjectId, ref: "Branch", required: true },
    manufacturingUnitId: { type: ObjectId, ref: "Branch", required: true },
    customerId: { type: ObjectId, ref: "Customer", default: null },
    customerSnapshot: { type: customerSnapshotSchema, required: true },

    orderDate: { type: Date, required: true },
    expectedDeliveryDate: { type: Date, required: true },
    priority: { type: String, enum: ["NORMAL", "URGENT"], default: "NORMAL", required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "DRAFT", required: true },

    customerRequirements: { type: String, default: "", trim: true },
    referenceFileIds: { type: [{ type: ObjectId, ref: "CommonAttachment" }], default: [] },

    subtotal: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    urgentChargeType: { type: String, enum: ["AMOUNT", "PERCENTAGE"], default: "AMOUNT" },
    urgentChargeValue: { type: Number, default: 0, min: 0 },
    urgentChargeAmount: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },
    advanceAmount: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "UNPAID", required: true },
    advanceOverride: { type: advanceOverrideSchema, default: null },

    currentAssignment: { type: currentAssignmentSchema, default: null },
    currentDesignVersion: { type: Number, default: 0, min: 0 },
    approvedDesignId: { type: ObjectId, ref: "SaleOrderDesign", default: null },
    approval: { type: approvalSchema, default: null },
    printing: { type: printingSchema, default: null },
    dispatch: { type: dispatchSchema, default: null },
    delivery: { type: deliverySchema, default: null },
    cancellation: { type: cancellationSchema, default: null },
    reminders: { type: remindersSchema, default: () => ({}) },

    remarks: { type: String, default: "", trim: true },
    createdBy: { type: ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "saleOrders",
  }
);

saleOrderSchema.index({ orderNo: 1 }, { unique: true });
saleOrderSchema.index({ orderBranchId: 1, status: 1, orderDate: -1 });
saleOrderSchema.index({ manufacturingUnitId: 1, status: 1 });
saleOrderSchema.index({ "currentAssignment.designerUserId": 1, status: 1 });
saleOrderSchema.index({ "customerSnapshot.mobile": 1 });
saleOrderSchema.index({ status: 1, expectedDeliveryDate: 1 });
// Order list is newest-first for a branch or a unit; day-end reads a branch by order date; the unit board is ordered by priority
saleOrderSchema.index({ createdAt: -1 });
saleOrderSchema.index({ orderBranchId: 1, createdAt: -1 });
saleOrderSchema.index({ manufacturingUnitId: 1, createdAt: -1 });
saleOrderSchema.index({ orderBranchId: 1, orderDate: -1 });
saleOrderSchema.index({ manufacturingUnitId: 1, status: 1, priority: -1, orderDate: 1 });
saleOrderSchema.index({ status: 1, updatedAt: 1 });

module.exports =
  mongoose.models.SaleOrder || mongoose.model("SaleOrder", saleOrderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
module.exports.APPROVAL_CHANNELS = APPROVAL_CHANNELS;
