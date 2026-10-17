const mongoose = require("mongoose");

/**
 * Product Model
 * Decoupled product catalog schema for POS & billing.
 * Interoperable with saleRate/price and InventoryItem mappings.
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      index: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    itemCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    saleRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    costPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      default: "NOS",
    },
    category: {
      type: String,
      default: "GENERAL",
    },
    isStockTracked: {
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
    collection: "products",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.pre("save", function (next) {
  if (this.saleRate === undefined && this.price !== undefined) {
    this.saleRate = this.price;
  } else if (this.price === undefined && this.saleRate !== undefined) {
    this.price = this.saleRate;
  }
  if (!this.itemCode && this.code) {
    this.itemCode = this.code;
  } else if (!this.code && this.itemCode) {
    this.code = this.itemCode;
  }
  next();
});

module.exports = mongoose.models.Product || mongoose.model("Product", productSchema);
