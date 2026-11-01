/**
 * Salary & Payroll Integration Test Suite (Isolated Ephemeral Replica-Set Environment)
 * Specification Reference: Integration Test Plan v1.1.0
 * 
 * IMPORTANT SAFETY CONSTRAINTS:
 * 1. This script operates EXCLUSIVELY on an isolated ephemeral MongoDB replica set using "printz_isolated_salary_test_db".
 * 2. An in-memory replica set (WiredTiger) is spun up bound strictly to 127.0.0.1 before any backend modules are loaded.
 * 3. Pre-connection validation verifies protocol, loopback hostname, ephemeral port, and database name.
 * 4. All test entities use synthetic prefixes ("ISO_SAL_*") and exact component IDs are tracked and cleaned up.
 * 5. Mongoose disconnection and replica-set termination are guaranteed in a finally block.
 * 6. Production configuration and live MongoDB connections MUST NEVER be loaded.
 */

const { MongoMemoryReplSet } = require("mongodb-memory-server");

const REQUIRED_TEST_DB = "printz_isolated_salary_test_db";

// Global handles for modules loaded after dynamic URI generation
let mongoose = null;
let salaryService = null;
let SalaryComponent = null;
let EmployeeSalaryStructure = null;
let SalaryRun = null;
let SalaryRecord = null;
let SalaryAdjustment = null;
let EmployeeLoan = null;
let LoanRepayment = null;
let Employee = null;
let Branch = null;
let Department = null;
let AttendancePolicy = null;
let DailyAttendance = null;
let HolidayCalendar = null;
let User = null;

/**
 * Loads backend modules ONLY after the test database URI has been locked down in process.env.
 */
function loadBackendModules() {
  mongoose = require("mongoose");
  salaryService = require("../src/modules/salary/services/salary.service");
  const salaryModels = require("../src/modules/salary/models");
  SalaryComponent = salaryModels.SalaryComponent;
  EmployeeSalaryStructure = salaryModels.EmployeeSalaryStructure;
  SalaryRun = salaryModels.SalaryRun;
  SalaryRecord = salaryModels.SalaryRecord;
  SalaryAdjustment = salaryModels.SalaryAdjustment;
  EmployeeLoan = salaryModels.EmployeeLoan;
  LoanRepayment = salaryModels.LoanRepayment;
  Employee = require("../src/modules/employees/models/Employee");
  Branch = require("../src/modules/branches/models/Branch");
  Department = require("../src/modules/departments/models/Department");
  AttendancePolicy = require("../src/modules/attendance/models/AttendancePolicy");
  DailyAttendance = require("../src/modules/attendance/models/DailyAttendance");
  HolidayCalendar = require("../src/modules/attendance/models/HolidayCalendar");
  User = require("../src/modules/auth/models/User");
}

// ============================================================================
// STAGE 1: EPHEMERAL REPLICA-SET LIFECYCLE & PRE-IMPORT LOCKDOWN
// ============================================================================

/**
 * Starts a single-node in-memory replica set with WiredTiger storage engine.
 * Locks process.env to the generated ephemeral URI before backend modules load.
 */
async function startTestReplicaSet() {
  const replSet = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: "wiredTiger",
      name: "rs0",
      dbName: REQUIRED_TEST_DB,
      ip: "127.0.0.1",
    },
    instanceOpts: [
      {
        ip: "127.0.0.1",
        dbName: REQUIRED_TEST_DB,
      },
    ],
  });

  const uri = replSet.getUri(REQUIRED_TEST_DB);

  // Set NODE_ENV, MONGODB_URI, and MONGO_URI to the temporary test configuration
  // BEFORE importing backend modules or config
  process.env.NODE_ENV = "test";
  process.env.MONGODB_URI = uri;
  process.env.MONGO_URI = uri;

  return { replSet, uri };
}

// ============================================================================
// STAGE 2: FAIL-CLOSED PRE-CONNECTION & RUNTIME ISOLATION CHECKS
// ============================================================================

/**
 * Validates the exact target URI before calling mongoose.connect().
 * Allows dynamically assigned local ports while strictly enforcing protocol, localhost, and dbName.
 */
function validatePreConnectionTarget(targetUri, expectedUri) {
  if (!targetUri || typeof targetUri !== "string") {
    throw new Error("[FATAL ISOLATION BREACH] Target MongoDB URI is missing or invalid.");
  }

  // Ensure process.env matches the assigned test URI
  if (process.env.MONGODB_URI !== expectedUri || process.env.MONGO_URI !== expectedUri) {
    throw new Error(
      `[FATAL ISOLATION BREACH] process.env.MONGODB_URI was mutated: "${process.env.MONGODB_URI}" !== "${expectedUri}".`
    );
  }

  let parsed;
  try {
    parsed = new URL(targetUri);
  } catch (err) {
    throw new Error(`[FATAL ISOLATION BREACH] Malformed MongoDB URI "${targetUri}": ${err.message}`);
  }

  // 1. Protocol must be strictly "mongodb:" (reject mongodb+srv:, http:, etc.)
  if (parsed.protocol !== "mongodb:") {
    throw new Error(
      `[FATAL ISOLATION BREACH] Invalid protocol "${parsed.protocol}". Only "mongodb:" is permitted.`
    );
  }

  // 2. Hostname must be strictly local loopback
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error(
      `[FATAL ISOLATION BREACH] Non-local hostname "${parsed.hostname}". Localhost required.`
    );
  }

  // 3. Port must be a valid ephemeral port integer
  const portNum = parseInt(parsed.port, 10);
  if (!Number.isInteger(portNum) || portNum < 1024 || portNum > 65535) {
    throw new Error(`[FATAL ISOLATION BREACH] Invalid local port "${parsed.port}". Valid ephemeral port required.`);
  }

  // 4. Database name must match REQUIRED_TEST_DB exactly
  const dbName = parsed.pathname.replace(/^\//, "");
  if (dbName !== REQUIRED_TEST_DB) {
    throw new Error(
      `[FATAL ISOLATION BREACH] Database name "${dbName}" does not match "${REQUIRED_TEST_DB}".`
    );
  }

  // 5. Database name must end with _test_db
  if (!dbName.endsWith("_test_db")) {
    throw new Error(
      `[FATAL ISOLATION BREACH] Database name "${dbName}" lacks required suffix "_test_db".`
    );
  }

  // 6. Explicit cloud cluster blacklist
  if (
    parsed.hostname.includes("mongodb.net") ||
    parsed.hostname.includes("cluster") ||
    parsed.hostname.includes("azure") ||
    parsed.hostname.includes("aws")
  ) {
    throw new Error(
      `[FATAL ISOLATION BREACH] Remote cloud domain detected in URI: "${parsed.hostname}".`
    );
  }

  return true;
}

/**
 * Validates the active Mongoose connection state and socket properties.
 */
