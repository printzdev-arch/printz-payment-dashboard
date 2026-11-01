/**
 * Salary & Payroll Component Engine — Staging End-to-End (E2E) Verification Runner
 * Specification Reference: Staging Verification Plan v1.0.0
 * 
 * SAFETY & ISOLATION CONSTRAINTS:
 * 1. Operates EXCLUSIVELY on an ephemeral WiredTiger replica set using "printz_staging_salary_e2e_db".
 * 2. In-process HTTP Express server binds strictly to 127.0.0.1 on an OS-assigned ephemeral port (port 0).
 * 3. All test entities use a run-specific synthetic prefix ("STG_SAL_<timestamp>_") and exact IDs are tracked.
 * 4. Cleanup deletes ONLY the exact synthetic documents created by this specific run.
 * 5. Pre-connection and post-connection socket assertions prevent accidental connection to production/cloud DBs.
 * 6. External communications (SMS/WhatsApp/email) and live disbursement gateways are stubbed.
 * 7. Guaranteed teardown in finally: Mongoose disconnection, HTTP server closure, and replica set termination.
 * 8. NO production database or real employee/payroll records are ever accessed.
 */

const http = require("http");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

const REQUIRED_TEST_DB = "printz_staging_salary_e2e_db";
const RUN_TIMESTAMP = Date.now();
const RUN_PREFIX = `STG_SAL_${RUN_TIMESTAMP}_`;

// Global handles for modules loaded after dynamic URI generation
let mongoose = null;
let app = null;
let salaryService = null;
let tokenService = null;
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

// Registry of exact entity IDs created during this execution
const trackedEntities = {
  branchIds: new Set(),
  departmentIds: new Set(),
  policyIds: new Set(),
  employeeIds: new Set(),
  componentIds: new Set(),
  structureIds: new Set(),
  adjustmentIds: new Set(),
  loanIds: new Set(),
  repaymentIds: new Set(),
  runIds: new Set(),
  userIds: new Set(),
};

/**
 * Loads backend modules ONLY after the test database URI has been locked down in process.env.
 */
