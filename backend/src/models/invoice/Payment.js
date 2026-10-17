const mongoose = require("mongoose");

/**
 * Payment Model for Invoice Settlement & Multi-Payment / Split-Payment Tracking
 */
const paymentSchema = new mongoose.Schema(
  {
    paymentNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      index: true,
    },
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Customer",
      default: null,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, "Payment amount must be greater than zero"],
    },
    paymentMode: {
      type: String,
      enum: ["CASH", "CARD", "UPI", "BANK"],
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      default: null,
      trim: true,
    },
    paymentReference: {
      type: String,
      default: null,
      trim: true,
    },
    referenceNumber: {
      type: String,
      default: null,
      trim: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "VOID", "REVERSED"],
      default: "COMPLETED",
      index: true,
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    idempotencyKey: {
      type: String,
      trim: true,
    },
    voidReason: {
      type: String,
      default: null,
      trim: true,
    },
    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    voidedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "payments",
  }
);

paymentSchema.pre("validate", function (next) {
  if (this.idempotencyKey === null || this.idempotencyKey === "") {
    this.idempotencyKey = undefined;
  }
  next();
});

paymentSchema.pre("save", function (next) {
  if (this.paymentMode && !this.paymentMethod) {
    this.paymentMethod = this.paymentMode;
  } else if (this.paymentMethod && !this.paymentMode) {
    this.paymentMode = this.paymentMethod;
  }
  if (this.paymentReference && !this.referenceNumber) {
    this.referenceNumber = this.paymentReference;
  } else if (this.referenceNumber && !this.paymentReference) {
    this.paymentReference = this.referenceNumber;
  }
  next();
});

paymentSchema.index({ invoiceId: 1, createdAt: -1 });
paymentSchema.index({ jobOrderId: 1, createdAt: -1 });
paymentSchema.index({ branchId: 1, paymentDate: -1 });
paymentSchema.index(
  { idempotencyKey: 1 },
  { unique: true, sparse: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);


// === INJECTED REPOSITORY STATICS ===

paymentSchema.statics.findByInvoiceId = async function (invoiceId) {
  return this.find({ invoiceId, status: { $ne: "FAILED" } }).sort({ paymentDate: -1 });
};

paymentSchema.statics.findValidPaymentsByInvoiceId = async function (invoiceId) {
  return this.find({
    invoiceId,
    status: { $in: ["COMPLETED", "PAID", "SUCCESS"] },
    isDeleted: { $ne: true },
  }).sort({ paymentDate: 1 });
};

paymentSchema.statics.findByJobOrderId = async function (jobOrderId) {
  return this.find({ jobOrderId }).sort({ paymentDate: -1 });
};

paymentSchema.statics.updateById = async function (id, updateData) {
  return this.findByIdAndUpdate(id, { $set: updateData }, { new: true });
};


if (typeof paymentSchema !== "undefined" && typeof Payment !== "undefined" && paymentSchema.statics) {
  Object.assign(Payment, paymentSchema.statics);
}

module.exports = Payment;