function assertDatabaseIsolation() {
  if (!mongoose || !mongoose.connection || mongoose.connection.readyState !== 1) {
    throw new Error("[FATAL ISOLATION BREACH] Mongoose is not connected. Operation aborted.");
  }

  const activeDbName = mongoose.connection.name;
  const activeHost = mongoose.connection.host;

  // Safeguard 1: Exact Database Name Match
  if (activeDbName !== REQUIRED_TEST_DB) {
    throw new Error(
      `[FATAL ISOLATION BREACH] Connected to "${activeDbName}", expected strictly "${REQUIRED_TEST_DB}". Halting immediately.`
    );
  }

  // Safeguard 2: Database name must have _test_db suffix
  if (!activeDbName.endsWith("_test_db")) {
    throw new Error(
      `[FATAL ISOLATION BREACH] Database "${activeDbName}" does not end with required suffix "_test_db". Halting immediately.`
    );
  }

  // Safeguard 3: Localhost / Loopback enforcement
  if (activeHost !== "127.0.0.1" && activeHost !== "localhost") {
    throw new Error(
      `[FATAL ISOLATION BREACH] Connected to non-local host "${activeHost}". Halting immediately.`
    );
  }

  // Safeguard 4: Blacklist remote cloud domains
  if (
    activeHost.includes("mongodb.net") ||
    activeHost.includes("cluster") ||
    activeHost.includes("azure") ||
    activeHost.includes("aws")
  ) {
    throw new Error(
      `[FATAL ISOLATION BREACH] Remote cloud database host detected ("${activeHost}"). Halting immediately.`
    );
  }
}

// ============================================================================
// STAGE 3: SYNTHETIC DATA FIXTURES & EXACT ID TRACKING
// ============================================================================
const SYN_PREFIX = "ISO_SAL_";
const createdComponentIds = new Set();

/**
 * Wrapper for SalaryComponent.create that tracks created IDs for safe, precise teardown.
 */
async function createTrackedSalaryComponent(data) {
  assertDatabaseIsolation();
  const comp = await SalaryComponent.create(data);
  createdComponentIds.add(String(comp._id));
  return comp;
}

/**
 * Helper to create synthetic employees with all required fields conforming to EmployeeSchema.
 */
async function createSyntheticEmployee({
  code,
  name,
  branchId,
  departmentId,
  policyId,
  joiningDate = "2026-01-01",
}) {
  assertDatabaseIsolation();
  const numSuffix = String(code).replace(/\D/g, "").padStart(2, "0");
  return Employee.create({
    employeeCode: `${SYN_PREFIX}${code}`,
    name: name || `Synthetic Employee ${code}`,
    mobile: `98765432${numSuffix}`, // exactly 10 digits
    email: `${SYN_PREFIX.toLowerCase()}${code.toLowerCase()}@printz-test.local`,
    branchId,
    departmentId: departmentId || null,
    attendancePolicyId: policyId || null,
    joiningDate: new Date(joiningDate),
    employmentStatus: "ACTIVE",
    isActive: true,
  });
}

/**
 * Helper to create synthetic employee salary structure with required branchId,
 * employeeId, monthlySalary, effectiveFrom, and components.
 */
async function createSyntheticStructure({
  employeeId,
  branchId,
  monthlySalary,
  components = [],
  effectiveFrom = "2026-01-01",
  isActive = true,
  remarks = "Synthetic structure for testing",
  createdBy = null,
}) {
  assertDatabaseIsolation();
  return EmployeeSalaryStructure.create({
    employeeId,
    branchId,
    monthlySalary,
    components,
    effectiveFrom: effectiveFrom instanceof Date ? effectiveFrom : new Date(effectiveFrom),
    isActive,
    remarks,
    createdBy,
  });
}

/**
 * Clean up all synthetic records created during testing.
 * Components are removed strictly by tracked _id and synthetic prefix.
 */
async function cleanupSyntheticData() {
  assertDatabaseIsolation();

  const branchIds = (await Branch.find({ code: new RegExp(`^${SYN_PREFIX}`) }).select("_id").lean()).map((b) => b._id);
  const employeeIds = (await Employee.find({ employeeCode: new RegExp(`^${SYN_PREFIX}`) }).select("_id").lean()).map((e) => e._id);
  const runIds = (await SalaryRun.find({ branchId: { $in: branchIds } }).select("_id").lean()).map((r) => r._id);

  const compIdList = Array.from(createdComponentIds)
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  await Promise.all([
    Branch.deleteMany({ code: new RegExp(`^${SYN_PREFIX}`) }),
    Department.deleteMany({ code: new RegExp(`^${SYN_PREFIX}`) }),
    AttendancePolicy.deleteMany({ code: new RegExp(`^${SYN_PREFIX}`) }),
    Employee.deleteMany({ employeeCode: new RegExp(`^${SYN_PREFIX}`) }),
    // Delete strictly tracked components and any matching the synthetic prefix
    SalaryComponent.deleteMany({
      $or: [
        { _id: { $in: compIdList } },
        { code: new RegExp(`^${SYN_PREFIX}`) },
      ],
    }),
    EmployeeSalaryStructure.deleteMany({ employeeId: { $in: employeeIds } }),
    DailyAttendance.deleteMany({ employeeId: { $in: employeeIds } }),
    HolidayCalendar.deleteMany({ branchId: { $in: branchIds } }),
    SalaryAdjustment.deleteMany({ employeeId: { $in: employeeIds } }),
    EmployeeLoan.deleteMany({ employeeId: { $in: employeeIds } }),
    LoanRepayment.deleteMany({ employeeId: { $in: employeeIds } }),
    SalaryRecord.deleteMany({ salaryRunId: { $in: runIds } }),
    SalaryRun.deleteMany({ _id: { $in: runIds } }),
    User.deleteMany({ username: new RegExp(`^${SYN_PREFIX}`) }),
  ]);

  createdComponentIds.clear();
}

/**
 * Explicitly initializes required MongoDB collections and awaits all Mongoose model
 * index creation outside any transaction, preventing LockTimeout (code 24) conflicts.
 */
async function initializeCollectionsAndIndexes() {
  assertDatabaseIsolation();
  const db = mongoose.connection.db;

  const coreModels = [
    SalaryRecord,
    SalaryRun,
    SalaryComponent,
    EmployeeSalaryStructure,
    SalaryAdjustment,
    EmployeeLoan,
    LoanRepayment,
    Employee,
    Branch,
    Department,
    AttendancePolicy,
    DailyAttendance,
    HolidayCalendar,
    User,
  ];

  const allModels = Array.from(
    new Set([...coreModels, ...Object.values(mongoose.models)])
  ).filter((m) => m && m.collection && m.collection.name);

  // 1. Explicitly create underlying collections if they do not yet exist
  const existingCollections = (await db.listCollections().toArray()).map((c) => c.name);
  for (const model of allModels) {
    const collName = model.collection.name;
    if (!existingCollections.includes(collName)) {
      try {
        await db.createCollection(collName);
        existingCollections.push(collName);
      } catch (err) {
        if (err.codeName !== "NamespaceExists") throw err;
      }
    }
  }

  // Ensure "salaryrecords" is explicitly created
  if (!existingCollections.includes("salaryrecords")) {
    try {
      await db.createCollection("salaryrecords");
    } catch (err) {
      if (err.codeName !== "NamespaceExists") throw err;
    }
  }

  // 2. Await full index creation across all models outside transactions
  await Promise.all(allModels.map((model) => model.init()));
}

/**
 * Creates common synthetic environment prerequisites:
 * - 1 Branch (weekly off = Sunday [0])
 * - 1 Department
 * - 1 Attendance Policy (8 hrs/day, 4 days leave allowance, weekly off = Sunday)
 * - 1 Test Manager User
 */
