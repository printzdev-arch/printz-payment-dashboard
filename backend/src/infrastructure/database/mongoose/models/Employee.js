const mongoose = require("mongoose");

const BankDetailsSchema = new mongoose.Schema(
  {
    accountHolderName: { type: String, default: "" },
    accountNumberEncrypted: { type: String, default: "" },
    bankName: { type: String, default: "" },
    ifscCode: { type: String, default: "" },
    bankBranch: { type: String, default: "" },
  },
  { _id: false }
);

const EmployeeSchema = new mongoose.Schema(
  {
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Employee name is required"],
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      match: [/^\d{10}$/, "Mobile must be 10 digits"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      default: "",
    },
    joiningDate: {
      type: Date,
      required: [true, "Joining date is required"],
    },
    leavingDate: {
      type: Date,
      default: null,
    },
    employmentStatus: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "LEFT"],
      default: "ACTIVE",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Branch",
      required: [true, "Branch assignment is required"],
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Department",
      default: null,
    },
    designationId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Designation",
      default: null,
    },
    roleId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Role",
      default: null,
    },
    reportingManagerId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Employee",
      default: null,
    },
    defaultSalary: {
      type: Number,
      default: null,
    },
    bankDetails: {
      type: BankDetailsSchema,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "employees",
  }
);

module.exports = mongoose.model("Employee", EmployeeSchema);
