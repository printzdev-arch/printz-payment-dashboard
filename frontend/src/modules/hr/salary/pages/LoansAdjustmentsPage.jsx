import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Eye,
  Trash2,
  Users,
  Wallet,
  CheckCircle,
  XCircle,
  Search,
  Building2,
  ArrowRight,
  Clock,
  RotateCcw,
} from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../../../app/providers/AuthContext";
import salaryApi from "../api/salaryApi";
import AddLoanModal from "../components/AddLoanModal";
import RecordRepaymentModal from "../components/RecordRepaymentModal";
import AddAdjustmentModal from "../components/AddAdjustmentModal";
import SalaryPagination from "../components/SalaryPagination";
import SalaryMaintenanceBanner from "../components/SalaryMaintenanceBanner";
import { flagIfMaintenance, useSalaryMaintenance } from "../utils/salaryGuards";
import "../styles/salary.css";

export default function LoansAdjustmentsPage() {
  const maintenance = useSalaryMaintenance();
  const { hasPermission } = useAuth();
  const canConfigure = hasPermission("hr.salary.configure");
  const canProcess = hasPermission("hr.salary.process");
  const [deficits, setDeficits] = useState([]);
  const [carryBusyId, setCarryBusyId] = useState("");
  const [activeTab, setActiveTab] = useState("loans"); // "loans" | "repayments" | "adjustments"
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(() => salaryApi.getLockedBranchId());
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Data lists
  const [loans, setLoans] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionBusyId, setActionBusyId] = useState("");
  const [error, setError] = useState("");

  // Modals
  const [isAddLoanModalOpen, setIsAddLoanModalOpen] = useState(false);
  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedLoanForRepayment, setSelectedLoanForRepayment] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    setSelectedStatus("ALL");
  }, [activeTab]);

  useEffect(() => {
    // All three lists load together so the tab badges show real counts.
    // Repayment rows carry only loan/employee ids, so the loan list is needed too.
    loadLoans();
    loadRepayments();
    loadAdjustments();
  }, [activeTab, selectedBranchId]);

  // Deficits from the previous payroll month (deductions exceeded gross pay).
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const prevPeriod = (() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  })();
  const currentPeriod = { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
  const prevLabel = `${MONTH_NAMES[prevPeriod.month - 1]} ${prevPeriod.year}`;
  const currentLabel = `${MONTH_NAMES[currentPeriod.month - 1]} ${currentPeriod.year}`;
  const carryDescription = (rec) => `Carry-forward deficit from ${prevLabel}`;

  const loadDeficits = async () => {
    try {
      const params = { limit: 200, payrollMonth: prevPeriod.month, payrollYear: prevPeriod.year };
      if (selectedBranchId) params.branchId = selectedBranchId;
      const res = await salaryApi.listRecords(params);
      const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
      setDeficits((Array.isArray(list) ? list : []).filter((r) => r.isDeficit && Number(r.deficitAmount) > 0));
    } catch {
      setDeficits([]);
    }
  };

  useEffect(() => {
    loadDeficits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  // A deficit is settled once a carry-forward adjustment exists for the current month.
  const isCarried = (rec) =>
    adjustments.some(
      (a) =>
        a.description === carryDescription(rec) &&
        a.status !== "CANCELLED" &&
        refId(a.employeeId) === refId(rec.employeeId) &&
        Number(a.payrollMonth) === currentPeriod.month &&
        Number(a.payrollYear) === currentPeriod.year
    );

  // Skip one month's EMI for one loan. The balance is untouched, so the loan finishes a month later.
  const [skipDialog, setSkipDialog] = useState(null); // { loan, month, year, reason }
  const [skipBusy, setSkipBusy] = useState("");

  const openSkipDialog = (loan) => {
    // Default to the first month that is not already skipped, starting from this month.
    const taken = new Set((loan.skippedMonths || []).map((s) => `${s.year}-${s.month}`));
    let month = currentPeriod.month;
    let year = currentPeriod.year;
    while (taken.has(`${year}-${month}`)) {
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
    setSkipDialog({ loan, month, year, reason: "" });
  };

  const submitSkip = async () => {
    if (!skipDialog || skipBusy) return;
    try {
      setSkipBusy("skip");
      setError("");
      const res = await salaryApi.skipLoanMonth(skipDialog.loan._id, {
        month: Number(skipDialog.month),
        year: Number(skipDialog.year),
        reason: skipDialog.reason.trim(),
      });
      setSkipDialog(null);
      await loadLoans();
      if (res?.data?.payrollReset ?? res?.payrollReset) {
        toast.info("That month was already calculated. It was reset to Draft; recalculate payroll to apply the skip.");
      }
    } catch (err) {
      if (!flagIfMaintenance(err)) {
        setSkipDialog(null);
        setError(err?.response?.data?.message || err?.message || "Failed to skip the EMI.");
      }
    } finally {
      setSkipBusy("");
    }
  };

  const handleUnskip = async (loan, s) => {
    if (skipBusy) return;
    if (!window.confirm(`Remove the skip for ${MONTH_NAMES[s.month - 1]} ${s.year}? The EMI will be deducted that month again.`)) return;
    try {
      setSkipBusy("unskip");
      setError("");
      const res = await salaryApi.unskipLoanMonth(loan._id, { month: s.month, year: s.year });
      await loadLoans();
      if (res?.data?.payrollReset ?? res?.payrollReset) {
        toast.info("That month was already calculated. It was reset to Draft; recalculate payroll to apply the change.");
      }
    } catch (err) {
      if (!flagIfMaintenance(err)) {
        setError(err?.response?.data?.message || err?.message || "Failed to remove the skip.");
      }
    } finally {
      setSkipBusy("");
    }
  };

  const handleCarryForward = async (rec) => {
    if (carryBusyId) return;
    const name = empNameOf(rec.employeeId);
    const amount = Number(rec.deficitAmount || 0);
    if (
      !window.confirm(
        `Deduct ₹ ${amount.toLocaleString("en-IN")} from ${name} in ${currentLabel} as a carry-forward of the ${prevLabel} deficit?`
      )
    ) {
      return;
    }
    try {
      setCarryBusyId(String(rec._id));
      setError("");
      const description = carryDescription(rec);
      const existing = await salaryApi.listAdjustments({
        employeeId: refId(rec.employeeId),
        branchId: refId(rec.branchId),
        limit: 100,
      });
      const rows = existing?.data || existing?.items || (Array.isArray(existing) ? existing : []);
      const duplicate = (Array.isArray(rows) ? rows : []).some(
        (a) =>
          a.description === description &&
          a.status !== "CANCELLED" &&
          Number(a.payrollMonth) === currentPeriod.month &&
          Number(a.payrollYear) === currentPeriod.year
      );
      if (duplicate) {
        setError(`A carry-forward adjustment for ${name} already exists for ${currentLabel}.`);
        return;
      }
      await salaryApi.createAdjustment({
        employeeId: refId(rec.employeeId),
        branchId: refId(rec.branchId),
        adjustmentType: "OTHER_DEDUCTION",
        amount,
        payrollMonth: currentPeriod.month,
        payrollYear: currentPeriod.year,
        description,
      });
      if (activeTab === "adjustments") await loadAdjustments();
    } catch (err) {
      if (!flagIfMaintenance(err)) setError(err?.response?.data?.message || err?.message || "Failed to carry forward deficit.");
    } finally {
      setCarryBusyId("");
    }
  };

  // Employee / loan lookups for rows the API returns without populated references.
  const empMap = useMemo(() => {
    const m = {};
    employees.forEach((e) => {
      m[String(e._id || e.id)] = e;
    });
    return m;
  }, [employees]);
  const loanMap = useMemo(() => {
    const m = {};
    loans.forEach((l) => {
      m[String(l._id)] = l;
    });
    return m;
  }, [loans]);
  const refId = (v) => String(v && v._id ? v._id : v || "");
  const pendingDeficits = deficits.filter((rec) => !isCarried(rec));
  const empOf = (v) => {
    if (v && typeof v === "object" && v.name) {
      // Fill in whatever the server left out from the employee list.
      return { ...(empMap[refId(v)] || {}), ...v };
    }
    return empMap[refId(v)] || {};
  };
  const loanNumberOf = (v) =>
    (v && typeof v === "object" && v.loanNumber) || loanMap[refId(v)]?.loanNumber || "—";
  const empNameOf = (v) => {
    const e = empOf(v);
    return e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || "—";
  };

  const loadLookups = async () => {
    try {
      const [branchList, empList] = await Promise.all([
        salaryApi.getBranches(),
        salaryApi.getEmployees({ limit: 300 }),
      ]);
      setBranches(branchList);
      setEmployees(empList);
      setSelectedBranchId(salaryApi.getLockedBranchId());
    } catch (err) {
      console.error("Failed to load lookups:", err);
    }
  };

  const loadLoans = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { limit: 200 };
      if (selectedBranchId) params.branchId = selectedBranchId;
      const res = await salaryApi.listLoans(params);
      const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
      setLoans(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load loans.");
    } finally {
      setLoading(false);
    }
  };

  const loadRepayments = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { limit: 200 };
      if (selectedBranchId) params.branchId = selectedBranchId;
      const res = await salaryApi.listLoanRepayments(params);
      const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
      setRepayments(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load repayments.");
    } finally {
      setLoading(false);
    }
  };

  const loadAdjustments = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { limit: 200 };
      if (selectedBranchId) params.branchId = selectedBranchId;
      const res = await salaryApi.listAdjustments(params);
      const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
      setAdjustments(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load adjustments.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAdjustment = async (id) => {
    if (actionBusyId) return;
    if (!window.confirm("Are you sure you want to cancel this salary adjustment?")) return;
    try {
      setActionBusyId(id);
      setError("");
      await salaryApi.cancelAdjustment(id);
      await loadAdjustments();
    } catch (err) {
      if (!flagIfMaintenance(err)) setError(err?.response?.data?.message || "Failed to cancel adjustment.");
    } finally {
      setActionBusyId("");
    }
  };

  // KPIs (real data only; statuses follow the backend: ACTIVE / CLOSED / ON_HOLD)
  const totalLoansCount = loans.length;
  const activeLoansCount = loans.filter((l) => l.status === "ACTIVE").length;
  const closedLoansCount = loans.filter((l) => l.status === "CLOSED").length;
  const onHoldLoansCount = loans.filter((l) => l.status === "ON_HOLD").length;

  // Filtered Loans
  const filteredLoans = useMemo(() => {
    return loans.filter((l) => {
      const empName = empNameOf(l.employeeId).toLowerCase();
      const loanNum = (l.loanNumber || "").toLowerCase();
      if (selectedStatus !== "ALL" && l.status !== selectedStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!empName.includes(q) && !loanNum.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loans, empMap, selectedStatus, searchQuery]);

  // Filtered Repayments
  const filteredRepayments = useMemo(() => {
    return repayments.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const empName = empNameOf(r.employeeId).toLowerCase();
        const loanNo = String(loanNumberOf(r.employeeLoanId)).toLowerCase();
        if (!empName.includes(q) && !loanNo.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repayments, empMap, loanMap, searchQuery]);

  // Filtered Adjustments
  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((a) => {
      if (selectedStatus !== "ALL" && a.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const empName = empNameOf(a.employeeId).toLowerCase();
        const desc = (a.description || "").toLowerCase();
        if (!empName.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustments, empMap, selectedStatus, searchQuery]);

  const currentListLength =
    activeTab === "loans"
      ? filteredLoans.length
      : activeTab === "repayments"
      ? filteredRepayments.length
      : filteredAdjustments.length;

  const paginatedLoans = filteredLoans.slice((page - 1) * pageSize, page * pageSize);
  const paginatedRepayments = filteredRepayments.slice((page - 1) * pageSize, page * pageSize);
  const paginatedAdjustments = filteredAdjustments.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="salary-page-container">
      <SalaryMaintenanceBanner />
      {/* ── Top Header Row ─────────────────────────────────────────────── */}
      <div className="salary-header-row">
        <div className="salary-title-area">
          <h1>Loans & Adjustments</h1>
          
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

          {activeTab === "loans" && canConfigure && (
            <button
              type="button"
              className="btn-salary-primary"
              disabled={maintenance}
              onClick={() => setIsAddLoanModalOpen(true)}
            >
              <Plus size={16} /> Add Loan
            </button>
          )}

          {activeTab === "repayments" && canProcess && (
            <button
              type="button"
              className="btn-salary-primary"
              disabled={maintenance}
              onClick={() => {
                setSelectedLoanForRepayment(null);
                setIsRepaymentModalOpen(true);
              }}
            >
              <Plus size={16} /> Record Repayment
            </button>
          )}

          {activeTab === "adjustments" && canConfigure && (
            <button
              type="button"
              className="btn-salary-primary"
              disabled={maintenance}
              onClick={() => setIsAdjustmentModalOpen(true)}
            >
              <Plus size={16} /> Add Adjustment
            </button>
          )}
        </div>
      </div>

      {/* ── Deficit review (previous payroll month) ──────────────────── */}
      {pendingDeficits.length > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "12px 16px", marginBottom: "14px", fontSize: "13px", color: "#7f1d1d" }}>
          <div style={{ fontWeight: 700, marginBottom: "8px" }}>
            Deficit Review: {pendingDeficits.length} employee{pendingDeficits.length > 1 ? "s" : ""} had deductions above gross pay in {prevLabel}
          </div>
          {pendingDeficits.map((rec) => (
            <div key={rec._id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "4px 0", flexWrap: "wrap" }}>
              <span style={{ minWidth: "180px" }}>{empNameOf(rec.employeeId)}</span>
              <strong>₹ {Number(rec.deficitAmount || 0).toLocaleString("en-IN")}</strong>
              {isCarried(rec) ? (
                <span style={{ color: "#166534", fontWeight: 600 }}>Carried forward to {currentLabel} ✓</span>
              ) : (
                canConfigure && (
                  <button
                    type="button"
                    className="btn-salary-secondary"
                    disabled={maintenance || Boolean(carryBusyId)}
                    onClick={() => handleCarryForward(rec)}
                  >
                    {carryBusyId === String(rec._id) ? "Adding..." : "Carry forward as adjustment"}
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs Bar ─────────────────────────────────────────────────── */}
      <div className="salary-tabs-bar">
        <button
          type="button"
          className={`salary-tab-btn ${activeTab === "loans" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("loans");
            setPage(1);
          }}
        >
          Employee Loans
          <span className="salary-tab-badge">{loans.length}</span>
        </button>

        <button
          type="button"
          className={`salary-tab-btn ${activeTab === "repayments" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("repayments");
            setPage(1);
          }}
        >
          Loan Repayments
          <span className="salary-tab-badge">{repayments.length}</span>
        </button>

        <button
          type="button"
          className={`salary-tab-btn ${activeTab === "adjustments" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("adjustments");
            setPage(1);
          }}
        >
          Monthly Adjustments
          <span className="salary-tab-badge">{adjustments.length}</span>
        </button>
      </div>

      {/* ── Filters Row Card ──────────────────────────────────────────── */}
      <div className="salary-filters-card">
        {activeTab === "loans" && (
          <>

            <select
              className="salary-filter-select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="CLOSED">Closed</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
          </>
        )}

        {activeTab === "adjustments" && (
          <select
            className="salary-filter-select"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPLIED">Applied</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        )}

        <div className="salary-search-wrapper">
          <Search size={16} className="salary-search-icon" />
          <input
            type="text"
            className="salary-search-input"
            placeholder={
              activeTab === "loans"
                ? "Search employee by name or loan number..."
                : activeTab === "repayments"
                ? "Search by employee name or payment ref..."
                : "Search adjustments by employee or reason..."
            }
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* ── KPI Summary Cards ─────────────────────────────────────────── */}
      {activeTab === "loans" && (
        <div className="salary-kpi-grid">
          <div className="salary-kpi-card">
            <div className="salary-kpi-icon-box green">
              <Users size={22} />
            </div>
            <div className="salary-kpi-details">
              <span className="salary-kpi-value">{totalLoansCount}</span>
              <span className="salary-kpi-label">Total Loans</span>
            </div>
          </div>

          <div className="salary-kpi-card">
            <div className="salary-kpi-icon-box blue">
              <Wallet size={22} />
            </div>
            <div className="salary-kpi-details">
              <span className="salary-kpi-value">{activeLoansCount}</span>
              <span className="salary-kpi-label">Active Loans</span>
            </div>
          </div>

          <div className="salary-kpi-card">
            <div className="salary-kpi-icon-box amber">
              <CheckCircle size={22} />
            </div>
            <div className="salary-kpi-details">
              <span className="salary-kpi-value">{closedLoansCount}</span>
              <span className="salary-kpi-label">Closed Loans</span>
            </div>
          </div>

          <div className="salary-kpi-card">
            <div className="salary-kpi-icon-box red">
              <XCircle size={22} />
            </div>
            <div className="salary-kpi-details">
              <span className="salary-kpi-value">{onHoldLoansCount}</span>
              <span className="salary-kpi-label">On Hold Loans</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Table Card ───────────────────────────────────────────────── */}
      <div className="salary-table-card">
        {error && (
          <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px 16px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <div className="salary-table-responsive">
          {activeTab === "loans" && (
            <table className="salary-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>#</th>
                  <th>Loan Number</th>
                  <th>Employee</th>
                  <th>Loan Amount</th>
                  <th>EMI Amount</th>
                  <th>Outstanding</th>
                  <th>EMI Deduction</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                      Loading loans...
                    </td>
                  </tr>
                ) : filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                      No loans found. Click <strong>"+ Add Loan"</strong> to issue an employee loan.
                    </td>
                  </tr>
                ) : (
                  paginatedLoans.map((l, index) => {
                    const empName = empNameOf(l.employeeId);
                    const isCompleted = l.status === "CLOSED";

                    return (
                      <tr key={l._id || index}>
                        <td>{(page - 1) * pageSize + index + 1}</td>
                        <td>
                          <strong>{l.loanNumber}</strong>
                        </td>
                        <td>{empName}</td>
                        <td style={{ fontWeight: 600 }}>₹ {Number(l.loanAmount || 0).toLocaleString("en-IN")}</td>
                        <td>₹ {Number(l.emiAmount || 0).toLocaleString("en-IN")} / mo</td>
                        <td style={{ color: Number(l.outstandingBalance || 0) > 0 ? "#b91c1c" : "#15803d", fontWeight: 700 }}>
                          ₹ {Number(l.outstandingBalance || 0).toLocaleString("en-IN")}
                        </td>
                        <td>
                          <span className={`badge-salary-status ${l.autoDeduct === false ? "pending" : "active"}`}>
                            {l.autoDeduct === false ? "Manual" : "Auto"}
                          </span>
                          {(l.skippedMonths || []).length > 0 && (
                            <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {[...l.skippedMonths]
                                .sort((a, b) => a.year - b.year || a.month - b.month)
                                .map((s) => (
                                  <span
                                    key={`${s.year}-${s.month}`}
                                    title={s.reason ? `Skipped: ${s.reason}` : "EMI skipped for this month"}
                                    style={{ fontSize: "11px", background: "#fef3c7", color: "#92400e", borderRadius: "999px", padding: "1px 8px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                  >
                                    Skip {MONTH_NAMES[s.month - 1].slice(0, 3)} {s.year}
                                    {canConfigure && (
                                      <button
                                        type="button"
                                        aria-label="Remove skip"
                                        title="Remove this skip"
                                        disabled={maintenance || Boolean(skipBusy)}
                                        onClick={() => handleUnskip(l, s)}
                                        style={{ border: "none", background: "transparent", color: "#92400e", cursor: "pointer", padding: 0, fontSize: "12px" }}
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </span>
                                ))}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`badge-salary-status ${isCompleted ? "paid" : l.status === "ON_HOLD" ? "pending" : "active"}`}>
                            {String(l.status || "ACTIVE").replace("_", " ")}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="salary-action-group" style={{ justifyContent: "flex-end" }}>
                            {l.status === "ACTIVE" && l.autoDeduct !== false && canConfigure && (
                              <button
                                type="button"
                                className="btn-salary-secondary"
                                style={{ padding: "4px 10px", fontSize: "12px" }}
                                title="Skip the EMI for one month"
                                disabled={maintenance}
                                onClick={() => openSkipDialog(l)}
                              >
                                Skip month
                              </button>
                            )}
                            {l.status === "ACTIVE" && (
                              <button
                                type="button"
                                className="salary-icon-btn primary"
                                title="Record repayment"
                                onClick={() => {
                                  setSelectedLoanForRepayment(l);
                                  setIsRepaymentModalOpen(true);
                                }}
                              >
                                <Wallet size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeTab === "repayments" && (
            <table className="salary-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>#</th>
                  <th>Loan Number</th>
                  <th>Employee</th>
                  <th>Repayment Date</th>
                  <th>Amount</th>
                  <th>Previous Balance</th>
                  <th>Remaining Balance</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                      Loading repayments...
                    </td>
                  </tr>
                ) : filteredRepayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                      No loan repayments recorded yet.
                    </td>
                  </tr>
                ) : (
                  paginatedRepayments.map((r, index) => {
                    const empName = empNameOf(r.employeeId);
                    const loanNo = loanNumberOf(r.employeeLoanId);
                    const dateStr = r.repaymentDate ? new Date(r.repaymentDate).toLocaleDateString("en-GB") : "-";
                    const isPayroll = r.paymentMethod === "SALARY_DEDUCTION";

                    return (
                      <tr key={r._id || index}>
                        <td>{(page - 1) * pageSize + index + 1}</td>
                        <td><strong>{loanNo}</strong></td>
                        <td>{empName}</td>
                        <td>{dateStr}</td>
                        <td style={{ fontWeight: 700, color: "#15803d" }}>
                          ₹ {Number(r.amount || 0).toLocaleString("en-IN")}
                        </td>
                        <td>₹ {Number(r.previousBalance || 0).toLocaleString("en-IN")}</td>
                        <td style={{ fontWeight: 600 }}>
                          ₹ {Number(r.remainingBalance || 0).toLocaleString("en-IN")}
                        </td>
                        <td>
                          <span style={{ fontSize: "11.5px", padding: "3px 8px", borderRadius: "4px", background: "#f1f5f9", fontWeight: 600 }}>
                            {isPayroll
                              ? `Payroll${r.payrollMonth ? ` ${r.payrollMonth}/${r.payrollYear}` : ""}`
                              : String(r.paymentMethod || "").replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeTab === "adjustments" && (
            <table className="salary-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>#</th>
                  <th>Employee</th>
                  <th>Period</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                      Loading adjustments...
                    </td>
                  </tr>
                ) : filteredAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                      No salary adjustments found. Click <strong>"+ Add Adjustment"</strong> to record incentives, shortages or advance deductions.
                    </td>
                  </tr>
                ) : (
                  paginatedAdjustments.map((a, index) => {
                    const empName = empNameOf(a.employeeId);
                    const isAddition = a.adjustmentType === "INCENTIVE" || a.adjustmentType === "OTHER_EARNING";
                    const isPending = a.status === "PENDING";

                    return (
                      <tr key={a._id || index}>
                        <td>{(page - 1) * pageSize + index + 1}</td>
                        <td><strong>{empName}</strong></td>
                        <td>{a.payrollMonth}/{a.payrollYear}</td>
                        <td>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 600,
                              background: isAddition ? "#dcfce7" : "#fee2e2",
                              color: isAddition ? "#15803d" : "#b91c1c",
                            }}
                          >
                            {String(a.adjustmentType || "").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: isAddition ? "#15803d" : "#b91c1c" }}>
                          {isAddition ? "+" : "-"} ₹ {Number(a.amount || 0).toLocaleString("en-IN")}
                        </td>
                        <td>{a.description}</td>
                        <td>
                          <span className={`badge-salary-status ${String(a.status || "PENDING").toLowerCase()}`}>
                            {a.status || "PENDING"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {isPending && (
                            <button
                              type="button"
                              className="salary-icon-btn danger"
                              disabled={actionBusyId === a._id}
                              title="Cancel adjustment"
                              onClick={() => handleCancelAdjustment(a._id)}
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination Bar ─────────────────────────────────────────── */}
        <SalaryPagination
          total={currentListLength}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {skipDialog && (
        <div className="salary-modal-overlay">
          <div className="salary-modal-card" style={{ maxWidth: "460px" }}>
            <div className="salary-modal-header">
              <h3 className="salary-modal-title">Skip EMI for one month</h3>
            </div>
            <div className="salary-modal-body">
              <div style={{ fontSize: "13px", marginBottom: "12px", color: "#334155" }}>
                <strong>{skipDialog.loan.loanNumber}</strong> · {empNameOf(skipDialog.loan.employeeId)} · EMI ₹{" "}
                {Number(skipDialog.loan.emiAmount || 0).toLocaleString("en-IN")}
              </div>
              <div className="salary-form-grid" style={{ marginBottom: "12px" }}>
                <div className="salary-form-group">
                  <label>Month</label>
                  <select
                    className="salary-form-select"
                    value={skipDialog.month}
                    onChange={(e) => setSkipDialog({ ...skipDialog, month: Number(e.target.value) })}
                  >
                    {MONTH_NAMES.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="salary-form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    className="salary-form-input"
                    min="2000"
                    max="2100"
                    value={skipDialog.year}
                    onChange={(e) => setSkipDialog({ ...skipDialog, year: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="salary-form-group" style={{ marginBottom: "12px" }}>
                <label>Reason (optional)</label>
                <input
                  type="text"
                  className="salary-form-input"
                  maxLength={200}
                  placeholder="e.g. Employee request"
                  value={skipDialog.reason}
                  onChange={(e) => setSkipDialog({ ...skipDialog, reason: e.target.value })}
                />
              </div>
              <p style={{ fontSize: "12.5px", color: "#475569", margin: 0 }}>
                No EMI is deducted in {MONTH_NAMES[skipDialog.month - 1]} {skipDialog.year}. The balance stays
                the same and the loan finishes one month later. The EMI is postponed, not added to the next month. If that month was already calculated, it goes back to Draft and must be recalculated.
              </p>
            </div>
            <div className="salary-modal-footer">
              <button type="button" className="btn-salary-secondary" disabled={Boolean(skipBusy)} onClick={() => setSkipDialog(null)}>
                Cancel
              </button>
              <button type="button" className="btn-salary-primary" disabled={Boolean(skipBusy) || maintenance} onClick={submitSkip}>
                {skipBusy === "skip" ? "Saving..." : "Skip this month"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddLoanModal
        isOpen={isAddLoanModalOpen}
        onClose={() => setIsAddLoanModalOpen(false)}
        onSuccess={loadLoans}
        branches={branches}
        initialBranchId={selectedBranchId}
      />

      <RecordRepaymentModal
        isOpen={isRepaymentModalOpen}
        onClose={() => {
          setIsRepaymentModalOpen(false);
          setSelectedLoanForRepayment(null);
        }}
        onSuccess={() => {
          loadRepayments();
          loadLoans();
        }}
        selectedLoan={selectedLoanForRepayment}
      />

      <AddAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        onSuccess={loadAdjustments}
        branches={branches}
        initialBranchId={selectedBranchId}
      />
    </div>
  );
}
