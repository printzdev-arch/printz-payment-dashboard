import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CheckCircle2,
  Clock,
  Search,
  Eye,
  Calendar,
  Building2,
  Lock,
  RotateCcw,
  LogIn,
  LogOut,
  ArrowUp,
  UserCheck,
  ArrowLeftRight,
} from "lucide-react";
import attendanceApi from "../api/attendanceApi";
import CheckInModal from "../components/CheckInModal";
import CheckOutModal from "../components/CheckOutModal";
import ViewAttendanceModal from "../components/ViewAttendanceModal";
import ReconcileModal from "../components/ReconcileModal";
import FinalizeModal from "../components/FinalizeModal";
import SearchableBranchSelect from "../components/SearchableBranchSelect";
import AttendancePagination from "../components/AttendancePagination";
import "../styles/attendance.css";

// Color palette for employee avatar initials matching reference image 2
const AVATAR_COLORS = [
  "#3b82f6", // Blue (A)
  "#a855f7", // Purple (P)
  "#6366f1", // Indigo (S)
  "#8b5cf6", // Violet (K)
  "#4f46e5", // Dark Indigo (D)
  "#0ea5e9", // Sky Blue (R)
  "#d946ef", // Magenta (M)
  "#059669", // Emerald
  "#f59e0b", // Amber
];

const getAvatarColor = (name = "") => {
  if (!name) return AVATAR_COLORS[0];
  const charCode = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[charCode % AVATAR_COLORS.length];
};

