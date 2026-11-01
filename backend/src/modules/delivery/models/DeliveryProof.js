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
      enum: ["SELF", "CUSTOMER", "FAMILY", "COLLEAGUE", "SECURITY", "OFFICE_STAFF", "STORE_MANAGER", "MANAGER", "AGENT", "OTHER"],
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


// === INJECTED REPOSITORY STATICS ===

deliveryProofSchema.statics.findByDeliveryOrderId = async function (deliveryOrderId) {
  return this.findOne({ deliveryOrderId }).lean();
};



deliveryProofSchema.statics.findAll = async function(query = {}) {
  const filter = {};
  if (query.branchId) filter.branchId = query.branchId;
  if (query.deliveryOrderId) filter.deliveryOrderId = query.deliveryOrderId;
  if (query.jobOrderId) filter.jobOrderId = query.jobOrderId;
  if (query.status) filter.status = query.status;
  if (query.proofType) filter.proofType = query.proofType;
  if (query.search) {
    const term = query.search.trim();
    filter.$or = [
      { deliveryNo: { $regex: term, $options: "i" } },
      { proofNo: { $regex: term, $options: "i" } },
      { recipientName: { $regex: term, $options: "i" } },
      { recipientPhone: { $regex: term, $options: "i" } },
    ];
  }
  return this.find(filter).sort({ createdAt: -1 });
};

deliveryProofSchema.statics.findLatestByDeliveryOrderId = async function(deliveryOrderId) {
  return this.findOne({ deliveryOrderId })
    .populate("recordedBy", "name email")
    .populate("deliveredBy", "name email")
    .sort({ deliveredAt: -1 });
};

deliveryProofSchema.statics.findByJobOrderId = async function(jobOrderId) {
  return this.find({ jobOrderId })
    .populate("recordedBy", "name email")
    .populate("deliveredBy", "name email")
    .sort({ deliveredAt: -1 });
};

if (typeof deliveryProofSchema !== "undefined" && typeof DeliveryProof !== "undefined" && deliveryProofSchema.statics) {
  Object.assign(DeliveryProof, deliveryProofSchema.statics);
}

module.exports = DeliveryProof;
