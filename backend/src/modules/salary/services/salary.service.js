const mongoose = require("mongoose");
const {
  SalaryComponent,
  EmployeeSalaryStructure,
  SalaryRun,
  SalaryRecord,
  SalaryAdjustment,
  EmployeeLoan,
  LoanRepayment
} = require("../models");
const Employee = require("../../employees/models/Employee");
const Branch = require("../../branches/models/Branch");
const { sameSchedule, toNames } = require("../../../utils/helpers/weeklyOff.util");
const { computeLopDays } = require("../../../utils/helpers/lop.util");
const AttendancePolicy = require("../../attendance/models/AttendancePolicy");
const DailyAttendance = require("../../attendance/models/DailyAttendance");
const HolidayCalendar = require("../../attendance/models/HolidayCalendar");
const EmployeeBranchAssignment = require("../../employees/models/EmployeeBranchAssignment");
const ApiError = require("../../../utils/errors/ApiError");
const fieldRules = require("../../../utils/validation/fieldRules");
const { getTodayDateString } = require("../../../utils/helpers/dateUtils");

const money = (n) => require("../../../utils/validation/roundMoney").roundMoney(n || 0);

const idVariants = (id) => {
  if (!id) return [];
  const s = String(id._id || id);
  const values = [s];
  if (mongoose.Types.ObjectId.isValid(s)) values.push(new mongoose.Types.ObjectId(s));
  return values;
};

const idString = (id) => String(id && id._id ? id._id : id || "");

