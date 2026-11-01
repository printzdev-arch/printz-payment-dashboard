/**
 * Payroll / attendance alignment check.
 *
 * Dry run by default: reports problems and writes nothing. Pass --apply to
 * make the changes listed below.
 *
 *   node scripts/20261024_payroll_attendance_alignment.js
 *   node scripts/20261024_payroll_attendance_alignment.js --apply
 *   node scripts/20261024_payroll_attendance_alignment.js --apply --leave-type=UNPAID
 *
 * 1. Weekly offs: the attendance policy is authoritative. With --apply, each
 *    branch's weeklyOffDays is set from its active branch policy.
 * 2. Branches without an active policy (and no global default) are reported:
 *    payroll will refuse to calculate for them until a policy exists.
 * 3. Active policies without workingHoursPerDay / monthlyLeaveAllowance are
 *    reported (never guessed).
 * 4. ON_LEAVE attendance without leavePaymentType is counted. It is only
 *    backfilled when --leave-type=PAID|UNPAID is passed, because the correct
 *    value is a business decision.
 */
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const AttendancePolicy = require("../src/modules/attendance/models/AttendancePolicy");
const DailyAttendance = require("../src/modules/attendance/models/DailyAttendance");
const Branch = require("../src/modules/branches/models/Branch");
const { sameSchedule, toNames } = require("../src/utils/weeklyOff.util");

const apply = process.argv.includes("--apply");
const leaveTypeArg = (process.argv.find((a) => a.startsWith("--leave-type=")) || "").split("=")[1];

async function main() {
  if (leaveTypeArg && !["PAID", "UNPAID"].includes(leaveTypeArg)) {
    throw new Error("--leave-type must be PAID or UNPAID");
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/pos_db";
  await mongoose.connect(mongoUri);
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN (no changes written)"}\n`);

  const branches = await Branch.find().lean();
  const policies = await AttendancePolicy.find({ isActive: true }).lean();
  const globalPolicy = policies.find((p) => !p.branchId);

  console.log("=== Weekly offs and policy coverage ===");
  for (const branch of branches) {
    const policy = policies.find((p) => String(p.branchId) === String(branch._id));
    const effective = policy || globalPolicy;

    if (!effective) {
      console.log(`  [NO POLICY] ${branch.name}: payroll will be blocked until an attendance policy exists.`);
      continue;
    }
    if (!policy) {
      console.log(`  [GLOBAL] ${branch.name}: uses global policy '${effective.name}'. Branch weekly offs: [${(branch.weeklyOffDays || []).join(", ")}]`);
      if ((branch.weeklyOffDays || []).length > 0 && !sameSchedule(branch.weeklyOffDays, effective.weeklyOffDays)) {
        console.log(`    -> MISMATCH with global policy [${toNames(effective.weeklyOffDays).join(", ")}]. Payroll will be blocked; clear the branch value or create a branch policy.`);
      }
      continue;
    }

    if (sameSchedule(branch.weeklyOffDays, policy.weeklyOffDays)) {
      console.log(`  [OK] ${branch.name}: [${toNames(policy.weeklyOffDays).join(", ")}]`);
    } else {
      const target = toNames(policy.weeklyOffDays);
      console.log(`  [MISMATCH] ${branch.name}: branch [${(branch.weeklyOffDays || []).join(", ")}] vs policy [${target.join(", ")}]${apply ? " -> branch updated from policy" : ""}`);
      if (apply) await Branch.updateOne({ _id: branch._id }, { $set: { weeklyOffDays: target } });
    }
  }

  console.log("\n=== Policies missing payroll values ===");
  let incomplete = 0;
  for (const p of policies) {
    const missing = [];
    if (!(Number(p.workingHoursPerDay || p.fullDayHours) > 0)) missing.push("workingHoursPerDay");
    if (p.monthlyLeaveAllowance === undefined || p.monthlyLeaveAllowance === null) missing.push("monthlyLeaveAllowance");
    if (missing.length) {
      incomplete++;
      console.log(`  [INCOMPLETE] ${p.name} (${p.code}): missing ${missing.join(", ")}. Set these in the policy; payroll will not guess them.`);
    }
  }
  if (!incomplete) console.log("  none");

  console.log("\n=== ON_LEAVE attendance without leavePaymentType ===");
  const untyped = await DailyAttendance.countDocuments({
    status: "ON_LEAVE",
    $or: [{ leavePaymentType: null }, { leavePaymentType: { $exists: false } }],
  });
  console.log(`  ${untyped} record(s)`);
  if (untyped > 0) {
    if (apply && leaveTypeArg) {
      const res = await DailyAttendance.updateMany(
        { status: "ON_LEAVE", $or: [{ leavePaymentType: null }, { leavePaymentType: { $exists: false } }] },
        { $set: { leavePaymentType: leaveTypeArg } }
      );
      console.log(`  backfilled ${res.modifiedCount} as ${leaveTypeArg}`);
    } else {
      console.log("  Payroll will refuse to calculate for affected employees. Set each record's leavePaymentType, or re-run with --apply --leave-type=PAID|UNPAID.");
    }
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
