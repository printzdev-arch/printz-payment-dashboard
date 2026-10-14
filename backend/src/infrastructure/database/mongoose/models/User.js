const mongoose = require("mongoose");
const passwordService = require("../../../auth/BcryptPasswordService");

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
    maxLoad: {
      type: Number,
      default: 5,
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

// Automatically handle string vs ObjectId queries when _id is defined as Mixed
const normalizeIdFilter = function () {
  const filter = this.getFilter();
  if (filter && filter._id && typeof filter._id === "string" && mongoose.Types.ObjectId.isValid(filter._id)) {
    filter.$or = [{ _id: filter._id }, { _id: new mongoose.Types.ObjectId(filter._id) }];
    delete filter._id;
  }
};

userSchema.pre(/^find/, normalizeIdFilter);
userSchema.pre("findOneAndUpdate", normalizeIdFilter);
userSchema.pre("updateOne", normalizeIdFilter);

userSchema.statics.findByIdFlexible = function (id) {
  if (!id) return Promise.resolve(null);
  const conditions = [{ _id: id }];
  if (typeof id === "string" && mongoose.Types.ObjectId.isValid(id)) {
    conditions.push({ _id: new mongoose.Types.ObjectId(id) });
  }
  return this.findOne({ $or: conditions });
};

const User = mongoose.model("User", userSchema, "users");

module.exports = User;
