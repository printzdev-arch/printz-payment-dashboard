import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Building2,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowUp,
} from "lucide-react";
import attendanceApi from "../api/attendanceApi";
import AttendancePagination from "../components/AttendancePagination";
import SearchableBranchSelect from "../components/SearchableBranchSelect";
import "../styles/attendance.css";

export default function AttendanceReportsPage() {
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranchId, selectedMonth, selectedYear]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [records, currentPage, pageSize]);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadReportData();
  }, [selectedBranchId, selectedMonth, selectedYear]);

  const loadBranches = async () => {
    try {
      const data = await attendanceApi.getBranches();
      setBranches(data);
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError("");
      // No branchId = all branches the user can access
      const branchParam = selectedBranchId ? { branchId: selectedBranchId } : {};
      const [sumRes, attRes] = await Promise.all([
        attendanceApi.getAttendanceSummary({
          ...branchParam,
          month: selectedMonth,
          year: selectedYear,
        }),
        attendanceApi.getDailyAttendance({
          ...branchParam,
          month: selectedMonth,
          year: selectedYear,
          limit: 100,
        }),
      ]);
      setSummary(sumRes?.data || sumRes || null);
      setRecords(attRes?.data?.records || attRes?.records || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load report data.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!records.length) return;
    const headers = ["Employee Code", "Employee Name", "Date", "Check In", "Check Out", "Worked Hours", "Status", "Late (Min)", "Early (Min)"];
    const rows = records.map((r) => [
      r.employeeId?.employeeCode || "",
      `"${r.employeeId?.name || ""}"`,
      r.attendanceDate || "",
      r.checkIn || "",
      r.checkOut || "",
      r.workingHoursPerDay || 0,
      r.status || "",
      r.lateMinutes || 0,
      r.earlyCheckoutMinutes || 0,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_report_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="attendance-page-container">
      {/* Header */}
      <div className="attendance-header-row">
        <div className="attendance-title-area">
          <h1>Attendance Reports</h1>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="attendance-filter-bar">
        <div className="attendance-filter-item">
          <input
            type="month"
            className="attendance-filter-input"
            value={`${selectedYear}-${String(selectedMonth).padStart(2, "0")}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              setSelectedYear(y);
              setSelectedMonth(m);
            }}
          />
        </div>

        <div style={{ width: "230px" }}>
          <SearchableBranchSelect
            value={selectedBranchId}
            onChange={setSelectedBranchId}
            branches={branches}
          />
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
          <button type="button" className="btn-printz-outline" onClick={handleExportCSV}>
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button type="button" className="btn-printz-primary" onClick={() => window.print()}>
            <Printer size={15} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "10px 18px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {/* ─── Dashboard UI KPI Cards ─────────────────────────────────── */}
      {summary && (
        <div className="printz-kpi-grid">
          {/* Calendar Days */}
          <div className="printz-kpi-card">
            <div className="printz-kpi-top">
              <div className="printz-summary-icon blue">
                <Calendar size={20} strokeWidth={2.3} color="#ffffff" />
              </div>
              <div className="printz-kpi-values">
                <div className="printz-kpi-number">{summary.calendarDays || 0}</div>
                <div className="printz-kpi-label">Calendar Days</div>
              </div>
            </div>
          </div>

          {/* Total Worked Hours */}
          <div className="printz-kpi-card">
            <div className="printz-kpi-top">
              <div className="printz-summary-icon green">
                <Clock size={20} strokeWidth={2.3} color="#ffffff" />
              </div>
              <div className="printz-kpi-values">
                <div className="printz-kpi-number">{summary.totalWorkingHours || 0}h</div>
                <div className="printz-kpi-label">Total Worked</div>
              </div>
            </div>
          </div>

          {/* Late Arrivals */}
          <div className="printz-kpi-card">
            <div className="printz-kpi-top">
              <div className="printz-summary-icon orange">
                <AlertTriangle size={20} strokeWidth={2.3} color="#ffffff" />
              </div>
              <div className="printz-kpi-values">
                <div className="printz-kpi-number">{summary.lateArrivalCount || 0}</div>
                <div className="printz-kpi-label">Late Arrivals</div>
              </div>
            </div>
          </div>

          {/* Approved Permissions */}
          <div className="printz-kpi-card">
            <div className="printz-kpi-top">
              <div className="printz-summary-icon purple">
                <Users size={20} strokeWidth={2.3} color="#ffffff" />
              </div>
              <div className="printz-kpi-values">
                <div className="printz-kpi-number">{summary.totalPermissionHours || 0}h</div>
                <div className="printz-kpi-label">Permission Hours</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Records Table */}
      <div className="attendance-table-card">
        <table className="attendance-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>#</th>
              <th>Employee</th>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Worked Hours</th>
              <th>Late / Early</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "36px", color: "#475569" }}>
                  Generating attendance report...
                </td>
              </tr>
            ) : paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "36px", color: "#475569" }}>
                  No attendance records found for this period.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r, idx) => {
                const rowNum = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <tr key={r._id}>
                    <td>{rowNum}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{r.employeeId?.name || "Employee"}</div>
                      <div style={{ fontSize: "11px", color: "#475569" }}>{r.employeeId?.employeeCode}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.attendanceDate}</td>
                    <td>{r.checkIn || "-"}</td>
                    <td>{r.checkOut || "-"}</td>
                    <td style={{ fontWeight: 600, color: "#059669" }}>{r.workingHoursPerDay || 0}h</td>
                    <td>
                      {r.lateArrival ? (
                        <span style={{ color: "#d97706", fontSize: "12px", fontWeight: 600 }}>Late: {r.lateMinutes || 0}m</span>
                      ) : r.earlyCheckout ? (
                        <span style={{ color: "#d97706", fontSize: "12px", fontWeight: 600 }}>Early: {r.earlyCheckoutMinutes || 0}m</span>
                      ) : (
                        <span style={{ color: "#475569", fontSize: "12px" }}>-</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${(r.status || "present").toLowerCase().replace("_", "-")}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ─── Modern Pagination ─── */}
        <AttendancePagination
          currentPage={currentPage}
          totalItems={records.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
          itemName="records"
        />
      </div>

      {/* Printed copy: every record of the period (the on-screen table shows one page at a time) */}
      <div className="attendance-print-only">
        <h2 style={{ margin: "0 0 4px", fontSize: "18px" }}>Attendance Report</h2>
        <div style={{ margin: "0 0 12px", fontSize: "12px", color: "#475569" }}>
          {String(selectedMonth).padStart(2, "0")}/{selectedYear} · {records.length} records
        </div>
        <table className="attendance-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Employee</th>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Worked Hours</th>
              <th>Late / Early</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, idx) => (
              <tr key={r._id || idx}>
                <td>{idx + 1}</td>
                <td>{r.employeeId?.name || "Employee"} {r.employeeId?.employeeCode ? "(" + r.employeeId.employeeCode + ")" : ""}</td>
                <td>{r.attendanceDate}</td>
                <td>{r.checkIn || "-"}</td>
                <td>{r.checkOut || "-"}</td>
                <td>{r.workingHoursPerDay || 0}h</td>
                <td>{r.lateArrival ? "Late: " + (r.lateMinutes || 0) + "m" : r.earlyCheckout ? "Early: " + (r.earlyCheckoutMinutes || 0) + "m" : "-"}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
