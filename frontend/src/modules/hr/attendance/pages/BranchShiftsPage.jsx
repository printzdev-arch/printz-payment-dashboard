import React, { useState, useEffect, useCallback } from "react";
import { Search, Plus, Eye, Ban, CalendarX, ArrowRight } from "lucide-react";
import attendanceApi from "../api/attendanceApi";
import branchShiftApi from "../api/branchShiftApi";
import SearchableBranchSelect from "../components/SearchableBranchSelect";
import AttendancePagination from "../components/AttendancePagination";
import {
  BranchShiftCreateModal,
  BranchShiftViewModal,
  BranchShiftActionModal,
} from "../components/employeeShift";
import {
  getAvatarColor,
  formatShiftDate,
  shiftDayCount,
  getShiftStatus,
} from "../components/employeeShift/shiftUtils";
import "../styles/attendance.css";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function BranchShiftsPage() {
  const [branches, setBranches] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters + pagination (all applied on the server)
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewShift, setViewShift] = useState(null);
  const [actionState, setActionState] = useState(null); // { shift, type }

  useEffect(() => {
    attendanceApi.getBranches().then(setBranches);
  }, []);

  // Debounce the search box so we do not query on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadShifts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await branchShiftApi.getShifts({
        page,
        limit: pageSize,
        status: statusFilter || undefined,
        branchId: branchFilter || undefined,
        search: search || undefined,
      });
      const body = res?.data || res || {};
      setShifts(body.items || []);
      setTotal(body.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load branch shifts.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, branchFilter, search]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  return (
    <div className="attendance-page-container">
      {/* ─── Header Row ──────────────────────────────────────────────── */}
      <div className="attendance-header-row">
        <div className="attendance-title-area">
          <h1>Branch Shifts</h1>
          
        </div>
        <div className="attendance-header-actions">
          <button type="button" className="btn-printz-primary" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} strokeWidth={2.5} />
            Create Branch Shift
          </button>
        </div>
      </div>

      {/* ─── Filters Bar ─────────────────────────────────────────────── */}
      <div className="attendance-filter-bar shift-filter-bar">
        <div className="attendance-search-box">
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by employee name or code..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <div className="attendance-filter-item">
          <select
            className="attendance-filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="attendance-filter-item">
          <SearchableBranchSelect
            value={branchFilter}
            onChange={(id) => {
              setBranchFilter(id);
              setPage(1);
            }}
            branches={branches}
            placeholder="Filter by branch..."
            style={{ width: "220px", minWidth: 0 }}
          />
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "10px 18px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {/* ─── Shifts Table ────────────────────────────────────────────── */}
      <div className="attendance-table-card">
        <table className="attendance-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>#</th>
              <th>Employee</th>
              <th>Shift Route</th>
              <th>Shift Period</th>
              <th>Reason</th>
              <th>Status</th>
              <th style={{ width: "200px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "#475569" }}>
                  Loading branch shifts...
                </td>
              </tr>
            ) : shifts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "#475569" }}>
                  No branch shifts found.
                </td>
              </tr>
            ) : (
              shifts.map((s, idx) => {
                const emp = s.employeeId || {};
                const status = getShiftStatus(s);
                const days = shiftDayCount(s.fromDate, s.toDate);
                return (
                  <tr key={s._id}>
                    <td>{(page - 1) * pageSize + idx + 1}</td>
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
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="shift-route-cell">
                        <span>{s.sourceBranchId?.name || "-"}</span>
                        <ArrowRight size={14} color="#94a3b8" />
                        <strong>{s.branchId?.name || "-"}</strong>
                      </div>
                    </td>
                    <td>
                      <div className="shift-period-cell">
                        <span>
                          {formatShiftDate(s.fromDate)} – {formatShiftDate(s.toDate)}
                        </span>
                        <span className="attendance-desig-sub">
                          {days} day{days === 1 ? "" : "s"}
                        </span>
                      </div>
                    </td>
                    <td className="shift-reason-cell" title={s.remarks || ""}>
                      {s.remarks || "-"}
                    </td>
                    <td>
                      <span className={`status-badge shift-${status.toLowerCase()}`}>{status}</span>
                    </td>
                    <td>
                      <div className="action-icon-group">
                        <button type="button" className="action-btn-view" onClick={() => setViewShift(s)}>
                          <Eye size={13} strokeWidth={2.4} />
                          <span>View</span>
                        </button>
                        {status === "SCHEDULED" && (
                          <button
                            type="button"
                            className="action-btn-danger"
                            onClick={() => setActionState({ shift: s, type: "cancel" })}
                          >
                            <Ban size={13} strokeWidth={2.4} />
                            <span>Cancel</span>
                          </button>
                        )}
                        {status === "ACTIVE" && (
                          <button
                            type="button"
                            className="action-btn-warn"
                            onClick={() => setActionState({ shift: s, type: "end" })}
                          >
                            <CalendarX size={13} strokeWidth={2.4} />
                            <span>End Early</span>
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

        <AttendancePagination
          currentPage={page}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
          itemName="shifts"
        />
      </div>

      {/* ─── Modals ─────────────────────────────────────────────────── */}
      <BranchShiftCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setPage(1);
          loadShifts();
        }}
        branches={branches}
      />

      <BranchShiftViewModal isOpen={Boolean(viewShift)} onClose={() => setViewShift(null)} shift={viewShift} />

      <BranchShiftActionModal
        isOpen={Boolean(actionState)}
        onClose={() => setActionState(null)}
        onSuccess={loadShifts}
        shift={actionState?.shift}
        type={actionState?.type}
      />
    </div>
  );
}
