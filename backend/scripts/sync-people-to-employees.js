/**
 * Makes sure everyone who works here has an Employee record with the right role.
 *
 * Covers: admins, managers, designers, mfg managers and mfg designers who have a login, and
 * production operators (who do not log in). For each person it will
 *   - create an Employee when they have none (through the same code the Employees screen uses),
 *   - link the login (or operator) to that Employee,
 *   - set the role when the Employee has none, and
 *   - switch a "left" employee back on when their login is still active.
 * Only the logins on the keep list (scripts/keep-logins.js) are considered. Every other login is
 * listed and left alone, as are logins whose role is not admin / manager / designer / mfg.
 *
 * Nothing is deleted. Employees that already exist keep their data apart from the fixes above.
 *
 * Usage:
 *   node scripts/sync-people-to-employees.js                  # dry run, changes nothing
 *   node scripts/sync-people-to-employees.js --apply          # writes the changes
 * Options:
 *   --branch=<branchId>   branch to use for logins that have no branch (otherwise they are skipped)
 */
require("dotenv").config();
const path = require("path");
const mongoose = require("mongoose");

require(path.join(__dirname, "../src/modules/models"));
const User = require(path.join(__dirname, "../src/modules/auth/models/User"));
const Role = require(path.join(__dirname, "../src/modules/auth/models/Role"));
const Employee = require(path.join(__dirname, "../src/modules/employees/models/Employee"));
const EmployeeBranchAssignment = require(path.join(__dirname, "../src/modules/employees/models/EmployeeBranchAssignment"));
const ProductionOperator = require(path.join(__dirname, "../src/modules/production/models/ProductionOperator"));
const Branch = require(path.join(__dirname, "../src/modules/branches/models/Branch"));
const employeeService = require(path.join(__dirname, "../src/modules/employees/services/employee.service"));

const APPLY = process.argv.includes("--apply");
const KEEP = require("./keep-logins");
const keepSet = new Set(Object.values(KEEP).flat().map((e) => e.toLowerCase()));
const DEFAULT_BRANCH = (process.argv.find((a) => a.startsWith("--branch=")) || "").split("=")[1] || "";

// Login role (as stored on the user) -> system role code
const ROLE_MAP = {
  admin: "ADMIN",
  super_admin: "SUPER_ADMIN",
  superadmin: "SUPER_ADMIN",
  manager: "BRANCH_MANAGER",
  branch_manager: "BRANCH_MANAGER",
  designer: "DESIGNER",
  operator: "OPERATOR",
  mfg_manager: "MFG_MANAGER",
  mfg_designer: "MFG_DESIGNER",
};

const PLACEHOLDER_MOBILE = "0000000000";

