import React, { useState, useEffect } from "react";
import { X, Calculator, CheckCircle2, Wallet, Lock, RefreshCw, AlertCircle } from "lucide-react";
import salaryApi from "../api/salaryApi";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../app/providers/AuthContext";
import EmployeeSalaryDetailsModal from "./EmployeeSalaryDetailsModal";
import SalaryMaintenanceBanner from "./SalaryMaintenanceBanner";
import {
  flagIfMaintenance,
  attendanceLinkFor,
  getApprovalState,
  isAttendanceIssue,
  isConflictError,
  useSalaryMaintenance,
} from "../utils/salaryGuards";

const inr = (n) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

const STEPS = [
  { key: "DRAFT", label: "Draft Created" },
  { key: "CALCULATED", label: "Calculated" },
  { key: "APPROVED", label: "Approved" },
  { key: "PAID", label: "Paid" },
  { key: "LOCKED", label: "Locked" },
];
// CALCULATING sits between Draft and Calculated.
const stepIndexOf = (status) => {
  if (status === "CALCULATING") return 0;
  const i = STEPS.findIndex((s) => s.key === status);
  return i < 0 ? 0 : i;
};


export default function SalaryRunReviewModal({
  isOpen,
  onClose,
  runId,
  onRunUpdated,
  branchName = "",
}) {
  const maintenance = useSalaryMaintenance();
  const navigate = useNavigate();
  const { hasPermission, currentUser } = useAuth();
  // Only a Super Admin may send an approved run back
  const isSuperAdmin = currentUser?.roleCode === "SUPER_ADMIN";
  const canProcess = hasPermission("hr.salary.process");
  const canApprove = hasPermission("hr.salary.approve");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [run, setRun] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isOpen && runId) {
      loadRunDetails();
    } else {
      setRun(null);
      setRecords([]);
      setError("");
      setSuccessMsg("");
    }
  }, [isOpen, runId]);

  const loadRunDetails = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await salaryApi.getRunById(runId);
      const data = res?.data || res;
      setRun(data?.run || data);
      setRecords(data?.records || data?.salaryRecords || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load run details.");
    } finally {
      setLoading(false);
    }
  };

  const CONFIRM_TEXT = {
    approve: "Approve this payroll? After approval it can no longer be recalculated.",
    pay: "Mark this payroll as paid? This posts salary payment, adjustments and loan EMI repayments. It does not transfer money.",
    lock: "Lock this payroll? It becomes read-only and cannot be reopened.",
  };

  const handleAction = async (actionType, extra = "") => {
    if (actionLoading) return;
    if (CONFIRM_TEXT[actionType] && !window.confirm(CONFIRM_TEXT[actionType])) return;
    try {
      setActionLoading(true);
      setError("");
      setSuccessMsg("");

      if (actionType === "calculate") {
        await salaryApi.calculateRun(runId);
        setSuccessMsg("Salary calculation completed successfully!");
      } else if (actionType === "approve") {
        await salaryApi.approveRun(runId);
        setSuccessMsg("Salary run approved!");
      } else if (actionType === "pay") {
        await salaryApi.payRun(runId);
        setSuccessMsg("Salary marked as paid and loan ledger updated!");
      } else if (actionType === "lock") {
        await salaryApi.lockRun(runId);
        setSuccessMsg("Salary run locked and finalized.");
      } else if (actionType === "reopen") {
        await salaryApi.reopenRun(runId, extra);
        setSuccessMsg("Salary run sent back to calculated. Recalculate or approve it again after the correction.");
      }

      await loadRunDetails();
      if (onRunUpdated) onRunUpdated();
    } catch (err) {
      if (flagIfMaintenance(err)) {
        // Banner explains it; no error alert needed.
      } else if (isConflictError(err)) {
        toast.info("Payroll was already updated by another session. Refreshing view...");
        await loadRunDetails();
        if (onRunUpdated) onRunUpdated();
      } else {
        setError(err?.response?.data?.message || err?.message || `Failed to ${actionType} salary run.`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const status = run?.status || "DRAFT";
  const approval = status === "CALCULATED" ? getApprovalState(run) : null;
  const actionsDisabled = actionLoading || maintenance;
  const monthName =
    run?.payrollYear && run?.payrollMonth
      ? new Date(run.payrollYear, run.payrollMonth - 1).toLocaleString("en-US", { month: "long" })
      : "";

  return (
    <div className="salary-modal-overlay">
      <div className="salary-modal-card wide">
        <div className="salary-modal-header">
          <div>
            <h3 className="salary-modal-title">
              Payroll Run Review: {monthName} {run?.payrollYear}
            </h3>
            <span style={{ fontSize: "12px", color: "#475569" }}>
              Branch: <strong>{branchName || run?.branchName || run?.branchId?.name || "—"}</strong>
            </span>
          </div>
          <button type="button" className="salary-modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="salary-modal-body">
          <SalaryMaintenanceBanner />
          {/* Lifecycle stepper */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
            {STEPS.map((step, i) => {
              const current = stepIndexOf(status);
              const done = i < current || status === "LOCKED";
              const active = i === current && status !== "LOCKED";
              return (
                <React.Fragment key={step.key}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: 600,
                      background: done ? "#dcfce7" : active ? "#dbeafe" : "#f1f5f9",
                      color: done ? "#166534" : active ? "#1d4ed8" : "#64748b",
                    }}
                  >
                    <span>{done ? "✓" : active ? "⏳" : "○"}</span>
                    <span>{i + 1}. {step.label}</span>
                    {i === 1 && approval?.midMonth && (
                      <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: "999px", padding: "0 7px", fontSize: "10.5px" }}>
                        Mid-Month Preview
                      </span>
                    )}
                  </div>
                  {i < STEPS.length - 1 && <span style={{ color: "#94a3b8" }}>→</span>}
                </React.Fragment>
              );
            })}
          </div>

          {error && isAttendanceIssue(error) ? (
            <div style={{ background: "#fff7ed", border: "1px solid #fdba74", color: "#9a3412", padding: "12px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
              <div style={{ marginBottom: "8px" }}>{error}</div>
              <button
                type="button"
                className="btn-salary-secondary"
                onClick={() => {
                  onClose();
                  navigate(attendanceLinkFor(error));
                }}
              >
                Go to Daily Attendance
              </button>
            </div>
          ) : (
            error && (
              <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
                {error}
              </div>
            )
          )}

          {successMsg && (
            <div style={{ background: "#ecfdf5", color: "#047857", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
              {successMsg}
            </div>
          )}

          {/* KPI Strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px", marginBottom: "20px" }}>
            <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Status</span>
              <div style={{ marginTop: "4px" }}>
                <span className={`badge-salary-status ${status.toLowerCase()}`}>{status}</span>
                {approval?.midMonth && (
                  <span style={{ marginLeft: "6px", fontSize: "10.5px", color: "#b45309", background: "#fef3c7", borderRadius: "999px", padding: "1px 8px", fontWeight: 600 }}>
                    Mid-Month Preview
                  </span>
                )}
                {approval?.recalcRequired && (
                  <span style={{ marginLeft: "6px", fontSize: "10.5px", color: "#1d4ed8", background: "#dbeafe", borderRadius: "999px", padding: "1px 8px", fontWeight: 600 }}>
                    Recalculate Required
                  </span>
                )}
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Staff Count</span>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                {run?.employeeCount ?? records.length}
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Gross Salary</span>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                ₹ {Number(run?.totalGrossPay || 0).toLocaleString("en-IN")}
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Total Deductions</span>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#b91c1c", marginTop: "2px" }}>
                ₹ {Number(run?.totalDeductions || 0).toLocaleString("en-IN")}
              </div>
            </div>

            <div style={{ background: "#ecfdf5", padding: "12px 14px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
              <span style={{ fontSize: "11px", color: "#047857", textTransform: "uppercase", fontWeight: 600 }}>Total Net Pay</span>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#107548", marginTop: "2px" }}>
                ₹ {Number(run?.totalNetPay || 0).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Table of Employee Calculations */}
          {records.some((r) => r.isDeficit) && (
            <div style={{
              background: "#fee2e2",
              border: "1px solid #f87171",
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: "14px",
              color: "#991b1b",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <AlertCircle size={16} />
              <span>
                <strong>Deficit Alert:</strong> One or more employees have deductions exceeding gross earnings. Net pay is clamped to ₹0 and deficit amounts are flagged for HR review.
              </span>
            </div>
          )}

          <div className="salary-table-card" style={{ marginBottom: 0 }}>
            <div className="salary-table-responsive">
              <table className="salary-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Employee</th>
                    <th>Monthly Salary</th>
                    <th>Working Days</th>
                    <th>Days Worked</th>
                    <th>LOP Days</th>
                    <th>LOP Deduction</th>
                    <th>OT Hours</th>
                    <th>OT Pay</th>
                    <th>Loan EMI</th>
                    <th>Other Deductions</th>
                    <th>Gross Pay</th>
                    <th>Final Pay</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={16} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                        Loading employee records...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={16} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                        No employee calculations recorded yet. Click <strong>"Calculate Payroll"</strong> below to generate breakdown.
                      </td>
                    </tr>
                  ) : (
                    records.map((rec, index) => {
                      const emp = rec.employeeId || {};
                      return (
                        <tr
                          key={rec._id || index}
                          style={{ cursor: "pointer" }}
                          title="View salary breakdown"
                          onClick={() => setSelectedRecord(rec)}
                        >
                          <td>{index + 1}</td>
                          <td>
                            <strong>{emp.name || "—"}</strong>
                            <div style={{ fontSize: "11px", color: "#475569" }}>{emp.employeeCode || ""}</div>
                          </td>
                          <td>{inr(rec.monthlySalary)}</td>
                          <td>{rec.salaryCalculationDays ?? "—"}</td>
                          <td>{rec.daysWorked ?? "—"}</td>
                          <td style={{ color: Number(rec.lopDays || 0) > 0 ? "#b91c1c" : "inherit" }}>{rec.lopDays ?? 0}</td>
                          <td style={{ color: "#b91c1c" }}>{inr(rec.lopDeduction)}</td>
                          <td>{rec.totalOtHours ?? 0}</td>
                          <td style={{ color: Number(rec.otAmount || 0) > 0 ? "#15803d" : "inherit" }}>{inr(rec.otAmount)}</td>
                          <td>{inr(rec.loanEmi)}</td>
                          <td>{inr(rec.otherDeductions)}</td>
                          <td style={{ fontWeight: 600 }}>{inr(rec.grossPay)}</td>
                          <td style={{ fontWeight: 700, color: rec.isDeficit ? "#dc2626" : "#107548" }}>
                            {inr(rec.roundPay)}
                            {rec.isDeficit && (
                              <div style={{ fontSize: "10px", color: "#b91c1c", fontWeight: 600 }}>
                                Deficit: {inr(rec.deficitAmount)}
                              </div>
                            )}
                          </td>
                          <td>{inr(rec.paid)}</td>
                          <td style={{ color: Number(rec.balance || 0) > 0 ? "#b45309" : "inherit" }}>{inr(rec.balance)}</td>
                          <td>
                            <span className={`badge-salary-status ${String(rec.status || "DRAFT").toLowerCase()}`}>
                              {String(rec.status || "DRAFT").replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer State-Based Action Buttons */}
        <div className="salary-modal-footer">
          <button type="button" className="btn-salary-secondary" onClick={onClose}>
            Close
          </button>

          {status === "DRAFT" && canProcess && (
            <button
              type="button"
              className="btn-salary-primary"
              onClick={() => handleAction("calculate")}
              disabled={actionsDisabled}
            >
              <Calculator size={16} />
              {actionLoading ? "Calculating..." : "Calculate Payroll"}
            </button>
          )}

          {status === "CALCULATED" && (
            <>
              {approval && !approval.canApprove && (
                <span style={{ fontSize: "12px", color: "#92400e", marginRight: "auto" }}>{approval.reason}</span>
              )}
              {canProcess && (
                <button
                  type="button"
                  className="btn-salary-secondary"
                  onClick={() => handleAction("calculate")}
                  disabled={actionsDisabled}
                >
                  <RefreshCw size={14} />
                  Recalculate
                </button>
              )}
              {canApprove && (
                <button
                  type="button"
                  className="btn-salary-primary"
                  title={approval && !approval.canApprove ? approval.reason : undefined}
                  onClick={() => handleAction("approve")}
                  disabled={actionsDisabled || (approval && !approval.canApprove)}
                >
                  <CheckCircle2 size={16} />
                  {actionLoading ? "Approving..." : "Approve Payroll"}
                </button>
              )}
            </>
          )}

          {status === "APPROVED" && isSuperAdmin && (
            <button
              type="button"
              className="btn-salary-secondary"
              title="Super Admin only. Not possible once the run is paid."
              onClick={() => {
                const reason = window.prompt("Why is this approved payroll being sent back? (at least 5 characters)");
                if (reason === null) return;
                if (reason.trim().length < 5) {
                  setError("Enter a reason of at least 5 characters.");
                  return;
                }
                handleAction("reopen", reason.trim());
              }}
              disabled={actionsDisabled}
            >
              <RefreshCw size={14} />
              Send Back to Calculated
            </button>
          )}

          {status === "APPROVED" && canProcess && (
            <button
              type="button"
              className="btn-salary-primary"
              onClick={() => handleAction("pay")}
              disabled={actionsDisabled}
            >
              <Wallet size={16} />
              {actionLoading ? "Processing..." : "Mark as Paid"}
            </button>
          )}

          {status === "PAID" && canProcess && (
            <button
              type="button"
              className="btn-salary-secondary"
              style={{ borderColor: "#64748b", color: "#334155" }}
              onClick={() => handleAction("lock")}
              disabled={actionsDisabled}
            >
              <Lock size={15} />
              {actionLoading ? "Locking..." : "Lock Run (Finalize)"}
            </button>
          )}

          {status === "LOCKED" && (
            <span style={{ fontSize: "12px", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Lock size={14} /> Locked & Immutable
            </span>
          )}
        </div>
      </div>

      <EmployeeSalaryDetailsModal
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
        branchName={branchName}
      />
    </div>
  );
}