async function setupSyntheticEnvironment() {
  assertDatabaseIsolation();

  const branch = await Branch.create({
    name: `${SYN_PREFIX}Branch`,
    code: `${SYN_PREFIX}BR01`,
    weeklyOffDays: [0], // Sunday
    isActive: true,
  });

  const department = await Department.create({
    name: `${SYN_PREFIX}Dept`,
    code: `${SYN_PREFIX}DP01`,
    branchId: branch._id,
    isActive: true,
  });

  const policy = await AttendancePolicy.create({
    name: `${SYN_PREFIX}Policy`,
    code: `${SYN_PREFIX}POL01`,
    branchId: branch._id,
    workingHoursPerDay: 8,
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
    fullDayHours: 8,
    halfDayHours: 4,
    monthlyLeaveAllowance: 4,
    weeklyOffDays: [0],
    overtimeEnabled: true,
    isActive: true,
  });

  const user = await User.create({
    name: "Synthetic Test Admin",
    username: `${SYN_PREFIX}admin`,
    email: `${SYN_PREFIX}admin@printz-test.local`,
    password: "synthetic_password_hash",
    role: "ADMIN",
    isActive: true,
  });

  return { branch, department, policy, user };
}

/**
 * Helper to seed full attendance for a given month and employee.
 * Marks Sundays as WEEKLY_OFF, normal workdays as PRESENT, with optional OT on a specific date.
 */
async function seedMonthlyAttendance({
  employee,
  branch,
  policy,
  year,
  month,
  otHours = 0,
  otDate = 15,
}) {
  assertDatabaseIsolation();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const attendanceDocs = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayOfWeek = new Date(Date.UTC(year, month - 1, d)).getUTCDay();

    if (dayOfWeek === 0) {
      // Sunday Weekly Off
      attendanceDocs.push({
        employeeId: employee._id,
        branchId: branch._id,
        attendanceDate: dateStr,
        attendancePolicyId: policy._id,
        workingHoursPerDay: 8,
        paidWorkingHours: 0,
        status: "WEEKLY_OFF",
        calculationStatus: "CALCULATED",
      });
    } else {
      // Standard Workday
      const hasOt = d === otDate && otHours > 0;
      attendanceDocs.push({
        employeeId: employee._id,
        branchId: branch._id,
        attendanceDate: dateStr,
        attendancePolicyId: policy._id,
        workingHoursPerDay: 8,
        paidWorkingHours: 8,
        status: "PRESENT",
        overtimeHours: hasOt ? otHours : 0,
        overtimeStatus: hasOt ? "APPROVED" : "NONE",
        calculationStatus: "CALCULATED",
      });
    }
  }

  await DailyAttendance.insertMany(attendanceDocs);
}

// ============================================================================
// STAGE 4: TEST CASES (TC-01 THROUGH TC-10)
// ============================================================================

const testResults = [];

function recordTest(id, name, passed, details = {}) {
  testResults.push({ id, name, passed, details });
  const statusStr = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`[${statusStr}] ${id}: ${name}`);
  if (!passed) {
    console.error("  Failure details:", details);
  }
}

/**
 * TC-01: Component Reconciliation & Single Special Allowance Generation
 * Formula: earnings reconciles to monthlySalary (₹50,000), remainder allocated to Special Allowance.
 */
async function testTC01_ComponentReconciliation(env) {
  assertDatabaseIsolation();
  const employee = await createSyntheticEmployee({
    code: "EMP01",
    name: "Test TC01",
    branchId: env.branch._id,
    departmentId: env.department._id,
    policyId: env.policy._id,
  });

  const compBasic = await createTrackedSalaryComponent({
    code: `${SYN_PREFIX}BASIC_01`,
    name: "Basic Salary",
    componentType: "EARNING",
    calculationType: "FIXED",
    isTaxable: true,
  });

  const compHra = await createTrackedSalaryComponent({
    code: `${SYN_PREFIX}HRA_01`,
    name: "House Rent Allowance",
    componentType: "EARNING",
    calculationType: "FIXED",
    isTaxable: false,
  });

  await createSyntheticStructure({
    employeeId: employee._id,
    branchId: env.branch._id,
    monthlySalary: 50000,
    effectiveFrom: "2026-01-01",
    isActive: true,
    components: [
      { componentId: compBasic._id, amount: 25000, isEnabled: true },
      { componentId: compHra._id, amount: 10000, isEnabled: true },
    ],
  });

  // Payroll Period: September 2026 (completed 30-day month)
  await seedMonthlyAttendance({
    employee,
    branch: env.branch,
    policy: env.policy,
    year: 2026,
    month: 9,
  });

  const run = await salaryService.createRun(
    { branchId: env.branch._id, payrollYear: 2026, payrollMonth: 9 },
    env.user._id
  );

  const calculated = await salaryService.calculateRun(run._id, env.user._id);
  const record = calculated.records.find((r) => String(r.employeeId._id || r.employeeId) === String(employee._id));

  const basicItem = record.components.find((c) => c.name === "Basic Salary");
  const hraItem = record.components.find((c) => c.name === "House Rent Allowance");
  const saItem = record.components.find((c) => c.code === "SPECIAL_ALLOWANCE");

  const pass =
    record.monthlySalary === 50000 &&
    record.salaryOfThisMonth === 50000 &&
    record.totalComponentEarnings === 50000 &&
    basicItem?.amount === 25000 &&
    hraItem?.amount === 10000 &&
    saItem?.amount === 15000 &&
    record.components.filter((c) => c.code === "SPECIAL_ALLOWANCE").length === 1;

  recordTest("TC-01", "Package Reconciliation & System Special Allowance Generation", pass, {
    monthlySalary: record.monthlySalary,
    totalComponentEarnings: record.totalComponentEarnings,
    basic: basicItem?.amount,
    hra: hraItem?.amount,
    sa: saItem?.amount,
  });
}

/**
 * TC-02: Rounding & Gross Base Percentage Deductions (Exact Mathematical Values)
 * - Package: ₹40,000. 30 calendar days, 4 days leave allowance -> 26 calc days. Shift: 8 hrs/day.
 * - Hourly salary: money(40000 / (26 * 8)) = ₹192.31
 * - 4 approved OT hours -> otAmount = money(4 * 192.31 * 1) = ₹769.24
 * - Incentive: ₹1,000.00
 * - grossPayBase = money(40000 + 769.24 + 1000) = ₹41,769.24
 * - Basic (50%): ₹20,000.00 | HRA (40% of Basic): ₹8,000.00 | Special Allowance: ₹12,000.00
 * - PF (12% of Basic): ₹2,400.00
 * - ESI (0.75% of Gross Pay Base): money((41769.24 * 0.75) / 100) = money(313.2693) = ₹313.27
 * - totalDeductions: ₹2,713.27
 * - netPay: ₹39,055.97 -> roundPay: ₹39,056.00
 */
