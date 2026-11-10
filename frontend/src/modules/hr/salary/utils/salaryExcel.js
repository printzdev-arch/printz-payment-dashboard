import XLSX from "xlsx-js-style";

const MONTH_NAMES = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

// Indian digit grouping (₹ 10,82,223) for amounts.
const INR_FORMAT = '[>=10000000]"₹ "##\\,##\\,##\\,##0;[>=100000]"₹ "##\\,##\\,##0;"₹ "##,##0';
const DAYS_FORMAT = "General";

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const idOf = (v) => String(v && v._id ? v._id : v || "");

const IST_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const istParts = (d) => IST_DATE.format(new Date(d)).split("-").map(Number);

// Whole years between a date of birth and a reference date (default: today).
export const ageAt = (dateOfBirth, asOf = new Date()) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const [by, bm, bd] = istParts(dob);
  const [ry, rm, rd] = istParts(asOf);
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age -= 1;
  return age >= 0 ? age : null;
};

export const formatDob = (dateOfBirth) => {
  if (!dateOfBirth) return "";
  const d = new Date(dateOfBirth);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
};

// Last day of a payroll month, used as the "as of" date for age.
const periodEnd = (record) => {
  if (!record?.payrollYear || !record?.payrollMonth) return new Date();
  return new Date(Date.UTC(record.payrollYear, record.payrollMonth, 0, 12));
};

const BORDER = {
  top: { style: "thin", color: { rgb: "000000" } },
  bottom: { style: "thin", color: { rgb: "000000" } },
  left: { style: "thin", color: { rgb: "000000" } },
  right: { style: "thin", color: { rgb: "000000" } },
};

const headerStyle = {
  font: { bold: true, sz: 11 },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: BORDER,
};
const cellStyle = (extra = {}) => ({
  font: { sz: 11 },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: BORDER,
  ...extra,
});

/**
 * Builds the monthly salary sheet and downloads it as .xlsx.
 *
 * records:          salary records (employeeId populated with name, employeeCode, dateOfBirth)
 * loanRemaining:    Map of employeeId -> outstanding loan balance
 * periodMonth/Year: payroll period shown in the title (null = unknown)
 */