export default function DailyAttendancePage() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  // Deep links (e.g. from payroll errors) may pass ?date=YYYY-MM-DD&employee=EMP-00008.
  const linkParams = new URLSearchParams(window.location.search);
  const linkDate = /^\d{4}-\d{2}-\d{2}$/.test(linkParams.get("date") || "") ? linkParams.get("date") : "";
  const [attendanceDate, setAttendanceDate] = useState(
    linkDate || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  );
  const [searchQuery, setSearchQuery] = useState(linkParams.get("employee") || "");

  const [loading, setLoading] = useState(false);
  const [employeesData, setEmployeesData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [selectedRosterBranchId, setSelectedRosterBranchId] = useState("");
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);

  // Temporary branch shifting is Admin-only (mirrors the backend check).
  const isAdmin = useMemo(() => {
    try {
      const rawUser = localStorage.getItem("user");
      const user = rawUser ? JSON.parse(rawUser) : {};
      const role = (user.roleCode || user.role || "").toString().toLowerCase().trim();
      const perms = user.permissions;
      const hasWildcard = Array.isArray(perms)
        ? perms.includes("*")
        : typeof perms === "string"
          ? perms === "*"
          : Boolean(perms && typeof perms === "object" && perms["*"]);
      return ["admin", "super_admin", "internal_admin"].includes(role) || hasWildcard;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    loadInitialDropdowns();
  }, []);

  useEffect(() => {
    if (branches.length > 0 && attendanceDate) {
      loadDailyAttendance();
      loadSummary();
    }
  }, [branches, selectedBranchId, attendanceDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranchId, attendanceDate, searchQuery]);

  const loadInitialDropdowns = async () => {
    try {
      const branchesData = await attendanceApi.getBranches();
      setBranches(branchesData);
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  };

  const loadDailyAttendance = async () => {
    try {
      setLoading(true);
      setError("");
      setNotice("");
      let targetBranches = selectedBranchId
        ? [{ _id: selectedBranchId }]
        : branches;

      // Attendance is branch-isolated: a branch without an active attendance
      // policy answers 400. In the all-branches view, ask only branches that
      // have one instead of firing a failing request per branch.
      let noPolicyCount = 0;
      if (!selectedBranchId) {
        try {
          const withPolicy = new Set();
          for (let page = 1; page <= 20; page += 1) {
            const res = await attendanceApi.getPolicies({ isActive: true, limit: 100, page });
            const body = res?.data || res || {};
            const rows = body.policies || body.items || (Array.isArray(body) ? body : []);
            rows.forEach((p) => {
              if (p.isActive === false || !p.branchId) return;
              withPolicy.add(String(p.branchId?._id || p.branchId));
            });
            if (page >= (Number(body.pages) || 1) || rows.length === 0) break;
          }
          if (withPolicy.size > 0) {
            const filtered = branches.filter((b) => withPolicy.has(String(b._id)));
            noPolicyCount = branches.length - filtered.length;
            targetBranches = filtered;
          }
        } catch {
          // Policy lookup failed; fall back to asking every branch.
        }
      }

      const results = await Promise.allSettled(
        targetBranches.map((b) =>
          attendanceApi.getEmployeesForDate({
            branchId: b._id,
            attendanceDate,
          })
        )
      );

      const items = [];
      const failed = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          const list = r.value?.data?.items || r.value?.items || [];
          // Remember which branch roster each row came from, so check-in/out goes to that branch
          items.push(...list.map((it) => ({ ...it, rosterBranchId: targetBranches[i]._id })));
        } else {
          const b = targetBranches[i];
          const name = branches.find((x) => x._id === b._id)?.name || "Branch";
          failed.push({
            name,
            message: r.reason?.response?.data?.message || r.reason?.message || "Failed to load.",
          });
        }
      });

      if (selectedBranchId && failed.length > 0) {
        setError(failed[0].message);
      } else if (failed.length > 0 && items.length === 0) {
        setError(failed[0].message);
      } else if (failed.length > 0) {
        setNotice(
          `Showing ${targetBranches.length - failed.length} of ${targetBranches.length} branches. ${failed.length} skipped — select a branch to see its reason.`
        );
      } else if (noPolicyCount > 0) {
        setNotice(
          `${noPolicyCount} branch${noPolicyCount === 1 ? " has" : "es have"} no active attendance policy and ${noPolicyCount === 1 ? "is" : "are"} not listed. Create and activate a policy in Attendance Setup to include ${noPolicyCount === 1 ? "it" : "them"}.`
        );
      }

      setEmployeesData(items);
      setCurrentPage(1);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load daily attendance.");
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    if (!selectedBranchId) {
      setSummaryData(null);
      return;
    }
    try {
      const res = await attendanceApi.getAttendanceSummary({
        branchId: selectedBranchId,
        date: attendanceDate,
      });
      setSummaryData(res?.data || res);
    } catch (err) {
      console.error("Failed to load attendance summary:", err);
    }
  };

  // Filtered employees by search
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employeesData;
    const q = searchQuery.toLowerCase().trim();
    return employeesData.filter((item) => {
      const emp = item.employee || {};
      const name = (emp.name || "").toLowerCase();
      const code = (emp.employeeCode || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [employeesData, searchQuery]);

  // Derived metrics for summary cards
  const totalCount = employeesData.length;
  const checkedInCount = employeesData.filter(
    (item) => item.attendance && (item.attendance.checkIn || item.attendance.status === "PRESENT" || item.attendance.status === "LATE")
  ).length;
  const checkedOutCount = employeesData.filter(
    (item) => item.attendance && item.attendance.checkOut
  ).length;
  const pendingCheckoutCount = Math.max(0, checkedInCount - checkedOutCount);

  // Pagination slice
  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  // Check-in/out act on the branch the employee is listed under (their home branch, or the
  // destination branch while temporarily shifted) when "All Branches" is selected
  const employeeBranchId =
    selectedBranchId ||
    String(selectedRosterBranchId || selectedEmployee?.branchId?._id || selectedEmployee?.branchId || "");

  const handleOpenCheckIn = (emp, att, rosterBranchId = "") => {
    setSelectedRosterBranchId(rosterBranchId);
    setSelectedEmployee(emp);
    setSelectedAttendance(att);
    setIsCheckInOpen(true);
  };

  const handleOpenCheckOut = (emp, att, rosterBranchId = "") => {
    setSelectedRosterBranchId(rosterBranchId);
    setSelectedEmployee(emp);
    setSelectedAttendance(att);
    setIsCheckOutOpen(true);
  };

  const handleOpenView = (emp, att) => {
    setSelectedEmployee(emp);
    setSelectedAttendance(att);
    setIsViewOpen(true);
  };

  return (
    <div className="attendance-page-container">
      {/* ─── Header Row ──────────────────────────────────────────────── */}
      <div className="attendance-header-row">
        <div className="attendance-title-area">
          <h1>Daily Attendance</h1>

        </div>

        {isAdmin && (
          <div className="attendance-header-actions">
            <button
              type="button"
              className="btn-printz-outline"
              onClick={() => navigate("/attendance/branch-shifts")}
            >
              <ArrowLeftRight size={16} />
              Branch Shifts
            </button>
          </div>
        )}
      </div>

      {/* ─── Filters Bar ─────────────────────────────────────────────── */}
      <div className="attendance-filter-bar">
        {/* Date Selector */}
        <div className="attendance-filter-item">
          <input
            type="date"
            className="attendance-filter-input"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
          />
        </div>

        {/* Branch Dropdown */}
        <div className="attendance-filter-item">
          <SearchableBranchSelect
            value={selectedBranchId}
            onChange={setSelectedBranchId}
            branches={branches}
          />
        </div>

        {/* Search employee input */}
        <div className="attendance-search-box">
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ─── Dashboard UI KPI Cards ─────────────────────────────────── */}
      <div className="printz-kpi-grid">
        {/* Total Employees */}
        <div className="printz-kpi-card">
          <div className="printz-kpi-top">
            <div className="printz-summary-icon teal">
              <Users size={20} strokeWidth={2.3} color="#ffffff" />
            </div>
            <div className="printz-kpi-values">
              <div className="printz-kpi-number">{totalCount}</div>
              <div className="printz-kpi-label">Total Employees</div>
            </div>
          </div>
        </div>

        {/* Checked In */}
        <div className="printz-kpi-card">
          <div className="printz-kpi-top">
            <div className="printz-summary-icon green">
              <CheckCircle2 size={20} strokeWidth={2.4} color="#ffffff" />
            </div>
            <div className="printz-kpi-values">
              <div className="printz-kpi-number">{checkedInCount}</div>
              <div className="printz-kpi-label">Checked In</div>
            </div>
          </div>
        </div>

        {/* Checked Out */}
        <div className="printz-kpi-card">
          <div className="printz-kpi-top">
            <div className="printz-summary-icon blue">
              <UserCheck size={20} strokeWidth={2.3} color="#ffffff" />
            </div>
            <div className="printz-kpi-values">
              <div className="printz-kpi-number">{checkedOutCount}</div>
              <div className="printz-kpi-label">Checked Out</div>
            </div>
          </div>
        </div>

        {/* Pending Checkout */}
        <div className="printz-kpi-card">
          <div className="printz-kpi-top">
            <div className="printz-summary-icon orange">
              <Clock size={20} strokeWidth={2.3} color="#ffffff" />
            </div>
            <div className="printz-kpi-values">
              <div className="printz-kpi-number">{pendingCheckoutCount}</div>
              <div className="printz-kpi-label">Pending Checkout</div>
            </div>
          </div>
        </div>
      </div>

      {notice && !error && (
        <div style={{ backgroundColor: "#fffbeb", color: "#92400e", padding: "10px 18px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
          {notice}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "10px 18px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {/* ─── Employee Attendance Table ───────────────────────────────── */}
      <div className="attendance-table-card">
        <table className="attendance-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>#</th>
              <th>Employee</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Worked Hours</th>
              <th>Status</th>
              <th style={{ width: "120px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "#475569" }}>
                  Loading attendance records...
                </td>
              </tr>
            ) : paginatedEmployees.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "#475569" }}>
                  No employees found for the selected branch and criteria.
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((item, idx) => {
                const emp = item.employee || {};
                const att = item.attendance;
                const indexNum = (currentPage - 1) * pageSize + idx + 1;

                // Determine display status & action button
                let displayStatus = "Not Yet";
                let statusClass = "not-yet";
                let actionType = "check-in";

                if (att) {
                  if (att.checkIn && !att.checkOut) {
                    displayStatus = "Checked In";
                    statusClass = "checked-in";
                    actionType = "check-out";
                  } else if (att.status === "PRESENT") {
                    displayStatus = "Present";
                    statusClass = "present";
                    actionType = "view";
                  } else if (att.status === "HALF_DAY") {
                    displayStatus = "Half Day";
                    statusClass = "half-day";
                    actionType = "view";
                  } else if (att.status === "ABSENT") {
                    displayStatus = "Absent";
                    statusClass = "absent";
                    actionType = "check-in";
                  } else if (att.lateArrival) {
                    displayStatus = "Late";
                    statusClass = "late";
                    actionType = att.checkOut ? "view" : "check-out";
                  } else if (att.status === "HOLIDAY") {
                    displayStatus = "Holiday";
                    statusClass = "holiday";
                    actionType = "view";
                  } else if (att.status === "WEEKLY_OFF") {
                    displayStatus = "Weekly Off";
                    statusClass = "weekly-off";
                    actionType = "view";
                  } else if (att.status) {
                    displayStatus = att.status;
                    statusClass = att.status.toLowerCase().replace("_", "-");
                    actionType = att.checkOut ? "view" : "check-out";
                  }
                }

                // Format worked duration
                const workedHoursText =
                  att && att.checkIn && att.checkOut
                    ? `${att.workingHoursPerDay || 0}h`
                    : "-";

                return (
                  <tr key={emp._id}>
                    <td>{indexNum}</td>
                    <td>
                      <div className="attendance-employee-cell">
                        <div
                          className="attendance-avatar-circle"
                          style={{ backgroundColor: getAvatarColor(emp.name) }}
                        >
                          {(emp.name || "E").charAt(0).toUpperCase()}
                        </div>
                        <div className="attendance-emp-info">
                          <span className="attendance-emp-code">{emp.employeeCode}</span>
                          <span className="attendance-emp-name">{emp.name}</span>
                          {item.isShifted && (
                            <span
                              className="attendance-shift-badge"
                              title={item.shiftInfo ? `Shifted ${item.shiftInfo.fromDate} to ${item.shiftInfo.toDate}` : ""}
                            >
                              Shifted from {item.homeBranch?.name || "home branch"}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{att?.checkIn || "-"}</td>
                    <td style={{ fontWeight: 600 }}>{att?.checkOut || "-"}</td>
                    <td style={{ fontWeight: 600 }}>{workedHoursText}</td>
                    <td>
                      <span className={`status-badge ${statusClass}`}>{displayStatus}</span>
                    </td>
                    <td>
                      {actionType === "check-out" && (
                        <button
                          type="button"
                          className="action-btn-checkout"
                          onClick={() => handleOpenCheckOut(emp, att, item.rosterBranchId)}
                        >
                          <LogOut size={13} strokeWidth={2.4} />
                          <span>Check Out</span>
                        </button>
                      )}
                      {actionType === "check-in" && (
                        <button
                          type="button"
                          className="action-btn-checkin"
                          onClick={() => handleOpenCheckIn(emp, att, item.rosterBranchId)}
                        >
                          <LogIn size={13} strokeWidth={2.4} />
                          <span>Check In</span>
                        </button>
                      )}
                      {actionType === "view" && (
                        <button
                          type="button"
                          className="action-btn-view"
                          onClick={() => handleOpenView(emp, att)}
                        >
                          <Eye size={13} strokeWidth={2.4} />
                          <span>View</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ─── Modern Pagination with dynamic rows per page & Admin Actions ─── */}
        <AttendancePagination
          currentPage={currentPage}
          totalItems={filteredEmployees.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
          itemName="employees"
          extraActions={
            <div className="attendance-footer-admin-actions">
              <button
                type="button"
                className="btn-printz-outline"
                disabled={!selectedBranchId}
                title={!selectedBranchId ? "Select a branch first" : undefined}
                onClick={() => setIsReconcileOpen(true)}
              >
                Mark Missing
              </button>
              <button
                type="button"
                className="btn-printz-outline"
                disabled={!selectedBranchId}
                title={!selectedBranchId ? "Select a branch first" : undefined}
                onClick={() => setIsReconcileOpen(true)}
              >
                Resolve Attendance
              </button>
              <button
                type="button"
                className="btn-printz-primary"
                disabled={!selectedBranchId}
                title={!selectedBranchId ? "Select a branch first" : undefined}
                onClick={() => setIsFinalizeOpen(true)}
              >
                Finalize Attendance
              </button>
            </div>
          }
        />
      </div>

      {/* ─── Modals ─────────────────────────────────────────────────── */}
      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onCheckInSuccess={() => {
          loadDailyAttendance();
          loadSummary();
        }}
        employee={selectedEmployee}
        branchId={employeeBranchId}
        date={attendanceDate}
      />

      <CheckOutModal
        isOpen={isCheckOutOpen}
        onClose={() => setIsCheckOutOpen(false)}
        onCheckOutSuccess={() => {
          loadDailyAttendance();
          loadSummary();
        }}
        employee={selectedEmployee}
        attendanceRecord={selectedAttendance}
        branchId={employeeBranchId}
        date={attendanceDate}
      />

      <ViewAttendanceModal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        record={selectedAttendance}
      />

      <ReconcileModal
        isOpen={isReconcileOpen}
        onClose={() => setIsReconcileOpen(false)}
        onSuccess={() => {
          loadDailyAttendance();
          loadSummary();
        }}
        branchId={selectedBranchId}
        date={attendanceDate}
      />

      <FinalizeModal
        isOpen={isFinalizeOpen}
        onClose={() => setIsFinalizeOpen(false)}
        onSuccess={() => {
          loadDailyAttendance();
          loadSummary();
        }}
        branchId={selectedBranchId}
        date={attendanceDate}
      />
    </div>
  );
}
