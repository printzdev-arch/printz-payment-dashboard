const mongoose = require("mongoose");
const passwordService = require("../../../utils/integrations/BcryptPasswordService");

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.Mixed,
      default: () => new mongoose.Types.ObjectId(),
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    phone: {
      type: String,
    },
    branch: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    branchId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    employeeId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
    },
    branchIds: [
      {
        type: mongoose.Schema.Types.Mixed,
      },
    ],
    roleIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
      },
    ],
    profilePicUrl: {
      type: String,
      default: null,
    },
    needsReview: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      trim: true,
      default: "staff",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "LOCKED", "DISABLED"],
      default: "ACTIVE",
      index: true,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lastFailedLoginAt: {
      type: Date,
      default: null,
    },
    lockoutEnd: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    permissions: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    employeeCode: {
      type: String,
      trim: true,
      default: "",
    },
    // Most design jobs a designer can hold at once (used for designers only)
    maxLoad: {
      type: Number,
      default: 5,
      min: 1,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
      index: true,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.id;
        return ret;
      },
    },
    toObject: {
      virtuals: false,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.id;
        return ret;
      },
    },
  }
);

// User list is newest-first and filtered by role / branch; role checks count users holding a role
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ roleIds: 1 });
userSchema.index({ branchId: 1 });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await passwordService.hashPassword(this.password);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return passwordService.comparePassword(candidatePassword, this.password);
};

userSchema.statics.buildIdQuery = function (id) {
  if (!id) return { _id: id };
  const str = String(id).trim();
  if (mongoose.Types.ObjectId.isValid(str) && str.length === 24) {
    return {
      $or: [
        { _id: new mongoose.Types.ObjectId(str) },
        { _id: str },
      ],
    };
  }
  return { _id: str };
};

userSchema.statics.findByIdFlexible = function (id) {
  if (!id) return Promise.resolve(null);
  const q = this.buildIdQuery(id);
  const str = String(id).trim();
  return this.findOne({
    $or: [
      ...((q && q.$or) ? q.$or : [{ _id: id }]),
      { email: str.toLowerCase() },
      { name: str },
      { username: str.toLowerCase() },
    ],
  });
};