export function exportSalaryRecordsXlsx({ records, loanRemaining = new Map(), periodMonth, periodYear }) {
  const monthName = periodMonth ? MONTH_NAMES[periodMonth - 1] : "";
  const title = periodMonth
    ? `SALARY CALCULATION FOR ${monthName} ${periodYear}`
    : `SALARY CALCULATION${periodYear ? ` FOR ${periodYear}` : ""}`;

  // The "other deductions" column only appears when someone actually has one,
  // so the sheet matches the standard layout in the normal case.
  const otherOf = (r) =>
    num(r.shortageDeduction) + num(r.wastageDeduction) + num(r.employeePurchaseDeduction) + num(r.otherDeductions);
  const hasOther = records.some((r) => otherOf(r) > 0);

  const columns = [
    { key: "sno", label: "S.NO", width: 6 },
    { key: "name", label: "NAME", width: 24 },
    { key: "dob", label: "DOB", width: 18 },
    { key: "age", label: "AGE", width: 7 },
    { key: "salary", label: "SALARY", width: 13, money: true, total: true },
    { key: "daysInMonth", label: "NO OF DAYS IN A MONTH", width: 13, days: true },
    { key: "daysToWork", label: "NO OF DAYS TO BE WORKED", width: 13, days: true },
    { key: "perDay", label: "PER DAY SALARY", width: 12, money: true },
    { key: "daysWorked", label: "NO OF DAYS WORKED", width: 12, days: true },
    { key: "thisMonth", label: "SALARY OF THIS MONTH", width: 14, money: true, total: true },
    { key: "incentive", label: "INCENTIVE", width: 12, money: true, total: true },
    { key: "advance", label: "ADVANCE TAKEN IN PRESENT MONTH", width: 15, money: true, total: true },
    ...(hasOther
      ? [{ key: "other", label: "SHORTAGES / WASTAGES / EMPLOYEE PURCHASE / OTHER DEDUCTIONS", width: 20, money: true, total: true }]
      : []),
    { key: "emi", label: "LOAN EMI", width: 11, money: true, total: true },
    { key: "roundPay", label: "ROUND PAY", width: 13, money: true, total: true },
    { key: "paid", label: "PAID", width: 13, money: true, total: true },
    { key: "balance", label: "BALANCE", width: 13, money: true, total: true },
    { key: "loanRemaining", label: "LOAN REMAINING", width: 14, money: true, total: true },
  ];
  const colIndex = Object.fromEntries(columns.map((c, i) => [c.key, i]));

  const rows = records.map((r, i) => {
    const emp = r.employeeId && typeof r.employeeId === "object" ? r.employeeId : {};
    const dob = emp.dateOfBirth || null;
    // Pay for the days actually worked: monthly salary less LOP, plus approved overtime.
    const thisMonth = Math.max(0, num(r.monthlySalary) - num(r.lopDeduction) + num(r.otAmount));
    return {
      sno: i + 1,
      name: emp.name || "",
      dob: formatDob(dob),
      age: ageAt(dob, periodEnd(r)),
      salary: num(r.monthlySalary),
      daysInMonth: num(r.calendarDaysInMonth),
      daysToWork: num(r.salaryCalculationDays),
      perDay: num(r.perDaySalary),
      daysWorked: num(r.daysWorked),
      thisMonth,
      incentive: num(r.mobileSubmissionIncentive) + num(r.otherIncentive),
      advance: num(r.advanceTakenInPresentMonth),
      other: otherOf(r),
      emi: num(r.loanEmi),
      roundPay: num(r.roundPay),
      paid: num(r.paid),
      balance: num(r.balance),
      loanRemaining: num(loanRemaining.get(idOf(r.employeeId))),
    };
  });

  const aoa = [];
  aoa.push([title, ...Array(columns.length - 1).fill("")]);
  aoa.push(columns.map((c) => c.label));
  rows.forEach((row) => aoa.push(columns.map((c) => row[c.key] ?? "")));

  const firstDataRow = 3; // 1-based Excel row of the first record
  const lastDataRow = firstDataRow + rows.length - 1;
  const totalRow = lastDataRow + 1;
  const totals = {};
  columns.forEach((c) => {
    if (c.total) totals[c.key] = rows.reduce((s, r) => s + num(r[c.key]), 0);
  });
  aoa.push(columns.map((c) => (c.key === "name" ? "TOTAL" : c.total ? totals[c.key] : "")));
  const summaryRow = totalRow + 1;
  const monthLabel = monthName ? monthName.toLowerCase() : "salary";
  const summary = Array(columns.length).fill("");
  summary[colIndex.roundPay] = totals.roundPay;
  summary[colIndex.paid] = `${monthLabel} salary`;
  aoa.push(summary);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const lastCol = columns.length - 1;

  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }];
  ws["!cols"] = columns.map((c) => ({ wch: c.width }));
  ws["!rows"] = [{ hpt: 34 }, { hpt: 62 }];

  const ref = (r, c) => XLSX.utils.encode_cell({ r, c });

  // Title row
  for (let c = 0; c <= lastCol; c += 1) {
    ws[ref(0, c)] = ws[ref(0, c)] || { t: "s", v: "" };
    ws[ref(0, c)].s = {
      font: { bold: true, sz: 20 },
      alignment: { horizontal: "center", vertical: "center" },
      border: BORDER,
    };
  }
  // Header row
  columns.forEach((c, ci) => {
    ws[ref(1, ci)].s = headerStyle;
  });
  // Data rows and totals use live formulas for the totals
  for (let r = 2; r <= lastDataRow - 1; r += 1) {
    columns.forEach((c, ci) => {
      const cell = ws[ref(r, ci)];
      if (!cell) return;
      cell.s = cellStyle(c.key === "name" ? { alignment: { horizontal: "left", vertical: "center", wrapText: true } } : {});
      if (c.money) cell.z = INR_FORMAT;
      if (c.days) cell.z = DAYS_FORMAT;
    });
  }
  const totalR = totalRow - 1;
  columns.forEach((c, ci) => {
    const cell = ws[ref(totalR, ci)] || (ws[ref(totalR, ci)] = { t: "s", v: "" });
    cell.s = cellStyle({ font: { bold: true, sz: 11 } });
    if (c.total && rows.length > 0) {
      const col = XLSX.utils.encode_col(ci);
      ws[ref(totalR, ci)] = {
        t: "n",
        v: totals[c.key],
        f: `SUM(${col}${firstDataRow}:${col}${lastDataRow})`,
        z: INR_FORMAT,
        s: cell.s,
      };
    }
  });
  // Summary line: net pay total and its label
  const sr = summaryRow - 1;
  const payCell = ws[ref(sr, colIndex.roundPay)];
  if (payCell) {
    payCell.z = INR_FORMAT;
    payCell.s = cellStyle({ font: { bold: true, sz: 11 } });
  }
  const labelCell = ws[ref(sr, colIndex.paid)];
  if (labelCell) {
    labelCell.s = cellStyle({ font: { bold: true, sz: 11 }, alignment: { horizontal: "left", vertical: "center" } });
  }

  const range = XLSX.utils.decode_range(ws["!ref"]);
  range.e.r = sr;
  ws["!ref"] = XLSX.utils.encode_range(range);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Salary");
  const fileLabel = periodMonth ? `${monthName}_${periodYear}` : `${periodYear || "All"}`;
  XLSX.writeFile(wb, `Salary_Calculation_${fileLabel}.xlsx`);
}
