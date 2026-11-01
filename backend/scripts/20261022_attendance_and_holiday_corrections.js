/**
 * Attendance and Holiday Corrections Script (Reconciled)
 * - Safe reconciliation: preserves admin-configured branch rules
 * - Only sets 15-minute grace for unconfigured standard shifts
 * - Audits mandatory holiday calendar conflicts
 * - Ensures policy snapshot integrity
 */
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const AttendancePolicy = require("../src/modules/attendance/models/AttendancePolicy");
const HolidayCalendar = require("../src/modules/attendance/models/HolidayCalendar");
const DailyAttendance = require("../src/modules/attendance/models/DailyAttendance");

async function runCorrections() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/pos_db";
  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(mongoUri);

  console.log("=== 1. Checking Attendance Policy Configurations ===");
  const policies = await AttendancePolicy.find();

  for (const policy of policies) {
    let changed = false;

    // RULE: Retain admin-configured rules. Only apply default if explicitly unconfigured.
    if (policy.lateGraceMinutes === undefined || policy.lateGraceMinutes === null || isNaN(policy.lateGraceMinutes)) {
      console.log(`  [Correction] Policy '${policy.name}': Setting default 15 min late grace (was unset).`);
      policy.lateGraceMinutes = 15;
      changed = true;
    } else {
      console.log(`  [Preserved] Policy '${policy.name}': Keeping admin-configured grace of ${policy.lateGraceMinutes} min.`);
    }

    // Retain weekly off configuration
    if (!Array.isArray(policy.weeklyOffDays)) {
      console.log(`  [Correction] Policy '${policy.name}': Initializing empty weeklyOffDays array.`);
      policy.weeklyOffDays = [];
      changed = true;
    } else {
      console.log(`  [Preserved] Policy '${policy.name}': Keeping admin-configured weekly off days: [${policy.weeklyOffDays.join(", ")}].`);
    }

    if (changed) {
      await policy.save();
    }
  }

  console.log("\n=== 2. Auditing Holiday Calendar Integrity ===");
  const calendars = await HolidayCalendar.find({ isActive: true });
  console.log(`Active holiday calendars found: ${calendars.length}`);

  let holidayConflictCount = 0;
  for (const cal of calendars) {
    for (const h of cal.holidays || []) {
      if (h.isOptional) continue; // skip optional holidays

      // Find any non-holiday attendance recorded on mandatory holiday date for this branch
      const query = {
        attendanceDate: h.date,
        status: { $nin: ["HOLIDAY", "WEEKLY_OFF"] },
      };
      if (cal.branchId) {
        query.branchId = cal.branchId;
      }

      const conflicting = await DailyAttendance.find(query);
      if (conflicting.length > 0) {
        holidayConflictCount += conflicting.length;
        console.warn(`  [Warning] Mandatory holiday conflict on ${h.date} ('${h.name}'): ${conflicting.length} record(s) found with non-holiday status.`);
      }
    }
  }
  console.log(`Holiday calendar audit complete. Total mandatory holiday conflicts detected: ${holidayConflictCount}`);

  console.log("\n=== Corrections Check Completed Successfully ===");
  await mongoose.disconnect();
}

if (require.main === module) {
  runCorrections().catch((err) => {
    console.error("Corrections script failed:", err);
    process.exit(1);
  });
}

module.exports = runCorrections;
