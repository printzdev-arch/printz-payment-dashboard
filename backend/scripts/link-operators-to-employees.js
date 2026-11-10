/**
 * Links existing production operators to Employee records.
 *
 * Matching (same branch when both have one):
 *   1. the operator's phone equals the employee's mobile (digits only), else
 *   2. the operator's name equals the employee's name (case-insensitive).
 * A match is only used when it is unambiguous: exactly one employee fits, and that
 * employee is not already linked to another operator.
 *
 * Usage:
 *   node scripts/link-operators-to-employees.js            # dry run, changes nothing
 *   node scripts/link-operators-to-employees.js --apply    # writes the links
 *
 * Operators it cannot match are listed so they can be created as employees in the
 * Employees screen and linked from the Operators screen.
 */
require("dotenv").config();
const path = require("path");
const mongoose = require("mongoose");

const ProductionOperator = require(path.join(__dirname, "../src/modules/production/models/ProductionOperator"));
const Employee = require(path.join(__dirname, "../src/modules/employees/models/Employee"));

const APPLY = process.argv.includes("--apply");
const digits = (v) => String(v || "").replace(/\D/g, "");
const norm = (v) => String(v || "").trim().replace(/\s+/g, " ").toLowerCase();
const idStr = (v) => (v && v._id ? String(v._id) : v ? String(v) : "");

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/printz";
  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${APPLY ? "APPLY (will write)" : "DRY RUN (no changes)"}\n`);

  const operators = await ProductionOperator.find({ $or: [{ employeeId: null }, { employeeId: { $exists: false } }] }).lean();
  const employees = await Employee.find({ isActive: { $ne: false }, employmentStatus: "ACTIVE" }).lean();
  const alreadyLinked = new Set(
    (await ProductionOperator.find({ employeeId: { $type: "objectId" } }).select("employeeId").lean()).map((o) => String(o.employeeId))
  );

  console.log(`Unlinked operators: ${operators.length} | Active employees: ${employees.length}\n`);

  const sameBranch = (op, emp) => !op.branchId || !emp.branchId || idStr(op.branchId) === idStr(emp.branchId);
  const claimed = new Set(alreadyLinked);
  const linked = [];
  const ambiguous = [];
  const unmatched = [];

  for (const op of operators) {
    const free = employees.filter((e) => !claimed.has(String(e._id)) && sameBranch(op, e));
    const byPhone = digits(op.phone).length >= 7 ? free.filter((e) => digits(e.mobile) === digits(op.phone)) : [];
    const byName = free.filter((e) => norm(e.name) === norm(op.name));

    let pool = byPhone.length ? byPhone : byName;
    if (pool.length === 1) {
      const emp = pool[0];
      claimed.add(String(emp._id));
      linked.push({ op, emp, by: byPhone.length ? "phone" : "name" });
    } else if (pool.length > 1) {
      ambiguous.push({ op, candidates: pool });
    } else {
      unmatched.push(op);
    }
  }

  console.log(`Will link (${linked.length}):`);
  linked.forEach(({ op, emp, by }) => console.log(`  ${op.name} -> ${emp.employeeCode} ${emp.name} (matched by ${by})`));

  console.log(`\nAmbiguous, needs a manual choice (${ambiguous.length}):`);
  ambiguous.forEach(({ op, candidates }) =>
    console.log(`  ${op.name} (${op.phone || "no phone"}): ${candidates.map((c) => `${c.employeeCode} ${c.name}`).join(" | ")}`)
  );

  console.log(`\nNo matching employee (${unmatched.length}):`);
  unmatched.forEach((op) => console.log(`  ${op.name} (${op.phone || "no phone"})`));

  if (APPLY) {
    for (const { op, emp } of linked) {
      await ProductionOperator.updateOne({ _id: op._id }, { $set: { employeeId: emp._id } });
    }
    console.log(`\nLinked ${linked.length} operator(s).`);
  } else {
    console.log("\nDry run only. Run again with --apply to write these links.");
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