function loadBackendModules() {
  process.env.NODE_ENV = "test";
  mongoose = require("mongoose");
  app = require("../src/app");
  salaryService = require("../src/modules/salary/services/salary.service");
  tokenService = require("../src/utils/JwtTokenService");

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
// STAGE 1: EPHEMERAL REPLICA-SET & IN-PROCESS HTTP SERVER LIFECYCLE
// ============================================================================

/**
 * Starts an in-memory MongoDB replica set bound strictly to 127.0.0.1.
 */
async function startStagingReplicaSet() {
  const replSet = await MongoMemoryReplSet.create({
    replSet: {
      name: "rs0",
      count: 1,
      storageEngine: "wiredTiger",
    },
    instanceOpts: [
      {
        ip: "127.0.0.1",
      },
    ],
  });

  await replSet.waitUntilRunning();
  const rawUri = replSet.getUri();
  const urlObj = new URL(rawUri);
  urlObj.pathname = `/${REQUIRED_TEST_DB}`;
  const isolatedUri = urlObj.toString();

  // Pre-connection safety checks
  assertTargetUri(isolatedUri);

  // Lock environment variables
  process.env.MONGODB_URI = isolatedUri;
  process.env.DATABASE_URL = isolatedUri;

  // Load backend modules with the locked URI
  loadBackendModules();

  await mongoose.connect(isolatedUri, {
    serverSelectionTimeoutMS: 5000,
  });

  // Post-connection safety checks
  assertDatabaseIsolation();

  return { replSet, uri: isolatedUri };
}

/**
 * Starts an in-process HTTP server binding to 127.0.0.1 on an OS-assigned ephemeral port.
 */
async function startStagingHttpServer() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/salary`;
  return { server, port, baseUrl };
}

/**
 * Pre-connection validation of the generated MongoDB target URI.
 */
function assertTargetUri(uri) {
  if (!uri || typeof uri !== "string") {
    throw new Error("[FATAL ISOLATION BREACH] URI must be a valid non-empty string.");
  }
  const parsed = new URL(uri);

  if (parsed.protocol !== "mongodb:" && parsed.protocol !== "mongodb+srv:") {
    throw new Error(`[FATAL ISOLATION BREACH] Invalid protocol: ${parsed.protocol}`);
  }
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error(`[FATAL ISOLATION BREACH] Hostname "${parsed.hostname}" is not local loopback.`);
  }
  const dbName = parsed.pathname.replace(/^\//, "");
  if (dbName !== REQUIRED_TEST_DB) {
    throw new Error(`[FATAL ISOLATION BREACH] Database "${dbName}" does not match "${REQUIRED_TEST_DB}".`);
  }
  if (!dbName.endsWith("_e2e_db") && !dbName.endsWith("_test_db")) {
    throw new Error(`[FATAL ISOLATION BREACH] Database "${dbName}" lacks required suffix "_e2e_db".`);
  }
  if (
    parsed.hostname.includes("mongodb.net") ||
    parsed.hostname.includes("cluster") ||
    parsed.hostname.includes("azure") ||
    parsed.hostname.includes("aws")
  ) {
    throw new Error(`[FATAL ISOLATION BREACH] Remote cloud database host detected.`);
  }
}

/**
 * Post-connection socket-level safeguards verifying active connection properties.
 */
function assertDatabaseIsolation() {
  if (!mongoose || !mongoose.connection) {
    throw new Error("[FATAL ISOLATION BREACH] Mongoose is not initialized.");
  }
  if (mongoose.connection.readyState !== 1) {
    throw new Error("[FATAL ISOLATION BREACH] Mongoose connection is not active (state !== 1).");
  }
  const activeDbName = mongoose.connection.name;
  const activeHost = mongoose.connection.host;

  if (activeDbName !== REQUIRED_TEST_DB) {
    throw new Error(`[FATAL ISOLATION BREACH] Connected to "${activeDbName}", expected "${REQUIRED_TEST_DB}".`);
  }
  if (activeHost !== "127.0.0.1" && activeHost !== "localhost") {
    throw new Error(`[FATAL ISOLATION BREACH] Connected to non-local host "${activeHost}".`);
  }
  if (
    activeHost.includes("mongodb.net") ||
    activeHost.includes("cluster") ||
    activeHost.includes("azure") ||
    activeHost.includes("aws")
  ) {
    throw new Error(`[FATAL ISOLATION BREACH] Remote cloud database host detected.`);
  }
}

/**
 * Pre-warms MongoDB collections and indexes outside transactions.
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

  for (const model of coreModels) {
    const collName = model.collection.name;
    const existing = await db.listCollections({ name: collName }).toArray();
    if (existing.length === 0) {
      await db.createCollection(collName);
    }
  }

  await Promise.all(coreModels.map((model) => model.init()));
}

// ============================================================================
// STAGE 2: TARGETED SYNTHETIC FIXTURES & EXACT ID REGISTRATION
// ============================================================================

async function createSyntheticBranch(nameSuffix = "BR01") {
  assertDatabaseIsolation();
  const branch = await Branch.create({
    name: `${RUN_PREFIX}Branch_${nameSuffix}`,
    code: `${RUN_PREFIX}${nameSuffix}`,
    weeklyOffDays: [0], // Sunday
    isActive: true,
  });
  trackedEntities.branchIds.add(branch._id);
  return branch;
}

async function createSyntheticPolicy(branch, nameSuffix = "POL01") {
  assertDatabaseIsolation();
  const policy = await AttendancePolicy.create({
    name: `${RUN_PREFIX}Policy_${nameSuffix}`,
    code: `${RUN_PREFIX}${nameSuffix}`,
    branchId: branch._id,
    workingHoursPerDay: 8,
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
    fullDayHours: 8,
    halfDayHours: 4,
    monthlyLeaveAllowance: 4,
    weeklyOffDays: [0], // Sunday
    overtimeEnabled: true,
    isActive: true,
  });
  trackedEntities.policyIds.add(policy._id);
  return policy;
}

async function createSyntheticDepartment(nameSuffix = "DEPT01") {
  assertDatabaseIsolation();
  const dept = await Department.create({
    name: `${RUN_PREFIX}Department_${nameSuffix}`,
    code: `${RUN_PREFIX}${nameSuffix}`,
    isActive: true,
  });
  trackedEntities.departmentIds.add(dept._id);
  return dept;
}

async function createSyntheticEmployee({ code, name, branchId, departmentId, policyId, salary = 50000 }) {
  assertDatabaseIsolation();
  const numericSuffix = String(Math.floor(10000000 + Math.random() * 90000000));
  const employee = await Employee.create({
    employeeCode: `${RUN_PREFIX}${code}`,
    name: `${RUN_PREFIX}${name}`,
    mobile: `98${numericSuffix}`,
    email: `${RUN_PREFIX.toLowerCase()}${code.toLowerCase()}@synthetic-test.local`,
    branchId,
    departmentId,
    attendancePolicyId: policyId,
    joiningDate: new Date("2025-01-01"),
    status: "ACTIVE",
    employmentStatus: "ACTIVE",
    salary,
    isActive: true,
  });
  trackedEntities.employeeIds.add(employee._id);
  return employee;
}

async function createSyntheticUser({ username, email, role = "admin", permissions = [], branchIds = [] }) {
  assertDatabaseIsolation();
  const user = await User.create({
    username: `${RUN_PREFIX}${username}`,
    email: `${RUN_PREFIX.toLowerCase()}${email}@synthetic-test.local`,
    name: `${RUN_PREFIX}${username}`,
    password: "SyntheticPassword123!",
    role,
    permissions,
    branchIds,
    isActive: true,
    status: "ACTIVE",
  });
  trackedEntities.userIds.add(user._id);
  return user;
}

async function createSyntheticComponent({ code, name, componentType = "EARNING", calculationType = "FIXED", defaultAmount = 0 }) {
  assertDatabaseIsolation();
  const comp = await SalaryComponent.create({
    code: `${RUN_PREFIX}${code}`,
    name,
    componentType,
    calculationType,
    defaultAmount,
    isTaxable: true,
    isActive: true,
  });
  trackedEntities.componentIds.add(comp._id);
  return comp;
}

async function createSyntheticStructure({ employeeId, branchId, monthlySalary, components = [] }) {
  assertDatabaseIsolation();
  const struct = await EmployeeSalaryStructure.create({
    employeeId,
    branchId,
    monthlySalary,
    effectiveFrom: new Date("2026-01-01"),
    components,
    isActive: true,
    remarks: "Synthetic E2E Structure",
  });
  trackedEntities.structureIds.add(struct._id);
  return struct;
}

async function seedCompleteMonthlyAttendance({ employee, branch, policy, year, month, approvedOtHours = 0 }) {
  assertDatabaseIsolation();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weeklyOffs = policy.weeklyOffDays || [0];
  const requiredHours = policy.workingHoursPerDay || 8;

  const records = [];
  let remainingOt = approvedOtHours;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
    const isOff = weeklyOffs.includes(dayOfWeek);
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    let status = "PRESENT";
    let workingHours = requiredHours;
    let otHours = 0;
    let otStatus = "NONE";

    if (isOff) {
      status = "WEEKLY_OFF";
      workingHours = 0;
    } else if (remainingOt > 0) {
      otHours = Math.min(2, remainingOt);
      otStatus = "APPROVED";
      remainingOt -= otHours;
    }

    records.push({
      employeeId: employee._id,
      branchId: branch._id,
      attendancePolicyId: policy._id,
      attendanceDate: dateStr,
      status,
      checkIn: isOff ? null : "09:00",
      checkOut: isOff ? null : "18:00",
      workingHoursPerDay: workingHours,
      paidWorkingHours: workingHours,
      overtimeHours: otHours,
      overtimeStatus: otStatus,
      isManual: true,
    });
  }

  await DailyAttendance.insertMany(records);
}

// ============================================================================
// STAGE 3: TARGETED TEARDOWN (EXACT RUN IDENTIFIERS ONLY)
// ============================================================================

/**
 * Deletes ONLY the specific entities created during this execution.
 * Avoids any broad regex matching that could delete records belonging to another process.
 */
async function cleanupSpecificRunData() {
  assertDatabaseIsolation();

  const toObjIds = (set) =>
    Array.from(set)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

  const branchIds = toObjIds(trackedEntities.branchIds);
  const employeeIds = toObjIds(trackedEntities.employeeIds);
  const componentIds = toObjIds(trackedEntities.componentIds);
  const structureIds = toObjIds(trackedEntities.structureIds);
  const adjustmentIds = toObjIds(trackedEntities.adjustmentIds);
  const loanIds = toObjIds(trackedEntities.loanIds);
  const repaymentIds = toObjIds(trackedEntities.repaymentIds);
  const runIds = toObjIds(trackedEntities.runIds);
  const userIds = toObjIds(trackedEntities.userIds);
  const deptIds = toObjIds(trackedEntities.departmentIds);
  const policyIds = toObjIds(trackedEntities.policyIds);

  await Promise.all([
    Branch.deleteMany({ _id: { $in: branchIds } }),
    Department.deleteMany({ _id: { $in: deptIds } }),
    AttendancePolicy.deleteMany({ _id: { $in: policyIds } }),
    Employee.deleteMany({ _id: { $in: employeeIds } }),
    SalaryComponent.deleteMany({ _id: { $in: componentIds } }),
    EmployeeSalaryStructure.deleteMany({ _id: { $in: structureIds } }),
    SalaryAdjustment.deleteMany({ _id: { $in: adjustmentIds } }),
    EmployeeLoan.deleteMany({ _id: { $in: loanIds } }),
    LoanRepayment.deleteMany({ _id: { $in: repaymentIds } }),
    DailyAttendance.deleteMany({ employeeId: { $in: employeeIds } }),
    SalaryRecord.deleteMany({ salaryRunId: { $in: runIds } }),
    SalaryRun.deleteMany({ _id: { $in: runIds } }),
    User.deleteMany({ _id: { $in: userIds } }),
  ]);
}

// ============================================================================
// STAGE 4: HTTP CLIENT HELPER (In-Process Endpoint Testing)
// ============================================================================

/**
 * Standard HTTP request wrapper against the in-process test server.
 */
function makeRequest(baseUrl, path, { method = "GET", token = null, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let rawData = "";
      res.on("data", (chunk) => {
        rawData += chunk;
      });
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(rawData);
        } catch {
          json = rawData;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ============================================================================
// STAGE 5: E2E SCENARIOS (Implementation)
// ============================================================================

const testResults = [];

function recordScenario(id, title, passed, details = {}) {
  testResults.push({ id, title, passed, details });
  const icon = passed ? "[✓ PASS]" : "[✗ FAIL]";
  console.log(`${icon} ${id}: ${title}`);
  if (!passed) {
    console.error("  Details:", JSON.stringify(details, null, 2));
  }
}

/**
 * Scenario 1: RBAC & Multi-Branch Scoping Guards
 */
async function testScenario1_RBACAndAuthorization(baseUrl) {
  assertDatabaseIsolation();
  const branchA = await createSyntheticBranch("BR_A");
  const branchB = await createSyntheticBranch("BR_B");

  const unprivilegedUser = await createSyntheticUser({
    username: "cashier_user",
    email: "cashier",
    role: "cashier",
    permissions: ["POS.VIEW"],
    branchIds: [branchA._id],
  });
  const branchBUser = await createSyntheticUser({
    username: "branch_b_user",
    email: "branch_b",
    role: "hr_manager",
    permissions: ["HR.SALARY.PROCESS", "HR.SALARY.VIEW"],
    branchIds: [branchB._id],
  });

  const unprivilegedToken = tokenService.generateAccessToken({ userId: unprivilegedUser._id });
  const branchBToken = tokenService.generateAccessToken({ userId: branchBUser._id });

  // 1. Unauthenticated request to /runs
  const unauthRes = await makeRequest(baseUrl, "/runs");
  const unauthPass = unauthRes.status === 401;

  // 2. Insufficient permission (Cashier lacks HR.SALARY_PROCESS)
  const forbiddenRes = await makeRequest(baseUrl, "/runs", {
    method: "POST",
    token: unprivilegedToken,
    body: { branchId: branchA._id, payrollYear: 2026, payrollMonth: 9 },
  });
  const forbiddenPass = forbiddenRes.status === 403;

  // 3. Cross-branch access rejection (Branch B user attempting to create run for Branch A)
  const crossBranchRes = await makeRequest(baseUrl, "/runs", {
    method: "POST",
    token: branchBToken,
    body: { branchId: branchA._id, payrollYear: 2026, payrollMonth: 9 },
  });
  const crossBranchPass = crossBranchRes.status === 403;

  const passed = unauthPass && forbiddenPass && crossBranchPass;
  recordScenario("SCENARIO-1", "RBAC & Multi-Branch Scoping Access Control", passed, {
    unauthenticatedStatus: unauthRes.status,
    forbiddenStatus: forbiddenRes.status,
    crossBranchStatus: crossBranchRes.status,
  });
}

/**
 * Scenario 2: End-to-End Golden Path Calculation & Ledger Posting
 * 
 * Verified Mathematical Derivation:
 * - Period: September 2026 (30 calendar days).
 * - Leave allowance: 4 days -> salaryCalculationDays = 30 - 4 = 26 days.
 * - Required hours: 8 hrs/day -> Total standard hours = 26 * 8 = 208 hours.
 * - Monthly Package: ₹50,000.
 * - Hourly salary = money(50,000 / 208) = ₹240.38.
 * - Approved OT: 10 hours -> otAmount = money(10 * 240.38) = ₹2,403.80.
 * - Gross Pay = 50,000 + 2,403.80 = ₹52,403.80.
 * - Deductions: Component PF (₹2,000) + Advance (₹2,500) + Loan EMI (₹5,000) = ₹9,500.00.
 * - Net Pay = 52,403.80 - 9,500.00 = ₹42,903.80.
 * - Round Pay = Math.round(42,903.80) = ₹42,904.
 */
async function testScenario2_GoldenPathLifecycle(baseUrl) {
  assertDatabaseIsolation();
  const branch = await createSyntheticBranch("BR02");
  const policy = await createSyntheticPolicy(branch, "POL02");
  const dept = await createSyntheticDepartment("DEPT02");

  const employee = await createSyntheticEmployee({
    code: "EMP02",
    name: "Golden Path Employee",
    branchId: branch._id,
    departmentId: dept._id,
    policyId: policy._id,
    salary: 50000,
  });

  const adminUser = await createSyntheticUser({
    username: "admin_user",
    email: "admin",
    role: "admin",
    branchIds: [branch._id],
  });
  const adminToken = tokenService.generateAccessToken({ userId: adminUser._id });

  // Components: Basic 30k, HRA 10k, PF deduction 2k -> Auto residual Special Allowance: 10k
  const compBasic = await createSyntheticComponent({ code: "BASIC_02", name: "Basic Pay", componentType: "EARNING", defaultAmount: 30000 });
  const compHra = await createSyntheticComponent({ code: "HRA_02", name: "House Rent Allowance", componentType: "EARNING", defaultAmount: 10000 });
  const compPf = await createSyntheticComponent({ code: "PF_02", name: "Provident Fund", componentType: "DEDUCTION", defaultAmount: 2000 });

  await createSyntheticStructure({
    employeeId: employee._id,
    branchId: branch._id,
    monthlySalary: 50000,
    components: [
      { componentId: compBasic._id, amount: 30000, isEnabled: true },
      { componentId: compHra._id, amount: 10000, isEnabled: true },
      { componentId: compPf._id, amount: 2000, isEnabled: true },
    ],
  });

  // Seed attendance with exactly 10 hours approved OT
  await seedCompleteMonthlyAttendance({
    employee,
    branch,
    policy,
    year: 2026,
    month: 9,
    approvedOtHours: 10,
  });

  // Advance deduction: 2,500
  const adj = await SalaryAdjustment.create({
    employeeId: employee._id,
    branchId: branch._id,
    payrollMonth: 9,
    payrollYear: 2026,
    adjustmentType: "ADVANCE",
    amount: 2500,
    status: "PENDING",
    description: "Synthetic Golden Path Advance",
  });
  trackedEntities.adjustmentIds.add(adj._id);

  // Active Loan: 40,000 principal, 5,000 EMI, 20,000 balance
  const loan = await EmployeeLoan.create({
    employeeId: employee._id,
    branchId: branch._id,
    loanNumber: `${RUN_PREFIX}LN02`,
    loanAmount: 40000,
    loanDate: new Date("2026-01-01"),
    emiAmount: 5000,
    outstandingBalance: 20000,
    totalRepaid: 20000,
    status: "ACTIVE",
  });
  trackedEntities.loanIds.add(loan._id);

  // 1. POST /runs (Create Run)
  const createRes = await makeRequest(baseUrl, "/runs", {
    method: "POST",
    token: adminToken,
    body: { branchId: branch._id, payrollYear: 2026, payrollMonth: 9 },
  });
  const runId = createRes.data?.data?._id || createRes.data?._id;
  if (runId) trackedEntities.runIds.add(runId);

  // 2. POST /runs/:id/calculate
  const calcRes = await makeRequest(baseUrl, `/runs/${runId}/calculate`, {
    method: "POST",
    token: adminToken,
  });
  const calcData = calcRes.data?.data || calcRes.data;
  const record = (calcData.records || []).find((r) => String(r.employeeId._id || r.employeeId) === String(employee._id));

  // 3. POST /runs/:id/approve
  const approveRes = await makeRequest(baseUrl, `/runs/${runId}/approve`, {
    method: "POST",
    token: adminToken,
  });

  // 4. POST /runs/:id/pay
  const payRes = await makeRequest(baseUrl, `/runs/${runId}/pay`, {
    method: "POST",
    token: adminToken,
  });

  // Verify post-payment states
  const updatedLoan = await EmployeeLoan.findById(loan._id).lean();
  const repayments = await LoanRepayment.find({ employeeLoanId: loan._id }).lean();
  repayments.forEach((r) => trackedEntities.repaymentIds.add(r._id));
  const updatedAdj = await SalaryAdjustment.findById(adj._id).lean();

  const passed =
    createRes.status === 201 &&
    calcRes.status === 200 &&
    record.otAmount === 2403.8 &&
    record.grossPay === 52403.8 &&
    record.totalComponentDeductions === 2000 &&
    record.advanceTakenInPresentMonth === 2500 &&
    record.loanEmi === 5000 &&
    record.totalDeductions === 9500 &&
    record.roundPay === 42904 &&
    record.isDeficit === false &&
    approveRes.status === 200 &&
    payRes.status === 200 &&
    updatedLoan.outstandingBalance === 15000 &&
    repayments.length === 1 &&
    updatedAdj.status === "APPLIED";

  recordScenario("SCENARIO-2", "Golden Path Full Payroll Lifecycle & Exact Rounding", passed, {
    otAmount: record?.otAmount,
    grossPay: record?.grossPay,
    totalDeductions: record?.totalDeductions,
    roundPay: record?.roundPay,
    loanBalanceAfterPay: updatedLoan?.outstandingBalance,
    repaymentCount: repayments.length,
    adjustmentStatus: updatedAdj?.status,
  });
}

/**
 * Scenario 3: Period Boundary Approval Guards & Recalculation Lock
 */
async function testScenario3_PeriodBoundaryAndRecalculationLock(baseUrl) {
  assertDatabaseIsolation();
  const branch = await createSyntheticBranch("BR03");
  const policy = await createSyntheticPolicy(branch, "POL03");
  const dept = await createSyntheticDepartment("DEPT03");

  const employee = await createSyntheticEmployee({
    code: "EMP03",
    name: "Boundary Guard Employee",
    branchId: branch._id,
    departmentId: dept._id,
    policyId: policy._id,
  });

  const adminUser = await createSyntheticUser({
    username: "admin_user_03",
    email: "admin03",
    role: "admin",
    branchIds: [branch._id],
  });
  const adminToken = tokenService.generateAccessToken({ userId: adminUser._id });

  await createSyntheticStructure({
    employeeId: employee._id,
    branchId: branch._id,
    monthlySalary: 35000,
  });

  // Run for October 2026 (ongoing period relative to test clock): Approval MUST be blocked
  await seedCompleteMonthlyAttendance({
    employee,
    branch,
    policy,
    year: 2026,
    month: 10,
  });

  const runOct = await salaryService.createRun(
    { branchId: branch._id, payrollYear: 2026, payrollMonth: 10 },
    adminUser._id
  );
  trackedEntities.runIds.add(runOct._id);
  await salaryService.calculateRun(runOct._id, adminUser._id);

  // Premature approval attempt on ongoing period
  const prematureRes = await makeRequest(baseUrl, `/runs/${runOct._id}/approve`, {
    method: "POST",
    token: adminToken,
  });
  const prematureBlocked = prematureRes.status === 400 && prematureRes.data?.message?.includes("still ongoing");

  // Concluded run (September 2026): Approval succeeds, then recalculation is locked
  await seedCompleteMonthlyAttendance({
    employee,
    branch,
    policy,
    year: 2026,
    month: 9,
  });
  const runSep = await salaryService.createRun(
    { branchId: branch._id, payrollYear: 2026, payrollMonth: 9 },
    adminUser._id
  );
  trackedEntities.runIds.add(runSep._id);
  await salaryService.calculateRun(runSep._id, adminUser._id);

  // Approve September run
  const approveRes = await makeRequest(baseUrl, `/runs/${runSep._id}/approve`, {
    method: "POST",
    token: adminToken,
  });

  // Attempt recalculate on APPROVED run (Must be rejected with 409 Conflict)
  let recalcConflict = false;
  try {
    await salaryService.calculateRun(runSep._id, adminUser._id);
  } catch (err) {
    recalcConflict = err.statusCode === 409 || err.message?.includes("status changed concurrently");
  }

  const passed = prematureBlocked && approveRes.status === 200 && recalcConflict;
  recordScenario("SCENARIO-3", "Period Boundary Approval Guard & Recalculation Locking", passed, {
    prematureApprovalStatus: prematureRes.status,
    prematureErrorMessage: prematureRes.data?.message,
    concludedApprovalStatus: approveRes.status,
    recalculateBlockedOnApproved: recalcConflict,
  });
}

/**
 * Scenario 4: Payment Idempotency & Repeated Payment Protection
 */
async function testScenario4_PaymentIdempotency(baseUrl) {
  assertDatabaseIsolation();
  const branch = await createSyntheticBranch("BR04");
  const policy = await createSyntheticPolicy(branch, "POL04");
  const dept = await createSyntheticDepartment("DEPT04");

  const employee = await createSyntheticEmployee({
    code: "EMP04",
    name: "Idempotency Employee",
    branchId: branch._id,
    departmentId: dept._id,
    policyId: policy._id,
    salary: 40000,
  });

  const adminUser = await createSyntheticUser({
    username: "admin_user_04",
    email: "admin04",
    role: "admin",
    branchIds: [branch._id],
  });
  const adminToken = tokenService.generateAccessToken({ userId: adminUser._id });

  await createSyntheticStructure({
    employeeId: employee._id,
    branchId: branch._id,
    monthlySalary: 40000,
  });

  const loan = await EmployeeLoan.create({
    employeeId: employee._id,
    branchId: branch._id,
    loanNumber: `${RUN_PREFIX}LN04`,
    loanAmount: 30000,
    loanDate: new Date("2026-01-01"),
    emiAmount: 5000,
    outstandingBalance: 15000,
    totalRepaid: 15000,
    status: "ACTIVE",
  });
  trackedEntities.loanIds.add(loan._id);

  await seedCompleteMonthlyAttendance({
    employee,
    branch,
    policy,
    year: 2026,
    month: 9,
  });

  const run = await salaryService.createRun(
    { branchId: branch._id, payrollYear: 2026, payrollMonth: 9 },
    adminUser._id
  );
  trackedEntities.runIds.add(run._id);
  await salaryService.calculateRun(run._id, adminUser._id);

  // 1. Pay on non-approved run (Must fail with 409)
  const nonApprovedRes = await makeRequest(baseUrl, `/runs/${run._id}/pay`, {
    method: "POST",
    token: adminToken,
  });

  // 2. Approve run, then Pay (Must succeed)
  await salaryService.transitionRun(run._id, "approve", adminUser._id);
  const firstPayRes = await makeRequest(baseUrl, `/runs/${run._id}/pay`, {
    method: "POST",
    token: adminToken,
  });
  const loanAfterFirst = await EmployeeLoan.findById(loan._id).lean();
  const repaymentsFirst = await LoanRepayment.find({ employeeLoanId: loan._id }).lean();
  repaymentsFirst.forEach((r) => trackedEntities.repaymentIds.add(r._id));

  // 3. Repeated payment on already PAID run (Idempotent 200, no second balance deduction)
  const secondPayRes = await makeRequest(baseUrl, `/runs/${run._id}/pay`, {
    method: "POST",
    token: adminToken,
  });
  const loanAfterSecond = await EmployeeLoan.findById(loan._id).lean();
  const repaymentsSecond = await LoanRepayment.find({ employeeLoanId: loan._id }).lean();

  const passed =
    nonApprovedRes.status === 409 &&
    firstPayRes.status === 200 &&
    loanAfterFirst.outstandingBalance === 10000 &&
    repaymentsFirst.length === 1 &&
    secondPayRes.status === 200 &&
    loanAfterSecond.outstandingBalance === 10000 &&
    repaymentsSecond.length === 1;

  recordScenario("SCENARIO-4", "Payment Idempotency & Repeated Payment Protection", passed, {
    nonApprovedPaymentStatus: nonApprovedRes.status,
    firstPaymentStatus: firstPayRes.status,
    loanBalanceAfterFirst: loanAfterFirst.outstandingBalance,
    repeatedPaymentStatus: secondPayRes.status,
    loanBalanceAfterRepeated: loanAfterSecond.outstandingBalance,
    totalRepaymentsCreated: repaymentsSecond.length,
  });
}

/**
 * Scenario 5: Multi-Document Transaction Rollback Verification
 */
async function testScenario5_TransactionRollback(baseUrl) {
  assertDatabaseIsolation();
  const branch = await createSyntheticBranch("BR05");
  const policy = await createSyntheticPolicy(branch, "POL05");
  const dept = await createSyntheticDepartment("DEPT05");

  const employee = await createSyntheticEmployee({
    code: "EMP05",
    name: "Rollback Test Employee",
    branchId: branch._id,
    departmentId: dept._id,
    policyId: policy._id,
    salary: 40000,
  });

  const adminUser = await createSyntheticUser({
    username: "admin_user_05",
    email: "admin05",
    role: "admin",
    branchIds: [branch._id],
  });

  await createSyntheticStructure({
    employeeId: employee._id,
    branchId: branch._id,
    monthlySalary: 40000,
  });

  const loan = await EmployeeLoan.create({
    employeeId: employee._id,
    branchId: branch._id,
    loanNumber: `${RUN_PREFIX}LN05`,
    loanAmount: 20000,
    loanDate: new Date("2026-01-01"),
    emiAmount: 4000,
    outstandingBalance: 12000,
    totalRepaid: 8000,
    status: "ACTIVE",
  });
  trackedEntities.loanIds.add(loan._id);

  const adj = await SalaryAdjustment.create({
    employeeId: employee._id,
    branchId: branch._id,
    payrollMonth: 9,
    payrollYear: 2026,
    adjustmentType: "ADVANCE",
    amount: 1500,
    status: "PENDING",
    description: "Rollback Synthetic Advance",
  });
  trackedEntities.adjustmentIds.add(adj._id);

  await seedCompleteMonthlyAttendance({
    employee,
    branch,
    policy,
    year: 2026,
    month: 9,
  });

  const run = await salaryService.createRun(
    { branchId: branch._id, payrollYear: 2026, payrollMonth: 9 },
    adminUser._id
  );
  trackedEntities.runIds.add(run._id);
  await salaryService.calculateRun(run._id, adminUser._id);
  await salaryService.transitionRun(run._id, "approve", adminUser._id);

  // Inject fault into LoanRepayment.create strictly during transaction execution
  const originalCreate = LoanRepayment.create;
  let faultTriggered = false;
  LoanRepayment.create = async function (...args) {
    faultTriggered = true;
    throw new Error("INJECTED_TEST_FAULT_TRANSACTION_FAILURE");
  };

  let paymentFailedAsExpected = false;
  try {
    await salaryService.payRun(run._id, adminUser._id);
  } catch (err) {
    paymentFailedAsExpected = true;
  } finally {
    // Restore original method immediately
    LoanRepayment.create = originalCreate;
  }

  // Verify full rollback across all documents
  const runAfterRollback = await SalaryRun.findById(run._id).lean();
  const recordAfterRollback = await SalaryRecord.findOne({ salaryRunId: run._id }).lean();
  const loanAfterRollback = await EmployeeLoan.findById(loan._id).lean();
  const repaymentsAfterRollback = await LoanRepayment.find({ salaryRunId: run._id }).lean();
  const adjAfterRollback = await SalaryAdjustment.findById(adj._id).lean();

  const passed =
    faultTriggered &&
    paymentFailedAsExpected &&
    runAfterRollback.status === "APPROVED" &&
    recordAfterRollback.status === "APPROVED" &&
    recordAfterRollback.paid === 0 &&
    loanAfterRollback.outstandingBalance === 12000 &&
    repaymentsAfterRollback.length === 0 &&
    adjAfterRollback.status === "PENDING";

  recordScenario("SCENARIO-5", "Multi-Document Transaction Rollback Atomicity", passed, {
    faultInjectedAndCaught: faultTriggered && paymentFailedAsExpected,
    runStatusAfterRollback: runAfterRollback.status,
    recordStatusAfterRollback: recordAfterRollback.status,
    loanBalanceAfterRollback: loanAfterRollback.outstandingBalance,
    repaymentCount: repaymentsAfterRollback.length,
    adjustmentStatus: adjAfterRollback.status,
  });
}

/**
 * Scenario 6: Deficit Protection & Zero Net Pay Clamping
 */
async function testScenario6_DeficitHandlingAndApiCompatibility(baseUrl) {
  assertDatabaseIsolation();
  const branch = await createSyntheticBranch("BR06");
  const policy = await createSyntheticPolicy(branch, "POL06");
  const dept = await createSyntheticDepartment("DEPT06");

  const employee = await createSyntheticEmployee({
    code: "EMP06",
    name: "Deficit Test Employee",
    branchId: branch._id,
    departmentId: dept._id,
    policyId: policy._id,
    salary: 25000,
  });

  const adminUser = await createSyntheticUser({
    username: "admin_user_06",
    email: "admin06",
    role: "admin",
    branchIds: [branch._id],
  });
  const adminToken = tokenService.generateAccessToken({ userId: adminUser._id });

  await createSyntheticStructure({
    employeeId: employee._id,
    branchId: branch._id,
    monthlySalary: 25000,
  });

  // Deductions exceed gross pay: Advance 15k + Loan EMI 15k = 30k deductions > 25k gross
  const adj = await SalaryAdjustment.create({
    employeeId: employee._id,
    branchId: branch._id,
    payrollMonth: 9,
    payrollYear: 2026,
    adjustmentType: "ADVANCE",
    amount: 15000,
    status: "PENDING",
    description: "Large Advance Causing Deficit",
  });
  trackedEntities.adjustmentIds.add(adj._id);

  const loan = await EmployeeLoan.create({
    employeeId: employee._id,
    branchId: branch._id,
    loanNumber: `${RUN_PREFIX}LN06`,
    loanAmount: 50000,
    loanDate: new Date("2026-01-01"),
    emiAmount: 15000,
    outstandingBalance: 30000,
    totalRepaid: 20000,
    status: "ACTIVE",
  });
  trackedEntities.loanIds.add(loan._id);

  await seedCompleteMonthlyAttendance({
    employee,
    branch,
    policy,
    year: 2026,
    month: 9,
  });

  const run = await salaryService.createRun(
    { branchId: branch._id, payrollYear: 2026, payrollMonth: 9 },
    adminUser._id
  );
  trackedEntities.runIds.add(run._id);
  await salaryService.calculateRun(run._id, adminUser._id);

  // Retrieve records via HTTP API to verify frontend payload compatibility
  const recordsRes = await makeRequest(baseUrl, `/records?salaryRunId=${run._id}&branchId=${branch._id}`, {
    method: "GET",
    token: adminToken,
  });
  const recordsList = recordsRes.data?.data || recordsRes.data || [];
  const rec = recordsList.find((r) => String(r.employeeId._id || r.employeeId) === String(employee._id));

  const passed =
    recordsRes.status === 200 &&
    rec &&
    rec.grossPay === 25000 &&
    rec.totalDeductions === 30000 &&
    rec.roundPay === 0 &&
    rec.isDeficit === true &&
    rec.deficitAmount === 5000;

  recordScenario("SCENARIO-6", "Deficit Handling Clamps Net Pay to Zero & Sets Deficit Flag", passed, {
    httpStatus: recordsRes.status,
    grossPay: rec?.grossPay,
    totalDeductions: rec?.totalDeductions,
    roundPay: rec?.roundPay,
    isDeficit: rec?.isDeficit,
    deficitAmount: rec?.deficitAmount,
  });
}

/**
 * Scenario 7: Orphaned Component Reference Fallback & Package Preservation
 */
async function testScenario7_OrphanedComponentReference(baseUrl) {
  assertDatabaseIsolation();
  const branch = await createSyntheticBranch("BR07");
  const policy = await createSyntheticPolicy(branch, "POL07");
  const dept = await createSyntheticDepartment("DEPT07");

  const employee = await createSyntheticEmployee({
    code: "EMP07",
    name: "Orphaned Reference Employee",
    branchId: branch._id,
    departmentId: dept._id,
    policyId: policy._id,
    salary: 45000,
  });

  const adminUser = await createSyntheticUser({
    username: "admin_user_07",
    email: "admin07",
    role: "admin",
    branchIds: [branch._id],
  });

  // Create and delete catalog component to produce orphaned componentId reference
  const tempComp = await createSyntheticComponent({
    code: "TEMP_TO_DELETE",
    name: "Temporary Deleted Allowance",
    componentType: "EARNING",
    defaultAmount: 5000,
  });
  await SalaryComponent.findByIdAndDelete(tempComp._id);
  trackedEntities.componentIds.delete(tempComp._id);

  await createSyntheticStructure({
    employeeId: employee._id,
    branchId: branch._id,
    monthlySalary: 45000,
    components: [
      { componentId: tempComp._id, amount: 5000, isEnabled: true },
    ],
  });

  await seedCompleteMonthlyAttendance({
    employee,
    branch,
    policy,
    year: 2026,
    month: 9,
  });

  const run = await salaryService.createRun(
    { branchId: branch._id, payrollYear: 2026, payrollMonth: 9 },
    adminUser._id
  );
  trackedEntities.runIds.add(run._id);

  // Engine must not crash; component must fallback to "COMPONENT" / "Component" and amount 5000
  const calculated = await salaryService.calculateRun(run._id, adminUser._id);
  const rec = calculated.records.find((r) => String(r.employeeId._id || r.employeeId) === String(employee._id));

  const orphanComp = (rec.components || []).find((c) => c.code === "COMPONENT");
  const saComp = (rec.components || []).find((c) => c.code === "SPECIAL_ALLOWANCE");

  // Orphaned component (₹5,000) + Auto Special Allowance residual (₹40,000) = ₹45,000
  const passed =
    orphanComp !== undefined &&
    orphanComp.name === "Component" &&
    orphanComp.amount === 5000 &&
    saComp !== undefined &&
    saComp.amount === 40000 &&
    rec.grossPay === 45000 &&
    rec.roundPay === 45000;

  recordScenario("SCENARIO-7", "Orphaned Component Reference Safe Fallback & Reconciliation", passed, {
    fallbackCode: orphanComp?.code,
    fallbackName: orphanComp?.name,
    fallbackAmount: orphanComp?.amount,
    specialAllowanceAmount: saComp?.amount,
    roundPay: rec?.roundPay,
  });
}

/**
 * Scenario 8: Historical Legacy Record Backward Compatibility
 */
async function testScenario8_HistoricalLegacyCompatibility(baseUrl) {
  assertDatabaseIsolation();
  const branch = await createSyntheticBranch("BR08");
  const dept = await createSyntheticDepartment("DEPT08");

  const employee = await createSyntheticEmployee({
    code: "EMP08",
    name: "Legacy Historical Employee",
    branchId: branch._id,
    departmentId: dept._id,
    salary: 30000,
  });

  const adminUser = await createSyntheticUser({
    username: "admin_user_08",
    email: "admin08",
    role: "admin",
    branchIds: [branch._id],
  });

  // Direct creation of legacy SalaryRun and SalaryRecord simulating older DB schema
  const legacyRun = await SalaryRun.create({
    branchId: branch._id,
    payrollMonth: 8,
    payrollYear: 2026,
    periodStart: new Date("2026-08-01T00:00:00.000Z"),
    periodEnd: new Date("2026-08-31T23:59:59.999Z"),
    status: "PAID",
    totalGrossPay: 30000,
    totalNetPay: 25000,
    employeeCount: 1,
    createdBy: adminUser._id,
  });
  trackedEntities.runIds.add(legacyRun._id);

  const legacyRecord = await SalaryRecord.create({
    salaryRunId: legacyRun._id,
    employeeId: employee._id,
    branchId: branch._id,
    payrollMonth: 8,
    payrollYear: 2026,
    monthlySalary: 30000,
    calendarDaysInMonth: 31,
    salaryCalculationDays: 27,
    requiredWorkingHoursPerDay: 8,
    hourlySalary: 138.89,
    perDaySalary: 1111.11,
    salaryOfThisMonth: 30000,
    daysWorked: 27,
    grossPay: 30000,
    advanceTakenInPresentMonth: 3000,
    loanEmi: 2000,
    roundPay: 25000,
    status: "PAID",
    paid: 25000,
    balance: 0,
    // Note: components, totalComponentEarnings, totalComponentDeductions omitted intentionally
  });

  // Query via service attachRecordVirtuals to verify backward compatibility
  const retrievedRecords = await salaryService.listRecords({ salaryRunId: legacyRun._id });
  const rec = retrievedRecords.find((r) => String(r._id) === String(legacyRecord._id));

  // Virtuals should resolve: totalDeductions = 3000 + 2000 = 5000, roundPay = 25000, isDeficit = false
  const passed =
    rec !== undefined &&
    rec.totalDeductions === 5000 &&
    rec.roundPay === 25000 &&
    rec.isDeficit === false;

  recordScenario("SCENARIO-8", "Historical Legacy Record Backward Compatibility", passed, {
    retrievedTotalDeductions: rec?.totalDeductions,
    retrievedRoundPay: rec?.roundPay,
    retrievedIsDeficit: rec?.isDeficit,
  });
}

// ============================================================================
// STAGE 6: RUNNER HARNESS (Ordered Execution & Guaranteed Teardown)
// ============================================================================

async function runStagingE2ESuite() {
  console.log("======================================================================");
  console.log("STARTING STAGING END-TO-END (E2E) VERIFICATION SUITE");
  console.log("======================================================================");

  let replSet = null;
  let server = null;
  let testUri = null;

  try {
    console.log("1. Starting ephemeral MongoDB replica set (WiredTiger, 127.0.0.1)...");
    const started = await startStagingReplicaSet();
    replSet = started.replSet;
    testUri = started.uri;
    console.log("   Ephemeral Replica Set Active. Target URI:", testUri);

    console.log("2. Initializing collections and pre-warming indexes outside transactions...");
    await initializeCollectionsAndIndexes();
    console.log("   All collections and indexes ready.");

    console.log("3. Starting in-process HTTP server on 127.0.0.1:0...");
    const httpStarted = await startStagingHttpServer();
    server = httpStarted.server;
    const baseUrl = httpStarted.baseUrl;
    console.log(`   In-process HTTP server active at ${baseUrl}`);

    console.log("\n4. Executing End-to-End Scenarios...");
    await testScenario1_RBACAndAuthorization(baseUrl);
    await testScenario2_GoldenPathLifecycle(baseUrl);
    await testScenario3_PeriodBoundaryAndRecalculationLock(baseUrl);
    await testScenario4_PaymentIdempotency(baseUrl);
    await testScenario5_TransactionRollback(baseUrl);
    await testScenario6_DeficitHandlingAndApiCompatibility(baseUrl);
    await testScenario7_OrphanedComponentReference(baseUrl);
    await testScenario8_HistoricalLegacyCompatibility(baseUrl);

    console.log("\n======================================================================");
    const passCount = testResults.filter((r) => r.passed).length;
    const failCount = testResults.filter((r) => !r.passed).length;
    console.log(`E2E SUITE COMPLETED: ${passCount}/${testResults.length} Passed, ${failCount} Failed`);
    console.log("======================================================================");

    if (failCount > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("\n[FATAL ERROR IN STAGING E2E HARNESS]:", err);
    process.exitCode = 1;
  } finally {
    console.log("Ensuring clean teardown of synthetic test data, server, and database...");
    try {
      if (mongoose && mongoose.connection && mongoose.connection.readyState === 1) {
        await cleanupSpecificRunData();
        console.log("✓ Tracked synthetic records deleted.");
      }
    } catch (cleanupErr) {
      console.error("Warning: Cleanup error:", cleanupErr.message);
    }

    try {
      if (server) {
        await new Promise((res) => server.close(res));
        console.log("✓ In-process HTTP server stopped.");
      }
    } catch (serverErr) {
      console.error("Warning: Server close error:", serverErr.message);
    }

    try {
      if (mongoose && mongoose.connection && mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        console.log("✓ Mongoose disconnected.");
      }
    } catch (dbErr) {
      console.error("Warning: Disconnect error:", dbErr.message);
    }

    try {
      if (replSet) {
        await replSet.stop();
        console.log("✓ Ephemeral replica set stopped.");
      }
    } catch (replSetErr) {
      console.error("Warning: Replica set stop error:", replSetErr.message);
    }
  }
}

// Module export for inspection and testing harness
module.exports = {
  runStagingE2ESuite,
  testScenario1_RBACAndAuthorization,
  testScenario2_GoldenPathLifecycle,
  testScenario3_PeriodBoundaryAndRecalculationLock,
  testScenario4_PaymentIdempotency,
  testScenario5_TransactionRollback,
  testScenario6_DeficitHandlingAndApiCompatibility,
  testScenario7_OrphanedComponentReference,
  testScenario8_HistoricalLegacyCompatibility,
};

if (require.main === module) {
  runStagingE2ESuite();
}
