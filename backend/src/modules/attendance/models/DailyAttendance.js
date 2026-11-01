const mongoose = require("mongoose");

const AttendancePermissionSchema = new mongoose.Schema(
  {
    permissionId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "AttendancePermission",
      default: null,
    },
    durationHours: {
      type: Number,
      min: [0, "Permission duration cannot be negative"],
      max: [24, "Permission duration cannot exceed 24 hours"],
      default: 0,
    },
    startTime: {
      type: String,
      default: null,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Permission start time must be in HH:mm format"],
    },
    endTime: {
      type: String,
      default: null,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Permission end time must be in HH:mm format"],
    },
    reason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const AttendancePolicySnapshotSchema = new mongoose.Schema(
  {
    policyId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "AttendancePolicy",
      default: null,
    },
    name: { type: String, default: "" },
    code: { type: String, default: "" },
    workingHoursPerDay: { type: Number, default: 8 },
    shiftStartTime: { type: String, default: "09:00" },
    shiftEndTime: { type: String, default: "18:00" },
    lateGraceMinutes: { type: Number, default: 15 },
    earlyCheckoutGraceMinutes: { type: Number, default: 0 },
    breakDurationMinutes: { type: Number, default: 60 },
    halfDayHours: { type: Number, default: 4 },
    fullDayHours: { type: Number, default: 8 },
    weeklyOffDays: { type: [Number], default: [] },
    monthlyLeaveAllowance: { type: Number, default: 4 },
    overtimeEnabled: { type: Boolean, default: true },
    snapshotAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DailyAttendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Employee",
      required: [true, "Employee ID is required"],
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Branch",
      required: [true, "Branch ID is required"],
      index: true,
    },
    attendanceDate: {
      type: String,
      required: [true, "Attendance date is required (YYYY-MM-DD)"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Attendance date must be in YYYY-MM-DD format"],
      index: true,
    },
    attendancePolicyId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "AttendancePolicy",
      default: null,
      index: true,
    },
    policySnapshot: {
      type: AttendancePolicySnapshotSchema,
      default: null,
    },
    holidayCalendarId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "HolidayCalendar",
      default: null,
      index: true,
    },
    checkIn: {
      type: String,
      default: null,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Check-in time must be in HH:mm format"],
    },
    checkOut: {
      type: String,
      default: null,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Check-out time must be in HH:mm format"],
    },
    workingHoursPerDay: {
      type: Number,
      min: [0, "Working hours cannot be negative"],
      max: [24, "Working hours cannot exceed 24"],
      default: 0,
    },
    paidWorkingHours: {
      type: Number,
      min: [0, "Paid working hours cannot be negative"],
      max: [24, "Paid working hours cannot exceed 24"],
      default: 0,
    },
    status: {
      type: String,
      enum: ["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE", "HOLIDAY", "WEEKLY_OFF", "PENDING"],
      required: [true, "Attendance status is required"],
      index: true,
    },
    source: {
      type: String,
      enum: ["WEB_MOBILE", "MANAGER_APP", "MANUAL", "SYSTEM"],
      default: "WEB_MOBILE",
      index: true,
    },
    lateArrival: {
      type: Boolean,
      default: false,
    },
    lateMinutes: {
      type: Number,
      min: [0, "Late minutes cannot be negative"],
      default: 0,
    },
    earlyCheckout: {
      type: Boolean,
      default: false,
    },
    earlyCheckoutMinutes: {
      type: Number,
      min: [0, "Early checkout minutes cannot be negative"],
      default: 0,
    },
    permission: {
      type: AttendancePermissionSchema,
      default: null,
    },
    permissions: {
      type: [AttendancePermissionSchema],
      default: [],
    },
    // Salary treatment of an ON_LEAVE day. Payroll cannot infer this from the
    // status alone, so it is required whenever status is ON_LEAVE.
    leavePaymentType: {
      type: String,
      enum: ["PAID", "UNPAID", null],
      default: null,
    },
    // Legacy field preserved for historical records; no longer written in new workflow
    leaveTypeId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
    },
    overtimeHours: {
      type: Number,
      min: [0, "Overtime hours cannot be negative"],
      default: 0,
    },
    overtimeStatus: {
      type: String,
      enum: ["NONE", "PENDING", "APPROVED", "REJECTED"],
      default: "NONE",
      index: true,
    },
    overtimeApprovedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
    overtimeApprovedAt: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
    calculationStatus: {
      type: String,
      enum: ["CALCULATED", "MANUAL_OVERRIDE", "PENDING", "FAILED"],
      default: "CALCULATED",
      index: true,
    },
    calculatedAt: {
      type: Date,
      default: null,
    },
    // Finalization & Locking Support
    isLocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    lockedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
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
    collection: "dailyattendances",
  }
);

// Compound Unique Indexes: Prevent duplicate daily attendance for same employee and date
DailyAttendanceSchema.index(
  { employeeId: 1, attendanceDate: 1 },
  { unique: true }
);
DailyAttendanceSchema.index(
  { employeeId: 1, branchId: 1, attendanceDate: 1 },
  { unique: true }
);

// Performance Query Indexes
DailyAttendanceSchema.index({ branchId: 1, attendanceDate: 1 });
DailyAttendanceSchema.index({ attendanceDate: 1, status: 1 });
DailyAttendanceSchema.index({ branchId: 1, status: 1, attendanceDate: 1 });

module.exports = mongoose.models.DailyAttendance || mongoose.model("DailyAttendance", DailyAttendanceSchema);