async function testTC02_RoundingAndGrossBaseDeductions(env) {
  assertDatabaseIsolation();

  // Create dedicated synthetic branch and policy for TC-02
  const branch02 = await Branch.create({
    name: `${SYN_PREFIX}Branch02`,
    code: `${SYN_PREFIX}BR02`,
    weeklyOffDays: [0], // Sunday
    isActive: true,
  });

  const policy02 = await AttendancePolicy.create({
    name: `${SYN_PREFIX}Policy02`,
    code: `${SYN_PREFIX}POL02`,
    branchId: branch02._id,
    workingHoursPerDay: 8,
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
    fullDayHours: 8,
    halfDayHours: 4,
    monthlyLeaveAllowance: 4,
    weeklyOffDays: [0],
    overtimeEnabled: true,
    isActive: true,
  });

  const employee = await createSyntheticEmployee({
    code: "EMP02",
    name: "Test TC02",
    branchId: branch02._id,
    departmentId: env.department._id,
    policyId: policy02._id,
  });

  const compBasic = await createTrackedSalaryComponent({
    code: "BASIC",
    name: "Basic Salary",
    componentType: "EARNING",
    calculationType: "PERCENTAGE",
    percentageOf: "MONTHLY_SALARY",
    defaultAmount: 50,
  });

  const compHra = await createTrackedSalaryComponent({
    code: "HRA",
    name: "House Rent Allowance",
    componentType: "EARNING",
    calculationType: "PERCENTAGE",
    percentageOf: "BASIC",
    defaultAmount: 40,
  });

  const compPf = await createTrackedSalaryComponent({
    code: "PF",
    name: "Provident Fund",
    componentType: "DEDUCTION",
    calculationType: "PERCENTAGE",
    percentageOf: "BASIC",
    defaultAmount: 12,
  });

  const compEsi = await createTrackedSalaryComponent({
    code: "ESI",
    name: "Employee State Insurance",
    componentType: "DEDUCTION",
    calculationType: "PERCENTAGE",
    percentageOf: "GROSS",
    defaultAmount: 0.75,
  });

  await createSyntheticStructure({
    employeeId: employee._id,
    branchId: branch02._id,
    monthlySalary: 40000,
    effectiveFrom: "2026-01-01",
    isActive: true,
    components: [
      { componentId: compBasic._id, percentage: 50, isEnabled: true },
      { componentId: compHra._id, percentage: 40, isEnabled: true },
      { componentId: compPf._id, percentage: 12, isEnabled: true },
      { componentId: compEsi._id, percentage: 0.75, isEnabled: true },
    ],
  });

  // Seed 4 OT hours on Jun 15
  await seedMonthlyAttendance({
    employee,
    branch: branch02,
    policy: policy02,
    year: 2026,
    month: 6,
    otHours: 4,
    otDate: 15,
  });

  // Seed ₹1,000 mobile submission incentive
  await SalaryAdjustment.create({
    employeeId: employee._id,
    branchId: branch02._id,
    payrollMonth: 6,
    payrollYear: 2026,
    adjustmentType: "INCENTIVE",
    amount: 1000,
    description: "Mobile Submission Incentive",
    status: "PENDING",
  });

  const run = await salaryService.createRun(
    { branchId: branch02._id, payrollYear: 2026, payrollMonth: 6 },
    env.user._id
  );

  const calculated = await salaryService.calculateRun(run._id, env.user._id);
  const record = calculated.records.find((r) => String(r.employeeId._id || r.employeeId) === String(employee._id));

  const pfItem = record.components.find((c) => c.code === "PF");
  const esiItem = record.components.find((c) => c.code === "ESI");

  const pass =
    record.hourlySalary === 192.31 &&
    record.otAmount === 769.24 &&
    record.mobileSubmissionIncentive === 1000 &&
    pfItem?.amount === 2400.0 &&
    esiItem?.amount === 313.27 &&
    record.totalComponentDeductions === 2713.27 &&
    record.roundPay === 39056;

  recordTest("TC-02", "Exact Mathematical Rounding (OT, Gross Base ESI, Net & Round Pay)", pass, {
    hourlySalary: record.hourlySalary,
    otAmount: record.otAmount,
    grossPayBase: record.salaryOfThisMonth + record.otAmount + record.mobileSubmissionIncentive,
    pf: pfItem?.amount,
    esi: esiItem?.amount,
    totalDeductions: record.totalDeductions,
    roundPay: record.roundPay,
  });
}

/**
 * TC-03: Special Allowance Reuse (Enforce No Duplicate Special Allowance)
 * When structure explicitly includes a SPECIAL_ALLOWANCE line, engine reuses it and avoids creating a 2nd line.
 */
async function testTC03_SpecialAllowanceReuse(env) {
  assertDatabaseIsolation();

  // Create dedicated synthetic branch and policy for TC-03
  const branch03 = await Branch.create({
    name: `${SYN_PREFIX}Branch03`,
    code: `${SYN_PREFIX}BR03`,
    weeklyOffDays: [0], // Sunday
    isActive: true,
  });

  const policy03 = await AttendancePolicy.create({
    name: `${SYN_PREFIX}Policy03`,
    code: `${SYN_PREFIX}POL03`,
    branchId: branch03._id,
    workingHoursPerDay: 8,
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
    fullDayHours: 8,
    halfDayHours: 4,
    monthlyLeaveAllowance: 4,
    weeklyOffDays: [0],
    overtimeEnabled: true,
    isActive: true,
  });

  const employee = await createSyntheticEmployee({
    code: "EMP03",
    name: "Test TC03",
    branchId: branch03._id,
    departmentId: env.department._id,
    policyId: policy03._id,
  });

  const compBasic = await createTrackedSalaryComponent({
    code: "BASIC_03",
    name: "Basic Salary",
    componentType: "EARNING",
    calculationType: "FIXED",
  });

  const compSa = await createTrackedSalaryComponent({
    code: "SPECIAL_ALLOWANCE",
    name: "Special Allowance",
    componentType: "EARNING",
    calculationType: "FIXED",
  });

  await createSyntheticStructure({
    employeeId: employee._id,
    branchId: branch03._id,
    monthlySalary: 50000,
    effectiveFrom: "2026-01-01",
    isActive: true,
    components: [
      { componentId: compBasic._id, amount: 30000, isEnabled: true },
      { componentId: compSa._id, amount: 10000, isEnabled: true }, // initial structure value
    ],
  });

  await seedMonthlyAttendance({
    employee,
    branch: branch03,
    policy: policy03,
    year: 2026,
    month: 9,
  });

  const run = await salaryService.createRun(
    { branchId: branch03._id, payrollYear: 2026, payrollMonth: 9 },
    env.user._id
  );

  const calculated = await salaryService.calculateRun(run._id, env.user._id);
  const record = calculated.records.find((r) => String(r.employeeId._id || r.employeeId) === String(employee._id));

  const saItems = record.components.filter((c) => c.code === "SPECIAL_ALLOWANCE" || c.code === "SA");

  const pass =
    saItems.length === 1 &&
    saItems[0].amount === 20000 && // 50,000 - 30,000
    record.totalComponentEarnings === 50000;

  recordTest("TC-03", "Special Allowance Reuse Without Duplicate Line Item", pass, {
    saCount: saItems.length,
    saAmount: saItems[0]?.amount,
    totalEarnings: record.totalComponentEarnings,
  });
}

/**
 * TC-04: Package Overflow Validation
 * Configured earnings (₹55,000) exceed monthly salary package (₹50,000). Engine must throw validation error.
 */
