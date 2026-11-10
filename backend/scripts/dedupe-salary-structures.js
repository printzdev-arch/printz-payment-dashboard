/**
 * Cleans up duplicate salary structures.
 *
 * Assigning a salary structure used to add a new active record each time without ending the
 * previous one, so an employee could end up with several identical active structures.
 * For each employee, active structures that start on the same day are collapsed to the newest
 * one; the older copies are switched off (isActive = false, a note added). Nothing is deleted,
 * so a copy can be switched back on if needed. Payroll already used the newest, so pay is unchanged.
 *
 * Usage:
 *   node scripts/dedupe-salary-structures.js            # dry run, changes nothing
 *   node scripts/dedupe-salary-structures.js --apply    # switches the older copies off
 */
require("dotenv").config();
const path = require("path");
const mongoose = require("mongoose");

const Structure = require(path.join(__dirname, "../src/modules/salary/models/EmployeeSalaryStructure"));
const Employee = require(path.join(__dirname, "../src/modules/employees/models/Employee"));

const APPLY = process.argv.includes("--apply");
const day = (d) => new Date(d).toISOString().slice(0, 10);

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/printz";
  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${APPLY ? "APPLY (will write)" : "DRY RUN (no changes)"}\n`);

  const active = await Structure.find({ isActive: true }).sort({ createdAt: -1, _id: -1 }).lean();
  const names = {};
  (await Employee.find({}).select("employeeCode name").lean()).forEach((e) => {
    names[String(e._id)] = `${e.employeeCode} ${e.name}`;
  });

  // Group by employee + start day; the list is newest first, so the first of each group is kept
  const groups = new Map();
  for (const s of active) {
    const key = `${String(s.employeeId)}|${day(s.effectiveFrom)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  let toSwitchOff = 0;
  const idsToSwitchOff = [];
  for (const [key, list] of groups) {
    if (list.length < 2) continue;
    const [keep, ...extras] = list;
    const who = names[String(keep.employeeId)] || String(keep.employeeId);
    console.log(`${who}, from ${day(keep.effectiveFrom)}: ${list.length} active records`);
    console.log(`  keep   ${String(keep._id)} (newest, salary ${keep.monthlySalary})`);
    extras.forEach((e) => {
      const sameSalary = Number(e.monthlySalary) === Number(keep.monthlySalary);
      console.log(`  switch off ${String(e._id)} (salary ${e.monthlySalary}${sameSalary ? "" : " - DIFFERENT from the kept one"})`);
      idsToSwitchOff.push(e._id);
      toSwitchOff += 1;
    });
  }

  if (toSwitchOff === 0) {
    console.log("No duplicate active structures found.");
  } else if (APPLY) {
    const res = await Structure.updateMany({ _id: { $in: idsToSwitchOff } }, { $set: { isActive: false } });
    // The note is appended per document so each keeps its own remarks
    for (const id of idsToSwitchOff) {
      const doc = await Structure.findById(id);
      doc.remarks = [doc.remarks, "Switched off as a duplicate of a newer structure with the same start date."].filter(Boolean).join(" ");
      await doc.save();
    }
    console.log(`\nSwitched off ${res.modifiedCount} duplicate record(s).`);
  } else {
    console.log(`\nDry run only: ${toSwitchOff} record(s) would be switched off. Run again with --apply.`);
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Failed:", err.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
