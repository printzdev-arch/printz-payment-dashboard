const mongoose = require("mongoose");

/**
 * Step 6: Record Handover Evidence - Delivery Proof Model
 * Collection: deliveryProofs
 */
const deliveryProofSchema = new mongoose.Schema(
  {
    // Proof identification number (e.g. DP-xxxxx)
    proofNo: {
      type: String,
      trim: true,
      uppercase: true,
    },
    // Associated Delivery Order
    deliveryOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryOrder",
      required: [true, "Delivery Order ID is required"],
      index: true,
    },
    deliveryNo: {
      type: String,
      required: [true, "Delivery number is required"],
      trim: true,
      index: true,
    },
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      required: [true, "Job Order ID is required"],
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Branch ID is required"],
      index: true,
    },

    // Handover Evidence Details
    recipientName: {
      type: String,
      required: [true, "Recipient name is required"],
      trim: true,
    },
    recipientPhone: {
      type: String,
      default: "",
      trim: true,
    },
    recipientRelationship: {
      type: String,
      enum: ["SELF", "CUSTOMER", "FAMILY", "COLLEAGUE", "SECURITY", "OFFICE_STAFF", "OTHER"],
      default: "CUSTOMER",
    },
    deliveryType: {
      type: String,
      enum: ["DELIVERY", "COUNTER_PICKUP", "COURIER"],
      default: "DELIVERY",
    },

    // Evidence artifacts
    signatureUrl: {
      type: String,
      default: null,
    },
    otp: {
      type: String,
      default: null,
    },
    otpVerified: {
      type: Boolean,
      default: false,
    },
    deliveryPhotos: [
      {
        url: { type: String, required: true },
        caption: { type: String, default: "" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    proofType: {
      type: String,
      enum: ["SIGNATURE", "OTP", "PHOTO", "SIGNATURE_AND_PHOTO", "MANUAL", "HYBRID"],
      default: "SIGNATURE",
    },

    // Geo-location / Address at handover
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      address: { type: String, default: "" },
    },

    // Verification & Handover Audit
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deliveredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deliveryPersonName: {
      type: String,
      default: "",
      trim: true,
    },
    deliveredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ["VERIFIED", "PENDING", "REJECTED"],
      default: "VERIFIED",
      index: true,
    },
    handoverStage: {
      type: String,
      default: "DELIVERED",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
deliveryProofSchema.index({ deliveryOrderId: 1, deliveredAt: -1 });
deliveryProofSchema.index({ jobOrderId: 1, deliveredAt: -1 });
deliveryProofSchema.index({ branchId: 1, deliveredAt: -1 });
deliveryProofSchema.index({ proofNo: 1 }, { unique: true, sparse: true });

const DeliveryProof =
  mongoose.models.DeliveryProof ||
  mongoose.model("DeliveryProof", deliveryProofSchema, "deliveryProofs");

module.exports = DeliveryProof;
