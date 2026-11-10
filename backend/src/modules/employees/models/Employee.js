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
    // Age is never stored; it is derived from this date (see utils/age.util.js).
    dateOfBirth: {
      type: Date,
      default: null,
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
    roleId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Role",
      default: null,
    },
    // Menu items (keys from auth/constants/pageCatalog.js) this person may open. Left unset, the role's pages apply;
    // a list (even an empty one) replaces them. An empty list means no pages, so no login.
    pageAccess: { type: [String], default: undefined },
    // Set when an admin lets this person sign in although their role does not (for example an Operator who needs a login).
    // The reason is required and is kept here so anyone can see why.
    // Why this person has pages beyond their role's. Required whenever the saved list goes past the role's pages.
    extraPages: {
      type: new mongoose.Schema(
        {
          reason: { type: String, required: true, trim: true },
          setBy: { type: mongoose.Schema.Types.Mixed, default: null },
          setByName: { type: String, default: "" },
          setAt: { type: Date, default: Date.now },
        },
        { _id: false }
      ),
      default: undefined,
    },
    loginException: {
      type: new mongoose.Schema(
        {
          reason: { type: String, required: true, trim: true },
          setBy: { type: mongoose.Schema.Types.Mixed, default: null },
          setByName: { type: String, default: "" },
          setAt: { type: Date, default: Date.now },
        },
        { _id: false }
      ),
      default: undefined,
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

// The signed-in user is cached with its employee profile; clear the cache when an employee changes
const authCache = require("../../../utils/helpers/authCache");
["save", "findOneAndUpdate", "findOneAndDelete", "updateOne", "updateMany", "deleteOne", "deleteMany"].forEach((op) => {
  EmployeeSchema.post(op, function () {
    authCache.invalidateAllUsers();
  });
});

module.exports = mongoose.models.Employee || mongoose.model("Employee", EmployeeSchema);
