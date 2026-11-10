const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

/**
 * Outbound WhatsApp log (design approval requests, pickup reminders, receipts).
 * Collection: whatsappMessages
 */
const whatsappMessageSchema = new mongoose.Schema(
  {
    orderId: { type: ObjectId, ref: "SaleOrder", required: true },
    designId: { type: ObjectId, ref: "SaleOrderDesign", default: null },
    purpose: {
      type: String,
      enum: ["DESIGN_APPROVAL", "READY_FOR_PICKUP", "PAYMENT_RECEIPT"],
      required: true,
    },
    toNumber: { type: String, required: true, trim: true },
    templateName: { type: String, required: true, trim: true },
    templateParams: { type: mongoose.Schema.Types.Mixed, default: {} },
    mediaUrl: { type: String, default: null },
    status: {
      type: String,
      enum: ["QUEUED", "SENT", "DELIVERED", "READ", "FAILED"],
      default: "QUEUED",
      required: true,
    },
    providerMessageId: { type: String, default: null },
    error: { type: String, default: null },
    sentBy: { type: ObjectId, ref: "User", required: true },
    sentAt: { type: Date, required: true },
    statusUpdatedAt: { type: Date, default: null },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "whatsappMessages",
  }
);

whatsappMessageSchema.index({ orderId: 1, sentAt: -1 });
whatsappMessageSchema.index(
  { providerMessageId: 1 },
  { sparse: true }
);

module.exports =
  mongoose.models.WhatsappMessage ||
  mongoose.model("WhatsappMessage", whatsappMessageSchema);