async function testTC04_PackageOverflowValidation(env) {
  assertDatabaseIsolation();

  // Create dedicated synthetic branch and policy for TC-04
  const branch04 = await Branch.create({
    name: `${SYN_PREFIX}Branch04`,
    code: `${SYN_PREFIX}BR04`,
    weeklyOffDays: [0], // Sunday
    isActive: true,
  });

  const policy04 = await AttendancePolicy.create({
    name: `${SYN_PREFIX}Policy04`,
    code: `${SYN_PREFIX}POL04`,
    branchId: branch04._id,
    workingHoursPerDay: 8,
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
    fullDayHours: 8,
    halfDayHours: 4,
    monthlyLeaveAllowance: 4,
    weeklyOffDays: [0],
    overtimeEnabled: true,
    isActive: true,
  });

  const employee = await createSyntheticEmployee({
    code: "EMP04",
    name: "Test TC04",
    branchId: branch04._id,
    departmentId: env.department._id,
    policyId: policy04._id,
  });

  const compBasic = await createTrackedSalaryComponent({
    code: "BASIC_04",
    name: "Basic Salary",
    componentType: "EARNING",
    calculationType: "FIXED",
  });

  const compHra = await createTrackedSalaryComponent({
    code: "HRA_04",
    name: "HRA",
    componentType: "EARNING",
    calculationType: "FIXED",
  });

  await createSyntheticStructure({
    employeeId: employee._id,
    branchId: branch04._id,
    monthlySalary: 50000,
    effectiveFrom: "2026-01-01",
    isActive: true,
    components: [
      { componentId: compBasic._id, amount: 35000, isEnabled: true },
      { componentId: compHra._id, amount: 20000, isEnabled: true }, // 35k + 20k = 55k > 50k
    ],
  });

  await seedMonthlyAttendance({
    employee,
    branch: branch04,
    policy: policy04,
    year: 2026,
    month: 9,
  });

  const run = await salaryService.createRun(
    { branchId: branch04._id, payrollYear: 2026, payrollMonth: 9 },
    env.user._id
  );

  let errorCaught = null;
  try {
    await salaryService.calculateRun(run._id, env.user._id);
  } catch (err) {
    errorCaught = err;
  }

  const pass =
    errorCaught !== null &&
    (errorCaught.statusCode === 400 || errorCaught.name === "ApiError") &&
    errorCaught.message.includes("exceed the monthly salary package");

  recordTest("TC-04", "Package Overflow Validation Blocks Run Calculation", pass, {
    errorMessage: errorCaught?.message,
    statusCode: errorCaught?.statusCode,
  });
}

/**
 * TC-05: PER_DAY and PER_HOUR Component Evaluation
 * Inputs:
 * - Package: ₹40,000. Basic: ₹20,000 (FIXED)
 * - Food Allowance: ₹100/day (PER_DAY)
 * - Shift Allowance: ₹50/hour (PER_HOUR)
 * Attendance: 20 days worked (160 regular hours), 2 paid leave days, 4 absences, 4 Sundays (weekly off).
 * Expected:
 * - Food Allowance: money(100 * (20 + 2)) = ₹2,200.00
 * - Shift Allowance: money(50 * 160) = ₹8,000.00
 * - Basic Salary: ₹20,000.00
 * - Special Allowance: 40000 - (20000 + 2200 + 8000) = ₹9,800.00
 * - Total Component Earnings: ₹40,000.00
 */
async function testTC05_PerDayAndPerHourComponents(env) {
  assertDatabaseIsolation();

  // Create dedicated synthetic branch and policy for TC-05
  const branch05 = await Branch.create({
    name: `${SYN_PREFIX}Branch05`,
    code: `${SYN_PREFIX}BR05`,
    weeklyOffDays: [0], // Sunday
    isActive: true,
  });

  const policy05 = await AttendancePolicy.create({
    name: `${SYN_PREFIX}Policy05`,
    code: `${SYN_PREFIX}POL05`,
    branchId: branch05._id,
    workingHoursPerDay: 8,
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
    fullDayHours: 8,
    halfDayHours: 4,
    monthlyLeaveAllowance: 4,
    weeklyOffDays: [0],
    overtimeEnabled: true,
    isActive: true,
  });

  const employee = await createSyntheticEmployee({
    code: "EMP05",
    name: "Test TC05",
    branchId: branch05._id,
    departmentId: env.department._id,
    policyId: policy05._id,
  });

  const compBasic = await createTrackedSalaryComponent({
    code: "BASIC_05",
    name: "Basic Salary",
    componentType: "EARNING",
    calculationType: "FIXED",
  });

  const compFood = await createTrackedSalaryComponent({
    code: "FOOD",
    name: "Food Allowance",
    componentType: "EARNING",
    calculationType: "PER_DAY",
  });

  const compShift = await createTrackedSalaryComponent({
    code: "SHIFT",
    name: "Shift Allowance",
    componentType: "EARNING",
    calculationType: "PER_HOUR",
  });

  await createSyntheticStructure({
    employeeId: employee._id,
    branchId: branch05._id,
    monthlySalary: 40000,
    effectiveFrom: "2026-01-01",
    isActive: true,
    components: [
      { componentId: compBasic._id, amount: 20000, isEnabled: true }, // Basic ₹20,000
      { componentId: compFood._id, amount: 100, isEnabled: true },   // ₹100/day
      { componentId: compShift._id, amount: 50, isEnabled: true },   // ₹50/hour
    ],
  });

  // Seed custom attendance for Sep 2026 (30 days total):
  // 4 Sundays (Weekly Off)
  // 26 Workdays: 20 PRESENT (160 regular hours), 2 ON_LEAVE (PAID), 4 ABSENT
  const attendanceDocs = [];
  let nonSundayCount = 0;

  for (let d = 1; d <= 30; d++) {
    const dateStr = `2026-09-${String(d).padStart(2, "0")}`;
    const dayOfWeek = new Date(Date.UTC(2026, 8, d)).getUTCDay();

    if (dayOfWeek === 0) {
      attendanceDocs.push({
        employeeId: employee._id,
        branchId: branch05._id,
        attendanceDate: dateStr,
        attendancePolicyId: policy05._id,
        workingHoursPerDay: 8,
        paidWorkingHours: 0,
        status: "WEEKLY_OFF",
        calculationStatus: "CALCULATED",
      });
    } else {
      nonSundayCount++;
      if (nonSundayCount <= 20) {
        // 20 PRESENT workdays: 8 paid working hours each -> 160 regular hours
        attendanceDocs.push({
          employeeId: employee._id,
          branchId: branch05._id,
          attendanceDate: dateStr,
          attendancePolicyId: policy05._id,
          workingHoursPerDay: 8,
          paidWorkingHours: 8,
          status: "PRESENT",
          calculationStatus: "CALCULATED",
        });
      } else if (nonSundayCount <= 22) {
        // 2 PAID LEAVE days
        attendanceDocs.push({
          employeeId: employee._id,
          branchId: branch05._id,
          attendanceDate: dateStr,
          attendancePolicyId: policy05._id,
          workingHoursPerDay: 8,
          paidWorkingHours: 0,
          status: "ON_LEAVE",
          leavePaymentType: "PAID",
          calculationStatus: "CALCULATED",
        });
      } else {
        // 4 ABSENT days
        attendanceDocs.push({
          employeeId: employee._id,
          branchId: branch05._id,
          attendanceDate: dateStr,
          attendancePolicyId: policy05._id,
          workingHoursPerDay: 8,
          paidWorkingHours: 0,
          status: "ABSENT",
          calculationStatus: "CALCULATED",
        });
      }
    }
  }

  await DailyAttendance.insertMany(attendanceDocs);

  const run = await salaryService.createRun(
    { branchId: branch05._id, payrollYear: 2026, payrollMonth: 9 },
    env.user._id
  );

  const calculated = await salaryService.calculateRun(run._id, env.user._id);
  const record = calculated.records.find((r) => String(r.employeeId._id || r.employeeId) === String(employee._id));

  const basicItem = record.components.find((c) => c.code === "BASIC_05");
  const foodItem = record.components.find((c) => c.code === "FOOD");
  const shiftItem = record.components.find((c) => c.code === "SHIFT");
  const saItem = record.components.find((c) => c.code === "SPECIAL_ALLOWANCE");

  const pass =
    basicItem?.amount === 20000 &&
    foodItem?.amount === 2200 &&
    shiftItem?.amount === 8000 &&
    saItem?.amount === 9800 &&
    record.totalComponentEarnings === 40000 &&
    record.salaryOfThisMonth === 40000;

  recordTest("TC-05", "PER_DAY and PER_HOUR Dynamic Component Calculation", pass, {
    daysWorked: record.daysWorked,
    regularHours: record.totalRegularHours,
    basic: basicItem?.amount,
    food: foodItem?.amount,
    shift: shiftItem?.amount,
    sa: saItem?.amount,
    totalEarnings: record.totalComponentEarnings,
  });
}

