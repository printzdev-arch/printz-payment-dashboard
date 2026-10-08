const mongoose = require("mongoose");

const jobItemSchema = new mongoose.Schema(
  {
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      index: true,
    },
    lineNo: { type: Number, default: 1 },
    itemType: { type: String, default: "PRINT" },
    itemId: { type: mongoose.Schema.Types.Mixed, default: null },
    itemName: { type: String, required: true },
    description: { type: String, default: "" },
    quantity: { type: Number, required: true, default: 1 },
    unit: { type: String, default: "PCS" },
    unitRate: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    needsProduction: { type: Boolean, default: true },
    paperType: { type: String, default: "" },
    paperSize: { type: String, default: "" },
    printingType: { type: String, default: "" },
    colorMode: { type: String, default: "" },
    sides: { type: String, default: "SINGLE" },
    finishing: [
      {
        code: { type: String, required: true }, // e.g. LAMINATION, CUTTING, FOLDING, BINDING, CREASING, UV
        name: { type: String, default: "" },
        notes: { type: String, default: "" },
        sequence: { type: Number, default: 1 },
      },
    ],
    materials: [
      {
        itemId: { type: mongoose.Schema.Types.Mixed, default: null },
        itemName: { type: String, default: "" },
        quantity: { type: Number, default: 0 },
        unit: { type: String, default: "" },
      },
    ],
    specification: { type: String, default: "" },
    estimatedCost: { type: Number, default: 0 },
    estimatedPrice: { type: Number, default: 0 },
    productionQty: { type: Number, default: 0 },
    customerRequirements: { type: String, default: "" },
    remarks: { type: String, default: "" },
    approvedSample: {
      fileUrl: { type: String, default: null },
      thumbnailUrl: { type: String, default: null },
      comments: { type: String, default: "" },
      approvedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

jobItemSchema.index({ jobOrderId: 1, lineNo: 1 });

const JobItem = mongoose.models.JobItem || mongoose.model("JobItem", jobItemSchema, "jobItems");

module.exports = {
  JobItem,
  jobItemSchema,
};
