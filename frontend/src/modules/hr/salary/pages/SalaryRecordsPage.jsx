import React, { useState, useEffect, useMemo } from "react";
import {
  Eye,
  FileSpreadsheet,
  Search,
  Users,
  FileText,
  DollarSign,
  MinusCircle,
  TrendingUp,
} from "lucide-react";
import salaryApi from "../api/salaryApi";
import EmployeeSalaryDetailsModal from "../components/EmployeeSalaryDetailsModal";
import SalaryPagination from "../components/SalaryPagination";
import { exportSalaryRecordsXlsx } from "../utils/salaryExcel";
import "../styles/salary.css";

export default function SalaryRecordsPage() {
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(() => salaryApi.getLockedBranchId());
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [searchQuery, setSearchQuery] = useState("");
  const [deficitOnly, setDeficitOnly] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Modal
  const [selectedRecordForView, setSelectedRecordForView] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [selectedBranchId, selectedMonth, selectedYear]);

  // Records come back with only employeeCode/name populated, so the rest
  // comes from the employee list.
  const empMap = useMemo(() => {
    const m = {};
    employees.forEach((e) => {
      m[String(e._id || e.id)] = e;
    });
    return m;
  }, [employees]);
  const branchNameOf = (v, serverName) => {
    if (serverName) return serverName;
    const id = String(v && v._id ? v._id : v || "");
    return branches.find((b) => String(b._id) === id)?.name || "";
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

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { limit: 200 };
      if (selectedBranchId) params.branchId = selectedBranchId;
      if (selectedMonth) params.payrollMonth = selectedMonth;
      if (selectedYear) params.payrollYear = selectedYear;
      const res = await salaryApi.listRecords(params);
      const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
      setRecords(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load salary records.");
    } finally {
      setLoading(false);
    }
  };

  // Export the filtered table as an Excel sheet in the monthly salary-sheet layout.
  const [exporting, setExporting] = useState(false);
  const handleExportExcel = async () => {
    if (exporting || filteredRecords.length === 0) return;
    try {
      setExporting(true);
      setError("");

      // Outstanding loan balance per employee for the LOAN REMAINING column.
      const loanRemaining = new Map();
      try {
        const loanParams = { limit: 500 };
        if (selectedBranchId) loanParams.branchId = selectedBranchId;
        const loanRes = await salaryApi.listLoans(loanParams);
        const loanList = loanRes?.data || loanRes?.items || (Array.isArray(loanRes) ? loanRes : []);
        (Array.isArray(loanList) ? loanList : [])
          .filter((l) => l.status === "ACTIVE" || l.status === "ON_HOLD")
          .forEach((l) => {
            const id = String(l.employeeId && l.employeeId._id ? l.employeeId._id : l.employeeId || "");
            loanRemaining.set(id, (loanRemaining.get(id) || 0) + Number(l.outstandingBalance || 0));
          });
      } catch (loanErr) {
        console.error("Could not load loans for export:", loanErr);
      }

      // Title period: the selected month, or the single month present in the rows.
      const months = [...new Set(filteredRecords.map((r) => r.payrollMonth))];
      const periodMonth = selectedMonth ? Number(selectedMonth) : months.length === 1 ? months[0] : null;
      const years = [...new Set(filteredRecords.map((r) => r.payrollYear))];
      const periodYear = selectedYear ? Number(selectedYear) : years.length === 1 ? years[0] : null;

      exportSalaryRecordsXlsx({ records: filteredRecords, loanRemaining, periodMonth, periodYear });
    } catch (err) {
      setError(err?.message || "Failed to export the salary sheet.");
    } finally {
      setExporting(false);
    }
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const emp = r.employeeId || {};
      const empName = (emp.name || "").toLowerCase();
      const empCode = (emp.employeeCode || "").toLowerCase();
      if (selectedStatus !== "ALL" && r.status !== selectedStatus) return false;
      if (deficitOnly && !r.isDeficit) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!empName.includes(q) && !empCode.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, empMap, selectedStatus, searchQuery, deficitOnly]);

  const deficitCount = records.filter((r) => r.isDeficit).length;

  // Aggregate KPIs (final pay uses roundPay, the backend's payable amount)
  const totalEmployees = filteredRecords.length;
  const totalGross = filteredRecords.reduce((acc, r) => acc + Number(r.grossPay || 0), 0);
  const totalDeductions = filteredRecords.reduce((acc, r) => acc + Number(r.totalDeductions || 0), 0);
  const totalNet = filteredRecords.reduce((acc, r) => acc + Number(r.roundPay || 0), 0);
  const paidEmployees = filteredRecords.filter((r) => r.status === "PAID" || r.status === "LOCKED").length;

  const paginatedRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="salary-page-container">
      {/* ── Top Header Row ─────────────────────────────────────────────── */}
      <div className="salary-header-row">
        <div className="salary-title-area">
          <h1>Salary Records</h1>
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

          <button type="button" className="btn-salary-excel" onClick={handleExportExcel} disabled={filteredRecords.length === 0 || exporting}>
            <FileSpreadsheet size={15} /> {exporting ? "Exporting..." : "Export Excel"}
          </button>
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
          <option value="CALCULATED">Calculated</option>
          <option value="APPROVED">Approved</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Paid</option>
          <option value="LOCKED">Locked</option>
        </select>

        <input
          type="number"
          className="salary-filter-select"
          style={{ width: "100px" }}
          min="2000"
          max="2100"
          title="Payroll year"
          value={selectedYear}
          onChange={(e) => {
            setSelectedYear(e.target.value);
            setPage(1);
          }}
        />

        <label
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: deficitCount > 0 ? "#b91c1c" : "#475569", whiteSpace: "nowrap" }}
        >
          <input
            type="checkbox"
            checked={deficitOnly}
            onChange={(e) => {
              setDeficitOnly(e.target.checked);
              setPage(1);
            }}
          />
          Deficit Records Only ({deficitCount})
        </label>

        <div className="salary-search-wrapper">
          <Search size={16} className="salary-search-icon" />
          <input
            type="text"
            className="salary-search-input"
            placeholder="Search by employee name or ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* ── 5 Summary Cards Grid ───────────────────────────────────────── */}
      <div className="salary-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <div className="salary-kpi-card">
          <div className="salary-kpi-icon-box green">
            <Users size={22} />
          </div>
          <div className="salary-kpi-details">
            <span className="salary-kpi-value">{totalEmployees}</span>
            <span className="salary-kpi-label">Employees with Records</span>
          </div>
        </div>

        <div className="salary-kpi-card">
          <div className="salary-kpi-icon-box blue">
            <FileText size={22} />
          </div>
          <div className="salary-kpi-details">
            <span className="salary-kpi-value">{paidEmployees}</span>
            <span className="salary-kpi-label">Paid Employees</span>
          </div>
        </div>

        <div className="salary-kpi-card">
          <div className="salary-kpi-icon-box teal">
            <DollarSign size={22} />
          </div>
          <div className="salary-kpi-details">
            <span className="salary-kpi-value">₹ {totalGross.toLocaleString("en-IN")}</span>
            <span className="salary-kpi-label">Total Gross Salary</span>
          </div>
        </div>

        <div className="salary-kpi-card">
          <div className="salary-kpi-icon-box red">
            <MinusCircle size={22} />
          </div>
          <div className="salary-kpi-details">
            <span className="salary-kpi-value">₹ {totalDeductions.toLocaleString("en-IN")}</span>
            <span className="salary-kpi-label">Total Deductions</span>
          </div>
        </div>

        <div className="salary-kpi-card">
          <div className="salary-kpi-icon-box purple">
            <TrendingUp size={22} />
          </div>
          <div className="salary-kpi-details">
            <span className="salary-kpi-value">₹ {totalNet.toLocaleString("en-IN")}</span>
            <span className="salary-kpi-label">Total Final Pay</span>
          </div>
        </div>
      </div>

      {/* ── Table Card ───────────────────────────────────────────────── */}
      <div className="salary-table-card">
        {error && (
          <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px 16px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <div className="salary-table-responsive">
          <table className="salary-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Working Days</th>
                <th>Days Worked</th>
                <th>LOP Days</th>
                <th>Gross Pay</th>
                <th>Total Deductions</th>
                <th>Final Pay</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                    Loading salary records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                    No salary records found for the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r, index) => {
                  const emp = r.employeeId || {};
                  const empName = emp.name || "—";
                  const empCode = emp.employeeCode || "—";
                  const workingDays = r.salaryCalculationDays ?? "—";
                  const lopDays = r.lopDays ?? 0;
                  const isPaid = r.status === "PAID" || r.status === "LOCKED";

                  return (
                    <tr key={r._id || index}>
                      <td>
                        <strong>{empCode}</strong>
                      </td>
                      <td>{empName}</td>
                      <td>{workingDays}</td>
                      <td>{r.daysWorked ?? "—"}</td>
                      <td style={{ color: Number(lopDays) > 0 ? "#b91c1c" : "inherit" }}>{lopDays}</td>
                      <td style={{ fontWeight: 600 }}>₹ {Number(r.grossPay || 0).toLocaleString("en-IN")}</td>
                      <td style={{ color: "#b91c1c" }}>₹ {Number(r.totalDeductions || 0).toLocaleString("en-IN")}</td>
                      <td style={{ fontWeight: 700, color: r.isDeficit ? "#dc2626" : "#107548" }}>
                        ₹ {Number(r.roundPay || 0).toLocaleString("en-IN")}
                        {r.isDeficit && (
                          <div style={{ fontSize: "10px", color: "#b91c1c", fontWeight: 600 }}>
                            Deficit: ₹ {Number(r.deficitAmount || 0).toLocaleString("en-IN")}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge-salary-status ${isPaid ? "paid" : String(r.status || "draft").toLowerCase()}`}>
                          {String(r.status || "DRAFT").replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="salary-action-group" style={{ justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="salary-icon-btn primary"
                            title="View salary details & payslip"
                            onClick={() => setSelectedRecordForView(r)}
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
          total={filteredRecords.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          unit="records"
        />
      </div>

      {/* ── Employee Salary Details Modal ────────────────────────────── */}
      <EmployeeSalaryDetailsModal
        isOpen={Boolean(selectedRecordForView)}
        onClose={() => setSelectedRecordForView(null)}
        record={selectedRecordForView}
        branchName={branchNameOf(selectedRecordForView?.branchId, selectedRecordForView?.branchName)}
      />
    </div>
  );
}
