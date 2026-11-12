/**
 * One-time cleanup: weekly off days now live ONLY on the attendance policy
 * (attendancepolicies.weeklyOffDays). This removes the old `weeklyOffDays` field from every
 * document in the `branches` collection.
 *
 * Usage (from the backend folder):
 *   node scripts/removeBranchWeeklyOff.js            # dry run: only reports what would change
 *   node scripts/removeBranchWeeklyOff.js --apply    # actually removes the field
 *
 * The dry run also lists branches that have weekly offs saved but no active attendance policy,
 * because their weekly offs will be lost; create a policy for them first if they matter.
 */
const mongoose = require("mongoose");
const { MONGODB_URI } = require("../src/config/env");

const apply = process.argv.includes("--apply");

(async () => {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(`[remove-branch-weekly-off] Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

  const branches = db.collection("branches");
  const policies = db.collection("attendancepolicies");

  const withField = await branches.find({ weeklyOffDays: { $exists: true } }).project({ name: 1, code: 1, weeklyOffDays: 1 }).toArray();
  console.log(`Branches that still have weeklyOffDays: ${withField.length}`);

  for (const b of withField) {
    const hasPolicy = await policies.countDocuments({ branchId: b._id, isActive: { $ne: false } });
    const note = hasPolicy ? "" : "  <-- no active attendance policy, weekly offs will be lost";
    console.log(` - ${b.name} (${b.code}): ${JSON.stringify(b.weeklyOffDays)}${note}`);
  }

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to remove the field.");
  } else {
    const res = await branches.updateMany({ weeklyOffDays: { $exists: true } }, { $unset: { weeklyOffDays: "" } });
    console.log(`Removed weeklyOffDays from ${res.modifiedCount} branch document(s).`);
  }

  await mongoose.disconnect();
})().catch(async (err) => {
  console.error("[remove-branch-weekly-off] Failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
