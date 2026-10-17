const mongoose = require("mongoose");
const passwordService = require("../utils/BcryptPasswordService");

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

  if (userObj.employeeId) {
    const Employee = require("./Employee");
    const employee = await Employee.findById(userObj.employeeId)
      .populate("roleId", "code name grants")
      .populate("branchId", "name code location")
      .lean();

    if (employee) {
      userObj.employee = employee;

      if (employee.branchId) {
        let branchDoc = employee.branchId;
        const bId = branchDoc._id || branchDoc;
        userObj.branchId = bId;
        userObj.branchIds = [bId];

        if (!branchDoc.name && mongoose.Types.ObjectId.isValid(bId)) {
          const Branch = require("./Branch");
          branchDoc = (await Branch.findById(bId).lean()) || {};
        }

        if (branchDoc.name) {
          userObj.branch = branchDoc.name;
        }
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
  } else if (!userObj.branch && userObj.branchId) {
    const Branch = require("./Branch");
    const bId = userObj.branchId;
    if (mongoose.Types.ObjectId.isValid(bId)) {
      const b = await Branch.findById(bId).lean();
      if (b) userObj.branch = b.name;
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

const User = mongoose.models.User || mongoose.model("User", userSchema, "users");

module.exports = User;

