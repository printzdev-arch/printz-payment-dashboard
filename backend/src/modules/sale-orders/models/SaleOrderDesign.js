const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const customerDecisionSchema = new mongoose.Schema(
  {
    decision: { type: String, enum: ["APPROVED", "CHANGES_REQUESTED"], required: true },
    channel: {
      type: String,
      enum: ["CALL_TO_BRANCH", "CALL_TO_DESIGNER", "WHATSAPP_REPLY", "IN_PERSON"],
      required: true,
    },
    changeNotes: { type: String, default: "", trim: true },
    recordedBy: { type: ObjectId, ref: "User", required: true },
    recordedAt: { type: Date, required: true },
  },
  { _id: false }
);

/**
 * Design versions prepared by the designer and the customer's decision on each.
 * Collection: saleOrderDesigns
 */
const saleOrderDesignSchema = new mongoose.Schema(
  {
    orderId: { type: ObjectId, ref: "SaleOrder", required: true },
    versionNo: { type: Number, required: true, min: 1 },
    previewAttachmentId: { type: ObjectId, ref: "CommonAttachment", required: true },
    printFileAttachmentId: { type: ObjectId, ref: "CommonAttachment", default: null },
    designerNotes: { type: String, default: "", trim: true },
    designedBy: { type: ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["DRAFT", "SENT", "APPROVED", "CHANGES_REQUESTED", "SUPERSEDED"],
      default: "DRAFT",
      required: true,
    },
    sentAt: { type: Date, default: null },
    whatsappMessageId: { type: ObjectId, ref: "WhatsappMessage", default: null },
    customerDecision: { type: customerDecisionSchema, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "saleOrderDesigns",
  }
);

saleOrderDesignSchema.index({ orderId: 1, versionNo: 1 }, { unique: true });
saleOrderDesignSchema.index({ orderId: 1, status: 1 });

module.exports =
  mongoose.models.SaleOrderDesign ||
  mongoose.model("SaleOrderDesign", saleOrderDesignSchema);
