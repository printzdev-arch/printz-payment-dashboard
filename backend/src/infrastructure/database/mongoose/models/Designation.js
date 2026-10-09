const mongoose = require("mongoose");

const DesignationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Designation name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Designation code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
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
    collection: "designations",
  }
);

module.exports = mongoose.model("Designation", DesignationSchema);