const idStr = (v) => (v && v._id ? String(v._id) : v ? String(v) : "");
const digits = (v) => String(v || "").replace(/\D/g, "");
const mobileOf = (v) => (digits(v).length >= 10 ? digits(v).slice(-10) : "");

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/printz";
  await mongoose.connect(uri);
  console.log(`Connected. Mode: ${APPLY ? "APPLY (will write)" : "DRY RUN (no changes)"}\n`);

  const roles = {};
  (await Role.find({}).lean()).forEach((r) => (roles[r.code] = r));
  const missingRoles = [...new Set(Object.values(ROLE_MAP))].filter((c) => !roles[c]);
  if (missingRoles.length) throw new Error(`Role(s) missing: ${missingRoles.join(", ")}. Open the Employees screen once so they are created.`);

  const branchDocs = await Branch.find({}).select("name").lean();
  const branchName = {};
  branchDocs.forEach((b) => (branchName[String(b._id)] = b.name));
  const branchExists = (id) => Boolean(id) && Boolean(branchName[idStr(id)]);
  if (DEFAULT_BRANCH && !branchExists(DEFAULT_BRANCH)) throw new Error(`--branch=${DEFAULT_BRANCH} is not a known branch.`);

  const users = await User.find({ status: "ACTIVE", isActive: { $ne: false } }).sort({ role: 1, name: 1 });
  const employees = await Employee.find({}).lean();
  const empById = new Map(employees.map((e) => [String(e._id), e]));
  const empByEmail = new Map(employees.filter((e) => e.email).map((e) => [e.email.toLowerCase().trim(), e]));

  const plan = { create: [], fix: [], skippedRole: [], skippedTest: [], noBranch: [], fine: [] };
  const claimedEmployees = new Set();

  for (const u of users) {
    const code = ROLE_MAP[String(u.role || "").toLowerCase().trim()];
    const label = `${u.name} <${u.email}> [${u.role}]`;
    if (!code) {
      plan.skippedRole.push(label);
      continue;
    }
    if (!keepSet.has(String(u.email || "").toLowerCase().trim())) {
      plan.skippedTest.push(label);
      continue;
    }

    let emp = u.employeeId ? empById.get(idStr(u.employeeId)) : null;
    if (!emp && u.email) emp = empByEmail.get(String(u.email).toLowerCase().trim()) || null;

    if (emp) {
      claimedEmployees.add(String(emp._id));
      const changes = [];
      if (!emp.roleId) changes.push(`set role ${code}`);
      if (emp.employmentStatus !== "ACTIVE" || emp.isActive === false) changes.push("switch back on (login is active)");
      if (!u.employeeId || idStr(u.employeeId) !== String(emp._id)) changes.push("link login");
      if (changes.length) plan.fix.push({ user: u, emp, code, changes, label: `${emp.employeeCode} ${emp.name}` });
      else plan.fine.push(label);
      continue;
    }

    // The login's own branch, else the first branch it has access to, else --branch
    const firstOfMany = Array.isArray(u.branchIds) ? u.branchIds.find((b) => branchExists(b)) : null;
    const branch = branchExists(u.branchId) ? idStr(u.branchId) : firstOfMany ? idStr(firstOfMany) : DEFAULT_BRANCH;
    if (!branch) {
      plan.noBranch.push(label);
      continue;
    }
    plan.create.push({ kind: "user", user: u, code, branch, label });
  }

  // Operators: they do not log in, so they come from the operator list
  const operators = await ProductionOperator.find({ isActive: { $ne: false }, $or: [{ employeeId: null }, { employeeId: { $exists: false } }] });
  for (const op of operators) {
    const branch = branchExists(op.branchId) ? idStr(op.branchId) : DEFAULT_BRANCH;
    const label = `${op.name} (${op.phone || "no phone"}) [operator]`;
    if (!branch) plan.noBranch.push(label);
    else plan.create.push({ kind: "operator", op, code: "OPERATOR", branch, label });
  }

  const show = (title, rows) => {
    console.log(`${title} (${rows.length})`);
    rows.forEach((r) => console.log("  " + r));
    console.log("");
  };

  show(
    "Will create an employee",
    plan.create.map((c) => {
      const mobile = c.kind === "user" ? mobileOf(c.user.phone) : mobileOf(c.op.phone);
      const note = [!mobile ? "no valid mobile: placeholder used" : "", c.kind === "operator" ? "no email: placeholder used" : ""].filter(Boolean).join("; ");
      return `${c.label} -> ${c.code} @ ${branchName[c.branch]}${note ? "  (" + note + ")" : ""}`;
    })
  );
  show("Will fix an existing employee", plan.fix.map((f) => `${f.label}: ${f.changes.join(", ")}`));
  show("Already in order", plan.fine);
  show("Skipped: no branch on the login (pass --branch=<id> to include)", plan.noBranch);
  show("Skipped: not on the keep list", plan.skippedTest);
  show("Skipped: role is not one of admin / manager / designer / operator / mfg", plan.skippedRole);

  if (!APPLY) {
    console.log("Dry run only. Run again with --apply to write these changes.");
    await mongoose.disconnect();
    return;
  }

  const ctx = { isSuperAdmin: true, authorizedBranchIds: [] };
  let created = 0;
  let fixed = 0;
  const failures = [];

  for (const c of plan.create) {
    try {
      const isUser = c.kind === "user";
      const name = isUser ? c.user.name : c.op.name;
      const mobile = (isUser ? mobileOf(c.user.phone) : mobileOf(c.op.phone)) || PLACEHOLDER_MOBILE;
      const email = isUser ? String(c.user.email).toLowerCase().trim() : `operator.${digits(c.op.phone) || String(c.op._id).slice(-6)}@no-login.printz.local`;
      const joined = (isUser ? c.user.createdAt : c.op.createdAt) || new Date();
      const emp = await employeeService.createEmployee(
        { name, mobile, email, branchId: c.branch, roleId: String(roles[c.code]._id), joiningDate: joined, defaultSalary: null },
        null,
        ctx,
        // An operator that already exists is linked below; do not create a second entry for it
        { skipOperatorProfile: !isUser }
      );
      if (isUser) await User.updateOne({ _id: c.user._id }, { $set: { employeeId: emp._id } });
      else await ProductionOperator.updateOne({ _id: c.op._id }, { $set: { employeeId: emp._id } });
      created += 1;
      console.log(`  created ${emp.employeeCode} ${name}`);
    } catch (err) {
      failures.push(`${c.label}: ${err.message}`);
    }
  }

  for (const f of plan.fix) {
    try {
      const set = {};
      if (!f.emp.roleId) set.roleId = String(roles[f.code]._id);
      const reactivate = f.emp.employmentStatus !== "ACTIVE" || f.emp.isActive === false;
      if (reactivate) Object.assign(set, { employmentStatus: "ACTIVE", isActive: true, leavingDate: null });
      if (Object.keys(set).length) await Employee.updateOne({ _id: f.emp._id }, { $set: set });

      // A switched-on employee needs an open branch assignment again
      if (reactivate) {
        const open = await EmployeeBranchAssignment.findOne({ employeeId: { $in: [f.emp._id, String(f.emp._id)] }, toDate: null });
        if (!open && f.emp.branchId) {
          await EmployeeBranchAssignment.create({
            employeeId: f.emp._id,
            branchId: f.emp.branchId,
            roleId: set.roleId || f.emp.roleId || null,
            fromDate: new Date(),
            toDate: null,
            isPrimary: true,
            createdBy: new mongoose.Types.ObjectId(),
          });
        }
      }
      if (!f.user.employeeId || idStr(f.user.employeeId) !== String(f.emp._id)) {
        await User.updateOne({ _id: f.user._id }, { $set: { employeeId: f.emp._id } });
      }
      fixed += 1;
      console.log(`  fixed ${f.label}`);
    } catch (err) {
      failures.push(`${f.label}: ${err.message}`);
    }
  }

  // Manufacturing-unit designer profiles (their workload for order assignment) point at the
  // person through the login; give each one the matching Employee as well.
  const profiles = mongoose.connection.db.collection("mfgDesignerProfiles");
  let profilesLinked = 0;
  for (const p of await profiles.find({ $or: [{ employeeId: null }, { employeeId: { $exists: false } }] }).toArray()) {
    const login = await User.findById(p.userId).lean();
    if (login && login.employeeId) {
      await profiles.updateOne({ _id: p._id }, { $set: { employeeId: login.employeeId } });
      profilesLinked += 1;
    }
  }

  console.log(`\nCreated ${created}, fixed ${fixed}, linked ${profilesLinked} manufacturing designer profile(s).`);
  if (failures.length) {
    console.log(`\n${failures.length} problem(s):`);
    failures.forEach((m) => console.log("  " + m));
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
