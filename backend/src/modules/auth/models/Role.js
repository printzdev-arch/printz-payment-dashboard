const mongoose = require("mongoose");

const RoleGrantSchema = new mongoose.Schema(
  {
    permissionCode: { type: String, default: null },
    permissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Permission",
      default: null,
    },
    scope: {
      type: String,
      enum: ["ALL", "BRANCH", "ASSIGNED", "SELF"],
      default: "BRANCH",
    },
  },
  { _id: false }
);

const RoleSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Role code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Role name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    grants: [RoleGrantSchema],
    isSystem: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "roles",
  }
);

RoleSchema.plugin(require("../../../utils/AuthCache").invalidationPlugin);

// Used by permission middleware on every protected request
RoleSchema.index({ code: 1, isActive: 1 });

module.exports = mongoose.models.Role || mongoose.model("Role", RoleSchema);
