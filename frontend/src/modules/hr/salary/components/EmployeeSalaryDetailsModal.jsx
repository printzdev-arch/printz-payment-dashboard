import React, { useState, useEffect } from "react";
import { X, Printer, FileSpreadsheet } from "lucide-react";
import salaryApi from "../api/salaryApi";
import DataTable from "../../../../shared/ui/DataTable/DataTable";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const inr = (n) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;
const num = (n) => Number(n || 0);

// Shift dates are stored as YYYY-MM-DD strings
const formatShiftDay = (s) =>
  s
    ? new Date(`${s}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    : "—";

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const htmlEscape = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const UnlinkedBadge = () => (
  <span
    title="This line item came from a salary component that no longer exists in the catalog."
    style={{ marginLeft: "6px", fontSize: "10px", color: "#475569", background: "#e2e8f0", borderRadius: "999px", padding: "1px 7px", fontWeight: 600 }}
  >
    Custom / Unlinked Component
  </span>
);

export default function EmployeeSalaryDetailsModal({
  isOpen,
  onClose,
  record = null,
  branchName = "",
}) {
  const [activeTab, setActiveTab] = useState("attendance"); // attendance | earnings | deductions | loans | netpay
  const [repayments, setRepayments] = useState([]);
  const [repaymentsLoading, setRepaymentsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !record?._id) {
      setRepayments([]);
      return;
    }
    setActiveTab("attendance");
    let cancelled = false;
    (async () => {
      try {
        setRepaymentsLoading(true);
        const res = await salaryApi.listLoanRepayments({ salaryRecordId: record._id, limit: 50 });
        const list = res?.data || [];
        if (!cancelled) setRepayments(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setRepayments([]);
      } finally {
        if (!cancelled) setRepaymentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, record?._id]);

  if (!isOpen || !record) return null;

  const emp = record.employeeId || {};
  const empName = emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "—";
  const empCode = emp.employeeCode || "—";
  const monthName = MONTH_NAMES[(record.payrollMonth || 1) - 1];
  const period = `${monthName} ${record.payrollYear}`;
  const status = record.status || "DRAFT";

  const hasComponents = Array.isArray(record.components) && record.components.length > 0;
  const shiftedPeriods = Array.isArray(record.branchShifts) ? record.branchShifts : [];

  // The backend falls back to code "COMPONENT" / name "Component" when the
  // assigned catalog item was deleted.
  const isUnlinked = (c) => c.code === "COMPONENT" && c.name === "Component";

  const earnings = hasComponents
    ? [
        ...record.components
          .filter((c) => c.componentType === "EARNING")
          .map((c) => ({ label: c.name, amount: c.amount, unlinked: isUnlinked(c) })),
        { label: "Overtime Pay", amount: record.otAmount, hide: num(record.otAmount) === 0 },
        { label: "Mobile Submission Incentive", amount: record.mobileSubmissionIncentive, hide: num(record.mobileSubmissionIncentive) === 0 },
        { label: "Other Incentive / Earnings", amount: record.otherIncentive, hide: num(record.otherIncentive) === 0 },
      ].filter((e) => !e.hide)
    : [
        { label: "Monthly Salary", amount: record.monthlySalary },
        { label: "Overtime Pay", amount: record.otAmount, hide: num(record.otAmount) === 0 },
        { label: "Mobile Submission Incentive", amount: record.mobileSubmissionIncentive, hide: num(record.mobileSubmissionIncentive) === 0 },
        { label: "Other Incentive / Earnings", amount: record.otherIncentive, hide: num(record.otherIncentive) === 0 },
      ].filter((e) => !e.hide);

  const deductions = [
    ...(hasComponents
      ? record.components
          .filter((c) => c.componentType === "DEDUCTION")
          .map((c) => ({ label: c.name, amount: c.amount, unlinked: isUnlinked(c) }))
      : []),
    { label: "Loss of Pay (LOP)", amount: record.lopDeduction },
    { label: "Salary Advance", amount: record.advanceTakenInPresentMonth },
    { label: "Shortage", amount: record.shortageDeduction },
    { label: "Wastage", amount: record.wastageDeduction },
    { label: "Employee Purchase", amount: record.employeePurchaseDeduction },
    { label: "Loan EMI", amount: record.loanEmi },
    { label: "Other Deductions", amount: record.otherDeductions },
  ].filter((d) => num(d.amount) > 0);

  const attendanceRows = [
    ["Calendar Days", record.calendarDaysInMonth],
    ["Salary Calculation Days", record.salaryCalculationDays],
    ["Days To Be Worked", record.daysToBeWorked],
    ["Days Worked", record.daysWorked],
    ["Paid Leave Days", record.paidLeaveDays],
    ["Unpaid Leave Days", record.unpaidLeaveDays],
    ["LOP Days", record.lopDays],
    ["Required Hours / Day", record.requiredWorkingHoursPerDay],
    ["Total Working Hours", record.totalWorkingHours],
    ["Approved OT Hours", record.totalOtHours],
  ];

  const handleExportCSV = () => {
    const rows = [
      ["Employee Name", empName],
      ["Employee Code", empCode],
      ["Branch", branchName],
      ["Period", period],
      ["Status", status],
      ["Monthly Salary", record.monthlySalary],
      ["Salary Calculation Days", record.salaryCalculationDays],
      ["Days Worked", record.daysWorked],
      ["LOP Days", record.lopDays],
      ...earnings.map((e) => [e.label, e.amount]),
      ["Gross Pay", record.grossPay],
      ...deductions.map((d) => [d.label, d.amount]),
      ["Total Deductions", record.totalDeductions],
      ["Deficit", record.isDeficit ? `Yes (${inr(record.deficitAmount)})` : "No"],
      ["Final Pay (Rounded)", record.roundPay],
      ["Paid", record.paid],
      ["Balance", record.balance],
    ];
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Salary_${empCode}_${monthName}_${record.payrollYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintPayslip = () => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    const lines = (items) =>
      items.map((i) => `<tr><td>${htmlEscape(i.label)}</td><td class="r">${htmlEscape(inr(i.amount))}</td></tr>`).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Payslip ${htmlEscape(empCode)} ${htmlEscape(period)}</title>
<style>body{font-family:Poppins,Arial,sans-serif;padding:24px;color:#0f172a}h1{font-size:18px;margin:0 0 4px}
table{width:100%;border-collapse:collapse;margin:12px 0}td{padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:13px}
.r{text-align:right}.t td{font-weight:700;border-top:2px solid #0f172a}.m{color:#475569;font-size:12px}</style></head><body>
<h1>Payslip — ${htmlEscape(period)}</h1>
<div class="m">${htmlEscape(empName)} (${htmlEscape(empCode)}) · ${htmlEscape(branchName)}</div>
<h3>Earnings</h3><table>${lines(earnings)}<tr class="t"><td>Gross Pay</td><td class="r">${htmlEscape(inr(record.grossPay))}</td></tr></table>
<h3>Deductions</h3><table>${lines(deductions)}<tr class="t"><td>Total Deductions</td><td class="r">${htmlEscape(inr(record.totalDeductions))}</td></tr></table>
<h3>Net Pay: ${htmlEscape(inr(record.roundPay))}</h3>
${record.isDeficit ? `<div style="color:#b91c1c;font-size:12px;margin:4px 0;font-weight:600;">Deficit Notice: Total deductions exceed gross earnings. Unrecovered deficit: ${htmlEscape(inr(record.deficitAmount))}</div>` : ""}
<div class="m">Days worked ${htmlEscape(record.daysWorked)} of ${htmlEscape(record.salaryCalculationDays)} · LOP days ${htmlEscape(record.lopDays)}</div>
<script>window.onload=function(){window.print();}</script></body></html>`);
    w.document.close();
  };

  const tabs = [
    ["attendance", "Attendance Summary"],
    ["earnings", "Earnings"],
    ["deductions", "Deductions & Adjustments"],
    ["loans", "Loan Details"],
    ["netpay", "Net Pay & Payslip"],
  ];

  return (
    <div className="salary-modal-overlay">
      <div className="salary-modal-card wide">
        <div className="salary-modal-header">
          <div>
            <h3 className="salary-modal-title">Employee Salary Details</h3>
            <span style={{ fontSize: "12px", color: "#475569" }}>
              {empCode} · {period}
            </span>
          </div>
          <button type="button" className="salary-modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="salary-modal-body">
          <div className="salary-details-header-card">
            <div className="salary-details-meta">
              <div className="salary-meta-item">
                <span className="salary-meta-label">Name & ID</span>
                <span className="salary-meta-val">{empName} ({empCode})</span>
              </div>
              <div className="salary-meta-item">
                <span className="salary-meta-label">Branch</span>
                <span className="salary-meta-val">{branchName || "—"}</span>
              </div>
              <div className="salary-meta-item">
                <span className="salary-meta-label">Period</span>
                <span className="salary-meta-val">{period}</span>
              </div>
              <div className="salary-meta-item">
                <span className="salary-meta-label">Status</span>
                <div>
                  <span className={`badge-salary-status ${status.toLowerCase()}`}>{status.replace("_", " ")}</span>
                </div>
              </div>
            </div>
          </div>

          {record.isDeficit && (
            <div style={{
              background: "#fee2e2",
              border: "1px solid #f87171",
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: "16px",
              color: "#991b1b",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <strong>HR Deficit Notice:</strong>
              <span>
                Total deductions ({inr(record.totalDeductions)}) exceed gross earnings ({inr(record.grossPay)}).
                Net pay is set to ₹0. Unrecovered deficit: <strong>{inr(record.deficitAmount)}</strong>.
              </span>
            </div>
          )}

          <div className="salary-tabs-bar" style={{ marginBottom: "16px", flexWrap: "wrap" }}>
            {tabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`salary-tab-btn ${activeTab === key ? "active" : ""}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === "attendance" && (
            <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
                {attendanceRows.map(([label, value]) => (
                  <div key={label}>
                    <span style={{ fontSize: "12px", color: "#475569" }}>{label}</span>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: label === "LOP Days" && num(value) > 0 ? "#b91c1c" : "#0f172a" }}>
                      {value ?? "—"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Shown only when the employee was temporarily shifted to another branch this month */}
              {shiftedPeriods.length > 0 && (
                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px dashed #cbd5e1" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#b45309", marginBottom: "8px" }}>
                    Temporary Branch Shift
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {shiftedPeriods.map((s, i) => (
                      <div
                        key={`${s.shiftId || i}`}
                        style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "8px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "#0f172a" }}
                      >
                        <span>
                          Shifted to <strong>{s.branchName || "another branch"}</strong>
                        </span>
                        <span>
                          <strong>{formatShiftDay(s.fromDate)}</strong> to <strong>{formatShiftDay(s.toDate)}</strong>
                          <span style={{ color: "#64748b" }}> ({s.totalDays} day{s.totalDays === 1 ? "" : "s"})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "earnings" && (
            <div className="salary-column-box">
              <div className="salary-column-title earnings">Earnings</div>
              {earnings.map((item, i) => (
                <div key={`${item.label}-${i}`} className="salary-line-item">
                  <span>{item.label}{item.unlinked && <UnlinkedBadge />}</span>
                  <strong>{inr(item.amount)}</strong>
                </div>
              ))}
              <div className="salary-line-item total">
                <span>Gross Pay</span>
                <span style={{ color: "#15803d" }}>{inr(record.grossPay)}</span>
              </div>
            </div>
          )}

          {activeTab === "deductions" && (
            <div className="salary-column-box">
              <div className="salary-column-title deductions">Deductions & Adjustments</div>
              {deductions.length === 0 ? (
                <div style={{ color: "#475569", fontSize: "12.5px", padding: "10px 0" }}>No deductions for this period.</div>
              ) : (
                deductions.map((item, i) => (
                  <div key={`${item.label}-${i}`} className="salary-line-item">
                    <span>{item.label}{item.unlinked && <UnlinkedBadge />}</span>
                    <strong style={{ color: "#b91c1c" }}>{inr(item.amount)}</strong>
                  </div>
                ))
              )}
              <div className="salary-line-item total">
                <span>Total Deductions</span>
                <span style={{ color: "#b91c1c" }}>{inr(record.totalDeductions)}</span>
              </div>
            </div>
          )}

          {activeTab === "loans" && (
            <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "13px", marginBottom: "12px" }}>
                <span style={{ color: "#475569" }}>Loan EMI deducted this period:</span>{" "}
                <strong style={{ color: "#b91c1c" }}>{inr(record.loanEmi)}</strong>
              </div>
              {num(record.skippedLoanEmi) > 0 && (
                <div style={{ fontSize: "12.5px", marginBottom: "12px", background: "#fef3c7", color: "#92400e", borderRadius: "8px", padding: "8px 12px" }}>
                  EMI skipped this month: {inr(record.skippedLoanEmi)} was not deducted on request and is postponed
                  (the loan finishes one month later).
                </div>
              )}
              {repaymentsLoading ? (
                <div style={{ fontSize: "12.5px", color: "#475569" }}>Loading repayment history...</div>
              ) : repayments.length === 0 ? (
                <div style={{ fontSize: "12.5px", color: "#475569" }}>
                  No loan repayments are linked to this salary record yet. Repayments are posted when the run is marked paid.
                </div>
              ) : (
                <DataTable
                  searchable={false}
                  pagination={false}
                  data={repayments}
                  columns={[
                    { key: "repaymentDate", label: "Date", render: (r) => (r.repaymentDate ? new Date(r.repaymentDate).toLocaleDateString("en-GB") : "—") },
                    { key: "amount", label: "Amount", render: (r) => inr(r.amount) },
                    { key: "previousBalance", label: "Previous Balance", render: (r) => inr(r.previousBalance) },
                    { key: "remainingBalance", label: "Remaining Balance", render: (r) => inr(r.remainingBalance) },
                  ]}
                />
              )}
            </div>
          )}

          {activeTab === "netpay" && (
            <div className="salary-pills-row">
              <div className="salary-pill-item">
                <span className="salary-pill-label">Gross Pay</span>
                <span className="salary-pill-value" style={{ color: "#15803d" }}>{inr(record.grossPay)}</span>
              </div>
              <div className="salary-pill-item">
                <span className="salary-pill-label">Total Deductions</span>
                <span className="salary-pill-value" style={{ color: "#b91c1c" }}>{inr(record.totalDeductions)}</span>
              </div>
              <div className="salary-pill-item">
                <span className="salary-pill-label">Final Pay (Rounded)</span>
                <span className="salary-pill-value" style={{ color: "#107548", fontWeight: 800 }}>{inr(record.roundPay)}</span>
              </div>
              <div className="salary-pill-item">
                <span className="salary-pill-label">Amount Paid</span>
                <span className="salary-pill-value">{inr(record.paid)}</span>
              </div>
              <div className="salary-pill-item">
                <span className="salary-pill-label">Outstanding Balance</span>
                <span className="salary-pill-value">{inr(record.balance)}</span>
              </div>
            </div>
          )}

          {record.isMidMonthPreview && (
            <div style={{ marginTop: "14px", fontSize: "12px", color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "8px 12px" }}>
              This is a mid-month preview. Figures will change as attendance is recorded until the period ends.
            </div>
          )}
        </div>

        <div className="salary-modal-footer">
          <button type="button" className="btn-salary-pdf" onClick={handlePrintPayslip}>
            <Printer size={15} /> Print Payslip
          </button>
          <button type="button" className="btn-salary-excel" onClick={handleExportCSV}>
            <FileSpreadsheet size={15} /> Export CSV
          </button>
          <button type="button" className="btn-salary-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
