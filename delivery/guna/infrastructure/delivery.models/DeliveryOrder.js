const mongoose = require("mongoose");

const deliveryOrderSchema = new mongoose.Schema(
  {
    // Step 2: DO-xxxxx unique delivery sequence number
    deliveryNo: {
      type: String,
      required: [true, "Delivery number is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    // Job Order association
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      required: [true, "Job Order ID is required"],
      index: true,
    },
    // Scoped branch
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Branch ID is required"],
      index: true,
    },
    customerId: {
      type: String,
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      default: "",
      trim: true,
    },
    customerPhone: {
      type: String,
      default: "",
      trim: true,
    },
    deliveryAddress: {
      type: String,
      default: "",
      trim: true,
    },
    deliveryType: {
      type: String,
      enum: ["DELIVERY", "COUNTER_PICKUP", "COURIER"],
      default: "DELIVERY",
      index: true,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    items: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: "JobItem", default: null },
        jobItemId: { type: mongoose.Schema.Types.ObjectId, ref: "JobItem", default: null },
        name: { type: String, default: "" },
        itemName: { type: String, default: "" },
        description: { type: String, default: "" },
        quantity: { type: Number, default: 0 },
        unit: { type: String, default: "pcs" },
      },
    ],
    // Workflow Lifecycle Status:
    // READY / READY_FOR_DELIVERY -> ASSIGNED -> PACKED -> OUT_FOR_DELIVERY -> DELIVERED (or CANCELLED)
    status: {
      type: String,
      enum: [
        "READY",
        "ASSIGNED",
        "PACKED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
      ],
      default: "READY",
      index: true,
    },

    // Step 1: Manager Review (Manager Only)
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNotes: {
      type: String,
      default: "",
      trim: true,
    },

    // Step 2: Delivery Details
    deliveryPersonName: {
      type: String,
      default: "",
      trim: true,
    },
    deliveryPersonPhone: {
      type: String,
      default: "",
      trim: true,
    },
    assignedEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    vehicleNumber: {
      type: String,
      default: "",
      trim: true,
    },
    vehicle: {
      type: String,
      default: "",
      trim: true,
    },
    deliveryTime: {
      type: String,
      default: "",
      trim: true,
    },
    instructions: {
      type: String,
      default: "",
      trim: true,
    },
    expectedDeliveryDate: {
      type: Date,
      default: null,
    },

    // Step 3: Assign and Send Details
    assignedAt: {
      type: Date,
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
    notificationSentAt: {
      type: Date,
      default: null,
    },
    notificationChannels: {
      type: [String],
      default: [],
    },
    whatsappMessageId: {
      type: String,
      default: null,
    },
    whatsappStatus: {
      type: String,
      enum: ["NOT_SENT", "SENT", "DELIVERED", "FAILED", "MOCK"],
      default: "NOT_SENT",
    },

    // Step 4: Pack and Verify Goods
    packedAt: {
      type: Date,
      default: null,
    },
    packedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    packingNotes: {
      type: String,
      default: "",
      trim: true,
    },
    itemsVerified: {
      type: Boolean,
      default: false,
    },

    // Step 5: Dispatch or Counter Pickup
    dispatchedAt: {
      type: Date,
      default: null,
    },
    dispatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    dispatchNotes: {
      type: String,
      default: "",
      trim: true,
    },

    // Step 6 & 7: Handover Evidence & Delivered
    deliveredAt: {
      type: Date,
      default: null,
    },
    deliveredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    receivedBy: {
      type: String,
      default: null,
      trim: true,
    },
    recipientName: {
      type: String,
      default: null,
      trim: true,
    },
    recipientPhone: {
      type: String,
      default: null,
      trim: true,
    },
    signatureUrl: {
      type: String,
      default: null,
    },
    pickupOtp: {
      type: String,
      default: null,
    },
    isOtpVerified: {
      type: Boolean,
      default: false,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    // Reference to dedicated DeliveryProof document
    proofId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryProof",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
deliveryOrderSchema.index({ jobOrderId: 1, status: 1 });
deliveryOrderSchema.index({ branchId: 1, status: 1 });
deliveryOrderSchema.index({ expectedDeliveryDate: 1 });
deliveryOrderSchema.index({ assignedAt: -1 });

const DeliveryOrder =
  mongoose.models.DeliveryOrder ||
  mongoose.model("DeliveryOrder", deliveryOrderSchema, "deliveryOrders");

module.exports = DeliveryOrder;