/**
 * TC-06: Deficit Handling (Deductions Exceed Gross Pay -> Net Clamped to 0)
 * Gross Pay = ₹30,000. Advance = ₹15,000. Loan EMI = ₹20,000. Total Deductions = ₹35,000.
 * Expected: isDeficit = true, deficitAmount = ₹5,000, roundPay = 0.
 */
async function testTC06_DeficitHandling(env) {
  assertDatabaseIsolation();

  // Create dedicated synthetic branch and policy for TC-06
  const branch06 = await Branch.create({
    name: `${SYN_PREFIX}Branch06`,
    code: `${SYN_PREFIX}BR06`,
    weeklyOffDays: [0], // Sunday
    isActive: true,
  });

  const policy06 = await AttendancePolicy.create({
    name: `${SYN_PREFIX}Policy06`,
    code: `${SYN_PREFIX}POL06`,
    branchId: branch06._id,
    workingHoursPerDay: 8,
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
    fullDayHours: 8,
    halfDayHours: 4,
    monthlyLeaveAllowance: 4,
    weeklyOffDays: [0],
    overtimeEnabled: true,
    isActive: true,
  });

  const employee = await createSyntheticEmployee({
    code: "EMP06",
    name: "Test TC06",
    branchId: branch06._id,
    departmentId: env.department._id,
    policyId: policy06._id,
  });

  await createSyntheticStructure({
    employeeId: employee._id,
    branchId: branch06._id,
    monthlySalary: 30000,
    effectiveFrom: "2026-01-01",
    isActive: true,
    components: [], // defaults to Basic = 30k
  });

  await seedMonthlyAttendance({
    employee,
    branch: branch06,
    policy: policy06,
    year: 2026,
    month: 9,
  });

  // Advance of ₹15,000
  await SalaryAdjustment.create({
    employeeId: employee._id,
    branchId: branch06._id,
    payrollMonth: 9,
    payrollYear: 2026,
    adjustmentType: "ADVANCE",
    amount: 15000,
    description: "Synthetic Advance Deduction",
    status: "PENDING",
  });

  // Active Loan with EMI = ₹20,000
  await EmployeeLoan.create({
    employeeId: employee._id,
    branchId: branch06._id,
    loanNumber: `${SYN_PREFIX}LN06`,
    loanAmount: 100000,
    loanDate: new Date("2026-01-01"),
    emiAmount: 20000,
    outstandingBalance: 60000,
    status: "ACTIVE",
  });

  const run = await salaryService.createRun(
    { branchId: branch06._id, payrollYear: 2026, payrollMonth: 9 },
    env.user._id
  );

  const calculated = await salaryService.calculateRun(run._id, env.user._id);
  const record = calculated.records.find((r) => String(r.employeeId._id || r.employeeId) === String(employee._id));

  // totalDeductions = 15k + 20k = 35k. grossPay = 30k. deficit = 5k.
  const pass =
    record.isDeficit === true &&
    record.deficitAmount === 5000 &&
    record.roundPay === 0;

  recordTest("TC-06", "Deficit Handling Clamps Net Pay to Zero & Sets Deficit Flag", pass, {
    grossPay: record.grossPay,
    totalDeductions: record.totalDeductions,
    isDeficit: record.isDeficit,
    deficitAmount: record.deficitAmount,
    roundPay: record.roundPay,
  });
}

/**
 * TC-07: Historical Records Backward Compatibility
 * Legacy record created without `components` array or `totalComponentDeductions`.
 * Verify virtual `totalDeductions`, preserved `roundPay`, and clean rendering compatibility.
 */
async function testTC07_HistoricalRecordCompatibility(env) {
  assertDatabaseIsolation();
  const employee = await createSyntheticEmployee({
    code: "EMP07",
    name: "Test TC07",
    branchId: env.branch._id,
    departmentId: env.department._id,
    policyId: env.policy._id,
  });

  const run = await SalaryRun.create({
    branchId: env.branch._id,
    payrollYear: 2026,
    payrollMonth: 8,
    periodStart: new Date("2026-08-01T00:00:00.000Z"),
    periodEnd: new Date("2026-08-31T23:59:59.999Z"),
    status: "APPROVED",
    totalGrossPay: 30000,
    totalDeductions: 5000,
    totalNetPay: 25000,
  });

  // Insert raw legacy record directly into MongoDB without components or totalComponentDeductions
  const legacyRecordDoc = await SalaryRecord.create({
    salaryRunId: run._id,
    employeeId: employee._id,
    branchId: env.branch._id,
    payrollMonth: 8,
    payrollYear: 2026,
    monthlySalary: 30000,
    calendarDaysInMonth: 31,
    salaryCalculationDays: 27,
    requiredWorkingHoursPerDay: 8,
    hourlySalary: 138.89,
    perDaySalary: 1111.11,
    salaryOfThisMonth: 30000,
    grossPay: 30000,
    advanceTakenInPresentMonth: 3000,
    loanEmi: 2000,
    roundPay: 25000,
    status: "APPROVED",
    // Note: components, totalComponentEarnings, totalComponentDeductions omitted intentionally
  });

  // Retrieve using standard service query
  const retrievedRun = await salaryService.getRun(run._id);
  const retrievedRecord = retrievedRun.records.find((r) => String(r._id) === String(legacyRecordDoc._id));

  const pass =
    retrievedRecord.totalDeductions === 5000 &&
    retrievedRecord.roundPay === 25000 &&
    retrievedRecord.isDeficit === false;

  recordTest("TC-07", "Historical Legacy Record Backward Compatibility", pass, {
    totalDeductions: retrievedRecord.totalDeductions,
    roundPay: retrievedRecord.roundPay,
    hasComponents: Array.isArray(retrievedRecord.components) && retrievedRecord.components.length > 0,
    isDeficit: retrievedRecord.isDeficit,
  });
}

/**
 * TC-08: Invalid & Orphaned Component References
 * Structure references a componentId that was deleted from the catalog.
 * Mongoose populates null. Engine must NOT crash and must NOT silently drop the amount;
 * it falls back to name: "Component", calculationType: "FIXED", amount: sc.amount,
 * and reconciles it properly into the salary package.
 */
