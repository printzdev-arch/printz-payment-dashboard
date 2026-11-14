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
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import attendanceApi from "../api/attendanceApi";
import CheckInModal from "../components/CheckInModal";
import CheckOutModal from "../components/CheckOutModal";
import ViewAttendanceModal from "../components/ViewAttendanceModal";
import ReconcileModal from "../components/ReconcileModal";
import FinalizeModal from "../components/FinalizeModal";
import BranchSelect from "../../../../shared/ui/selects/BranchSelect";
import DataTable from "../../../../shared/ui/DataTable/DataTable";
import { DateField } from "../../../../shared/ui/selects/CalendarSelect";
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

// Status label, badge class and the next action for an employee's attendance record
const getRowDisplay = (att) => {
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
  return { displayStatus, statusClass, actionType };
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
  const currentUser = useMemo(() => {
    try {
      const rawUser = localStorage.getItem("user");
      return rawUser ? JSON.parse(rawUser) : {};
    } catch {
      return {};
    }
  }, []);

  const isAdmin = useMemo(() => {
    const role = (currentUser.roleCode || currentUser.role || "").toString().toLowerCase().trim();
    const perms = currentUser.permissions;
    const hasWildcard = Array.isArray(perms)
      ? perms.includes("*")
      : typeof perms === "string"
        ? perms === "*"
        : Boolean(perms && typeof perms === "object" && perms["*"]);
    return ["admin", "super_admin", "internal_admin"].includes(role) || hasWildcard;
  }, [currentUser]);

  const assignedBranchIds = useMemo(() => {
    const ids = (currentUser.branchIds || [])
      .map((b) => (b && b._id ? b._id.toString() : (b ? b.toString() : "")))
      .filter(Boolean);
    const primary = currentUser.branchId?._id || currentUser.branchId;
    if (primary) {
      const pStr = primary.toString();
      if (!ids.includes(pStr)) ids.unshift(pStr);
    }
    return ids;
  }, [currentUser]);

  const assignedBranchName = currentUser.branchName || currentUser.branch || "";
  const isBranchLocked = !isAdmin && branches.length === 1 && (assignedBranchIds.length > 0 || Boolean(assignedBranchName));

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
      if (!isAdmin) {
        let scoped = [];
        if (assignedBranchIds.length > 0) {
          scoped = branchesData.filter((b) => assignedBranchIds.includes(String(b._id)));
        } else if (assignedBranchName) {
          const target = assignedBranchName.toLowerCase().trim();
          scoped = branchesData.filter(
            (b) =>
              b.name?.toLowerCase().trim() === target ||
              b.name?.toLowerCase().includes(target)
          );
        }
        if (scoped.length > 0) {
          setBranches(scoped);
          if (scoped.length === 1) {
            setSelectedBranchId(String(scoped[0]._id));
          }
          return;
        }
      }
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
          `Showing ${targetBranches.length - failed.length} of ${targetBranches.length} branches. ${failed.length} could not be loaded. Select a branch to see why.`
        );
      } else if (noPolicyCount > 0) {
        setNotice(
          `${noPolicyCount} branch${noPolicyCount === 1 ? " has" : "es have"} no active attendance policy, so ${noPolicyCount === 1 ? "it is" : "they are"} not listed. Add one in Attendance Setup.`
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
          <DateField
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
          />
        </div>

        {/* Branch Dropdown (Locked badge for branch-assigned non-admins) */}
        <div className="attendance-filter-item">
          {isBranchLocked ? (
            <div className="attendance-branch-locked-badge" title="Assigned Branch (Fixed)">
              <Building2 size={14} />
              <span>{branches[0]?.name || assignedBranchName || "My Branch"}</span>
              <span className="attendance-branch-tag">Assigned</span>
            </div>
          ) : (
            <BranchSelect
              valueKey="id"
              allowAll
              allOptionLabel="All Branches"
              allOptionValue=""
              branches={branches}
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            />
          )}
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


      {notice && !error && (
        <div className="attendance-alert warn" role="status">
          <AlertTriangle size={16} />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="attendance-alert error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Employee Attendance Table ───────────────────────────────── */}
      <DataTable
        mobileCards
        searchable={false}
        loading={loading}
        data={filteredEmployees}
        pageSize={10}
        emptyMessage="No employees found for the selected branch and criteria."
        footer={
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
        columns={[
          { key: "sno", label: "#", width: "40px", className: "printz-cell-hide-mobile", render: (item, idx) => idx + 1 },
          {
            key: "employee",
            label: "Employee",
            className: "printz-cell-lead",
            render: (item) => {
              const emp = item.employee || {};
              return (
                <div className="attendance-employee-cell">
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
              );
            },
          },
          { key: "checkIn", label: "Check In", render: (item) => <span style={{ fontWeight: 600 }}>{item.attendance?.checkIn || "-"}</span> },
          { key: "checkOut", label: "Check Out", render: (item) => <span style={{ fontWeight: 600 }}>{item.attendance?.checkOut || "-"}</span> },
          {
            key: "workedHours",
            label: "Worked Hours",
            render: (item) => {
              const att = item.attendance;
              return (
                <span style={{ fontWeight: 600 }}>
                  {att && att.checkIn && att.checkOut ? `${att.workingHoursPerDay || 0}h` : "-"}
                </span>
              );
            },
          },
          {
            key: "status",
            label: "Status",
            render: (item) => {
              const { displayStatus, statusClass } = getRowDisplay(item.attendance);
              return <span className={`status-badge ${statusClass}`}>{displayStatus}</span>;
            },
          },
          {
            key: "action",
            label: "Action",
            width: "120px",
            className: "printz-cell-actions",
            render: (item) => {
              const emp = item.employee || {};
              const att = item.attendance;
              const { actionType } = getRowDisplay(att);
              return (
                <>
                  {actionType === "check-out" && (
                    <button type="button" className="action-btn-checkout" onClick={() => handleOpenCheckOut(emp, att, item.rosterBranchId)}>
                      <LogOut size={13} strokeWidth={2.4} />
                      <span>Check Out</span>
                    </button>
                  )}
                  {actionType === "check-in" && (
                    <button type="button" className="action-btn-checkin" onClick={() => handleOpenCheckIn(emp, att, item.rosterBranchId)}>
                      <LogIn size={13} strokeWidth={2.4} />
                      <span>Check In</span>
                    </button>
                  )}
                  {actionType === "view" && (
                    <button type="button" className="action-btn-view" onClick={() => handleOpenView(emp, att)}>
                      <Eye size={13} strokeWidth={2.4} />
                      <span>View</span>
                    </button>
                  )}
                </>
              );
            },
          },
        ]}
      />

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
