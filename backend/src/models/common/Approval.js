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
        "INVOICE_VARIANCE",
        "INVOICE",
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


// === INJECTED REPOSITORY STATICS ===

approvalSchema.statics.findAll = async function (query = {}, { page = 1, limit = 50, sort = { createdAt: -1 } } = {}) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const [records, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Math.max(1, limit))
      .populate("requestedBy", "name email username role")
      .populate("approverId", "name email username role")
      .populate("branchId", "name code")
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    records,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit) || 1,
  };
};

approvalSchema.statics.findByReference = async function (referenceType, referenceId) {
  const refId = mongoose.Types.ObjectId.isValid(referenceId)
    ? new mongoose.Types.ObjectId(referenceId)
    : referenceId;
  return this.findOne({ referenceType, referenceId: refId })
    .sort({ createdAt: -1 })
    .lean();
};

approvalSchema.statics.updateStatus = async function (id, { status, approverId, decidedAt = new Date(), comments = null }) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return this.findByIdAndUpdate(
    id,
    {
      $set: {
        status,
        approverId,
        decidedAt,
        comments,
      },
    },
    { new: true }
  ).lean();
};

approvalSchema.statics.getCounts = async function (query = {}) {
  const results = await this.aggregate([
    { $match: query },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0, TOTAL: 0 };
  results.forEach((r) => {
    if (counts[r._id] !== undefined) counts[r._id] = r.count;
    counts.TOTAL += r.count;
  });
  return counts;
};


module.exports = mongoose.models.CommonApproval || mongoose.model("CommonApproval", approvalSchema);