async function testTC08_InvalidComponentReferenceHandling(env) {
  assertDatabaseIsolation();

  // Create dedicated synthetic branch and policy for TC-08
  const branch08 = await Branch.create({
    name: `${SYN_PREFIX}Branch08`,
    code: `${SYN_PREFIX}BR08`,
    weeklyOffDays: [0], // Sunday
    isActive: true,
  });

  const policy08 = await AttendancePolicy.create({
    name: `${SYN_PREFIX}Policy08`,
    code: `${SYN_PREFIX}POL08`,
    branchId: branch08._id,
    workingHoursPerDay: 8,
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
    fullDayHours: 8,
    halfDayHours: 4,
    monthlyLeaveAllowance: 4,
    weeklyOffDays: [0],
    overtimeEnabled: true,
    isActive: true,
  });

  const employee = await createSyntheticEmployee({
    code: "EMP08",
    name: "Test TC08",
    branchId: branch08._id,
    departmentId: env.department._id,
    policyId: policy08._id,
  });

  // Create and immediately delete a catalog component to produce an orphaned ObjectId
  const tempComp = await createTrackedSalaryComponent({
    code: "TEMP_DELETED",
    name: "Temporary Deleted Allowance",
    componentType: "EARNING",
    calculationType: "FIXED",
  });
  const deletedCompId = tempComp._id;
  await SalaryComponent.findByIdAndDelete(deletedCompId);
  createdComponentIds.delete(String(deletedCompId));

  await createSyntheticStructure({
    employeeId: employee._id,
    branchId: branch08._id,
    monthlySalary: 45000,
    effectiveFrom: "2026-01-01",
    isActive: true,
    components: [
      {
        componentId: deletedCompId, // orphaned reference
        amount: 15000,
        isEnabled: true,
      },
    ],
  });

  await seedMonthlyAttendance({
    employee,
    branch: branch08,
    policy: policy08,
    year: 2026,
    month: 9,
  });

  const run = await salaryService.createRun(
    { branchId: branch08._id, payrollYear: 2026, payrollMonth: 9 },
    env.user._id
  );

  let errorCaught = null;
  let record = null;
  try {
    const calculated = await salaryService.calculateRun(run._id, env.user._id);
    record = calculated.records.find((r) => String(r.employeeId._id || r.employeeId) === String(employee._id));
  } catch (err) {
    errorCaught = err;
  }

  const fallbackItem = record?.components?.find((c) => c.name === "Component" || c.name === "TEMP_DELETED");
  const saItem = record?.components?.find((c) => c.code === "SPECIAL_ALLOWANCE");

  const pass =
    errorCaught === null &&
    fallbackItem?.amount === 15000 &&
    saItem?.amount === 30000 &&
    record?.totalComponentEarnings === 45000;

  recordTest("TC-08", "Orphaned Component Reference Fallback & Package Preservation", pass, {
    error: errorCaught?.message,
    fallbackItemAmount: fallbackItem?.amount,
    saAmount: saItem?.amount,
    totalEarnings: record?.totalComponentEarnings,
  });
}

/**
 * TC-09: Component & Operational Deductions Aggregation (Single Count)
 * Verify that component deductions (PF + ESI) and operational deductions (Advance + Loan + LOP)
 * are summed cleanly without double-counting.
 */
async function testTC09_DeductionAggregation(env) {
  assertDatabaseIsolation();

  // Create dedicated synthetic branch and policy for TC-09
  const branch09 = await Branch.create({
    name: `${SYN_PREFIX}Branch09`,
    code: `${SYN_PREFIX}BR09`,
    weeklyOffDays: [0], // Sunday
    isActive: true,
  });

  const policy09 = await AttendancePolicy.create({
    name: `${SYN_PREFIX}Policy09`,
    code: `${SYN_PREFIX}POL09`,
    branchId: branch09._id,
    workingHoursPerDay: 8,
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
    fullDayHours: 8,
    halfDayHours: 4,
    monthlyLeaveAllowance: 4,
    weeklyOffDays: [0],
    overtimeEnabled: true,
    isActive: true,
  });

  const employee = await createSyntheticEmployee({
    code: "EMP09",
    name: "Test TC09",
    branchId: branch09._id,
    departmentId: env.department._id,
    policyId: policy09._id,
  });

  const compBasic = await createTrackedSalaryComponent({
    code: "BASIC_09",
    name: "Basic Salary",
    componentType: "EARNING",
    calculationType: "FIXED",
  });

  const compPf = await createTrackedSalaryComponent({
    code: "PF_09",
    name: "PF Deduction",
    componentType: "DEDUCTION",
    calculationType: "FIXED",
  });

  await createSyntheticStructure({
    employeeId: employee._id,
    branchId: branch09._id,
    monthlySalary: 50000,
    effectiveFrom: "2026-01-01",
    isActive: true,
    components: [
      { componentId: compBasic._id, amount: 50000, isEnabled: true },
      { componentId: compPf._id, amount: 3000, isEnabled: true },
    ],
  });

  await seedMonthlyAttendance({
    employee,
    branch: branch09,
    policy: policy09,
    year: 2026,
    month: 9,
  });

  // Operational deductions: Advance = 2000, Loan EMI = 4000
  await SalaryAdjustment.create({
    employeeId: employee._id,
    branchId: branch09._id,
    payrollMonth: 9,
    payrollYear: 2026,
    adjustmentType: "ADVANCE",
    amount: 2000,
    status: "PENDING",
    description: "Synthetic Advance Deduction",
  });

  await EmployeeLoan.create({
    employeeId: employee._id,
    branchId: branch09._id,
    loanNumber: `${SYN_PREFIX}LN09`,
    loanAmount: 50000,
    loanDate: new Date("2026-01-01"),
    emiAmount: 4000,
    outstandingBalance: 20000,
    status: "ACTIVE",
  });

  const run = await salaryService.createRun(
    { branchId: branch09._id, payrollYear: 2026, payrollMonth: 9 },
    env.user._id
  );

  const calculated = await salaryService.calculateRun(run._id, env.user._id);
  const record = calculated.records.find((r) => String(r.employeeId._id || r.employeeId) === String(employee._id));

  // totalComponentDeductions = 3000
  // operationalDeductions = 2000 + 4000 = 6000
  // totalDeductions = 9000
  // netPay = 50000 - 9000 = 41000
  const pass =
    record.totalComponentDeductions === 3000 &&
    record.advanceTakenInPresentMonth === 2000 &&
    record.loanEmi === 4000 &&
    record.totalDeductions === 9000 &&
    record.roundPay === 41000;

  recordTest("TC-09", "Component & Operational Deductions Clean Aggregation", pass, {
    componentDeductions: record.totalComponentDeductions,
    advance: record.advanceTakenInPresentMonth,
    loanEmi: record.loanEmi,
    totalDeductions: record.totalDeductions,
    roundPay: record.roundPay,
  });
}

/**
 * TC-10: Payment Idempotency, Transaction Safety & State Machine
 * 1. payRun on non-approved run (CALCULATED) throws HTTP 409 Conflict.
 * 2. transitionRun to APPROVED, then payRun succeeds (transitions to PAID, records marked PAID, loan repayment generated).
 * 3. Repeated payRun on PAID run fast-returns existing run with HTTP 200 (no duplicate repayment, no second loan balance decrement).
 */
