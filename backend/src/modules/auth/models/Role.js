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
    // Menu items (keys from constants/pageCatalog.js) this role may open. Left unset on older roles, which
    // means "no page restriction"; an empty list means the role has no pages and so cannot sign in.
    pageAccess: { type: [String], default: undefined },
    // What the role may do on each page ({ pageKey: ["view", "create", "edit", "delete"] }). A page that is not listed
    // here keeps every action, so older roles are unchanged until someone sets their actions.
    pageActions: { type: mongoose.Schema.Types.Mixed, default: undefined },
    // Can people with this role have a login? Left unset on older roles, where it is worked out from pageAccess
    // (and the Operator rule). When false, the role has no pages and its people cannot sign in.
    loginAllowed: { type: Boolean, default: undefined },
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

// Role grants are cached by the permission middleware; clear them whenever a role changes
const authCache = require("../../../utils/helpers/authCache");
["save", "findOneAndUpdate", "findOneAndDelete", "updateOne", "updateMany", "deleteOne", "deleteMany", "insertMany"].forEach((op) => {
  RoleSchema.post(op, function () {
    authCache.invalidateRoles();
  });
});

module.exports = mongoose.models.Role || mongoose.model("Role", RoleSchema);
