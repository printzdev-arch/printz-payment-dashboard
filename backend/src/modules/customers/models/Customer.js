const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    customerCode: {
      type: String,
      required: [true, "customerCode is required"],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, "Customer mobile number is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    company: {
      type: String,
      trim: true,
      default: "",
    },
    companyName: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    customerType: {
      type: String,
      enum: ["WALK_IN", "QR", "B2B", "REGULAR", "walk in", "qr", "WALK-IN", "Individual", "Company", "INDIVIDUAL", "COMPANY", "individual", "company"],
      default: "WALK_IN",
      index: true,
    },
    customerSource: {
      type: String,
      enum: ["INDIVIDUAL", "COMPANY", "individual", "company", "WALK_IN", "QR", "STAFF", "QR_CODE"],
      default: "INDIVIDUAL",
      index: true,
    },
    type: {
      type: String,
      trim: true,
      default: "individual",
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingBalance: {
      type: Number,
      default: 0,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },
    primaryBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },
    visitedBranches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "customers",
  }
);

customerSchema.pre("save", function () {
  if (this.company && !this.companyName) {
    this.companyName = this.company;
  } else if (this.companyName && !this.company) {
    this.company = this.companyName;
  }
  if (!this.customerSource) {
    this.customerSource = (this.company || this.companyName) ? "COMPANY" : "INDIVIDUAL";
  }
  if (!this.phone && this.mobile) {
    this.phone = this.mobile;
  }
  if (this.gstNumber && !this.gstin) {
    this.gstin = this.gstNumber;
  } else if (this.gstin && !this.gstNumber) {
    this.gstNumber = this.gstin;
  }
  if (this.branchId && !this.primaryBranchId) {
    this.primaryBranchId = this.branchId;
  }
  if (this.branchId) {
    if (!Array.isArray(this.visitedBranches)) this.visitedBranches = [];
    const exists = this.visitedBranches.some((b) => String(b) === String(this.branchId));
    if (!exists) {
      this.visitedBranches.push(this.branchId);
    }
  }
});

customerSchema.index({ customerCode: 1 }, { unique: true });
customerSchema.index({ mobile: 1 }, { unique: true, sparse: true });
customerSchema.index({ email: 1 });
customerSchema.index({ company: 1 });
customerSchema.index({ companyName: 1 });
customerSchema.index({ visitedBranches: 1 });
customerSchema.index({ name: "text", mobile: "text", customerCode: "text", email: "text", company: "text", companyName: "text" });


// === INJECTED REPOSITORY STATICS ===

function _escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function _normalizeDigits(val) {
  if (!val) return "";
  return String(val).replace(/\D/g, "");
}

customerSchema.statics.findAll = async function (filters = {}, pagination = { page: 1, limit: 20 }) {
  const conditions = [];

  if (filters.customerType && filters.customerType !== "all" && filters.customerType !== "ALL") {
    const typeStr = String(filters.customerType).trim().toUpperCase();
    if (typeStr === "WALK_IN" || typeStr === "WALKIN") {
      conditions.push({
        $or: [
          { customerType: { $in: ["WALK_IN", "walk in", "WALK-IN", "REGULAR", "B2B"] } },
          { customerType: { $exists: false } },
          { customerType: null },
        ],
      });
    } else if (typeStr === "QR") {
      conditions.push({ customerType: { $in: ["QR", "qr", "QR_CODE"] } });
    } else {
      conditions.push({ customerType: filters.customerType });
    }
  }

  if (filters.customerSource && filters.customerSource !== "all") {
    const srcStr = String(filters.customerSource).trim().toUpperCase();
    conditions.push({
      $or: [
        { customerSource: srcStr },
        { customerSource: srcStr.toLowerCase() },
        { type: srcStr.toLowerCase() },
      ],
    });
  }

  if (filters.isActive !== undefined) {
    conditions.push({ isActive: filters.isActive === "true" || filters.isActive === true });
  }

  if (filters.branchId) {
    conditions.push({
      $or: [
        { branchId: filters.branchId },
        { visitedBranches: filters.branchId },
      ],
    });
  }

  if (filters.q) {
    const escaped = _escapeRegex(filters.q.trim());
    const regex = new RegExp(escaped, "i");
    const orConditions = [
      { name: regex },
      { mobile: regex },
      { phone: regex },
      { customerCode: regex },
      { email: regex },
      { gstin: regex },
      { company: regex },
      { companyName: regex },
    ];

    const digits = _normalizeDigits(filters.q);
    if (digits.length >= 7 || (/^[\d\s+\-()]+$/.test(filters.q.trim()) && digits.length >= 4)) {
      orConditions.push({ mobile: new RegExp(_escapeRegex(digits), "i") });
      orConditions.push({ phone: new RegExp(_escapeRegex(digits), "i") });
    }

    conditions.push({ $or: orConditions });
  }

  const query = conditions.length > 0 ? { $and: conditions } : {};

  const page = Math.max(1, Number(pagination.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(pagination.limit) || 20));
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    this.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    this.countDocuments(query),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

customerSchema.statics.search = async function (q = "", limit = 10) {
  if (!q || !q.trim()) return [];
  const escaped = _escapeRegex(q.trim());
  const regex = new RegExp(escaped, "i");
  const orConditions = [
    { name: regex },
    { mobile: regex },
    { phone: regex },
    { customerCode: regex },
    { email: regex },
    { company: regex },
    { companyName: regex },
  ];

  const digits = _normalizeDigits(q);
  if (digits.length >= 7 || (/^[\d\s+\-()]+$/.test(q.trim()) && digits.length >= 4)) {
    orConditions.push({ mobile: new RegExp(_escapeRegex(digits), "i") });
    orConditions.push({ phone: new RegExp(_escapeRegex(digits), "i") });
  }

  return this.find({ $or: orConditions })
    .select("_id customerCode name mobile phone email company companyName gstin address isB2B customerType branchId")
    .limit(Math.min(50, Math.max(1, Number(limit) || 10)))
    .lean();
};

customerSchema.statics.findByCode = async function (customerCode) {
  if (!customerCode) return null;
  return this.findOne({ customerCode: new RegExp(`^${customerCode.trim()}$`, "i") });
};

customerSchema.statics.findByMobile = async function (mobile) {
  if (!mobile) return null;
  const digits = _normalizeDigits(mobile);
  return this.findOne({
    $or: [
      { mobile: mobile.trim() },
      { mobile: digits },
      { phone: mobile.trim() },
      { phone: digits },
    ],
  });
};

customerSchema.statics.findByEmail = async function (email) {
  if (!email) return null;
  return this.findOne({ email: new RegExp(`^${email.trim()}$`, "i") });
};

customerSchema.statics.addVisitedBranch = async function (customerId, branchId) {
  if (!customerId || !branchId) return;
  return this.findByIdAndUpdate(customerId, { $addToSet: { visitedBranches: branchId } });
};

customerSchema.statics.update = async function (id, data) {
  return this.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
};

customerSchema.statics.delete = async function (id) {
  return this.findByIdAndDelete(id);
};


module.exports = mongoose.models.Customer || mongoose.model("Customer", customerSchema);