async function testTC10_PaymentIdempotencyAndStateTransitions(env) {
  assertDatabaseIsolation();

  // Create dedicated synthetic branch and policy for TC-10
  const branch10 = await Branch.create({
    name: `${SYN_PREFIX}Branch10`,
    code: `${SYN_PREFIX}BR10`,
    weeklyOffDays: [0], // Sunday
    isActive: true,
  });

  const policy10 = await AttendancePolicy.create({
    name: `${SYN_PREFIX}Policy10`,
    code: `${SYN_PREFIX}POL10`,
    branchId: branch10._id,
    workingHoursPerDay: 8,
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
    fullDayHours: 8,
    halfDayHours: 4,
    monthlyLeaveAllowance: 4,
    weeklyOffDays: [0],
    overtimeEnabled: true,
    isActive: true,
  });

  const employee = await createSyntheticEmployee({
    code: "EMP10",
    name: "Test TC10",
    branchId: branch10._id,
    departmentId: env.department._id,
    policyId: policy10._id,
  });

  await createSyntheticStructure({
    employeeId: employee._id,
    branchId: branch10._id,
    monthlySalary: 40000,
    effectiveFrom: "2026-01-01",
    isActive: true,
    components: [],
  });

  const loan = await EmployeeLoan.create({
    employeeId: employee._id,
    branchId: branch10._id,
    loanNumber: `${SYN_PREFIX}LN10`,
    loanAmount: 30000,
    loanDate: new Date("2026-01-01"),
    emiAmount: 5000,
    outstandingBalance: 15000,
    totalRepaid: 15000,
    status: "ACTIVE",
  });

  await seedMonthlyAttendance({
    employee,
    branch: branch10,
    policy: policy10,
    year: 2026,
    month: 9,
  });

  const run = await salaryService.createRun(
    { branchId: branch10._id, payrollYear: 2026, payrollMonth: 9 },
    env.user._id
  );

  await salaryService.calculateRun(run._id, env.user._id);

  // Step 1: Attempt payRun on CALCULATED status (Must be rejected with 409)
  let nonApprovedError = null;
  try {
    await salaryService.payRun(run._id, env.user._id);
  } catch (err) {
    nonApprovedError = err;
  }

  // Step 2: Transition to APPROVED, then payRun
  await salaryService.transitionRun(run._id, "approve", env.user._id);
  const paidRun = await salaryService.payRun(run._id, env.user._id);

  const loanAfterFirstPay = await EmployeeLoan.findById(loan._id).lean();
  const repaymentsAfterFirstPay = await LoanRepayment.find({ employeeLoanId: loan._id }).lean();

  // Step 3: Repeated payRun on PAID run (Must fast-return without duplicate repayment or loan balance deduction)
  const repeatedPaidRun = await salaryService.payRun(run._id, env.user._id);

  const loanAfterSecondPay = await EmployeeLoan.findById(loan._id).lean();
  const repaymentsAfterSecondPay = await LoanRepayment.find({ employeeLoanId: loan._id }).lean();

  const pass =
    nonApprovedError !== null &&
    (nonApprovedError.statusCode === 409 || nonApprovedError.name === "ApiError") &&
    nonApprovedError.message.includes("Only an approved salary run can be marked paid") &&
    paidRun.status === "PAID" &&
    loanAfterFirstPay.outstandingBalance === 10000 && // 15,000 - 5,000
    repaymentsAfterFirstPay.length === 1 &&
    repeatedPaidRun.status === "PAID" &&
    loanAfterSecondPay.outstandingBalance === 10000 && // remains unchanged
    repaymentsAfterSecondPay.length === 1; // no duplicate repayment

  recordTest("TC-10", "Payment Idempotency, Transaction Safety & Repeated Payment Protection", pass, {
    nonApprovedRejected: nonApprovedError !== null,
    firstPaymentStatus: paidRun.status,
    loanBalanceAfterFirst: loanAfterFirstPay.outstandingBalance,
    repaymentCountAfterFirst: repaymentsAfterFirstPay.length,
    repeatedPaymentStatus: repeatedPaidRun.status,
    loanBalanceAfterSecond: loanAfterSecondPay.outstandingBalance,
    repaymentCountAfterSecond: repaymentsAfterSecondPay.length,
  });
}

// ============================================================================
// STAGE 5: RUNNER HARNESS (Gated Execution & Guaranteed Teardown)
// ============================================================================
async function runAllTests() {
  console.log("======================================================================");
  console.log("STARTING ISOLATED SALARY & PAYROLL INTEGRATION SUITE (v1.1.0)");
  console.log("======================================================================");

  let replSet = null;
  let testUri = null;

  try {
    // 1. Start single-node replica set with WiredTiger bound strictly to 127.0.0.1
    console.log("Starting ephemeral MongoDB replica set (WiredTiger, 127.0.0.1)...");
    const started = await startTestReplicaSet();
    replSet = started.replSet;
    testUri = started.uri;
    console.log("Ephemeral Replica Set Active. Target URI:", testUri);

    // 2. Validate URI BEFORE any connection attempt
    validatePreConnectionTarget(testUri, testUri);
    console.log("✓ Pre-connection target URI validated successfully.");

    // 3. Load backend modules now that process.env.MONGODB_URI is locked to the test URI
    loadBackendModules();
    console.log("✓ Backend models and services loaded with isolated test configuration.");

    // 4. Connect strictly to verified local ephemeral database
    await mongoose.connect(testUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });

    // 5. Re-assert connection socket properties after connection
    assertDatabaseIsolation();
    console.log("✓ Post-connection socket isolation safeguards verified successfully.");

    // Explicitly initialize collections and await index creation outside transactions
    console.log("Initializing collections and awaiting index creation outside transactions...");
    await initializeCollectionsAndIndexes();
    console.log("✓ All collections and indexes fully initialized outside transactions.");

    console.log("Cleaning up any existing records...");
    await cleanupSyntheticData();

    console.log("Setting up synthetic branch, department, policy, and user...");
    const env = await setupSyntheticEnvironment();

    console.log("\nExecuting Test Cases (TC-01 through TC-10)...");
    await testTC01_ComponentReconciliation(env);
    await testTC02_RoundingAndGrossBaseDeductions(env);
    await testTC03_SpecialAllowanceReuse(env);
    await testTC04_PackageOverflowValidation(env);
    await testTC05_PerDayAndPerHourComponents(env);
    await testTC06_DeficitHandling(env);
    await testTC07_HistoricalRecordCompatibility(env);
    await testTC08_InvalidComponentReferenceHandling(env);
    await testTC09_DeductionAggregation(env);
    await testTC10_PaymentIdempotencyAndStateTransitions(env);

    console.log("\nTearing down synthetic test data...");
    await cleanupSyntheticData();

    const total = testResults.length;
    const passed = testResults.filter((r) => r.passed).length;
    const failed = total - passed;

    console.log("======================================================================");
    console.log(`TEST RUN COMPLETED: ${passed}/${total} Passed, ${failed} Failed`);
    console.log("======================================================================");

    process.exitCode = failed > 0 ? 1 : 0;
  } catch (fatalError) {
    console.error("[FATAL ERROR IN TEST HARNESS]:", fatalError);
    process.exitCode = 1;
  } finally {
    // Ensure replica set is stopped and Mongoose is disconnected in finally block
    console.log("Ensuring clean teardown of Mongoose and ephemeral replica set...");
    if (mongoose && mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
      console.log("✓ Mongoose disconnected.");
    }
    if (replSet) {
      await replSet.stop().catch(() => {});
      console.log("✓ Ephemeral replica set stopped.");
    }
  }
}

// Module Exports for programmatic invocation or standalone CLI execution
module.exports = {
  REQUIRED_TEST_DB,
  startTestReplicaSet,
  validatePreConnectionTarget,
  assertDatabaseIsolation,
  initializeCollectionsAndIndexes,
  cleanupSyntheticData,
  runAllTests,
};

// Standalone execution entrypoint
if (require.main === module) {
  runAllTests();
}
