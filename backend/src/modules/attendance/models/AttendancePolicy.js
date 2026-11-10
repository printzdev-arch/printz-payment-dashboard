const mongoose = require("mongoose");

const AttendancePolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Policy name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Policy code is required"],
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    // branchId: null or undefined signifies organization-wide default policy
    branchId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Branch",
      default: null,
      index: true,
    },
    workingHoursPerDay: {
      type: Number,
      required: [true, "Working hours per day is required"],
      min: [1, "Working hours per day must be at least 1"],
      max: [24, "Working hours cannot exceed 24"],
      default: 8,
    },
    shiftStartTime: {
      type: String,
      required: [true, "Shift start time is required (HH:mm)"],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Shift start time must be in HH:mm format"],
      default: "09:00",
    },
    shiftEndTime: {
      type: String,
      required: [true, "Shift end time is required (HH:mm)"],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Shift end time must be in HH:mm format"],
      default: "18:00",
    },
    lateGraceMinutes: {
      type: Number,
      min: [0, "Late grace minutes cannot be negative"],
      max: [180, "Late grace minutes cannot exceed 180"],
      default: 15,
    },
    earlyCheckoutGraceMinutes: {
      type: Number,
      min: [0, "Early checkout grace minutes cannot be negative"],
      max: [180, "Early checkout grace minutes cannot exceed 180"],
      default: 0,
    },
    breakDurationMinutes: {
      type: Number,
      min: [0, "Break duration minutes cannot be negative"],
      max: [300, "Break duration minutes cannot exceed 300"],
      default: 60,
    },
    halfDayHours: {
      type: Number,
      required: [true, "Half day hours threshold is required"],
      min: [0.5, "Half day threshold must be at least 0.5 hours"],
      max: [24, "Half day threshold cannot exceed 24 hours"],
      default: 4,
    },
    fullDayHours: {
      type: Number,
      required: [true, "Full day hours threshold is required"],
      min: [1, "Full day threshold must be at least 1 hour"],
      max: [24, "Full day threshold cannot exceed 24 hours"],
      default: 8,
    },
    // Numeric array from 0 to 6 (0=Sunday, 6=Saturday). Default empty: 7-day working week.
    weeklyOffDays: {
      type: [Number],
      default: [], // Default empty: No automatic weekly off, Sunday is a workday
      validate: {
        validator: (arr) => arr.every((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        message: "Weekly off days must be integers between 0 (Sunday) and 6 (Saturday)",
      },
    },
    // Seven-day working week support
    workingDays: {
      type: [String],
      default: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
    },
    // Monthly leave allowance (default 4 days per calendar month)
    monthlyLeaveAllowance: {
      type: Number,
      min: [0, "Monthly leave allowance cannot be negative"],
      max: [31, "Monthly leave allowance cannot exceed 31 days"],
      default: 4,
    },
    // Overtime tracking enabled by default
    overtimeEnabled: {
      type: Boolean,
      default: true,
    },
    permissionEnabled: {
      type: Boolean,
      default: true,
    },
    maxPermissionHoursPerDay: {
      type: Number,
      default: 2,
    },
    maxPermissionHoursPerMonth: {
      type: Number,
      default: 4,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Audit fields
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
    collection: "attendancepolicies",
  }
);

// Indexes
AttendancePolicySchema.index({ branchId: 1, isActive: 1 });

// Helper method to resolve unified effective values
AttendancePolicySchema.methods.getEffectiveConfig = function () {
  const shiftStart = this.shiftStartTime || "09:00";
  const shiftEnd = this.shiftEndTime || "18:00";
  const workingHours = this.workingHoursPerDay || 8;
  const halfDay = this.halfDayHours || 4;
  const fullDay = this.fullDayHours || 8;
  const monthlyLeave = this.monthlyLeaveAllowance !== undefined && this.monthlyLeaveAllowance !== null
    ? this.monthlyLeaveAllowance
    : 4;
  const overtime = this.overtimeEnabled !== undefined ? this.overtimeEnabled : true;

  // 7-day working week: weeklyOffDays defaults to [] (no automatic Sunday off)
  let weeklyOffs = [];
  if (Array.isArray(this.weeklyOffDays)) {
    weeklyOffs = this.weeklyOffDays;
  } else if (Array.isArray(this.workingDays) && this.workingDays.length > 0) {
    const dayMap = { SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6 };
    const workingIndices = new Set(this.workingDays.map((d) => dayMap[String(d).toUpperCase()]).filter((idx) => idx !== undefined));
    weeklyOffs = [0, 1, 2, 3, 4, 5, 6].filter((i) => !workingIndices.has(i));
  }

  return {
    _id: this._id,
    name: this.name,
    code: this.code,
    description: this.description || "",
    branchId: this.branchId,
    workingHoursPerDay: workingHours,
    shiftStartTime: shiftStart,
    shiftEndTime: shiftEnd,
    lateGraceMinutes: Number.isFinite(Number(this.lateGraceMinutes)) ? Number(this.lateGraceMinutes) : 15,
    earlyCheckoutGraceMinutes: Number.isFinite(Number(this.earlyCheckoutGraceMinutes)) ? Number(this.earlyCheckoutGraceMinutes) : 0,
    breakDurationMinutes: Number.isFinite(Number(this.breakDurationMinutes)) ? Number(this.breakDurationMinutes) : 60,
    halfDayHours: halfDay,
    fullDayHours: fullDay,
    weeklyOffDays: weeklyOffs,
    monthlyLeaveAllowance: monthlyLeave,
    overtimeEnabled: overtime,
    permissionEnabled: this.permissionEnabled !== undefined ? Boolean(this.permissionEnabled) : true,
    maxPermissionHoursPerDay: Number(this.maxPermissionHoursPerDay) || 2,
    maxPermissionHoursPerMonth: Number(this.maxPermissionHoursPerMonth) || 4,
    workingDays: this.workingDays && this.workingDays.length > 0 ? this.workingDays : ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"],
    isActive: Boolean(this.isActive),
  };
};

module.exports = mongoose.models.AttendancePolicy || mongoose.model("AttendancePolicy", AttendancePolicySchema);
