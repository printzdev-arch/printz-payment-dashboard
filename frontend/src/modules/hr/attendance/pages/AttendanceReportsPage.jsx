import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
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
  AlertCircle,
} from "lucide-react";
import attendanceApi from "../api/attendanceApi";
import DataTable from "../../../../shared/ui/DataTable/DataTable";
import BranchSelect from "../../../../shared/ui/selects/BranchSelect";
import MonthField from "../../../../shared/ui/selects/MonthField";
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
          <MonthField
            value={`${selectedYear}-${String(selectedMonth).padStart(2, "0")}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              setSelectedYear(y);
              setSelectedMonth(m);
            }}
          />
        </div>

        <div className="attendance-filter-item">
          <BranchSelect
            valueKey="id"
            allowAll
            allOptionLabel="All Branches"
            allOptionValue=""
            branches={branches}
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          />
        </div>

        <div className="attendance-bar-actions">
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
        <div className="attendance-alert error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}


      {/* Report Records Table */}
      <DataTable
        mobileCards
        searchable={false}
        loading={loading}
        data={records}
        pageSize={10}
        emptyMessage="No attendance records found for this period."
        columns={[
          { key: "sno", label: "#", width: "40px", className: "printz-cell-hide-mobile", render: (r, idx) => idx + 1 },
          {
            key: "employee",
            label: "Employee",
            className: "printz-cell-lead",
            render: (r) => (
              <>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>{r.employeeId?.name || "Employee"}</div>
                <div style={{ fontSize: "11px", color: "#1e293b" }}>{r.employeeId?.employeeCode}</div>
              </>
            ),
          },
          { key: "attendanceDate", label: "Date", render: (r) => <span style={{ fontWeight: 600 }}>{r.attendanceDate}</span> },
          { key: "checkIn", label: "Check In", render: (r) => r.checkIn || "-" },
          { key: "checkOut", label: "Check Out", render: (r) => r.checkOut || "-" },
          {
            key: "workingHoursPerDay",
            label: "Worked Hours",
            render: (r) => <span style={{ fontWeight: 600, color: "#059669" }}>{r.workingHoursPerDay || 0}h</span>,
          },
          {
            key: "lateEarly",
            label: "Late / Early",
            render: (r) =>
              r.lateArrival ? (
                <span style={{ color: "#d97706", fontSize: "12px", fontWeight: 600 }}>Late: {r.lateMinutes || 0}m</span>
              ) : r.earlyCheckout ? (
                <span style={{ color: "#d97706", fontSize: "12px", fontWeight: 600 }}>Early: {r.earlyCheckoutMinutes || 0}m</span>
              ) : (
                <span style={{ color: "#1e293b", fontSize: "12px" }}>-</span>
              ),
          },
          {
            key: "status",
            label: "Status",
            render: (r) => (
              <span className={`status-badge ${(r.status || "present").toLowerCase().replace("_", "-")}`}>{r.status}</span>
            ),
          },
        ]}
      />
      {/* Printable copy: all records of the month, shown only when printing */}
      {createPortal(
        <div className="attendance-print-root">
          <h1>Attendance Report</h1>
          <p className="attendance-print-meta">
            {new Date(selectedYear, selectedMonth - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" })} ·{" "}
            {selectedBranchId ? branches.find((b) => String(b._id) === String(selectedBranchId))?.name || "Branch" : "All Branches"} ·{" "}
            {records.length} record{records.length === 1 ? "" : "s"}
          </p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Employee</th>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Worked</th>
                <th>Late / Early</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r._id || i}>
                  <td>{i + 1}</td>
                  <td>
                    {r.employeeId?.name || "Employee"}
                    <small>{r.employeeId?.employeeCode}</small>
                  </td>
                  <td>{r.attendanceDate}</td>
                  <td>{r.checkIn || "-"}</td>
                  <td>{r.checkOut || "-"}</td>
                  <td>{r.workingHoursPerDay || 0}h</td>
                  <td>{r.lateArrival ? `Late ${r.lateMinutes || 0}m` : r.earlyCheckout ? `Early ${r.earlyCheckoutMinutes || 0}m` : "-"}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
        document.body
      )}
    </div>
  );
}
