const mongoose = require("mongoose");
const { validateStrictDate } = require("../../../utils/helpers/attendanceDateUtils");

const HolidayItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Holiday name is required"],
      trim: true,
    },
    date: {
      type: String,
      required: [true, "Holiday date is required"],
      trim: true,
      validate: {
        validator: function (v) {
          const parent = typeof this.ownerDocument === "function" ? this.ownerDocument() : null;
          const parentYear = parent ? parent.year : null;
          const res = validateStrictDate(v, parentYear, { rejectPast: false });
          if (!res.isValid) {
            throw new Error(res.error);
          }
          return true;
        },
      },
    },
    type: {
      type: String,
      enum: ["PUBLIC", "FESTIVAL", "OPTIONAL", "COMPANY"],
      default: "PUBLIC",
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    isOptional: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const HolidayCalendarSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Calendar name is required"],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, "Calendar year is required"],
      min: [2000, "Year must be 2000 or later"],
      max: [2100, "Year cannot exceed 2100"],
      index: true,
    },
    // branchId: null or undefined represents organization-wide default holiday calendar
    branchId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Branch",
      default: null,
      index: true,
    },
    holidays: {
      type: [HolidayItemSchema],
      default: [],
      validate: [
        {
          validator: function (holidays) {
            const dates = new Set();
            for (const h of holidays) {
              if (dates.has(h.date)) {
                throw new Error(`Duplicate holiday date '${h.date}' found in calendar entries.`);
              }
              dates.add(h.date);
            }
            return true;
          },
        },
        {
          validator: function (holidays) {
            if (!this.year) return true;
            for (const h of holidays) {
              const res = validateStrictDate(h.date, this.year, { rejectPast: false });
              if (!res.isValid) {
                throw new Error(res.error);
              }
            }
            return true;
          },
        },
      ],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "holidaycalendars",
  }
);

// Indexes
HolidayCalendarSchema.index({ year: 1, branchId: 1 });
HolidayCalendarSchema.index({ branchId: 1, isActive: 1 });

module.exports = mongoose.models.HolidayCalendar || mongoose.model("HolidayCalendar", HolidayCalendarSchema);
