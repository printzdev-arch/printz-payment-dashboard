const mongoose = require("mongoose");

const approvalSchema = new mongoose.Schema(
  {
    approvalNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    referenceType: {
      type: String,
      required: true,
      enum: [
        "PRODUCT_ORDER",
        "LEAVE_REQUEST",
        "ATTENDANCE_REGULARIZATION",
        "REPRINT_REQUEST",
        "SALARY_RUN",
        "SALARY_ADJUSTMENT",
        "SALE_RECEIPT_VOID",
        "STOCK_ADJUSTMENT",
      ],
      index: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
      index: true,
    },
    approverId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
    comments: {
      type: String,
      default: null,
      trim: true,
    },
    branchId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Branch",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "approvals",
  }
);

// Compound Indexes specified in requirements
approvalSchema.index({ referenceType: 1, referenceId: 1, status: 1 });
approvalSchema.index({ branchId: 1, status: 1 });

module.exports = mongoose.models.CommonApproval || mongoose.model("CommonApproval", approvalSchema);