userSchema.statics.enrichUser = async function (user) {
  if (!user) return null;
  const userObj = user._doc
    ? { ...user._doc }
    : (typeof user.toObject === "function" ? user.toObject({ transform: false }) : { ...user });
  let homeBranch = null; // the branch this login works at

  if (userObj.employeeId) {
    const Employee = require("../../employees/models/Employee");
    const employee = await Employee.findById(userObj.employeeId)
      .populate("roleId", "code name grants pageAccess pageActions")
      .populate("branchId", "name code location branchType")
      .lean();

    if (employee) {
      userObj.employee = employee;

      if (employee.branchId) {
        let branchDoc = employee.branchId;
        const bId = branchDoc._id || branchDoc;
        userObj.branchId = bId;
        userObj.branchIds = [bId];

        if (!branchDoc.name && mongoose.Types.ObjectId.isValid(bId)) {
          const Branch = require("../../branches/models/Branch");
          branchDoc = (await Branch.findById(bId).lean()) || {};
        }

        if (branchDoc.name) {
          userObj.branch = branchDoc.name;
        }
        homeBranch = branchDoc;
      }

      if (employee.roleId) {
        let roleDoc = employee.roleId;
        const rId = roleDoc._id || roleDoc;
        userObj.roleId = rId;
        userObj.roleIds = [rId];

        if (!roleDoc.code && mongoose.Types.ObjectId.isValid(rId)) {
          const Role = require("./Role");
          roleDoc = (await Role.findById(rId).lean()) || {};
        }

        // Only roles that list their pages are restricted to them
        // The employee's own pages win; otherwise the role's. Super Admin is never limited.
        const effectivePages = Array.isArray(employee.pageAccess)
          ? employee.pageAccess
          : Array.isArray(roleDoc.pageAccess)
            ? roleDoc.pageAccess
            : null;
        if (effectivePages && roleDoc.code !== "SUPER_ADMIN") {
          const { pathsFor, linksFor } = require("../constants/pageCatalog");
          const isAdminRole = ["ADMIN", "SUPER_ADMIN"].includes(String(roleDoc.code || "").toUpperCase());
          // Branch managers do not get the Employees module, even if it is ticked for them. The page is only
          // hidden: pageAccess keeps it so other screens (attendance, salary) can still load the employee list.
          const isManagerRole = ["MANAGER", "BRANCH_MANAGER", "BRANCH_MANAGER1"].includes(String(roleDoc.code || "").toUpperCase());
          const shownPages = isManagerRole ? effectivePages.filter((k) => k !== "employees") : effectivePages;
          userObj.pageAccess = effectivePages;
          // Actions follow the same rule as pages: the person's own list wins, otherwise the role's
          const effectiveActions = Array.isArray(employee.pageAccess) ? employee.pageActions : roleDoc.pageActions;
          if (effectiveActions && typeof effectiveActions === "object") userObj.pageActions = effectiveActions;
          userObj.allowedPaths = pathsFor(shownPages, { admin: isAdminRole });
          userObj.pageLinks = linksFor(shownPages, { admin: isAdminRole });
        }

        if (roleDoc.code) {
          userObj.roleCode = roleDoc.code;
          userObj.role = roleDoc.code.toLowerCase();
        }
      }

      if (employee.name) {
        userObj.name = employee.name;
      }
      if (employee.mobile) {
        userObj.phone = employee.mobile;
      }
    }
  } else if (userObj.branchId) {
    const Branch = require("../../branches/models/Branch");
    const bId = userObj.branchId._id || userObj.branchId;
    if (mongoose.Types.ObjectId.isValid(bId)) {
      const b = await Branch.findById(bId).select("name code branchType").lean();
      if (b) {
        if (!userObj.branch) userObj.branch = b.name;
        homeBranch = b;
      }
    }
  }

  // A login with no employee record (like the admin logins) still carries its roles; mark Super Admin so the app can show it
  if (!userObj.roleCode && Array.isArray(userObj.roleIds) && userObj.roleIds.length > 0) {
    const Role = require("./Role");
    const held = await Role.find({ _id: { $in: userObj.roleIds } }).select("code").lean();
    if (held.some((r) => r.code === "SUPER_ADMIN")) userObj.roleCode = "SUPER_ADMIN";
  }

  // Everyone who works at the manufacturing unit shares one portal: the same pages (dashboard, orders, queue,
  // design) and the same orders, whatever role they were given. Their role's own page list does not apply.
  const roleNorm = String(userObj.roleCode || userObj.role || "").toLowerCase();
  const isAdminLogin = ["admin", "super_admin", "superadmin", "internal_admin"].includes(roleNorm);
  if (homeBranch && !isAdminLogin) {
    const { isManufacturingUnitBranch } = require("../../branches/utils/manufacturingUnit");
    if (isManufacturingUnitBranch(homeBranch)) {
      const { MFG_PAGE_KEYS, pathsFor, linksFor } = require("../constants/pageCatalog");
      userObj.pageAccess = MFG_PAGE_KEYS;
      userObj.allowedPaths = pathsFor(MFG_PAGE_KEYS, { admin: false });
      userObj.pageLinks = linksFor(MFG_PAGE_KEYS, { admin: false });
      userObj.isMfgUnit = true;
      userObj.mfgUnitId = homeBranch._id;
    }
  }
  return userObj;
};

userSchema.statics.findByIdEnriched = async function (id) {
  const user = await this.findOne(this.buildIdQuery(id)).select("-password");
  return this.enrichUser(user);
};

userSchema.statics.findByEmailEnriched = async function (email) {
  if (!email || typeof email !== "string") return null;
  const user = await this.findOne({ email: new RegExp(`^${email.trim()}$`, "i") });
  return this.enrichUser(user);
};

// The signed-in user is cached by the auth middleware; drop the cached copy as soon as the user changes
const authCache = require("../../../utils/helpers/authCache");
userSchema.post("save", function (doc) {
  authCache.invalidateUser(doc && doc._id);
});
userSchema.post("findOneAndUpdate", function (doc) {
  if (doc) authCache.invalidateUser(doc._id);
  else authCache.invalidateAllUsers();
});
userSchema.post("findOneAndDelete", function (doc) {
  if (doc) authCache.invalidateUser(doc._id);
  else authCache.invalidateAllUsers();
});
["updateOne", "updateMany", "deleteOne", "deleteMany"].forEach((op) => {
  userSchema.post(op, function () {
    authCache.invalidateAllUsers();
  });
});

const User = mongoose.models.User || mongoose.model("User", userSchema, "users");

module.exports = User;

