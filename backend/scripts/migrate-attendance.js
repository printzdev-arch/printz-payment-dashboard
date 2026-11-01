/**
 * Attendance Migration Script (Reconciled)
 * - Preserves admin-configured branch rules (custom late grace, weekly offs)
 * - Defaults unconfigured standard shifts to 15-minute late grace
 * - Backfills policySnapshot, lateMinutes, earlyCheckoutMinutes, and permissions array
 */
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const AttendancePolicy = require("../src/modules/attendance/models/AttendancePolicy");
const DailyAttendance = require("../src/modules/attendance/models/DailyAttendance");
const Employee = require("../src/modules/employees/models/Employee");
const AttendanceCalculationService = require("../src/modules/attendance/services/attendanceCalculation.service");

async function runMigration() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/pos_db";
  console.log(`Connecting to MongoDB at: ${mongoUri.replace(/:([^:@]{3,})@/, ":***@")}`);
  await mongoose.connect(mongoUri);

  console.log("=== Step 1: Reconciling Attendance Policies ===");
  const policies = await AttendancePolicy.find();
  let policiesUpdated = 0;

  for (const policy of policies) {
    let modified = false;

    // Preserve admin-configured grace period; if null/undefined, default standard shift to 15
    if (policy.lateGraceMinutes === undefined || policy.lateGraceMinutes === null || isNaN(policy.lateGraceMinutes)) {
      policy.lateGraceMinutes = 15;
      modified = true;
      console.log(`  [Policy] Set default 15m late grace for unconfigured policy: '${policy.name}' (${policy.code})`);
    } else {
      console.log(`  [Policy] Retained admin-configured ${policy.lateGraceMinutes}m late grace for: '${policy.name}'`);
    }

    // Preserve admin-configured weekly offs
    if (policy.weeklyOffDays === undefined || policy.weeklyOffDays === null) {
      policy.weeklyOffDays = [];
      modified = true;
    } else {
      console.log(`  [Policy] Retained admin-configured weekly off days [${policy.weeklyOffDays.join(",")}] for: '${policy.name}'`);
    }

    if (policy.earlyCheckoutGraceMinutes === undefined || policy.earlyCheckoutGraceMinutes === null) {
      policy.earlyCheckoutGraceMinutes = 0;
      modified = true;
    }

    if (modified) {
      await policy.save();
      policiesUpdated++;
    }
  }
  console.log(`Policies checked: ${policies.length}, policies updated: ${policiesUpdated}\n`);

  console.log("=== Step 2: Backfilling Daily Attendance Snapshots & Durations ===");
  const records = await DailyAttendance.find().populate("attendancePolicyId");
  let recordsUpdated = 0;

  for (const rec of records) {
    let modified = false;
    const policy = rec.attendancePolicyId;

    // 1. Backfill policySnapshot if missing
    if (!rec.policySnapshot && policy) {
      rec.policySnapshot = {
        policyId: policy._id,
        name: policy.name || "",
        code: policy.code || "",
        workingHoursPerDay: Number(policy.workingHoursPerDay) || 8,
        shiftStartTime: policy.shiftStartTime || "09:00",
        shiftEndTime: policy.shiftEndTime || "18:00",
        lateGraceMinutes: Number(policy.lateGraceMinutes) || 0,
        earlyCheckoutGraceMinutes: Number(policy.earlyCheckoutGraceMinutes) || 0,
        breakDurationMinutes: Number(policy.breakDurationMinutes) || 0,
        halfDayHours: Number(policy.halfDayHours) || 4,
        fullDayHours: Number(policy.fullDayHours) || 8,
        weeklyOffDays: Array.isArray(policy.weeklyOffDays) ? policy.weeklyOffDays : [],
        monthlyLeaveAllowance: Number(policy.monthlyLeaveAllowance) || 0,
        overtimeEnabled: Boolean(policy.overtimeEnabled),
        snapshotAt: rec.createdAt || new Date(),
      };
      modified = true;
    }

    const effectivePolicy = rec.policySnapshot || policy || {
      shiftStartTime: "09:00",
      shiftEndTime: "18:00",
      lateGraceMinutes: 15,
      earlyCheckoutGraceMinutes: 0,
    };

    // 2. Backfill lateMinutes if missing
    if ((rec.lateMinutes === undefined || rec.lateMinutes === null) && rec.checkIn) {
      if (rec.lateArrival) {
        rec.lateMinutes = AttendanceCalculationService.calculateLateMinutes(
          rec.checkIn,
          effectivePolicy.shiftStartTime,
          effectivePolicy.lateGraceMinutes
        );
      } else {
        rec.lateMinutes = 0;
      }
      modified = true;
    }

    // 3. Backfill earlyCheckoutMinutes if missing
    if ((rec.earlyCheckoutMinutes === undefined || rec.earlyCheckoutMinutes === null) && rec.checkOut) {
      if (rec.earlyCheckout) {
        rec.earlyCheckoutMinutes = AttendanceCalculationService.calculateEarlyCheckoutMinutes(
          rec.checkOut,
          effectivePolicy.shiftStartTime,
          effectivePolicy.shiftEndTime,
          effectivePolicy.earlyCheckoutGraceMinutes
        );
      } else {
        rec.earlyCheckoutMinutes = 0;
      }
      modified = true;
    }

    // 4. Backfill permissions array if legacy single permission subdocument is present
    if (rec.permission && (!rec.permissions || rec.permissions.length === 0) && rec.permission.durationHours > 0) {
      rec.permissions = [
        {
          startTime: rec.permission.startTime,
          endTime: rec.permission.endTime,
          durationHours: rec.permission.durationHours,
          reason: rec.permission.reason || "",
        },
      ];
      modified = true;
    }

    if (modified) {
      await rec.save();
      recordsUpdated++;
    }
  }

  console.log(`Records checked: ${records.length}, records updated with snapshots/durations: ${recordsUpdated}`);
  console.log("=== Migration Completed Successfully ===");
  await mongoose.disconnect();
}

if (require.main === module) {
  runMigration().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}

module.exports = runMigration;
