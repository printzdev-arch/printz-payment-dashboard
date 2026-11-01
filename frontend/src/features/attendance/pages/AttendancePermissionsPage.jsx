import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Search,
  Calendar,
  Building2,
  User,
  CheckCircle2,
  Users,
  FileText,
  ArrowUp,
} from "lucide-react";
import attendanceApi from "../api/attendanceApi";
import RecordPermissionModal from "../components/RecordPermissionModal";
import SearchableBranchSelect from "../components/SearchableBranchSelect";
import AttendancePagination from "../components/AttendancePagination";
import "../styles/attendance.css";

// Color palette for employee avatar initials matching reference image 3
const AVATAR_COLORS = [
  "#3b82f6", // Blue (A)
  "#a855f7", // Purple (P)
  "#6366f1", // Indigo (S)
  "#8b5cf6", // Violet (K)
  "#4f46e5", // Dark Indigo
  "#0ea5e9", // Sky Blue
  "#059669", // Emerald
];

const getAvatarColor = (name = "") => {
  if (!name) return AVATAR_COLORS[0];
  const charCode = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[charCode % AVATAR_COLORS.length];
};

export default function AttendancePermissionsPage() {
  // Authenticated user & branch determination
  const currentUser = useMemo(() => {
    try {
      const rawUser = localStorage.getItem("user");
      return rawUser ? JSON.parse(rawUser) : {};
    } catch {
      return {};
    }
  }, []);

  const userRole = (currentUser.roleCode || currentUser.role || "").toString().toLowerCase().trim();
  const perms = currentUser.permissions;
  const hasWildcardPermission = Array.isArray(perms)
    ? perms.includes("*")
    : typeof perms === "string"
      ? perms === "*"
      : Boolean(perms && typeof perms === "object" && perms["*"]);
  const isSuperAdmin = Boolean(
    ["super_admin", "internal_admin"].includes(userRole) || hasWildcardPermission
  );

  const assignedBranchId = currentUser.branchId?._id || currentUser.branchId || "";
  const assignedBranchName = currentUser.branchName || currentUser.branch || "";
  // Branch Managers have their branch automatically assigned from their account and it is NOT editable
  const isBranchLocked = !isSuperAdmin && Boolean(assignedBranchId || assignedBranchName);

  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [balanceData, setBalanceData] = useState(null);
  const [error, setError] = useState("");

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);

  useEffect(() => {
    loadBranches();
    attendanceApi.getDepartments().then(setDepartments);
  }, []);

  useEffect(() => {
    loadEmployees();
    // Previously selected employee may belong to another branch
    setSelectedEmployeeId("");
  }, [selectedBranchId]);

  useEffect(() => {
    loadPermissions();
    if (selectedEmployeeId) {
      loadEmployeeBalance(selectedEmployeeId);
    } else {
      setBalanceData(null);
    }
  }, [selectedBranchId, selectedEmployeeId, selectedMonth, selectedYear]);

  const loadBranches = async () => {
    try {
      const data = await attendanceApi.getBranches();
      setBranches(data);

      if (isBranchLocked) {
        // Automatically assign manager's branch from authenticated account
        const matched = data.find(
          (b) =>
            (assignedBranchId && String(b._id) === String(assignedBranchId)) ||
            (assignedBranchName && b.name?.toLowerCase().trim() === assignedBranchName.toLowerCase().trim())
        );
        setSelectedBranchId(matched ? String(matched._id) : String(assignedBranchId));
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await attendanceApi.getEmployees(
        selectedBranchId ? { branchId: selectedBranchId } : {}
      );
      const list = Array.isArray(data) ? data : (data?.items || []);
      setEmployees(list);
    } catch (err) {
      console.error("Failed to load employees:", err);
      setEmployees([]);
    }
  };

  const loadPermissions = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        month: selectedMonth,
        year: selectedYear,
      };
      if (selectedBranchId) params.branchId = selectedBranchId;
      if (selectedEmployeeId) params.employeeId = selectedEmployeeId;

      const res = await attendanceApi.getPermissions(params);
      const list = res?.data?.permissions || res?.permissions || res?.data || [];
      setPermissions(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load permissions.");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeBalance = async (empId) => {
    if (!empId) {
      setBalanceData(null);
      return;
    }
    try {
      const res = await attendanceApi.getEmployeePermissionBalance(empId, {
        month: selectedMonth,
        year: selectedYear,
      });
      setBalanceData(res?.data || res);
    } catch (err) {
      console.error("Failed to load employee balance:", err);
      setBalanceData(null);
    }
  };

  const handleEmployeeChange = (empId) => {
    // Immediately clear previous employee's details to prevent stale balance or history
    setSelectedEmployeeId(empId);
    setBalanceData(null);
    if (empId) {
      loadEmployeeBalance(empId);
    }
  };

  const handleDeletePermission = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this permission entry? Allowance will be restored.")) return;
    try {
      await attendanceApi.deletePermission(id);
      loadPermissions();
      if (selectedEmployeeId) {
        loadEmployeeBalance(selectedEmployeeId);
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete permission.");
    }
  };

  // Safe normalized employee list
  const employeeList = useMemo(() => {
    if (Array.isArray(employees)) return employees;
    if (Array.isArray(employees?.items)) return employees.items;
    return [];
  }, [employees]);

  // Employees offered in the filter: narrowed by the selected department
  const departmentEmployees = useMemo(() => {
    if (!selectedDepartmentId) return employeeList;
    return employeeList.filter(
      (e) => String(e.departmentId?._id || e.departmentId) === String(selectedDepartmentId)
    );
  }, [employeeList, selectedDepartmentId]);

  // Active branch object
  const activeBranch = useMemo(() => {
    return branches.find((b) => String(b._id) === String(selectedBranchId)) || null;
  }, [branches, selectedBranchId]);

  // Filter permissions by search
  const filteredPermissions = useMemo(() => {
    const list = Array.isArray(permissions) ? permissions : [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((p) => {
      const emp = p.employeeId || {};
      if (selectedDepartmentId) {
        const deptId = emp.departmentId?._id || emp.departmentId;
        if (String(deptId) !== String(selectedDepartmentId)) return false;
      }
      if (!q) return true;
      const name = (emp.name || "").toLowerCase();
      const code = (emp.employeeCode || "").toLowerCase();
      const r = (p.reason || "").toLowerCase();
      return name.includes(q) || code.includes(q) || r.includes(q);
    });
  }, [permissions, searchQuery, selectedDepartmentId]);

  // Reset to page 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranchId, selectedDepartmentId, selectedEmployeeId, selectedMonth, selectedYear, searchQuery]);

  // Paginated slice for current page
  const paginatedPermissions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPermissions.slice(start, start + pageSize);
  }, [filteredPermissions, currentPage, pageSize]);

  // Selected employee for the bottom card
  const activeEmp = useMemo(() => {
    if (!selectedEmployeeId) return null;
    const fromList = employeeList.find((e) => String(e._id) === String(selectedEmployeeId));
    if (fromList) return fromList;
    const row = (Array.isArray(permissions) ? permissions : []).find(
      (p) => String(p.employeeId?._id || p.employeeId) === String(selectedEmployeeId)
    );
    return row?.employeeId && typeof row.employeeId === "object" ? row.employeeId : null;
  }, [employeeList, permissions, selectedEmployeeId]);

  // Recent history for selected employee (only populated when an employee is selected)
  const employeeHistory = useMemo(() => {
    if (!selectedEmployeeId) return [];
    const list = Array.isArray(permissions) ? permissions : [];
    return list.filter((p) => {
      const pEmpId = p.employeeId?._id || p.employeeId;
      return String(pEmpId) === String(selectedEmployeeId);
    }).slice(0, 5);
  }, [permissions, selectedEmployeeId]);

  // Donut chart calculations
  const monthlyAllowance = Number(balanceData?.monthlyAllowanceHours ?? 4);
  const usedHours = Number(balanceData?.usedHours ?? 0);
  const remainingHours = Number(balanceData?.remainingHours ?? Math.max(0, monthlyAllowance - usedHours));
  const usedPercent = monthlyAllowance > 0 ? Math.min(100, Math.round((usedHours / monthlyAllowance) * 100)) : 0;
  const remainingPercent = 100 - usedPercent;

  // SVG Circular stroke values
  const strokeDash = 283; // 2 * PI * 45
  const strokeOffset = strokeDash - (strokeDash * remainingPercent) / 100;

  // Derived KPI metrics for Dashboard-Style KPI cards
  const totalPermissionsCount = filteredPermissions.length;
  const totalPermissionHours = useMemo(() => {
    return filteredPermissions.reduce((acc, curr) => acc + (Number(curr.durationHours) || 0), 0);
  }, [filteredPermissions]);
  const approvedPermissionsCount = useMemo(() => {
    return filteredPermissions.filter(
      (p) => String(p.status).toUpperCase() === "APPROVED" || !p.status || p.status === "ALLOWED"
    ).length;
  }, [filteredPermissions]);
  const uniqueEmployeesWithPermissions = useMemo(() => {
    const s = new Set();
    filteredPermissions.forEach((p) => {
      const id = p.employeeId?._id || p.employeeId;
      if (id) s.add(String(id));
    });
    return s.size;
  }, [filteredPermissions]);

  return (
    <div className="attendance-page-container">
      {/* ─── Header Row ──────────────────────────────────────────────── */}
      <div className="attendance-header-row">
        <div className="attendance-title-area">
          <h1>Attendance Permissions</h1>
        </div>
      </div>

      {/* ─── Filters Bar (No Duplicate Branch Dropdown) ────────────────── */}
      <div className="attendance-filter-bar">
        {/* Month / Year Filter */}
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

        {/* Search Input */}
        <div className="attendance-search-box" style={{ flex: "none", width: "260px", minWidth: 0 }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search employee or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Branch Search: Uneditable locked badge for Branch Manager, search box for Super Admin */}
        {isBranchLocked ? (
          <div className="attendance-branch-locked-badge" title="Assigned Branch (Fixed)">
            <Building2 size={14} />
            <span>{activeBranch?.name || assignedBranchName || "My Branch"}</span>
            <span className="attendance-branch-tag">Assigned</span>
          </div>
        ) : (
          <div style={{ width: "230px" }}>
            <SearchableBranchSelect
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              branches={branches}
            />
          </div>
        )}

        <button
          type="button"
          className="btn-printz-primary"
          style={{ marginLeft: "auto" }}
          onClick={() => {
            setEditingPermission(null);
            setIsRecordModalOpen(true);
          }}
        >
          <Plus size={16} />
          <span>Record Permission</span>
        </button>
      </div>

      {/* ─── Dashboard UI KPI Cards ─────────────────────────────────── */}
      <div className="printz-kpi-grid">
        {/* Total Permissions */}
        <div className="printz-kpi-card">
          <div className="printz-kpi-top">
            <div className="printz-summary-icon purple">
              <Clock size={20} strokeWidth={2.3} color="#ffffff" />
            </div>
            <div className="printz-kpi-values">
              <div className="printz-kpi-number">{totalPermissionsCount}</div>
              <div className="printz-kpi-label">Total Permissions</div>
            </div>
          </div>
        </div>

        {/* Total Permission Hours */}
        <div className="printz-kpi-card">
          <div className="printz-kpi-top">
            <div className="printz-summary-icon blue">
              <FileText size={20} strokeWidth={2.3} color="#ffffff" />
            </div>
            <div className="printz-kpi-values">
              <div className="printz-kpi-number">{totalPermissionHours}h</div>
              <div className="printz-kpi-label">Logged Hours</div>
            </div>
          </div>
        </div>

        {/* Approved Records */}
        <div className="printz-kpi-card">
          <div className="printz-kpi-top">
            <div className="printz-summary-icon green">
              <CheckCircle2 size={20} strokeWidth={2.4} color="#ffffff" />
            </div>
            <div className="printz-kpi-values">
              <div className="printz-kpi-number">{approvedPermissionsCount}</div>
              <div className="printz-kpi-label">Approved Permissions</div>
            </div>
          </div>
        </div>

        {/* Unique Employees */}
        <div className="printz-kpi-card">
          <div className="printz-kpi-top">
            <div className="printz-summary-icon teal">
              <Users size={20} strokeWidth={2.3} color="#ffffff" />
            </div>
            <div className="printz-kpi-values">
              <div className="printz-kpi-number">{uniqueEmployeesWithPermissions}</div>
              <div className="printz-kpi-label">Staff on Permission</div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "10px 18px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {/* ─── Permissions List Table ──────────────────────────────────── */}
      <div className="attendance-table-card">
        <table className="attendance-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>#</th>
              <th>Employee</th>
              <th>Date</th>
              <th>Time</th>
              <th>Duration</th>
              <th>Reason</th>
              <th>Allowance</th>
              <th>Status</th>
              <th style={{ width: "100px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "36px", color: "#475569" }}>
                  Loading permission records...
                </td>
              </tr>
            ) : paginatedPermissions.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "36px", color: "#475569" }}>
                  {selectedEmployeeId
                    ? "No permission records found for this employee in the selected month."
                    : "No permission records found for the selected filters and month."}
                </td>
              </tr>
            ) : (
              paginatedPermissions.map((item, idx) => {
                const emp = item.employeeId || {};
                const allowanceText =
                  item.monthlyAllowanceHours !== undefined
                    ? `${item.usedHours || 0}h / ${item.monthlyAllowanceHours}h`
                    : "-";
                const rowNum = (currentPage - 1) * pageSize + idx + 1;

                return (
                  <tr
                    key={item._id}
                    style={{
                      cursor: "pointer",
                      backgroundColor:
                        selectedEmployeeId &&
                        String(emp._id || item.employeeId) === String(selectedEmployeeId)
                          ? "#f0fdf4"
                          : undefined,
                    }}
                    title="Click to view this employee's balance and history"
                    onClick={() => {
                      const id = String(emp._id || item.employeeId || "");
                      handleEmployeeChange(id === String(selectedEmployeeId) ? "" : id);
                    }}
                  >
                    <td>{rowNum}</td>
                    <td>
                      <div className="attendance-employee-cell">
                        <div
                          className="attendance-avatar-circle"
                          style={{ backgroundColor: getAvatarColor(emp.name) }}
                        >
                          {(emp.name || "E").charAt(0).toUpperCase()}
                        </div>
                        <div className="attendance-emp-info">
                          <span className="attendance-emp-code">{emp.employeeCode || "EMP"}</span>
                          <span className="attendance-emp-name">{emp.name || "Unknown"}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.permissionDate}</td>
                    <td>
                      {item.startTime} - {item.endTime}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: "#059669" }}>
                        {item.durationHours}h
                      </span>
                    </td>
                    <td style={{ maxWidth: "220px", color: "#475569" }}>
                      <span title={item.reason} style={{ display: "inline-block", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.reason}
                      </span>
                    </td>
                    <td style={{ fontSize: "12px", color: "#475569", fontWeight: 500 }}>
                      {allowanceText}
                    </td>
                    <td>
                      <span className="status-badge permission-allowed">
                        Allowed
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                        <button
                          type="button"
                          className="icon-btn edit"
                          title="Edit Permission"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPermission(item);
                            setIsRecordModalOpen(true);
                          }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn delete"
                          title="Delete / Cancel Permission"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePermission(item._id);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
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
          totalItems={filteredPermissions.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
          itemName="permissions"
        />
      </div>

      {/* ─── Bottom Section: 2 Side-by-Side Cards (Image 3) ──────────── */}
      <div className="permissions-bottom-grid">
        {/* Card 1: Monthly Permission Balance */}
        <div className="balance-card">
          <div className="card-heading-row">
            <h3>Monthly Permission Balance</h3>
          </div>

          {!selectedEmployeeId ? (
            <div className="permissions-empty-selection">
              <div className="permissions-empty-selection-icon">
                <Clock size={20} />
              </div>
              <p>Click an employee row above to view permission balance and history</p>
            </div>
          ) : (
            <div className="balance-body">
              {/* SVG Circular Donut Chart */}
              <div className="donut-chart-container">
                <svg width="140" height="140" viewBox="0 0 100 100">
                  {/* Background track circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                  />
                  {/* Foreground remaining progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="8"
                    strokeDasharray="283"
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
                <div className="donut-inner-text">
                  <div className="donut-inner-hours">{remainingHours}h</div>
                  <div className="donut-inner-sub">Remaining</div>
                </div>
              </div>

              {/* Legend */}
              <div className="balance-legend">
                <div className="legend-item">
                  <div className="legend-left">
                    <span className="legend-dot" style={{ backgroundColor: "#0f172a" }}></span>
                    <span>Monthly Limit</span>
                  </div>
                  <span className="legend-val">{monthlyAllowance}h</span>
                </div>

                <div className="legend-item">
                  <div className="legend-left">
                    <span className="legend-dot" style={{ backgroundColor: "#cbd5e1" }}></span>
                    <span>Used</span>
                  </div>
                  <span className="legend-val">{usedHours}h</span>
                </div>

                <div className="legend-item">
                  <div className="legend-left">
                    <span className="legend-dot" style={{ backgroundColor: "#059669" }}></span>
                    <span>Remaining</span>
                  </div>
                  <span className="legend-val" style={{ color: "#059669" }}>
                    {remainingHours}h
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Employee Permission History */}
        <div className="history-card">
          <div className="card-heading-row">
            <h3>Employee Permission History</h3>
            {selectedEmployeeId && (
              <span className="history-badge-count">{employeeHistory.length} entries</span>
            )}
          </div>

          {!selectedEmployeeId ? (
            <div className="permissions-empty-selection">
              <div className="permissions-empty-selection-icon">
                <User size={20} />
              </div>
              <p>Click an employee row above to view permission balance and history</p>
            </div>
          ) : (
            <>
              {activeEmp?.name && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <div
                    className="attendance-avatar-circle"
                    style={{ width: "24px", height: "24px", fontSize: "11px", backgroundColor: getAvatarColor(activeEmp.name) }}
                  >
                    {(activeEmp.name || "E").charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                    {activeEmp.name} ({activeEmp.employeeCode || "EMP"})
                  </span>
                </div>
              )}

              <div style={{ overflowX: "auto" }}>
                <table className="attendance-table" style={{ fontSize: "12.5px" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "8px 10px" }}>Date</th>
                      <th style={{ padding: "8px 10px" }}>Time</th>
                      <th style={{ padding: "8px 10px" }}>Duration</th>
                      <th style={{ padding: "8px 10px" }}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "20px", color: "#475569" }}>
                          No permission history for this employee in {selectedMonth}/{selectedYear}.
                        </td>
                      </tr>
                    ) : (
                      employeeHistory.map((h) => (
                        <tr key={h._id}>
                          <td style={{ padding: "8px 10px", fontWeight: 600 }}>{h.permissionDate}</td>
                          <td style={{ padding: "8px 10px" }}>{h.startTime} - {h.endTime}</td>
                          <td style={{ padding: "8px 10px", fontWeight: 600, color: "#059669" }}>{h.durationHours}h</td>
                          <td style={{ padding: "8px 10px", color: "#475569" }}>{h.reason}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Record Permission Modal ─────────────────────────────────── */}
      <RecordPermissionModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSave={() => {
          loadPermissions();
          if (selectedEmployeeId) {
            loadEmployeeBalance(selectedEmployeeId);
          }
        }}
        employees={employeeList}
        branches={branches}
        selectedBranchId={selectedBranchId}
        editingPermission={editingPermission}
      />
    </div>
  );
}
