const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

/**
 * Every money movement on an order: advance, final payment, refunds.
 * Collection: saleOrderPayments
 */
const saleOrderPaymentSchema = new mongoose.Schema(
  {
    receiptNo: { type: String, required: true, trim: true, uppercase: true },
    orderId: { type: ObjectId, ref: "SaleOrder", required: true },
    branchId: { type: ObjectId, ref: "Branch", required: true },
    paymentType: { type: String, enum: ["ADVANCE", "FINAL", "ADDITIONAL", "REFUND"], required: true },
    amount: { type: Number, required: true, min: 0 },
    mode: { type: String, enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER"], required: true },
    reference: { type: String, default: "", trim: true },
    status: { type: String, enum: ["SUCCESS", "VOID"], default: "SUCCESS", required: true },
    idempotencyKey: { type: String, default: null, trim: true },
    collectedBy: { type: ObjectId, ref: "User", required: true },
    collectedAt: { type: Date, required: true },
    approvedBy: { type: ObjectId, ref: "User", default: null },
    remarks: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "saleOrderPayments",
  }
);

saleOrderPaymentSchema.index({ receiptNo: 1 }, { unique: true });
saleOrderPaymentSchema.index({ orderId: 1, collectedAt: 1 });
saleOrderPaymentSchema.index({ branchId: 1, collectedAt: -1, paymentType: 1 });
saleOrderPaymentSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

module.exports =
  mongoose.models.SaleOrderPayment ||
  mongoose.model("SaleOrderPayment", saleOrderPaymentSchema);
