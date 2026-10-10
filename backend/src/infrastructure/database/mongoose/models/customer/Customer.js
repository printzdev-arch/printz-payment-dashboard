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
      enum: ["WALK_IN", "B2B", "REGULAR"],
      default: "WALK_IN",
      index: true,
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
  if (!this.phone && this.mobile) {
    this.phone = this.mobile;
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

module.exports = mongoose.models.Customer || mongoose.model("Customer", customerSchema);

