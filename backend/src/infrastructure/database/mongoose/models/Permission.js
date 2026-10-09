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

module.exports = mongoose.model("Permission", PermissionSchema);
