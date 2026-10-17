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
    jobItemId: { type: String, default: null },
    productType: { type: String, default: "" },
    designRequired: { type: Boolean, default: false },
    designNotes: { type: String, default: "" },
    size: { type: mongoose.Schema.Types.Mixed, default: null },
    printing: { type: mongoose.Schema.Types.Mixed, default: null },
    material: { type: mongoose.Schema.Types.Mixed, default: null },
    notes: { type: String, default: "" },
    needsProduction: { type: Boolean, default: true },
    paperType: { type: String, default: "" },
    paperSize: { type: String, default: "" },
    printingType: { type: String, default: "" },
    colorMode: { type: String, default: "" },
    sides: { type: String, default: "SINGLE" },
    finishing: [
      {
        code: { type: String, default: "FINISHING" },
        name: { type: String, default: "" },
        config: { type: String, default: "" },
        quantity: { type: Number, default: 0 },
        unitPrice: { type: Number, default: 0 },
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
    specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
    paperGsm: { type: String, default: "" },
    printingSide: { type: String, default: "SINGLE" },
    lamination: { type: String, default: "" },
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


jobItemSchema.statics.findByJobOrderId = async function (jobOrderId) {
  return this.find({ jobOrderId }).sort({ lineNo: 1 });
};

jobItemSchema.statics.update = async function (id, updateData) {
  return this.findByIdAndUpdate(id, { $set: updateData }, { new: true });
};

const JobItem = mongoose.models.JobItem || mongoose.model("JobItem", jobItemSchema, "jobItems");

module.exports = JobItem;
module.exports.JobItem = JobItem;
if (typeof jobItemSchema !== "undefined" && typeof JobItem !== "undefined" && jobItemSchema.statics) {
  Object.assign(JobItem, jobItemSchema.statics);
}

module.exports.jobItemSchema = jobItemSchema;