// Rows grouped by the employee they belong to (the employee id may be stored as text or as an ObjectId)
const groupByEmployee = (rows) => {
  const grouped = new Map();
  for (const row of rows) {
    const key = idString(row.employeeId);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  return grouped;
};

const monthBounds = (year, month) => ({
  start: new Date(Date.UTC(year, month - 1, 1)),
  end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  days: new Date(Date.UTC(year, month, 0)).getUTCDate()
});

// Mandatory (non-optional) holiday dates of a branch for a year. A branch without its own
// calendar falls back to the organization calendar.
const loadMandatoryHolidayDates = async (branchId, year) => {
  let calendar = await HolidayCalendar.findOne({
    branchId: { $in: idVariants(branchId) },
    year,
    isActive: true,
  }).lean();
  if (!calendar) {
    calendar = await HolidayCalendar.findOne({ branchId: null, year, isActive: true }).lean();
  }
  const dates = new Set();
  if (calendar && Array.isArray(calendar.holidays)) {
    for (const h of calendar.holidays) {
      if (!h || !h.date) continue;
      const isOptional = Boolean(h.isOptional === true || String(h.type || "").toUpperCase() === "OPTIONAL");
      if (!isOptional) dates.add(String(h.date).trim().split("T")[0]);
    }
  }
  return dates;
};

// Holiday dates and weekly-off days that apply while an employee works at another branch.
const loadBranchDayRules = async (branchId, year, cache) => {
  const key = idString(branchId);
  if (cache.has(key)) return cache.get(key);

  const [branch, policy, holidayDates] = await Promise.all([
    Branch.findById(key).select("name").lean().catch(() => null),
    AttendancePolicy.findOne({ isActive: true, branchId: { $in: idVariants(branchId) } })
      .sort({ createdAt: -1 })
      .lean(),
    loadMandatoryHolidayDates(branchId, year),
  ]);
  const name = branch?.name || key;
  if (!policy) {
    throw ApiError.validation(
      `Cannot calculate payroll: no active attendance policy is configured for branch '${name}', where an employee is temporarily shifted. Create and activate one in Attendance Setup, then calculate again.`
    );
  }
  const rules = {
    branchName: name,
    holidayDates,
    weeklyOffDays: Array.isArray(policy.weeklyOffDays) ? policy.weeklyOffDays : [],
  };
  cache.set(key, rules);
  return rules;
};

// Map of YYYY-MM-DD -> destination branch rules for the dates of the month an employee
// spends on a temporary branch shift (cancelled shifts are ignored).
const resolveShiftedDayRules = async (employeeId, year, month, days, cache, preloadedShifts = null) => {
  const { start, end } = monthBounds(year, month);
  // A payroll run loads every employee's shifts in one query and passes this employee's here
  const shifts = preloadedShifts || await EmployeeBranchAssignment.find({
    employeeId: { $in: idVariants(employeeId) },
    assignmentType: "TEMPORARY",
    status: { $ne: "CANCELLED" },
    fromDate: { $lte: end },
    toDate: { $gte: start },
  }).lean();

  const byDate = new Map();
  const summaries = [];
  for (const shift of shifts) {
    const fromKey = new Date(shift.fromDate).toISOString().slice(0, 10);
    const toKey = new Date(shift.toDate).toISOString().slice(0, 10);
    const rules = await loadBranchDayRules(shift.branchId, year, cache);
    let firstDay = null;
    let lastDay = null;
    let count = 0;
    for (let d = 1; d <= days; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (dateStr >= fromKey && dateStr <= toKey) {
        byDate.set(dateStr, rules);
        if (!firstDay) firstDay = dateStr;
        lastDay = dateStr;
        count += 1;
      }
    }
    if (count > 0) {
      summaries.push({
        shiftId: shift._id,
        branchId: shift.branchId,
        branchName: rules.branchName,
        fromDate: firstDay,
        toDate: lastDay,
        totalDays: count,
      });
    }
  }
  summaries.sort((a, b) => a.fromDate.localeCompare(b.fromDate));
  return { byDate, summaries };
};

const parsePagination = (filters = {}) => {
  const pageRaw = filters.page;
  const limitRaw = filters.limit;

  const page = Math.max(1, parseInt(pageRaw, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(limitRaw, 10) || 50));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const formatPaginatedResult = (items, total, page, limit) => {
  const totalPages = Math.ceil(total / limit) || 1;
  const meta = {
    total,
    page,
    limit,
    totalPages,
  };
  items.total = total;
  items.page = page;
  items.limit = limit;
  items.totalPages = totalPages;
  items.meta = meta;
  return items;
};

// Branch references are stored as Mixed ids, so names are resolved here rather than through populate().
const loadNameMap = async (Model, ids) => {
  const unique = [...new Set(ids.map(idString).filter((v) => v && mongoose.Types.ObjectId.isValid(v)))];
  if (!unique.length) return {};
  const docs = await Model.find({ _id: { $in: unique.map((v) => new mongoose.Types.ObjectId(v)) } })
    .select("name")
    .lean();
  const map = {};
  docs.forEach((d) => {
    map[String(d._id)] = d.name;
  });
  return map;
};

// Adds `branchName` to each item.
const attachNames = async (items) => {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return items;
  const branchNames = await loadNameMap(Branch, list.map((i) => i.branchId));
  list.forEach((item) => {
    const bId = idString(item.branchId);
    if (bId && branchNames[bId]) item.branchName = branchNames[bId];
  });
  return items;
};

const EMPLOYEE_SELECT = "employeeCode name mobile email dateOfBirth";

// True when the loan has a skip recorded for this payroll month.
const isLoanSkipped = (loan, month, year) =>
  (loan.skippedMonths || []).some((s) => Number(s.month) === Number(month) && Number(s.year) === Number(year));

// Payroll deducts a loan's EMI only when it is on auto-deduction and not skipped this month.
const loanDueInPeriod = (loan, month, year) =>
  loan.autoDeduct !== false && !isLoanSkipped(loan, month, year);

const isTransientTransactionError = (err) => {
  if (!err) return false;
  if (err instanceof ApiError || err.name === "ApiError" || err.isOperational) return false;
  if (err.name === "ValidationError" || err.name === "CastError") return false;

  // Whole-transaction retry is strictly for TransientTransactionError and WriteConflict (code 112).
  // UnknownTransactionCommitResult must NOT trigger a new whole-transaction retry.
  if (typeof err.hasErrorLabel === "function") {
    if (err.hasErrorLabel("TransientTransactionError")) return true;
  }
  if (err.errorLabels) {
    if (Array.isArray(err.errorLabels)) {
      if (err.errorLabels.includes("TransientTransactionError")) {
        return true;
      }
    } else if (typeof err.errorLabels.has === "function") {
      if (err.errorLabels.has("TransientTransactionError")) {
        return true;
      }
    }
  }
  return err.code === 112 || err.codeName === "WriteConflict";
};

const isUnknownCommitResultError = (err) => {
  if (!err) return false;
  if (typeof err.hasErrorLabel === "function") {
    if (err.hasErrorLabel("UnknownTransactionCommitResult")) return true;
  }
  if (err.errorLabels) {
    if (Array.isArray(err.errorLabels)) {
      if (err.errorLabels.includes("UnknownTransactionCommitResult")) {
        return true;
      }
    } else if (typeof err.errorLabels.has === "function") {
      if (err.errorLabels.has("UnknownTransactionCommitResult")) {
        return true;
      }
    }
  }
  return false;
};

const isRunMidMonthPreview = (run) => {
  if (!run || !run.payrollYear || !run.payrollMonth) return false;
  if (!run.calculatedAt) return false;
  if (["APPROVED", "PAID", "LOCKED"].includes(run.status)) return false;
  const { days } = monthBounds(run.payrollYear, run.payrollMonth);
  const endDateStr = `${run.payrollYear}-${String(run.payrollMonth).padStart(2, "0")}-${String(days).padStart(2, "0")}`;
  const calcDateStr = getTodayDateString(run.calculatedAt);
  return calcDateStr <= endDateStr;
};

const attachRunVirtuals = (run) => {
  if (!run) return run;
  return {
    ...run,
    isMidMonthPreview: isRunMidMonthPreview(run),
  };
};

const isRecordMidMonthPreview = (record) => {
  if (!record || !record.payrollYear || !record.payrollMonth) return false;
  if (["APPROVED", "PARTIALLY_PAID", "PAID", "LOCKED"].includes(record.status)) return false;
  const { days } = monthBounds(record.payrollYear, record.payrollMonth);
  const endDateStr = `${record.payrollYear}-${String(record.payrollMonth).padStart(2, "0")}-${String(days).padStart(2, "0")}`;
  const calcDateStr = getTodayDateString(record.calculatedAt || record.updatedAt || record.createdAt || new Date());
  return calcDateStr <= endDateStr;
};

const attachRecordVirtuals = (record, isMidMonthPreviewOverride) => {
  if (!record) return record;
  const totalDeductions = money(
    (record.totalComponentDeductions || 0) +
    (record.advanceTakenInPresentMonth || 0) +
    (record.shortageDeduction || 0) +
    (record.wastageDeduction || 0) +
    (record.employeePurchaseDeduction || 0) +
    (record.loanEmi || 0) +
    (record.otherDeductions || 0) +
    (record.lopDeduction || 0)
  );
  const isMidMonthPreview = typeof isMidMonthPreviewOverride === "boolean"
    ? isMidMonthPreviewOverride
    : isRecordMidMonthPreview(record);
  return {
    ...record,
    totalDeductions,
    isMidMonthPreview,
    isDeficit: Boolean(record.isDeficit),
    deficitAmount: Number(record.deficitAmount || 0),
  };
};

const evaluateStructureComponents = ({
  structure,
  monthlySalary,
  daysWorked = 0,
  paidLeaveDays = 0,
  totalRegularHours = 0,
  grossPayBase = 0,
}) => {
  const rawComponents = Array.isArray(structure?.components)
    ? structure.components.filter((c) => c && c.isEnabled !== false)
    : [];

  const evaluatedEarnings = [];
  const evaluatedDeductions = [];

  // Fallback for employees without configured components: provide basic package
  if (!rawComponents.length) {
    evaluatedEarnings.push({
      componentId: null,
      code: "BASIC",
      name: "Basic Salary",
      componentType: "EARNING",
      calculationType: "FIXED",
      percentageOf: "BASIC",
      rate: 0,
      amount: money(monthlySalary),
      isTaxable: true,
    });
    return {
      evaluatedComponents: evaluatedEarnings,
      totalComponentEarnings: money(monthlySalary),
      totalComponentDeductions: 0,
    };
  }

  // Pass 1: Initial evaluation of earning components (except percentage of BASIC)
  let basicAmount = null;

  for (const sc of rawComponents) {
    const compDoc = sc.componentId && typeof sc.componentId === "object" ? sc.componentId : null;
    const code = String(compDoc?.code || sc.code || "COMPONENT").toUpperCase().trim();
    const name = String(compDoc?.name || sc.name || (code !== "COMPONENT" ? code : "Component")).trim();
    const componentType = String(compDoc?.componentType || sc.componentType || "EARNING").toUpperCase();
    const calculationType = String(compDoc?.calculationType || sc.calculationType || "FIXED").toUpperCase();
    const percentageOf = String(compDoc?.percentageOf || sc.percentageOf || "BASIC").toUpperCase();
    const isTaxable = Boolean(compDoc?.isTaxable ?? sc.isTaxable);
    const rateVal = Number(calculationType === "PERCENTAGE" ? (sc.percentage ?? compDoc?.defaultAmount ?? 0) : (sc.amount ?? compDoc?.defaultAmount ?? 0));

    if (componentType === "EARNING") {
      let amount = 0;
      if (calculationType === "FIXED" || calculationType === "MANUAL") {
        amount = money(rateVal);
      } else if (calculationType === "PER_DAY") {
        amount = money(rateVal * (daysWorked + paidLeaveDays));
      } else if (calculationType === "PER_HOUR") {
        amount = money(rateVal * totalRegularHours);
      } else if (calculationType === "PERCENTAGE" && percentageOf === "MONTHLY_SALARY") {
        amount = money((monthlySalary * rateVal) / 100);
      }

      const item = {
        componentId: compDoc?._id || sc.componentId?._id || sc.componentId || null,
        code,
        name,
        componentType: "EARNING",
        calculationType,
        percentageOf,
        rate: rateVal,
        amount,
        isTaxable,
      };

      if (code === "BASIC") {
        basicAmount = amount;
      }
      evaluatedEarnings.push(item);
    }
  }

  // Fallback basicAmount to monthlySalary if absent or zero
  if (basicAmount === null || basicAmount <= 0) {
    basicAmount = monthlySalary;
  }

  // Pass 2: Evaluate earnings with percentageOf === "BASIC" (excluding BASIC itself)
  for (const item of evaluatedEarnings) {
    if (item.calculationType === "PERCENTAGE" && item.percentageOf === "BASIC" && item.code !== "BASIC") {
      item.amount = money((basicAmount * item.rate) / 100);
    }
  }

  // Pass 3: Package Reconciliation & Single Special Allowance Reuse (Enforcing no duplicate Special Allowance)
  const saIndex = evaluatedEarnings.findIndex(
    (c) => c.code === "SPECIAL_ALLOWANCE" || c.code === "SA"
  );

  if (saIndex !== -1) {
    const otherEarningsSum = evaluatedEarnings
      .filter((_, idx) => idx !== saIndex)
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const otherRounded = money(otherEarningsSum);

    if (otherRounded > monthlySalary) {
      throw ApiError.validation(
        `Configured earning components (₹${otherRounded}) exceed the monthly salary package (₹${monthlySalary}).`
      );
    }

    evaluatedEarnings[saIndex].amount = money(monthlySalary - otherRounded);
  } else {
    const totalConfigured = money(
      evaluatedEarnings.reduce((sum, c) => sum + Number(c.amount || 0), 0)
    );

    if (totalConfigured > monthlySalary) {
      throw ApiError.validation(
        `Configured earning components (₹${totalConfigured}) exceed the monthly salary package (₹${monthlySalary}).`
      );
    }

    const residual = money(monthlySalary - totalConfigured);
    if (residual > 0) {
      evaluatedEarnings.push({
        componentId: null,
        code: "SPECIAL_ALLOWANCE",
        name: "Special Allowance",
        componentType: "EARNING",
        calculationType: "FIXED",
        percentageOf: "BASIC",
        rate: 0,
        amount: residual,
        isTaxable: true,
      });
    }
  }

  const totalComponentEarnings = money(
    evaluatedEarnings.reduce((sum, c) => sum + Number(c.amount || 0), 0)
  );

  // Pass 4: Evaluate deduction components (using grossPayBase explicitly for percentageOf: "GROSS")
  for (const sc of rawComponents) {
    const compDoc = sc.componentId && typeof sc.componentId === "object" ? sc.componentId : null;
    const code = String(compDoc?.code || sc.code || "COMPONENT").toUpperCase().trim();
    const name = String(compDoc?.name || sc.name || (code !== "COMPONENT" ? code : "Component")).trim();
    const componentType = String(compDoc?.componentType || sc.componentType || "").toUpperCase();
    const calculationType = String(compDoc?.calculationType || sc.calculationType || "FIXED").toUpperCase();
    const percentageOf = String(compDoc?.percentageOf || sc.percentageOf || "BASIC").toUpperCase();
    const isTaxable = Boolean(compDoc?.isTaxable ?? sc.isTaxable);
    const rateVal = Number(calculationType === "PERCENTAGE" ? (sc.percentage ?? compDoc?.defaultAmount ?? 0) : (sc.amount ?? compDoc?.defaultAmount ?? 0));

    if (componentType === "DEDUCTION") {
      let amount = 0;
      if (calculationType === "FIXED" || calculationType === "MANUAL") {
        amount = money(rateVal);
      } else if (calculationType === "PERCENTAGE") {
        if (percentageOf === "BASIC") {
          amount = money((basicAmount * rateVal) / 100);
        } else if (percentageOf === "MONTHLY_SALARY") {
          amount = money((monthlySalary * rateVal) / 100);
        } else if (percentageOf === "GROSS") {
          // Explicitly use Pass 4 Gross Pay Base (including OT & incentives)
          amount = money((grossPayBase * rateVal) / 100);
        }
      }

      evaluatedDeductions.push({
        componentId: compDoc?._id || sc.componentId?._id || sc.componentId || null,
        code,
        name,
        componentType: "DEDUCTION",
        calculationType,
        percentageOf,
        rate: rateVal,
        amount,
        isTaxable,
      });
    }
  }

  const totalComponentDeductions = money(
    evaluatedDeductions.reduce((sum, c) => sum + Number(c.amount || 0), 0)
  );

  return {
    evaluatedComponents: [...evaluatedEarnings, ...evaluatedDeductions],
    totalComponentEarnings,
    totalComponentDeductions,
  };
};

class SalaryService {
  async listRuns(filters = {}) {
    const q = {};
    if (filters.branchId) q.branchId = { $in: idVariants(filters.branchId) };
    if (filters.payrollMonth) q.payrollMonth = Number(filters.payrollMonth);
    if (filters.payrollYear) q.payrollYear = Number(filters.payrollYear);
    if (filters.status) q.status = filters.status;
    const runs = await SalaryRun.find(q).sort({ payrollYear: -1, payrollMonth: -1, createdAt: -1 }).lean();
    return attachNames(runs.map(attachRunVirtuals));
  }

  async getRun(id) {
    const run = await SalaryRun.findById(id).lean();
    if (!run) throw ApiError.notFound("Salary run not found.");
    const formattedRun = attachRunVirtuals(run);
    const records = await SalaryRecord.find({ salaryRunId: run._id })
      .populate("employeeId", EMPLOYEE_SELECT)
      .sort({ createdAt: 1 }).lean();
    const mapped = await attachNames(records.map((r) => attachRecordVirtuals(r, formattedRun.isMidMonthPreview)));
    const [withBranch] = await attachNames([formattedRun]);
    return {
      ...withBranch,
      records: mapped,
    };
  }

  async createRun(data, userId, context = {}) {
    const month = Number(data.payrollMonth);
    const year = Number(data.payrollYear);
    const branchId = data.branchId;
    if (!branchId) throw ApiError.validation("branchId is required.");
    if (!Number.isInteger(month) || month < 1 || month > 12) throw ApiError.validation("payrollMonth must be 1-12.");
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw ApiError.validation("Invalid payrollYear.");

    // Duplicate payroll prevention
    const existingRun = await SalaryRun.findOne({
      branchId: { $in: idVariants(branchId) },
      payrollMonth: month,
      payrollYear: year
    });
    if (existingRun) {
      throw ApiError.conflict(`A salary run already exists for this branch for period ${year}-${String(month).padStart(2, "0")}.`);
    }

    const bounds = monthBounds(year, month);
    const run = await SalaryRun.create({
      branchId,
      payrollMonth: month,
      payrollYear: year,
      periodStart: bounds.start,
      periodEnd: bounds.end,
      status: "DRAFT",
      createdBy: userId || null,
      updatedBy: userId || null
    });

    return attachRunVirtuals(run.toObject ? run.toObject() : run);
  }

  async calculateRun(runId, userId, options = {}) {
    const rId = idString(runId);
    if (!rId) throw ApiError.validation("Salary run ID is required.");

    const todayStr = (options && options.asOfDate) ? getTodayDateString(options.asOfDate) : getTodayDateString();

    const calculationAttemptId = `CALC-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    // Atomically claim the run in CALCULATING state only if currently DRAFT or CALCULATED
    // new: false returns the document BEFORE the transition to CALCULATING
    const claimedRun = await SalaryRun.findOneAndUpdate(
      {
        _id: rId,
        status: { $in: ["DRAFT", "CALCULATED"] }
      },
      {
        $set: {
          status: "CALCULATING",
          calculationAttemptId,
          updatedBy: userId || null,
          updatedAt: new Date()
        }
      },
      { new: false }
    );

    if (!claimedRun) {
      const currentRun = await SalaryRun.findById(rId);
      if (!currentRun) {
        throw ApiError.notFound("Salary run not found.");
      }
      if (currentRun.status === "CALCULATING") {
        throw ApiError.conflict("Salary run calculation is currently in progress. Concurrent calculation is not permitted.");
      }
      if (["APPROVED", "PAID", "LOCKED"].includes(currentRun.status)) {
        throw ApiError.conflict("Approved, paid, or locked salary runs cannot be recalculated.");
      }
      throw ApiError.conflict(`Salary run cannot be calculated in its current status (${currentRun.status}).`);
    }

    const beforeCalculationSnapshot = {
      status: claimedRun.status,
      employeeCount: claimedRun.employeeCount,
      totalGrossPay: claimedRun.totalGrossPay,
      totalDeductions: claimedRun.totalDeductions,
      totalNetPay: claimedRun.totalNetPay,
    };

    const run = {
      ...(claimedRun.toObject ? claimedRun.toObject() : claimedRun),
      status: "CALCULATING",
      calculationAttemptId,
    };

    let session = null;
    let existingRecordsBackup = null;

    try {
      const { start, end, days } = monthBounds(run.payrollYear, run.payrollMonth);
      const startDateStr = `${run.payrollYear}-${String(run.payrollMonth).padStart(2, "0")}-01`;
      const endDateStr = `${run.payrollYear}-${String(run.payrollMonth).padStart(2, "0")}-${String(days).padStart(2, "0")}`;

      if (startDateStr > todayStr) {
        throw ApiError.validation(
          `Cannot calculate payroll: The payroll period (${run.payrollYear}-${String(run.payrollMonth).padStart(2, "0")}) is in the future and has not started yet.`
        );
      }

      const branchVariants = idVariants(run.branchId);
      const branchDoc = mongoose.Types.ObjectId.isValid(idString(run.branchId))
        ? await Branch.findById(idString(run.branchId)).select("name weeklyOffDays").lean()
        : null;
      const employees = await Employee.find({
        branchId: { $in: branchVariants },
        employmentStatus: "ACTIVE",
        isActive: true,
        joiningDate: { $lte: end },
        $or: [{ leavingDate: null }, { leavingDate: { $gte: start } }]
      }).lean();

    // Resolve mandatory holiday calendar dates for the branch and year
    const mandatoryHolidayDates = await loadMandatoryHolidayDates(run.branchId, run.payrollYear);
    // Rules of other branches, loaded on demand for employees on a temporary shift
    const shiftBranchRuleCache = new Map();

    // Read what every employee needs once for the whole branch, instead of several queries per employee.
    // The calculation below is unchanged: it looks each employee's rows up here.
    const allEmployeeIds = employees.flatMap((e) => idVariants(e._id));
    const [structureRows, attendanceRows, shiftRows, adjustmentRows, loanRows] = employees.length === 0
      ? [[], [], [], [], []]
      : await Promise.all([
          EmployeeSalaryStructure.find({
            employeeId: { $in: allEmployeeIds },
            isActive: true,
            effectiveFrom: { $lte: end },
            $or: [{ effectiveTo: null }, { effectiveTo: { $gte: start } }]
          })
            .populate("components.componentId")
            .sort({ effectiveFrom: -1 })
            .lean(),
          DailyAttendance.find({
            employeeId: { $in: allEmployeeIds },
            attendanceDate: { $gte: startDateStr, $lte: endDateStr }
          }).lean(),
          EmployeeBranchAssignment.find({
            employeeId: { $in: allEmployeeIds },
            assignmentType: "TEMPORARY",
            status: { $ne: "CANCELLED" },
            fromDate: { $lte: end },
            toDate: { $gte: start },
          }).lean(),
          SalaryAdjustment.find({
            employeeId: { $in: allEmployeeIds },
            payrollMonth: run.payrollMonth,
            payrollYear: run.payrollYear,
            status: "PENDING"
          }).lean(),
          EmployeeLoan.find({
            employeeId: { $in: allEmployeeIds },
            status: "ACTIVE",
            outstandingBalance: { $gt: 0 }
          }).lean(),
        ]);
    // Structures come back newest first, so an employee's first row is the one the old per-employee query returned
    const structuresByEmployee = groupByEmployee(structureRows);
    const attendanceByEmployee = groupByEmployee(attendanceRows);
    const shiftsByEmployee = groupByEmployee(shiftRows);
    const adjustmentsByEmployee = groupByEmployee(adjustmentRows);
    const loansByEmployee = groupByEmployee(loanRows);

    // Structures reached only through employee.salaryStructureId (when no structure is effective by date)
    const linkedStructureIds = Array.from(new Set(
      employees
        .filter((e) => {
          const first = (structuresByEmployee.get(idString(e._id)) || [])[0];
          const salary = first?.monthlySalary;
          return e.salaryStructureId && (salary === undefined || salary === null);
        })
        .map((e) => idString(e.salaryStructureId))
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    ));
    const linkedStructures = new Map(
      linkedStructureIds.length === 0
        ? []
        : (await EmployeeSalaryStructure.find({ _id: { $in: linkedStructureIds } }).populate("components.componentId").lean())
            .map((st) => [String(st._id), st])
    );

    // Attendance policies set directly on an employee (an id that is invalid or missing finds nothing, as before)
    const policyIds = Array.from(new Set(
      employees
        .map((e) => e.attendancePolicyId && idString(e.attendancePolicyId))
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
    ));
    const policiesById = new Map(
      policyIds.length === 0
        ? []
        : (await AttendancePolicy.find({ _id: { $in: policyIds } }).lean()).map((p) => [String(p._id), p])
    );
    // The branch's own policy is the same for every employee without one of their own, so it is read once, when first needed
    let branchPolicyPromise = null;
    const getBranchPolicy = () => {
      if (!branchPolicyPromise) {
        branchPolicyPromise = AttendancePolicy.findOne({
          isActive: true,
          branchId: { $in: idVariants(run.branchId) }
        }).sort({ createdAt: -1 }).lean().exec(); // exec() gives a real promise that can be awaited by every employee
      }
      return branchPolicyPromise;
    };

    const newRecords = [];
    for (const employee of employees) {
      const employeeId = employee._id;
      const employeeKey = idString(employeeId);

      // 1. Active EmployeeSalaryStructure effective for this month (newest first)
      const structures = (structuresByEmployee.get(employeeKey) || []).slice(0, 1);

      let activeStructure = structures[0] || null;
      let monthlySalary = activeStructure?.monthlySalary;

      // 2. If not found in date query, check employee.salaryStructureId
      if ((monthlySalary === undefined || monthlySalary === null) && employee.salaryStructureId) {
        const linked = linkedStructures.get(idString(employee.salaryStructureId)) || null;
        if (linked && linked.isActive && linked.monthlySalary !== undefined && linked.monthlySalary !== null) {
          if (!linked.effectiveTo || linked.effectiveTo >= start) {
            activeStructure = linked;
            monthlySalary = linked.monthlySalary;
          }
        }
      }

      // 3. Fallback to employee.defaultSalary
      if (monthlySalary === undefined || monthlySalary === null) {
        if (employee.defaultSalary !== null && employee.defaultSalary !== undefined) {
          if (!employee.salaryEffectiveFrom || employee.salaryEffectiveFrom <= end) {
            monthlySalary = employee.defaultSalary;
          }
        }
      }

      monthlySalary = Number(monthlySalary);
      if (!Number.isFinite(monthlySalary) || monthlySalary < 0) {
        throw ApiError.validation(`Employee ${employee.employeeCode || employee._id} has no valid monthly salary. Set defaultSalary or an effective salary structure first.`);
      }

      // Applicable attendance policy resolution
      let policy = null;
      const policyId = employee.attendancePolicyId;
      if (policyId) policy = policiesById.get(idString(policyId)) || null;
      if (!policy) policy = await getBranchPolicy();
      // No global-policy fallback: attendance resolves policies per branch only,
      // so payroll must use the same policy that produced the attendance records.

      // Payroll must never run on guessed defaults: a missing policy or a policy
      // without the values below is a configuration error.
      const empLabel = employee.employeeCode || `EMP-${String(employeeId).slice(-6)}`;
      if (!policy) {
        throw ApiError.validation(
          `Cannot calculate payroll: no active attendance policy is configured for this branch (employee ${empLabel}). Create and activate an attendance policy for this branch in Attendance Setup, then calculate again.`
        );
      }
      const requiredHours = Number(policy.workingHoursPerDay || policy.fullDayHours);
      const leaveAllowance = Number(policy.monthlyLeaveAllowance);
      if (!Number.isFinite(requiredHours) || requiredHours <= 0 ||
          policy.monthlyLeaveAllowance === undefined || policy.monthlyLeaveAllowance === null ||
          !Number.isFinite(leaveAllowance) || leaveAllowance < 0) {
        throw ApiError.validation(
          `Cannot calculate payroll: attendance policy '${policy.name || policy.code || policy._id}' is missing working hours per day or monthly leave allowance. Update the policy and calculate again.`
        );
      }

      // The attendance policy is the authoritative weekly-off schedule. A
      // conflicting branch-level schedule would make payroll and attendance disagree.
      if (branchDoc && Array.isArray(branchDoc.weeklyOffDays) && branchDoc.weeklyOffDays.length > 0 &&
          !sameSchedule(branchDoc.weeklyOffDays, policy.weeklyOffDays)) {
        throw ApiError.validation(
          `Cannot calculate payroll: weekly-off days differ between branch '${branchDoc.name}' (${branchDoc.weeklyOffDays.join(", ")}) and attendance policy '${policy.name || policy.code}' (${toNames(policy.weeklyOffDays).join(", ") || "none"}). The attendance policy is authoritative; update the policy or re-save it so the branch value is synchronized, then calculate again.`
        );
      }

      const salaryCalculationDays = Math.max(1, days - leaveAllowance);
      // Requirement 9: hourly salary = monthly salary / ((calendar days - monthly leave allowance) * required hours per day)
      const hourlySalary = money(monthlySalary / (salaryCalculationDays * requiredHours));
      const perDaySalary = money(hourlySalary * requiredHours);

      const startDateStr = `${run.payrollYear}-${String(run.payrollMonth).padStart(2, "0")}-01`;
      const endDateStr = `${run.payrollYear}-${String(run.payrollMonth).padStart(2, "0")}-${String(days).padStart(2, "0")}`;

      const attendances = attendanceByEmployee.get(employeeKey) || [];

      // ── Attendance Completeness & Pending Status Guard ───────────────────
      const weeklyOffDays = Array.isArray(policy?.weeklyOffDays) ? policy.weeklyOffDays : [];
      // On dates of a temporary branch shift the destination branch's holidays and weekly
      // offs apply; salary itself still belongs to the home branch run.
      const { byDate: shiftedDayRules, summaries: branchShiftSummaries } = await resolveShiftedDayRules(
        employeeId,
        run.payrollYear,
        run.payrollMonth,
        days,
        shiftBranchRuleCache,
        shiftsByEmployee.get(employeeKey) || []
      );
      const joiningDateStr = employee.joiningDate
        ? getTodayDateString(employee.joiningDate)
        : null;
      const leavingDateStr = employee.leavingDate
        ? getTodayDateString(employee.leavingDate)
        : null;

      // A date the employee is expected to work: after joining, before leaving, and not a
      // mandatory holiday or weekly off of the branch whose rules apply that day (the
      // destination branch while temporarily shifted, otherwise the home branch).
      const isExpectedWorkday = (dateStr, d) => {
        if (joiningDateStr && dateStr < joiningDateStr) return false;
        if (leavingDateStr && dateStr > leavingDateStr) return false;
        const dayRules = shiftedDayRules.get(dateStr);
        if ((dayRules ? dayRules.holidayDates : mandatoryHolidayDates).has(dateStr)) return false;
        const dayOfWeek = new Date(Date.UTC(run.payrollYear, run.payrollMonth - 1, d)).getUTCDay();
        if ((dayRules ? dayRules.weeklyOffDays : weeklyOffDays).includes(dayOfWeek)) return false;
        return true;
      };

      // Working days expected in the whole month (shown as "Days To Be Worked"; not used for pay)
      let expectedWorkingDays = 0;
      for (let d = 1; d <= days; d++) {
        const dateStr = `${run.payrollYear}-${String(run.payrollMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        if (isExpectedWorkday(dateStr, d)) expectedWorkingDays += 1;
      }

      const recordedDateSet = new Set();
      const pendingDates = [];
      for (const att of attendances) {
        const dateKey = att.attendanceDate;
        if (!dateKey) continue;
        recordedDateSet.add(dateKey);
        // Today's workday has not ended, so a PENDING record (checked in, not
        // yet checked out) is expected and must not block a mid-month preview.
        if (String(att.status || "").toUpperCase() === "PENDING" && dateKey < todayStr) {
          pendingDates.push(dateKey);
        }
      }

      const missingDates = [];
      for (let d = 1; d <= days; d++) {
        const dateStr = `${run.payrollYear}-${String(run.payrollMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

        // 1. Skip today and future dates during mid-month calculation/preview.
        // Attendance for today cannot be finalized (ABSENT cannot even be
        // marked for the current date) until the workday has ended.
        if (dateStr >= todayStr) continue;

        // 2-5. Skip dates before joining, after leaving, mandatory holidays and weekly offs
        if (!isExpectedWorkday(dateStr, d)) continue;

        // Required workday: must have an attendance entry
        if (!recordedDateSet.has(dateStr)) {
          missingDates.push(dateStr);
        }
      }

      if (missingDates.length > 0 || pendingDates.length > 0) {
        const empCode = employee.employeeCode || `EMP-${String(employeeId).slice(-6)}`;
        const details = [];
        if (missingDates.length > 0) {
          const preview = missingDates.slice(0, 5).join(", ");
          const more = missingDates.length > 5 ? ` (+${missingDates.length - 5} more)` : "";
          details.push(`missing attendance on ${missingDates.length} date(s) [${preview}${more}]`);
        }
        if (pendingDates.length > 0) {
          const preview = pendingDates.slice(0, 5).join(", ");
          const more = pendingDates.length > 5 ? ` (+${pendingDates.length - 5} more)` : "";
          details.push(`pending unresolved attendance on ${pendingDates.length} date(s) [${preview}${more}]`);
        }
        throw ApiError.validation(
          `Cannot calculate payroll: Unresolved attendance detected for ${empCode}. ${details.join(" and ")}. Reconcile missing dates and approve/reject pending records before calculating salary.`
        );
      }

      const seenDates = new Set();
      let daysWorked = 0, totalWorkingHours = 0, approvedOtHours = 0;
      let fullDayAbsences = 0;
      let halfDayAbsences = 0;
      let paidLeaveDays = 0;
      let unpaidLeaveDays = 0;
      const untypedLeaveDates = [];

      for (const att of attendances) {
        const dateKey = att.attendanceDate;
        if (!dateKey || seenDates.has(dateKey)) continue;
        seenDates.add(dateKey);

        const status = String(att.status || "").toUpperCase();
        if (status === "PRESENT") {
          daysWorked += 1;
        } else if (status === "HALF_DAY") {
          daysWorked += 0.5;
          halfDayAbsences += 1;
        } else if (status === "ABSENT") {
          fullDayAbsences += 1;
        } else if (status === "ON_LEAVE") {
          // ON_LEAVE alone does not say whether the day is paid.
          if (att.leavePaymentType === "PAID") paidLeaveDays += 1;
          else if (att.leavePaymentType === "UNPAID") unpaidLeaveDays += 1;
          else untypedLeaveDates.push(dateKey);
        }

        totalWorkingHours += Number(att.paidWorkingHours ?? att.workingHoursPerDay ?? 0);

        // Overtime validation: must be enabled in policy AND approved
        const isOvertimeEnabled = policy?.overtimeEnabled !== false;
        if (isOvertimeEnabled && att.overtimeStatus === "APPROVED") {
          const ot = Number(att.overtimeHours || 0);
          if (ot > 0) approvedOtHours += ot;
        }
      }

      // Automatic Loss of Pay (LOP) calculation:
      if (untypedLeaveDates.length > 0) {
        const preview = untypedLeaveDates.slice(0, 5).join(", ");
        const more = untypedLeaveDates.length > 5 ? ` (+${untypedLeaveDates.length - 5} more)` : "";
        throw ApiError.validation(
          `Cannot calculate payroll: ${empLabel} has ON_LEAVE attendance without a paid/unpaid leave type on ${untypedLeaveDates.length} date(s) [${preview}${more}]. Set leavePaymentType to PAID or UNPAID on those records, then calculate again.`
        );
      }

      // Leave and LOP rules (allowance comes from the resolved attendance policy):
      //  - Approved paid leave: never LOP; it consumes the monthly paid-leave balance.
      //  - Unpaid leave: always LOP.
      //  - Unapproved absence / half-day: LOP only beyond the balance left after paid leave.
      //  - Weekly offs and mandatory holidays are not absences.
      //  Working days = calendar days - allowance.
      const { lopDays } = computeLopDays({
        leaveAllowance,
        paidLeaveDays,
        unpaidLeaveDays,
        fullDayAbsences,
        halfDayAbsences,
      });
      const perDayRate = monthlySalary / salaryCalculationDays;
      const lopDeduction = money(lopDays * perDayRate);

      const totalRegularHours = Math.min(totalWorkingHours, daysWorked * requiredHours);
      const totalOtHours = money(approvedOtHours);
      const otMultiplier = 1;
      const otAmount = money(totalOtHours * hourlySalary * otMultiplier);

      const adjustments = adjustmentsByEmployee.get(employeeKey) || [];
      const sumTypes = (types) => money(adjustments.filter(a => types.includes(a.adjustmentType)).reduce((s, a) => s + Number(a.amount || 0), 0));
      const mobileSubmissionIncentive = sumTypes(["INCENTIVE"]);
      const otherIncentive = sumTypes(["OTHER_EARNING"]);
      const advance = sumTypes(["ADVANCE"]);
      const shortage = sumTypes(["SHORTAGE"]);
      const wastage = sumTypes(["WASTAGE"]);
      const purchase = sumTypes(["EMPLOYEE_PURCHASE"]);
      const otherDeductions = sumTypes(["OTHER_DEDUCTION"]);

      const allLoans = loansByEmployee.get(employeeKey) || [];
      const emiOf = (loan) => Math.min(Number(loan.emiAmount || 0), Number(loan.outstandingBalance || 0));
      // Manual loans (autoDeduct false) are never touched by payroll; loans skipped for this
      // month are postponed, which leaves their balance and the later schedule unchanged.
      const loans = allLoans.filter((loan) => loanDueInPeriod(loan, run.payrollMonth, run.payrollYear));
      const loanEmi = money(loans.reduce((s, loan) => s + emiOf(loan), 0));
      const skippedLoanEmi = money(
        allLoans
          .filter((loan) => loan.autoDeduct !== false && isLoanSkipped(loan, run.payrollMonth, run.payrollYear))
          .reduce((s, loan) => s + emiOf(loan), 0)
      );

      const salaryOfThisMonth = money(monthlySalary);
      const grossPayBase = money(salaryOfThisMonth + otAmount + mobileSubmissionIncentive + otherIncentive);

      const {
        evaluatedComponents,
        totalComponentEarnings,
        totalComponentDeductions
      } = evaluateStructureComponents({
        structure: activeStructure,
        monthlySalary,
        daysWorked,
        paidLeaveDays,
        totalRegularHours,
        grossPayBase
      });

      const grossPay = grossPayBase;
      const operationalDeductions = money(
        advance + shortage + wastage + purchase + loanEmi + otherDeductions + lopDeduction
      );
      const totalDeductions = money(totalComponentDeductions + operationalDeductions);

      const isDeficit = totalDeductions > grossPay;
      const deficitAmount = isDeficit ? money(totalDeductions - grossPay) : 0;
      const net = isDeficit ? 0 : money(grossPay - totalDeductions);
      const roundPay = Math.round(net);

      newRecords.push({
        salaryRunId: run._id,
        employeeId,
        branchId: run.branchId,
        attendancePolicyId: policy?._id || employee.attendancePolicyId || null,
        payrollMonth: run.payrollMonth,
        payrollYear: run.payrollYear,
        branchShifts: branchShiftSummaries,
        monthlySalary,
        calendarDaysInMonth: days,
        monthlyLeaveAllowance: leaveAllowance,
        salaryCalculationDays,
        requiredWorkingHoursPerDay: requiredHours,
        daysToBeWorked: expectedWorkingDays,
        daysWorked: money(daysWorked),
        totalRegularHours: money(totalRegularHours),
        totalWorkingHours: money(totalWorkingHours),
        totalOtHours,
        hourlySalary,
        perDaySalary,
        salaryOfThisMonth,
        otAmount,
        components: evaluatedComponents,
        totalComponentEarnings,
        totalComponentDeductions,
        mobileSubmissionIncentive,
        otherIncentive,
        advanceTakenInPresentMonth: advance,
        shortageDeduction: shortage,
        wastageDeduction: wastage,
        employeePurchaseDeduction: purchase,
        loanEmi,
        skippedLoanEmi,
        otherDeductions,
        lopDays: money(lopDays),
        paidLeaveDays,
        unpaidLeaveDays,
        lopDeduction,
        grossPay,
        roundPay,
        paid: 0,
        balance: roundPay,
        isDeficit,
        deficitAmount,
        status: "CALCULATED",
        createdBy: userId || null,
        updatedBy: userId || null
      });
    }

    try {
      session = await mongoose.startSession();
    } catch (e) {
      session = null;
    }

    // In environments without transactions, backup existing records in memory before delete
    // so a failed recalculation cannot destroy valid existing records or leave partial data.
    if (!session) {
      existingRecordsBackup = await SalaryRecord.find({ salaryRunId: run._id }).lean();
    }

    const totals = newRecords.reduce((a, e) => {
      a.gross += e.grossPay;
      const deductions = (
        (e.totalComponentDeductions || 0) +
        e.advanceTakenInPresentMonth +
        e.shortageDeduction +
        e.wastageDeduction +
        e.employeePurchaseDeduction +
        e.loanEmi +
        e.otherDeductions +
        (e.lopDeduction || 0)
      );
      a.deductions += deductions;
      a.net += e.roundPay;
      return a;
    }, { gross: 0, deductions: 0, net: 0 });

    if (session) {
      try {
        session.startTransaction();
        await SalaryRecord.deleteMany({ salaryRunId: run._id }, { session });
        if (newRecords.length) {
          await SalaryRecord.insertMany(newRecords, { session });
        }

        const finalizedRun = await SalaryRun.findOneAndUpdate(
          {
            _id: run._id,
            status: "CALCULATING",
            calculationAttemptId
          },
          {
            $set: {
              employeeCount: newRecords.length,
              totalGrossPay: money(totals.gross),
              totalDeductions: money(totals.deductions),
              totalNetPay: money(totals.net),
              status: "CALCULATED",
              calculatedAt: (options && options.asOfDate) ? new Date(options.asOfDate) : new Date(),
              calculationAttemptId: null,
              updatedBy: userId || null
            }
          },
          { new: true, session }
        );

        if (!finalizedRun) {
          throw new Error("Calculation attempt was superseded or canceled.");
        }

        await session.commitTransaction();
      } catch (txErr) {
        if (session.inTransaction()) {
          await session.abortTransaction().catch(() => {});
        }
        throw txErr;
      } finally {
        await session.endSession().catch(() => {});
      }
    } else {
      // Safe recovery strategy without transactions:
      await SalaryRecord.deleteMany({ salaryRunId: run._id });
      if (newRecords.length) {
        await SalaryRecord.insertMany(newRecords);
      }
      const finalizedRun = await SalaryRun.findOneAndUpdate(
        {
          _id: run._id,
          status: "CALCULATING",
          calculationAttemptId
        },
        {
          $set: {
            employeeCount: newRecords.length,
            totalGrossPay: money(totals.gross),
            totalDeductions: money(totals.deductions),
            totalNetPay: money(totals.net),
            status: "CALCULATED",
            calculatedAt: (options && options.asOfDate) ? new Date(options.asOfDate) : new Date(),
            calculationAttemptId: null,
            updatedBy: userId || null
          }
        },
        { new: true }
      );
      if (!finalizedRun) {
        throw new Error("Calculation attempt was superseded or canceled.");
      }
    }

    return this.getRun(run._id);
  } catch (err) {
    // Non-transactional failure recovery: wipe partial records and restore backup if available
    if (!session && existingRecordsBackup !== null) {
      await SalaryRecord.deleteMany({ salaryRunId: rId }).catch(() => {});
      if (existingRecordsBackup.length > 0) {
        await SalaryRecord.insertMany(existingRecordsBackup).catch(() => {});
      }
    }

    // Revert status only if the run is still owned by the current calculation attempt
    // A run that was CALCULATED before this attempt keeps its records when the attempt
    // fails early (e.g. unresolved attendance), so it must go back to CALCULATED too.
    const hadCalculatedBefore = claimedRun.status === "CALCULATED" ||
      Boolean(existingRecordsBackup && existingRecordsBackup.length > 0);
    const revertStatus = hadCalculatedBefore ? "CALCULATED" : "DRAFT";
    await SalaryRun.findOneAndUpdate(
      {
        _id: rId,
        status: "CALCULATING",
        calculationAttemptId
      },
      {
        $set: {
          status: revertStatus,
          calculationAttemptId: null,
          updatedBy: userId || null
        }
      }
    ).catch(() => {});

    throw err;
  }
}

  async payRun(runId, userId, options = {}) {
    const maxRetries = 3;
    let attempt = 0;
    let lastError = null;

    while (attempt < maxRetries) {
      attempt++;

      // Pre-check outside transaction to fast-return already paid or locked runs,
      // and reject non-approved runs early
      const preCheck = await SalaryRun.findById(runId);
      if (!preCheck) throw ApiError.notFound("Salary run not found.");
      if (preCheck.status === "PAID" || preCheck.status === "LOCKED") {
        return this.getRun(runId);
      }
      if (preCheck.status !== "APPROVED") {
        if (preCheck.status === "CALCULATING") {
          throw ApiError.conflict("Salary run is currently calculating and cannot be marked paid.");
        }
        throw ApiError.conflict("Only an approved salary run can be marked paid.");
      }

      const beforePaySnapshot = {
        status: preCheck.status,
        employeeCount: preCheck.employeeCount,
        totalNetPay: preCheck.totalNetPay,
      };

      const { days } = monthBounds(preCheck.payrollYear, preCheck.payrollMonth);
      const endDateStr = `${preCheck.payrollYear}-${String(preCheck.payrollMonth).padStart(2, "0")}-${String(days).padStart(2, "0")}`;
      const todayStr = (options && options.asOfDate) ? getTodayDateString(options.asOfDate) : getTodayDateString();

      if (todayStr <= endDateStr) {
        throw ApiError.validation(
          `Cannot pay payroll: The payroll period (${preCheck.payrollYear}-${String(preCheck.payrollMonth).padStart(2, "0")}) is still ongoing. Final payroll can only be paid after the period ends (${endDateStr}).`
        );
      }

      let session;
      try {
        session = await mongoose.startSession();
      } catch (sessionErr) {
        throw new Error(`MongoDB transactions are required for salary payments: ${sessionErr.message}`);
      }

      try {
        session.startTransaction();

        // Atomically claim the run in APPROVED state inside the transaction
        const run = await SalaryRun.findOneAndUpdate(
          { _id: runId, status: "APPROVED" },
          { $set: { updatedAt: new Date(), updatedBy: userId || null } },
          { new: true, session }
        );

        if (!run) {
          const currentRun = await SalaryRun.findById(runId).session(session);
          if (!currentRun) throw ApiError.notFound("Salary run not found.");
          if (currentRun.status === "PAID" || currentRun.status === "LOCKED") {
            await session.abortTransaction();
            return this.getRun(runId);
          }
          if (currentRun.status === "CALCULATING") {
            await session.abortTransaction();
            throw ApiError.conflict("Salary run is currently calculating and cannot be marked paid.");
          }
          throw ApiError.conflict("Only an approved salary run can be marked paid.");
        }

        const records = await SalaryRecord.find({ salaryRunId: run._id }).session(session);

        for (const record of records) {
          record.paid = record.roundPay;
          record.balance = 0;
          record.status = "PAID";
          record.updatedBy = userId || null;
          await record.save({ session });

          const dueLoans = await EmployeeLoan.find({
            employeeId: { $in: idVariants(record.employeeId) },
            status: "ACTIVE",
            outstandingBalance: { $gt: 0 }
          }).sort({ createdAt: 1 }).session(session);
          // Same rule as calculation: manual loans and loans skipped this month are not deducted.
          const loans = dueLoans.filter((loan) => loanDueInPeriod(loan, run.payrollMonth, run.payrollYear));

          let emiRemaining = Number(record.loanEmi || 0);
          for (const loan of loans) {
            if (emiRemaining <= 0) break;

            // Prevent duplicate repayment if payment request is retried
            const existingRepayment = await LoanRepayment.findOne({
              employeeLoanId: loan._id,
              salaryRecordId: record._id
            }).session(session);

            if (existingRepayment) {
              emiRemaining = money(emiRemaining - existingRepayment.amount);
              continue;
            }

            const dueEmi = Math.min(Number(loan.emiAmount || 0), Number(loan.outstandingBalance || 0));
            const amount = Math.min(emiRemaining, dueEmi);
            if (amount <= 0) continue;

            const previousBalance = Number(loan.outstandingBalance);
            const remainingBalance = money(previousBalance - amount);

            // Calculate repayment number sequentially for this loan
            const lastRepayment = await LoanRepayment.findOne({ employeeLoanId: loan._id })
              .sort({ repaymentNumber: -1 })
              .session(session)
              .lean();
            const repaymentNumber = (lastRepayment?.repaymentNumber || 0) + 1;

            const monthName = new Date(Date.UTC(run.payrollYear, run.payrollMonth - 1, 1)).toLocaleString("default", { month: "long" });

            await LoanRepayment.create([{
              employeeLoanId: loan._id,
              employeeId: record.employeeId,
              salaryRecordId: record._id,
              salaryRunId: run._id,
              repaymentNumber,
              repaymentDate: new Date(),
              payrollMonth: run.payrollMonth,
              payrollYear: run.payrollYear,
              amount,
              previousBalance,
              remainingBalance,
              paymentMethod: "SALARY_DEDUCTION",
              remarks: `${monthName} ${run.payrollYear} EMI`,
              createdBy: userId || null,
              updatedBy: userId || null
            }], { session });

            loan.totalRepaid = money(Number(loan.totalRepaid || 0) + amount);
            loan.outstandingBalance = remainingBalance;
            loan.status = remainingBalance <= 0 ? "CLOSED" : "ACTIVE";
            loan.updatedBy = userId || null;
            await loan.save({ session });

            emiRemaining = money(emiRemaining - amount);
          }

          await SalaryAdjustment.updateMany({
            employeeId: { $in: idVariants(record.employeeId) },
            payrollMonth: run.payrollMonth,
            payrollYear: run.payrollYear,
            status: "PENDING"
          }, {
            $set: {
              status: "APPLIED",
              appliedAt: new Date(),
              salaryRunId: run._id,
              salaryRecordId: record._id,
              updatedBy: userId || null
            }
          }, { session });
        }

        // Transition run status to PAID only after all operations succeed
        run.status = "PAID";
        run.paidAt = new Date();
        run.updatedBy = userId || null;
        await run.save({ session });

        // Commit with safe retry handling for UnknownTransactionCommitResult on the active session
        let commitAttempt = 0;
        const maxCommitAttempts = 3;
        while (commitAttempt < maxCommitAttempts) {
          commitAttempt++;
          try {
            await session.commitTransaction();
            break;
          } catch (commitErr) {
            const isUnknownCommit = isUnknownCommitResultError(commitErr);
            if (isUnknownCommit && commitAttempt < maxCommitAttempts) {
              await new Promise((resolve) => setTimeout(resolve, commitAttempt * 50));
              continue;
            }

            // If commit attempts exhausted on UnknownTransactionCommitResult, inspect persisted state
            if (isUnknownCommit) {
              const persistedRun = await SalaryRun.findById(runId);
              if (persistedRun && (persistedRun.status === "PAID" || persistedRun.status === "LOCKED")) {
                return this.getRun(runId);
              }
              // A single read showing status other than PAID or LOCKED must not be treated as definitive proof of failure.
              // Do not blindly restart the transaction. Return an explicit error indicating verification is needed.
              throw ApiError.database(
                "Payment transaction commit outcome is unresolved (UnknownTransactionCommitResult). Payment status requires verification before retrying.",
                { code: "PAYMENT_COMMIT_UNRESOLVED", runId }
              );
            }

            throw commitErr;
          }
        }

        return this.getRun(runId);
      } catch (err) {
        lastError = err;
        if (session && session.inTransaction()) {
          await session.abortTransaction().catch(() => {});
        }

        const isTransient = isTransientTransactionError(err);
        if (isTransient && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 50));
          continue;
        }

        throw err;
      } finally {
        if (session) {
          await session.endSession().catch(() => {});
        }
      }
    }

    if (lastError) throw lastError;
  }

  /**
   * Send an approved salary run back to "calculated" so it can be corrected and approved again.
   * Only an approved run can be sent back: a paid or locked run has had money paid out, and is fixed
   * with an adjustment in a later payroll instead. A reason is required and is kept on the run.
   */
  async reopenRun(runId, reason, userId) {
    const rId = idString(runId);
    if (!rId) throw ApiError.validation("Salary run ID is required.");
    const why = String(reason || "").trim();
    if (why.length < 5) throw ApiError.validation("A reason of at least 5 characters is required to send a salary run back.");

    const run = await SalaryRun.findOneAndUpdate(
      { _id: rId, status: "APPROVED" },
      {
        $set: {
          status: "CALCULATED",
          approvedBy: null,
          approvedAt: null,
          reopenedBy: userId || null,
          reopenedAt: new Date(),
          reopenReason: why,
          updatedBy: userId || null,
        },
      },
      { new: true }
    );

    if (!run) {
      const current = await SalaryRun.findById(rId);
      if (!current) throw ApiError.notFound("Salary run not found.");
      if (current.status === "PAID" || current.status === "LOCKED") {
        throw ApiError.conflict("A paid or locked salary run cannot be sent back. Correct it with an adjustment in a later payroll.");
      }
      if (current.status === "CALCULATING") {
        throw ApiError.conflict("Salary run is currently calculating.");
      }
      throw ApiError.conflict(`Only an approved salary run can be sent back. This run is ${current.status}.`);
    }

    await SalaryRecord.updateMany({ salaryRunId: run._id, status: "APPROVED" }, { $set: { status: "CALCULATED", updatedBy: userId || null } });
    return this.getRun(run._id);
  }

  async transitionRun(runId, action, userId, options = {}) {
    const rId = idString(runId);
    if (!rId) throw ApiError.validation("Salary run ID is required.");

    if (action === "approve") {
      const current = await SalaryRun.findById(rId);
      if (!current) throw ApiError.notFound("Salary run not found.");
      if (current.status === "CALCULATING") {
        throw ApiError.conflict("Salary run is currently calculating and cannot be approved.");
      }
      if (current.status !== "CALCULATED") {
        throw ApiError.conflict("Only a calculated salary run can be approved.");
      }

      const beforeApproveSnapshot = {
        status: current.status,
        employeeCount: current.employeeCount,
        totalNetPay: current.totalNetPay,
      };

      const { days } = monthBounds(current.payrollYear, current.payrollMonth);
      const endDateStr = `${current.payrollYear}-${String(current.payrollMonth).padStart(2, "0")}-${String(days).padStart(2, "0")}`;
      const todayStr = (options && options.asOfDate) ? getTodayDateString(options.asOfDate) : getTodayDateString();

      // Enforce final payroll boundary: cannot approve before the full payroll period has concluded
      if (todayStr <= endDateStr) {
        throw ApiError.validation(
          `Cannot approve payroll: The payroll period (${current.payrollYear}-${String(current.payrollMonth).padStart(2, "0")}) is still ongoing. Final payroll can only be approved after the period ends (${endDateStr}).`
        );
      }

      // Enforce that calculation was performed after the period ended (not an outdated mid-month preview)
      const calcDateStr = current.calculatedAt ? getTodayDateString(current.calculatedAt) : null;
      if (!calcDateStr || calcDateStr <= endDateStr) {
        throw ApiError.validation(
          `Cannot approve payroll: This salary run was calculated mid-month before the period ended. Please recalculate payroll now that the full period has completed.`
        );
      }

      const run = await SalaryRun.findOneAndUpdate(
        { _id: rId, status: "CALCULATED" },
        {
          $set: {
            status: "APPROVED",
            approvedBy: userId || null,
            approvedAt: (options && options.asOfDate) ? new Date(options.asOfDate) : new Date(),
            updatedBy: userId || null
          }
        },
        { new: true }
      );
      if (!run) {
        throw ApiError.conflict("Salary run status changed concurrently.");
      }
      await SalaryRecord.updateMany({ salaryRunId: run._id }, { $set: { status: "APPROVED", updatedBy: userId || null } });

      return this.getRun(run._id);
    } else if (action === "pay") {
      return this.payRun(runId, userId, options);
    } else if (action === "lock") {
      const beforeLockSnapshot = {
        status: "PAID",
      };
      const run = await SalaryRun.findOneAndUpdate(
        { _id: rId, status: "PAID" },
        {
          $set: {
            status: "LOCKED",
            lockedAt: new Date(),
            updatedBy: userId || null
          }
        },
        { new: true }
      );
      if (!run) {
        const current = await SalaryRun.findById(rId);
        if (!current) throw ApiError.notFound("Salary run not found.");
        if (current.status === "CALCULATING") {
          throw ApiError.conflict("Salary run is currently calculating and cannot be locked.");
        }
        throw ApiError.conflict("Only a paid salary run can be locked.");
      }
      await SalaryRecord.updateMany({ salaryRunId: run._id }, { $set: { status: "LOCKED", updatedBy: userId || null } });

      return this.getRun(run._id);
    } else {
      throw ApiError.validation("Unsupported salary run action.");
    }
  }

  async listRecords(filters = {}) {
    const q = {};
    if (filters.salaryRunId) q.salaryRunId = filters.salaryRunId;
    if (filters.salaryRecordId) q._id = filters.salaryRecordId;
    if (filters.employeeId) q.employeeId = { $in: idVariants(filters.employeeId) };
    if (filters.branchId) q.branchId = { $in: idVariants(filters.branchId) };
    if (filters.payrollMonth) q.payrollMonth = Number(filters.payrollMonth);
    if (filters.payrollYear) q.payrollYear = Number(filters.payrollYear);
    if (filters.status) q.status = filters.status;
    const records = await SalaryRecord.find(q)
      .populate("employeeId", EMPLOYEE_SELECT)
      .sort({ payrollYear: -1, payrollMonth: -1, createdAt: 1 })
      .lean();
    return attachNames(records.map((r) => attachRecordVirtuals(r)));
  }

  // Backward compatibility alias for listRecords
  async listEntries(filters = {}) {
    return this.listRecords(filters);
  }

  async createAdjustment(data, userId) {
    const employee = await Employee.findById(idString(data.employeeId)).lean();
    if (!employee) throw ApiError.notFound("Employee not found.");
    if (idString(employee.branchId) !== idString(data.branchId)) throw ApiError.validation("branchId does not match employee branch.");
    const amount = Number(data.amount);
    if (!(amount > 0) || !fieldRules.isAmount(amount, { allowZero: false })) {
      throw ApiError.validation("Adjustment amount must be greater than zero, with at most 2 decimal places.");
    }

    // Check if payroll for this period is already finalized
    const existingRun = await SalaryRun.findOne({
      branchId: { $in: idVariants(data.branchId) },
      payrollMonth: Number(data.payrollMonth),
      payrollYear: Number(data.payrollYear),
      status: { $in: ["APPROVED", "PAID", "LOCKED"] }
    });
    if (existingRun) {
      throw ApiError.conflict(`Cannot add adjustments for a salary run that is already ${existingRun.status.toLowerCase()}.`);
    }

    return SalaryAdjustment.create({
      ...data,
      amount,
      status: "PENDING",
      createdBy: userId || null,
      updatedBy: userId || null
    });
  }

  async createLoan(data, userId) {
    const employee = await Employee.findById(idString(data.employeeId)).lean();
    if (!employee) throw ApiError.notFound("Employee not found.");
    if (idString(employee.branchId) !== idString(data.branchId)) throw ApiError.validation("branchId does not match employee branch.");
    const amount = Number(data.loanAmount);
    if (!(amount > 0) || !fieldRules.isAmount(amount, { allowZero: false })) {
      throw ApiError.validation("loanAmount must be greater than zero, with at most 2 decimal places.");
    }
    const emi = Number(data.emiAmount);
    if (!(emi > 0) || !fieldRules.isAmount(emi, { allowZero: false })) {
      throw ApiError.validation("emiAmount must be greater than zero, with at most 2 decimal places.");
    }
    if (emi > amount) throw ApiError.validation("emiAmount cannot be more than the loan amount.");
    const loanNumber = (data.loanNumber && String(data.loanNumber).trim()) || `LN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Auto-deduction is on unless explicitly turned off.
    const autoDeduct = !(data.autoDeduct === false || String(data.autoDeduct).toLowerCase() === "false");

    return EmployeeLoan.create({
      ...data,
      loanNumber,
      loanAmount: amount,
      emiAmount: emi,
      totalRepaid: 0,
      outstandingBalance: amount,
      status: "ACTIVE",
      autoDeduct,
      skippedMonths: [],
      createdBy: userId || null,
      updatedBy: userId || null
    });
  }

  // Skip one month's EMI for one loan. The balance is untouched, so the loan finishes a
  // month later (Option A: postponed, never doubled).
  async skipLoanMonth(loanId, { month, year, reason = "" } = {}, userId, context = {}) {
    const m = Number(month);
    const y = Number(year);
    if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 2000 || y > 2100) {
      throw ApiError.validation("A valid month (1-12) and year are required.");
    }
    const loan = await EmployeeLoan.findById(idString(loanId));
    if (!loan) throw ApiError.notFound("Employee loan not found.");
    if (loan.status !== "ACTIVE" || Number(loan.outstandingBalance) <= 0) {
      throw ApiError.conflict("Only active loans with an outstanding balance can have an EMI skipped.");
    }
    if (loan.autoDeduct === false) {
      throw ApiError.conflict("This loan is not on auto-deduction, so there is no EMI to skip.");
    }
    if (isLoanSkipped(loan, m, y)) {
      throw ApiError.conflict("The EMI for this month is already skipped.");
    }
    await this._assertLoanPeriodOpen(loan, m, y, "skipped");

    const updated = await EmployeeLoan.findOneAndUpdate(
      { _id: loan._id, skippedMonths: { $not: { $elemMatch: { month: m, year: y } } } },
      {
        $push: { skippedMonths: { month: m, year: y, reason: String(reason || "").trim(), skippedBy: userId || null, skippedAt: new Date() } },
        $set: { updatedBy: userId || null }
      },
      { new: true }
    );
    if (!updated) throw ApiError.conflict("The EMI for this month is already skipped.");

    const payrollReset = await this._resetCalculatedRun(loan.branchId, m, y, userId);
    return { ...updated.toObject(), payrollReset };
  }

  // A calculated payslip would still carry the old EMI, so a skip change sends that month's
  // run back to DRAFT. It must be recalculated before it can be approved.
  async _resetCalculatedRun(branchId, month, year, userId) {
    const reset = await SalaryRun.findOneAndUpdate(
      { branchId: { $in: idVariants(branchId) }, payrollMonth: month, payrollYear: year, status: "CALCULATED" },
      { $set: { status: "DRAFT", calculationAttemptId: null, updatedBy: userId || null } },
      { new: true }
    );
    return Boolean(reset);
  }

  async unskipLoanMonth(loanId, { month, year } = {}, userId, context = {}) {
    const m = Number(month);
    const y = Number(year);
    if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 2000 || y > 2100) {
      throw ApiError.validation("A valid month (1-12) and year are required.");
    }
    const loan = await EmployeeLoan.findById(idString(loanId));
    if (!loan) throw ApiError.notFound("Employee loan not found.");
    if (!isLoanSkipped(loan, m, y)) throw ApiError.conflict("No skip is recorded for this month.");
    await this._assertLoanPeriodOpen(loan, m, y, "restored");

    const updated = await EmployeeLoan.findOneAndUpdate(
      { _id: loan._id },
      { $pull: { skippedMonths: { month: m, year: y } }, $set: { updatedBy: userId || null } },
      { new: true }
    );
    const payrollReset = await this._resetCalculatedRun(loan.branchId, m, y, userId);
    return { ...updated.toObject(), payrollReset };
  }

  // A skip can only change while that month's payroll is still open.
  async _assertLoanPeriodOpen(loan, month, year, verb) {
    const run = await SalaryRun.findOne({
      branchId: { $in: idVariants(loan.branchId) },
      payrollMonth: month,
      payrollYear: year,
    }).select("status").lean();
    if (run && ["CALCULATING", "APPROVED", "PAID", "LOCKED"].includes(run.status)) {
      throw ApiError.conflict(
        `The ${month}/${year} payroll is already ${run.status.toLowerCase()}, so the EMI can no longer be ${verb}.`
      );
    }
    const repaid = await LoanRepayment.findOne({
      employeeLoanId: loan._id,
      payrollMonth: month,
      payrollYear: year,
    }).select("_id").lean();
    if (repaid) {
      throw ApiError.conflict(`An EMI for ${month}/${year} was already collected, so it can no longer be ${verb}.`);
    }
  }

  async getLoanById(loanId) {
    if (!loanId) return null;
    return EmployeeLoan.findById(idString(loanId));
  }

  async recordRepayment(data, userId, authContext = {}) {
    if (!data.employeeLoanId) throw ApiError.validation("employeeLoanId is required.");
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw ApiError.validation("Repayment amount must be greater than zero.");
    }

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      let session;
      try {
        session = await mongoose.startSession();
      } catch (sessionErr) {
        throw new Error(`MongoDB transactions are required for repayments: ${sessionErr.message}`);
      }

      try {
        session.startTransaction();

        const loan = await EmployeeLoan.findById(idString(data.employeeLoanId)).session(session);
        if (!loan) throw ApiError.notFound("Employee loan not found.");

        const authoritativeBranchId = idString(loan.branchId);
        if (data.branchId && idString(data.branchId) !== authoritativeBranchId) {
          throw ApiError.validation("branchId does not match the loan branch.");
        }
        if (data.employeeId && idString(data.employeeId) !== idString(loan.employeeId)) {
          throw ApiError.validation("employeeId does not match the loan employee.");
        }
        if (authContext && !authContext.isGlobal && authContext.authorizedBranchIds) {
          const allowed = (authContext.authorizedBranchIds || []).map(idString);
          if (!allowed.includes(authoritativeBranchId)) {
            throw ApiError.forbidden("Access denied: You are not authorized for this salary branch.");
          }
        }

        if (loan.status !== "ACTIVE" || loan.outstandingBalance <= 0) {
          throw ApiError.conflict("Only active loans with an outstanding balance can receive repayments.");
        }

        if (amount > loan.outstandingBalance) {
          throw ApiError.validation(`Repayment amount (${amount}) cannot exceed current outstanding balance (${loan.outstandingBalance}).`);
        }

        let salaryRecordId = data.salaryRecordId || null;
        if (salaryRecordId) {
          const sRec = await SalaryRecord.findById(idString(salaryRecordId)).session(session);
          if (!sRec) throw ApiError.notFound("Referenced salary record not found.");
          if (idString(sRec.employeeId) !== idString(loan.employeeId)) {
            throw ApiError.validation("Referenced salary record does not belong to the loan employee.");
          }
          if (idString(sRec.branchId) !== authoritativeBranchId) {
            throw ApiError.validation("Referenced salary record does not belong to the loan branch.");
          }
          if (sRec.status === "LOCKED") {
            throw ApiError.conflict("Cannot record a repayment against a locked salary record.");
          }
        }

        // A locked payroll period is frozen: no repayment may be tagged to it.
        const repayMonth = data.payrollMonth ? Number(data.payrollMonth) : null;
        const repayYear = data.payrollYear ? Number(data.payrollYear) : null;
        if (repayMonth && repayYear) {
          const lockedRun = await SalaryRun.findOne({
            branchId: { $in: idVariants(authoritativeBranchId) },
            payrollMonth: repayMonth,
            payrollYear: repayYear,
            status: "LOCKED"
          }).select("_id").session(session).lean();
          if (lockedRun) {
            throw ApiError.conflict("Cannot record a repayment for a locked payroll period.");
          }
        }

        let repaymentNumber = data.repaymentNumber ? Number(data.repaymentNumber) : null;
        if (!Number.isInteger(repaymentNumber) || repaymentNumber < 1) {
          const lastRepayment = await LoanRepayment.findOne({ employeeLoanId: loan._id })
            .sort({ repaymentNumber: -1 })
            .session(session)
            .lean();
          repaymentNumber = (lastRepayment?.repaymentNumber || 0) + 1;
        }

        const previousBalance = Number(loan.outstandingBalance);
        const remainingBalance = money(previousBalance - amount);

        const [repayment] = await LoanRepayment.create([{
          employeeLoanId: loan._id,
          employeeId: loan.employeeId,
          salaryRecordId: salaryRecordId ? new mongoose.Types.ObjectId(salaryRecordId) : null,
          salaryRunId: data.salaryRunId ? new mongoose.Types.ObjectId(data.salaryRunId) : null,
          repaymentNumber,
          repaymentDate: data.repaymentDate ? new Date(data.repaymentDate) : new Date(),
          payrollMonth: data.payrollMonth ? Number(data.payrollMonth) : null,
          payrollYear: data.payrollYear ? Number(data.payrollYear) : null,
          amount,
          previousBalance,
          remainingBalance,
          paymentMethod: data.paymentMethod || "CASH",
          remarks: data.remarks || data.notes || "",
          createdBy: userId || null,
          updatedBy: userId || null
        }], { session });

        loan.totalRepaid = money(Number(loan.totalRepaid || 0) + amount);
        loan.outstandingBalance = remainingBalance;
        loan.status = remainingBalance <= 0 ? "CLOSED" : "ACTIVE";
        loan.updatedBy = userId || null;
        await loan.save({ session });

        await session.commitTransaction();
        return repayment;
      } catch (err) {
        if (session && session.inTransaction()) {
          await session.abortTransaction().catch(() => {});
        }
        const isConcurrencyError = err.code === 11000 || isTransientTransactionError(err);
        if (isConcurrencyError && attempt < maxRetries && !data.repaymentNumber) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 50));
          continue;
        }
        throw err;
      } finally {
        if (session) {
          await session.endSession().catch(() => {});
        }
      }
    }
  }

  async createRepayment(data, userId, authContext) {
    return this.recordRepayment(data, userId, authContext);
  }

  async listLoans(filters = {}) {
    const q = {};
    if (filters.employeeId) q.employeeId = { $in: idVariants(filters.employeeId) };
    if (filters.branchId) q.branchId = { $in: idVariants(filters.branchId) };
    if (filters.status) q.status = filters.status;
    if (filters.loanNumber) q.loanNumber = String(filters.loanNumber).trim();

    const { page, limit, skip } = parsePagination(filters);

    const [items, total] = await Promise.all([
      EmployeeLoan.find(q)
        .populate("employeeId", EMPLOYEE_SELECT)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmployeeLoan.countDocuments(q),
    ]);

    await attachNames(items);
    return formatPaginatedResult(items, total, page, limit);
  }

  async listComponents(filters = {}) {
    const q = {};
    // A branch sees its own components plus legacy global ones (branchId null).
    if (filters.branchId) q.$or = [{ branchId: { $in: idVariants(filters.branchId) } }, { branchId: null }];
    return SalaryComponent.find(q).sort({ name: 1 }).lean();
  }

  async createComponent(data, userId) {
    const code = String(data.code || "").trim().toUpperCase();
    if (!code) throw ApiError.validation("Component code is required.");
    if (String(data.calculationType || "").toUpperCase() === "PERCENTAGE" && !fieldRules.isPercentage(data.defaultAmount ?? 0)) {
      throw ApiError.validation("A percentage component must have a rate between 0 and 100.");
    }
    const branchId = data.branchId ? idString(data.branchId) : null;
    const existing = await SalaryComponent.findOne({ code, branchId: { $in: branchId ? idVariants(branchId) : [null] } });
    if (existing) throw ApiError.conflict(`Salary component with code '${code}' already exists for this branch.`);
    return SalaryComponent.create({ ...data, code, branchId, createdBy: userId || null, updatedBy: userId || null });
  }

  async listStructures(filters = {}) {
    const q = {};
    if (filters.employeeId) q.employeeId = { $in: idVariants(filters.employeeId) };
    if (filters.branchId) q.branchId = { $in: idVariants(filters.branchId) };
    if (filters.isActive !== undefined) q.isActive = filters.isActive === "true" || filters.isActive === true;

    const { page, limit, skip } = parsePagination(filters);

    const [items, total] = await Promise.all([
      EmployeeSalaryStructure.find(q)
        .populate("employeeId", EMPLOYEE_SELECT)
        .populate("components.componentId", "code name componentType calculationType percentageOf isTaxable")
        .sort({ effectiveFrom: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmployeeSalaryStructure.countDocuments(q),
    ]);

    await attachNames(items);
    return formatPaginatedResult(items, total, page, limit);
  }

  /**
   * A new structure replaces whatever the employee had before it, so the employee keeps one
   * current structure instead of a pile of active ones:
   *  - an earlier structure that is still open is ended the day before the new one starts
   *    (its dates stay, so past months still use it), and
   *  - a structure that starts the same day is replaced outright, so it is switched off.
   * A structure that starts later is left alone. Nothing is deleted.
   */
  async _supersedeEarlierStructures(employeeId, created) {
    const newFrom = new Date(created.effectiveFrom);
    const dayBefore = new Date(newFrom.getTime() - 24 * 60 * 60 * 1000);
    const sameDay = (a, b) => new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);

    const others = await EmployeeSalaryStructure.find({
      _id: { $ne: created._id },
      employeeId: { $in: idVariants(employeeId) },
      isActive: true,
    });

    for (const prev of others) {
      const prevFrom = new Date(prev.effectiveFrom);
      if (sameDay(prevFrom, newFrom)) {
        prev.isActive = false;
        prev.effectiveTo = null;
        prev.remarks = [prev.remarks, "Replaced by a newer structure with the same start date."].filter(Boolean).join(" ");
        await prev.save();
      } else if (prevFrom < newFrom && (!prev.effectiveTo || new Date(prev.effectiveTo) >= newFrom)) {
        prev.effectiveTo = dayBefore;
        await prev.save();
      }
    }
  }

  async createStructure(data, userId) {
    const employee = await Employee.findById(idString(data.employeeId));
    if (!employee) throw ApiError.notFound("Employee not found.");
    if (idString(employee.branchId) !== idString(data.branchId)) throw ApiError.validation("branchId does not match employee branch.");
    const monthlySalary = Number(data.monthlySalary);
    if (!(monthlySalary >= 0)) throw ApiError.validation("monthlySalary must be a non-negative number.");

    if (Array.isArray(data.components) && data.components.length > 0) {
      const populatedComps = await SalaryComponent.find({
        _id: { $in: data.components.map((c) => c.componentId).filter(Boolean) }
      }).lean();
      const compMap = new Map(populatedComps.map((c) => [String(c._id), c]));

      // Components belong to a branch (or are global); an employee's structure
      // may only use its own branch's catalog.
      const foreign = populatedComps.find(
        (c) => c.branchId && idString(c.branchId) !== idString(data.branchId)
      );
      if (foreign) {
        throw ApiError.validation(`Component '${foreign.code}' belongs to a different branch.`);
      }

      let basicAmount = null;
      for (const sc of data.components) {
        if (sc.isEnabled === false) continue;
        const meta = compMap.get(String(sc.componentId));
        if (meta && meta.code === "BASIC") {
          const calcType = meta.calculationType || "FIXED";
          if (calcType === "PERCENTAGE" && meta.percentageOf === "MONTHLY_SALARY") {
            basicAmount = (monthlySalary * (Number(sc.percentage) || 0)) / 100;
          } else {
            basicAmount = Number(sc.amount) || 0;
          }
        }
      }
      if (basicAmount === null) basicAmount = monthlySalary;

      let nonSaEarningsSum = 0;
      for (const sc of data.components) {
        if (sc.isEnabled === false) continue;
        const meta = compMap.get(String(sc.componentId));
        if (!meta || meta.componentType !== "EARNING") continue;
        if (meta.code === "SPECIAL_ALLOWANCE" || meta.code === "SA") continue;

        const calcType = meta.calculationType || "FIXED";
        if (calcType === "PERCENTAGE") {
          const base = meta.percentageOf === "BASIC" ? basicAmount : monthlySalary;
          nonSaEarningsSum += (base * (Number(sc.percentage) || 0)) / 100;
        } else if (calcType === "FIXED" || calcType === "MANUAL") {
          nonSaEarningsSum += Number(sc.amount) || 0;
        }
      }

      if (money(nonSaEarningsSum) > monthlySalary) {
        throw ApiError.validation(
          `Configured earning components (₹${money(nonSaEarningsSum)}) exceed the monthly salary package (₹${monthlySalary}).`
        );
      }
    }

    const structure = await EmployeeSalaryStructure.create({
      ...data,
      monthlySalary,
      createdBy: userId || null,
      updatedBy: userId || null
    });

    await this._supersedeEarlierStructures(employee._id, structure);

    // Synchronize employee master fields
    await Employee.updateOne(
      { _id: employee._id },
      { $set: { salaryStructureId: structure._id, salaryEffectiveFrom: structure.effectiveFrom } }
    );

    return structure;
  }

  async listAdjustments(filters = {}) {
    const q = {};
    if (filters.employeeId) q.employeeId = { $in: idVariants(filters.employeeId) };
    if (filters.branchId) q.branchId = { $in: idVariants(filters.branchId) };
    if (filters.payrollMonth) q.payrollMonth = Number(filters.payrollMonth);
    if (filters.payrollYear) q.payrollYear = Number(filters.payrollYear);
    if (filters.status) q.status = filters.status;
    if (filters.adjustmentType) q.adjustmentType = String(filters.adjustmentType).trim();

    const { page, limit, skip } = parsePagination(filters);

    const [items, total] = await Promise.all([
      SalaryAdjustment.find(q)
        .populate("employeeId", EMPLOYEE_SELECT)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SalaryAdjustment.countDocuments(q),
    ]);

    await attachNames(items);
    return formatPaginatedResult(items, total, page, limit);
  }

  async getAdjustmentById(id) {
    const adjId = idString(id);
    if (!adjId) return null;
    return SalaryAdjustment.findById(adjId).lean();
  }

  async cancelAdjustment(id, userId, context = {}) {
    const adjId = idString(id);
    if (!adjId) throw ApiError.validation("Salary adjustment ID is required.");

    const existing = await SalaryAdjustment.findById(adjId);
    if (!existing) throw ApiError.notFound("Salary adjustment not found.");

    if (existing.status === "APPLIED") {
      throw ApiError.conflict("Cannot cancel an adjustment that has already been applied to payroll.");
    }

    if (existing.status === "CANCELLED") {
      throw ApiError.conflict("Salary adjustment is already cancelled.");
    }

    if (existing.status !== "PENDING") {
      throw ApiError.conflict(`Cannot cancel an adjustment in '${existing.status}' status.`);
    }

    // Check if payroll for this period is already approved, paid, or locked
    const finalizedRun = await SalaryRun.findOne({
      branchId: { $in: idVariants(existing.branchId) },
      payrollMonth: Number(existing.payrollMonth),
      payrollYear: Number(existing.payrollYear),
      status: { $in: ["APPROVED", "PAID", "LOCKED"] }
    });
    if (finalizedRun) {
      throw ApiError.conflict(`Cannot cancel adjustment for a salary run that is already ${finalizedRun.status.toLowerCase()}.`);
    }

    // Check if salary calculation is currently in progress
    const calculatingRun = await SalaryRun.findOne({
      branchId: { $in: idVariants(existing.branchId) },
      payrollMonth: Number(existing.payrollMonth),
      payrollYear: Number(existing.payrollYear),
      status: "CALCULATING"
    });
    if (calculatingRun) {
      throw ApiError.conflict("Cannot cancel adjustment while salary run calculation is in progress.");
    }

    // Concurrency-safe atomic transition from PENDING to CANCELLED
    const updated = await SalaryAdjustment.findOneAndUpdate(
      { _id: existing._id, status: "PENDING" },
      {
        $set: {
          status: "CANCELLED",
          updatedBy: userId || null,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!updated) {
      throw ApiError.conflict("Adjustment could not be cancelled due to a concurrent status change.");
    }

    try {
    } catch (e) {}

    return updated;
  }

  async listRepayments(filters = {}) {
    const q = {};
    if (filters.employeeId) q.employeeId = { $in: idVariants(filters.employeeId) };
    if (filters.employeeLoanId) q.employeeLoanId = filters.employeeLoanId;
    if (filters.salaryRecordId) q.salaryRecordId = filters.salaryRecordId;
    if (filters.payrollMonth) q.payrollMonth = Number(filters.payrollMonth);
    if (filters.payrollYear) q.payrollYear = Number(filters.payrollYear);
    if (filters.paymentMethod) q.paymentMethod = filters.paymentMethod;
    if (filters.branchId) {
      const loans = await EmployeeLoan.find({ branchId: { $in: idVariants(filters.branchId) } }).select("_id").lean();
      q.employeeLoanId = { $in: loans.map((loan) => loan._id) };
    }

    const { page, limit, skip } = parsePagination(filters);

    const [items, total] = await Promise.all([
      LoanRepayment.find(q)
        .populate("employeeId", EMPLOYEE_SELECT)
        .populate("employeeLoanId", "loanNumber")
        .sort({ repaymentDate: -1, repaymentNumber: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LoanRepayment.countDocuments(q),
    ]);

    await attachNames(items);
    return formatPaginatedResult(items, total, page, limit);
  }
}

SalaryService.prototype.isTransientTransactionError = isTransientTransactionError;
SalaryService.prototype.isUnknownCommitResultError = isUnknownCommitResultError;

module.exports = new SalaryService();
