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

module.exports = mongoose.model("Role", RoleSchema);
