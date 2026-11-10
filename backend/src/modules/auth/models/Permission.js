const mongoose = require("mongoose");

const PermissionSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.Mixed },
    code: { type: String, required: true, unique: true, index: true },
    module: { type: String, required: true, index: true },
    description: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    collection: "permissions",
  }
);

// Role grants (which include permissions) are cached by the permission middleware; clear them on any change
const authCache = require("../../../utils/helpers/authCache");
["save", "findOneAndUpdate", "findOneAndDelete", "updateOne", "updateMany", "deleteOne", "deleteMany", "insertMany"].forEach((op) => {
  PermissionSchema.post(op, function () {
    authCache.invalidateRoles();
  });
});

module.exports = mongoose.model("Permission", PermissionSchema);
