import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Eye,
  Calculator,
  CheckCircle2,
  Wallet,
  Lock,
  Search,
  FileText,
  Clock,
  Settings,
  Calendar,
  Building2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import salaryApi from "../api/salaryApi";
import CreateSalaryRunModal from "../components/CreateSalaryRunModal";
import SalaryRunReviewModal from "../components/SalaryRunReviewModal";
import SalaryMaintenanceBanner from "../components/SalaryMaintenanceBanner";
import SalaryPagination from "../components/SalaryPagination";
import {
  flagIfMaintenance,
  attendanceLinkFor,
  getApprovalState,
  isAttendanceIssue,
  isConflictError,
  useSalaryMaintenance,
} from "../utils/salaryGuards";
import "../styles/salary.css";

export default function PayrollProcessingPage() {
  const maintenance = useSalaryMaintenance();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canProcess = hasPermission("hr.salary.process");
  const canApprove = hasPermission("hr.salary.approve");
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(() => salaryApi.getLockedBranchId());
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRunIdForReview, setSelectedRunIdForReview] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { run, type }

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadRuns();
  }, [selectedBranchId]);

  const loadLookups = async () => {
    try {
      const branchList = await salaryApi.getBranches();
      setBranches(branchList);
      setSelectedBranchId(salaryApi.getLockedBranchId());
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  };

  const loadRuns = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { limit: 100 };
      if (selectedBranchId) params.branchId = selectedBranchId;
      const res = await salaryApi.listRuns(params);
      const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
      setRuns(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load salary runs.");
    } finally {
      setLoading(false);
    }
  };

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const branchNameOf = (v, serverName) => {
    if (serverName) return serverName;
    if (v && typeof v === "object" && v.name) return v.name;
    const id = String(v && v._id ? v._id : v || "");
    return branches.find((b) => String(b._id) === id)?.name || "—";
  };
  const runLabel = (r) => `${MONTH_NAMES[(r.payrollMonth || 1) - 1]} ${r.payrollYear}`;
  const money = (n) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

  const CONFIRM_COPY = {
    approve: {
      title: "Approve Payroll",
      body: "Approving authorises this payroll for payment. After approval the run can no longer be recalculated.",
      button: "Approve Payroll",
    },
    pay: {
      title: "Mark Payroll Paid",
      body: "This records salaries as paid, applies pending adjustments and posts loan EMI repayments. It does not transfer money; confirm only after the payment has actually been made.",
      button: "Mark as Paid",
    },
    lock: {
      title: "Lock Payroll",
      body: "Locking makes this run read-only. It cannot be recalculated, approved or edited afterwards.",
      button: "Lock Payroll",
    },
  };

  // Quick Action Handler
  const handleQuickAction = async (runId, actionType) => {
    if (actionLoadingId) return;
    try {
      setActionLoadingId(runId);
      setError("");

      if (actionType === "calculate") {
        await salaryApi.calculateRun(runId);
      } else if (actionType === "approve") {
        await salaryApi.approveRun(runId);
      } else if (actionType === "pay") {
        await salaryApi.payRun(runId);
      } else if (actionType === "lock") {
        await salaryApi.lockRun(runId);
      }

      await loadRuns();
      setConfirmAction(null);
    } catch (err) {
      setConfirmAction(null);
      if (flagIfMaintenance(err)) {
        // Banner explains it; no error alert needed.
      } else if (isConflictError(err)) {
        toast.info("Payroll was already updated by another session. Refreshing view...");
        await loadRuns();
      } else {
        setError(err?.response?.data?.message || err?.message || `Failed to ${actionType} salary run.`);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // KPIs
  const totalRuns = runs.length;
  const draftRuns = runs.filter((r) => r.status === "DRAFT").length;
  const calculatedRuns = runs.filter((r) => r.status === "CALCULATED").length;
  const approvedRuns = runs.filter((r) => r.status === "APPROVED").length;
  const paidRuns = runs.filter((r) => r.status === "PAID").length;
  const lockedRuns = runs.filter((r) => r.status === "LOCKED").length;

  // Filtered runs
  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      if (selectedStatus !== "ALL" && r.status !== selectedStatus) return false;
      if (selectedMonth && String(r.payrollMonth) !== String(selectedMonth)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const branchName = branchNameOf(r.branchId, r.branchName).toLowerCase();
        const label = runLabel(r).toLowerCase();
        if (!branchName.includes(q) && !label.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs, branches, selectedStatus, selectedMonth, searchQuery]);

  const paginatedRuns = filteredRuns.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="salary-page-container">
      <SalaryMaintenanceBanner />
      {/* ── Top Header Row ─────────────────────────────────────────────── */}
      <div className="salary-header-row">
        <div className="salary-title-area">
          <h1>Payroll Processing</h1>
          
        </div>

        <div className="salary-header-actions">
          {/* Branch Selector */}
          <select
            className="salary-branch-pill-select"
            disabled={!!salaryApi.getLockedBranchId()}
            value={selectedBranchId}
            onChange={(e) => {
              setSelectedBranchId(e.target.value);
              setPage(1);
            }}
          >
            {!salaryApi.getLockedBranchId() && <option value="">All Branches</option>}
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>

          {canProcess && (
            <button
              type="button"
              className="btn-salary-primary"
              disabled={maintenance}
              title={maintenance ? "Salary processing is suspended for maintenance" : undefined}
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={16} /> Create Salary Run
            </button>
          )}
        </div>
      </div>

      {/* ── Filters Row Card ──────────────────────────────────────────── */}
      <div className="salary-filters-card">
        <select
          className="salary-filter-select"
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Months</option>
          {[
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
          ].map((m, idx) => (
            <option key={idx + 1} value={idx + 1}>{m}</option>
          ))}
        </select>

        <select
          className="salary-filter-select"
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="CALCULATING">Calculating</option>
          <option value="CALCULATED">Calculated</option>
          <option value="APPROVED">Approved</option>
          <option value="PAID">Paid</option>
          <option value="LOCKED">Locked</option>
        </select>

        <div className="salary-search-wrapper">
          <Search size={16} className="salary-search-icon" />
          <input
            type="text"
            className="salary-search-input"
            placeholder="Search salary run by month, branch or note..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* ── 6 Summary Cards Grid ───────────────────────────────────────── */}
      <div className="salary-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <div className="salary-kpi-card">
          <div className="salary-kpi-icon-box green">
            <FileText size={20} />
          </div>
          <div className="salary-kpi-details">
            <span className="salary-kpi-value">{totalRuns}</span>
            <span className="salary-kpi-label">Total Runs</span>
          </div>
        </div>

        <div className="salary-kpi-card">
          <div className="salary-kpi-icon-box blue">
            <Clock size={20} />
          </div>
          <div className="salary-kpi-details">
            <span className="salary-kpi-value">{draftRuns}</span>
            <span className="salary-kpi-label">Draft Runs</span>
          </div>
        </div>

        <div className="salary-kpi-card">
          <div className="salary-kpi-icon-box amber">
            <Settings size={20} />
          </div>
          <div className="salary-kpi-details">
            <span className="salary-kpi-value">{calculatedRuns}</span>
            <span className="salary-kpi-label">Calculated</span>
          </div>
        </div>

        <div className="salary-kpi-card">
          <div className="salary-kpi-icon-box purple">
            <CheckCircle2 size={20} />
          </div>
          <div className="salary-kpi-details">
            <span className="salary-kpi-value">{approvedRuns}</span>
            <span className="salary-kpi-label">Approved</span>
          </div>
        </div>

        <div className="salary-kpi-card">
          <div className="salary-kpi-icon-box teal">
            <Wallet size={20} />
          </div>
          <div className="salary-kpi-details">
            <span className="salary-kpi-value">{paidRuns}</span>
            <span className="salary-kpi-label">Paid</span>
          </div>
        </div>

        <div className="salary-kpi-card">
          <div className="salary-kpi-icon-box red">
            <Lock size={20} />
          </div>
          <div className="salary-kpi-details">
            <span className="salary-kpi-value">{lockedRuns}</span>
            <span className="salary-kpi-label">Locked</span>
          </div>
        </div>
      </div>

      {/* ── Table Card ───────────────────────────────────────────────── */}
      <div className="salary-table-card">
        {error && isAttendanceIssue(error) ? (
          <div style={{ background: "#fff7ed", borderBottom: "1px solid #fdba74", color: "#9a3412", padding: "12px 16px", fontSize: "13px" }}>
            <div style={{ marginBottom: "8px" }}>{error}</div>
            <button type="button" className="btn-salary-secondary" onClick={() => navigate(attendanceLinkFor(error))}>
              Go to Daily Attendance
            </button>
          </div>
        ) : (
          error && (
            <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px 16px", fontSize: "13px" }}>
              {error}
            </div>
          )
        )}

        <div className="salary-table-responsive">
          <table className="salary-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>#</th>
                <th>Month / Year</th>
                <th>Branch</th>
                <th>Total Staff</th>
                <th>Gross Amount</th>
                <th>Total Deductions</th>
                <th>Total Net</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                    Loading salary runs...
                  </td>
                </tr>
              ) : filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                    No salary runs found. Click <strong>"+ Create Salary Run"</strong> to start monthly payroll.
                  </td>
                </tr>
              ) : (
                paginatedRuns.map((r, index) => {
                  const bName = branchNameOf(r.branchId, r.branchName);
                  const isBusy = Boolean(actionLoadingId) || maintenance;
                  const approval = r.status === "CALCULATED" ? getApprovalState(r) : null;

                  return (
                    <tr key={r._id || index}>
                      <td>{(page - 1) * pageSize + index + 1}</td>
                      <td>
                        <strong>{runLabel(r)}</strong>
                        {r.status === "CALCULATED" && approval?.midMonth && (
                          <span
                            title={approval.reason}
                            style={{ marginLeft: "6px", fontSize: "10.5px", color: "#b45309", background: "#fef3c7", borderRadius: "999px", padding: "1px 8px", fontWeight: 600 }}
                          >
                            Mid-Month Preview
                          </span>
                        )}
                        {r.status === "CALCULATED" && approval?.recalcRequired && (
                          <span
                            title={approval.reason}
                            style={{ marginLeft: "6px", fontSize: "10.5px", color: "#1d4ed8", background: "#dbeafe", borderRadius: "999px", padding: "1px 8px", fontWeight: 600 }}
                          >
                            Recalculate Required
                          </span>
                        )}
                      </td>
                      <td>{bName}</td>
                      <td>{r.employeeCount || 0}</td>
                      <td style={{ fontWeight: 600 }}>₹ {Number(r.totalGrossPay || 0).toLocaleString("en-IN")}</td>
                      <td style={{ color: "#b91c1c" }}>₹ {Number(r.totalDeductions || 0).toLocaleString("en-IN")}</td>
                      <td style={{ fontWeight: 700, color: "#107548" }}>
                        ₹ {Number(r.totalNetPay || 0).toLocaleString("en-IN")}
                      </td>
                      <td>
                        <span className={`badge-salary-status ${(r.status || "DRAFT").toLowerCase()}`}>
                          {r.status || "DRAFT"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="salary-action-group" style={{ justifyContent: "flex-end" }}>
                          {/* DRAFT Actions */}
                          {r.status === "DRAFT" && canProcess && (
                            <button
                              type="button"
                              className="salary-icon-btn primary"
                              title="Calculate payroll"
                              disabled={isBusy}
                              onClick={() => handleQuickAction(r._id, "calculate")}
                            >
                              <Calculator size={15} />
                            </button>
                          )}

                          {/* CALCULATED Actions: recalculate until approved, then approve */}
                          {r.status === "CALCULATED" && (
                            <>
                              {canProcess && (
                                <button
                                  type="button"
                                  className="salary-icon-btn"
                                  title="Recalculate payroll"
                                  disabled={isBusy}
                                  onClick={() => handleQuickAction(r._id, "calculate")}
                                >
                                  <RefreshCw size={15} />
                                </button>
                              )}
                              {canApprove && (
                                <button
                                  type="button"
                                  className="salary-icon-btn primary"
                                  title={approval?.canApprove === false ? approval.reason : "Approve run"}
                                  disabled={isBusy || approval?.canApprove === false}
                                  onClick={() => setConfirmAction({ run: r, type: "approve" })}
                                >
                                  <CheckCircle2 size={15} />
                                </button>
                              )}
                            </>
                          )}

                          {r.status === "CALCULATING" && (
                            <span style={{ fontSize: "11.5px", color: "#b45309" }}>Calculating…</span>
                          )}

                          {/* APPROVED Actions */}
                          {r.status === "APPROVED" && canProcess && (
                            <button
                              type="button"
                              className="salary-icon-btn primary"
                              title="Mark as paid"
                              disabled={isBusy}
                              onClick={() => setConfirmAction({ run: r, type: "pay" })}
                            >
                              <Wallet size={15} />
                            </button>
                          )}

                          {/* PAID Actions */}
                          {r.status === "PAID" && canProcess && (
                            <button
                              type="button"
                              className="salary-icon-btn"
                              title="Lock run (finalize)"
                              disabled={isBusy}
                              onClick={() => setConfirmAction({ run: r, type: "lock" })}
                            >
                              <Lock size={15} />
                            </button>
                          )}

                          {/* Always allow Review/Details View */}
                          <button
                            type="button"
                            className="salary-icon-btn"
                            title="Review details"
                            onClick={() => setSelectedRunIdForReview(r._id)}
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Bar ─────────────────────────────────────────── */}
        <SalaryPagination
          total={filteredRuns.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          unit="runs"
        />
      </div>

      {/* ── Visual Stepper Lifecycle Banner ──────────────────────────── */}
      <div className="salary-lifecycle-container">
        <div className="salary-lifecycle-title">Payroll Processing Lifecycle</div>
        <div className="salary-lifecycle-track">
          <div className="salary-lifecycle-step">
            <span className="salary-lifecycle-step-num">1</span>
            <div className="salary-lifecycle-step-info">
              <span className="salary-lifecycle-step-name">Create Run</span>
              <span className="salary-lifecycle-step-desc">DRAFT state</span>
            </div>
          </div>

          <ArrowRight size={16} color="#94a3b8" />

          <div className="salary-lifecycle-step">
            <span className="salary-lifecycle-step-num">2</span>
            <div className="salary-lifecycle-step-info">
              <span className="salary-lifecycle-step-name">Calculate</span>
              <span className="salary-lifecycle-step-desc">Attendance & Policies</span>
            </div>
          </div>

          <ArrowRight size={16} color="#94a3b8" />

          <div className="salary-lifecycle-step">
            <span className="salary-lifecycle-step-num">3</span>
            <div className="salary-lifecycle-step-info">
              <span className="salary-lifecycle-step-name">Review</span>
              <span className="salary-lifecycle-step-desc">Staff breakdown</span>
            </div>
          </div>

          <ArrowRight size={16} color="#94a3b8" />

          <div className="salary-lifecycle-step">
            <span className="salary-lifecycle-step-num">4</span>
            <div className="salary-lifecycle-step-info">
              <span className="salary-lifecycle-step-name">Approve</span>
              <span className="salary-lifecycle-step-desc">HR Authorization</span>
            </div>
          </div>

          <ArrowRight size={16} color="#94a3b8" />

          <div className="salary-lifecycle-step">
            <span className="salary-lifecycle-step-num">5</span>
            <div className="salary-lifecycle-step-info">
              <span className="salary-lifecycle-step-name">Mark Paid</span>
              <span className="salary-lifecycle-step-desc">Update loan ledger</span>
            </div>
          </div>

          <ArrowRight size={16} color="#94a3b8" />

          <div className="salary-lifecycle-step">
            <span className="salary-lifecycle-step-num">6</span>
            <div className="salary-lifecycle-step-info">
              <span className="salary-lifecycle-step-name">Lock</span>
              <span className="salary-lifecycle-step-desc">Immutable record</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <CreateSalaryRunModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadRuns}
        branches={branches}
        initialBranchId={selectedBranchId}
      />

      {confirmAction && (
        <div className="salary-modal-overlay">
          <div className="salary-modal-card" style={{ maxWidth: "480px" }}>
            <div className="salary-modal-header">
              <h3 className="salary-modal-title">{CONFIRM_COPY[confirmAction.type].title}</h3>
            </div>
            <div className="salary-modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px", marginBottom: "14px" }}>
                <div><span style={{ color: "#64748b" }}>Branch:</span> <strong>{branchNameOf(confirmAction.run.branchId, confirmAction.run.branchName)}</strong></div>
                <div><span style={{ color: "#64748b" }}>Period:</span> <strong>{runLabel(confirmAction.run)}</strong></div>
                <div><span style={{ color: "#64748b" }}>Employees:</span> <strong>{confirmAction.run.employeeCount || 0}</strong></div>
                <div><span style={{ color: "#64748b" }}>Gross Pay:</span> <strong>{money(confirmAction.run.totalGrossPay)}</strong></div>
                <div><span style={{ color: "#64748b" }}>Deductions:</span> <strong>{money(confirmAction.run.totalDeductions)}</strong></div>
                <div><span style={{ color: "#64748b" }}>Net Pay:</span> <strong style={{ color: "#107548" }}>{money(confirmAction.run.totalNetPay)}</strong></div>
              </div>
              <p style={{ fontSize: "13px", color: "#334155", margin: 0 }}>{CONFIRM_COPY[confirmAction.type].body}</p>
            </div>
            <div className="salary-modal-footer">
              <button
                type="button"
                className="btn-salary-secondary"
                disabled={Boolean(actionLoadingId)}
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-salary-primary"
                disabled={Boolean(actionLoadingId) || maintenance}
                onClick={() => handleQuickAction(confirmAction.run._id, confirmAction.type)}
              >
                {actionLoadingId ? "Working..." : CONFIRM_COPY[confirmAction.type].button}
              </button>
            </div>
          </div>
        </div>
      )}

      <SalaryRunReviewModal
        isOpen={Boolean(selectedRunIdForReview)}
        onClose={() => setSelectedRunIdForReview(null)}
        runId={selectedRunIdForReview}
        onRunUpdated={loadRuns}
        branchName={(() => {
          const sel = runs.find((r) => r._id === selectedRunIdForReview);
          return sel ? branchNameOf(sel.branchId, sel.branchName) : "";
        })()}
      />
    </div>
  );
}
