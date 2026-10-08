const mongoose = require("mongoose");

const designerRatingSchema = new mongoose.Schema(
  {
    jobOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobOrder",
      required: [true, "Job Order ID is required"],
      index: true,
    },
    designerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Designer ID is required"],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    ratingSource: {
      type: String,
      enum: ["CUSTOMER", "MANAGER", "ADMIN"],
      required: [true, "Rating source is required"],
      index: true,
    },
    comments: {
      type: String,
      default: "",
      trim: true,
    },
    ratedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Rated By is required"],
    },
    ratedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

designerRatingSchema.index({ designerId: 1, ratedAt: -1 });
designerRatingSchema.index(
  { jobOrderId: 1, designerId: 1, ratingSource: 1 },
  { unique: true }
);

const DesignerRating = mongoose.model(
  "DesignerRating",
  designerRatingSchema,
  "designerRatings"
);

module.exports = DesignerRating;
