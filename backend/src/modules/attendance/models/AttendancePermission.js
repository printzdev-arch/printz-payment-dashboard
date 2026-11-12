const mongoose = require("mongoose");

const AttendancePermissionSchema = new mongoose.Schema(
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
    attendancePolicyId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "AttendancePolicy",
      required: [true, "Attendance policy ID is required"],
      index: true,
    },
    permissionDate: {
      type: String,
      required: [true, "Permission date is required (YYYY-MM-DD)"],
      match: [/^\d{4}-\d{2}-\d{2}$/, "Permission date must be in YYYY-MM-DD format"],
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: [true, "Permission start time is required (HH:mm)"],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Permission start time must be in HH:mm format (00:00 - 23:59)"],
    },
    endTime: {
      type: String,
      required: [true, "Permission end time is required (HH:mm)"],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, "Permission end time must be in HH:mm format (00:00 - 23:59)"],
    },
    durationHours: {
      type: Number,
      required: [true, "Permission duration in hours is required"],
      min: [0.01, "Permission duration must be greater than 0"],
      max: [24, "Permission duration cannot exceed 24 hours"],
    },
    requestedHours: {
      type: Number,
      required: [true, "Requested permission hours is required"],
      min: [0.01, "Requested permission hours must be greater than 0"],
      max: [24, "Requested permission hours cannot exceed 24 hours"],
    },
    reason: {
      type: String,
      required: [true, "Reason for permission is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["APPROVED", "CANCELLED", "PENDING", "REJECTED"],
      default: "APPROVED",
      index: true,
    },

    // Dynamic Balance Snapshots for Display & Audit
    monthlyAllowanceHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    usedHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    reservedHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingHours: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Approval Lifecycle & Audit Fields
    approvedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
      trim: true,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
      trim: true,
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
    collection: "attendancepermissions",
  }
);

// Performance & Query Indexes
AttendancePermissionSchema.index({ employeeId: 1, year: 1, month: 1, status: 1 });
AttendancePermissionSchema.index({ employeeId: 1, permissionDate: 1, status: 1 });
AttendancePermissionSchema.index({ branchId: 1, permissionDate: 1 });
AttendancePermissionSchema.index({ branchId: 1, status: 1, permissionDate: 1 });
// Permission list is ordered by date then creation time
AttendancePermissionSchema.index({ permissionDate: -1, createdAt: -1 });
AttendancePermissionSchema.index({ branchId: 1, permissionDate: -1, createdAt: -1 });

module.exports =
  mongoose.models.AttendancePermission ||
  mongoose.model("AttendancePermission", AttendancePermissionSchema);
