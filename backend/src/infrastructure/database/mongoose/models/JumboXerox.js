const mongoose = require("mongoose");

const jumboXeroxSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Branch ID is required"],
      index: true,
    },
    printerId: {
      type: String,
      required: [true, "Printer ID is required"],
      trim: true,
      index: true,
    },
    printerRef: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    printerName: {
      type: String,
      required: [true, "Printer name is required"],
      trim: true,
    },
    size: {
      type: String,
      required: [true, "Size is required"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Type is required"],
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price must be greater than or equal to 0"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    clonedFrom: {
      type: String,
      default: null,
      trim: true,
    },
    movedFrom: {
      type: String,
      default: null,
      trim: true,
    },
    reason: {
      type: String,
      default: null,
      trim: true,
    },
    deactivatedAt: {
      type: Date,
      default: null,
    },
    updatedBy: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
    strict: true,
    toJSON: {
      virtuals: false,
      transform: (doc, ret) => {
        ret._id = ret._id ? ret._id.toString() : ret._id;
        ret.branchId = ret.branchId ? ret.branchId.toString() : ret.branchId;
        ret.printerRef = ret.printerRef ? ret.printerRef.toString() : ret.printerRef;
        delete ret.__v;
        delete ret.id;
        delete ret.legacyFirestoreId;
        delete ret.needsReview;
        delete ret.status;
        return ret;
      },
    },
  }
);

jumboXeroxSchema.index({ branchId: 1, printerId: 1 });

const JumboXerox = mongoose.model("JumboXerox", jumboXeroxSchema, "jumboXeroxPricing");

module.exports = JumboXerox;
