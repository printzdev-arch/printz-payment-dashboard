const mongoose = require("mongoose");

/**
 * Sale Item Sub-schema
 */
const saleItemSchema = new mongoose.Schema(
  {
    itemID: {
      type: String,
      required: [true, "Item ID is required"],
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
  },
  { _id: false }
);

/**
 * Sale Mongoose Schema
 */
const saleSchema = new mongoose.Schema(
  {
    branchID: {
      type: String,
      required: [true, "Branch ID is required"],
      trim: true,
      index: true,
    },
    branchName: {
      type: String,
      required: [true, "Branch name is required"],
      trim: true,
      index: true,
    },
    managerID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Manager ID is required"],
      index: true,
    },
    invoiceNo: {
      type: String,
      required: [true, "Invoice number is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    date: {
      type: String,
      required: [true, "Date is required"],
      trim: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"],
      index: true,
    },
    itemsSold: {
      type: [saleItemSchema],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "Sale must contain at least one item",
      },
    },
    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
      min: [0, "Subtotal cannot be negative"],
    },
    gst: {
      type: Number,
      required: [true, "GST is required"],
      min: [0, "GST cannot be negative"],
    },
    grandTotal: {
      type: Number,
      required: [true, "Grand total is required"],
      min: [0, "Grand total cannot be negative"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending", "Cancelled"],
      default: "Paid",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        return {
          id: ret._id ? ret._id.toString() : ret._id,
          _id: ret._id,
          branchID: ret.branchID,
          branchName: ret.branchName,
          managerID: ret.managerID,
          invoiceNo: ret.invoiceNo,
          date: ret.date,
          itemsSold: ret.itemsSold || [],
          subtotal: ret.subtotal,
          gst: ret.gst,
          grandTotal: ret.grandTotal,
          totalAmount: ret.totalAmount,
          paymentStatus: ret.paymentStatus,
          createdAt: ret.createdAt,
          updatedAt: ret.updatedAt,
          timestamp: ret.createdAt,
        };
      },
    },
  }
);

saleSchema.index({ branchName: 1, date: -1 });
saleSchema.index({ branchID: 1, date: -1 });
saleSchema.index({ createdAt: -1 });

const Sale = mongoose.model("Sale", saleSchema, "sales");

module.exports = Sale;
