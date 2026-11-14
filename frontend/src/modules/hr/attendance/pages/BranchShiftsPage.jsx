import React, { useState, useEffect, useCallback } from "react";
import { Search, Plus, Eye, Ban, CalendarX, ArrowRight, AlertCircle } from "lucide-react";
import attendanceApi from "../api/attendanceApi";
import branchShiftApi from "../api/branchShiftApi";
import BranchSelect from "../../../../shared/ui/selects/BranchSelect";
import SelectField from "../../../../shared/ui/selects/SelectField";
import DataTable from "../../../../shared/ui/DataTable/DataTable";
import {
  BranchShiftCreateModal,
  BranchShiftViewModal,
  BranchShiftActionModal,
} from "../components/employeeShift";
import {
  formatShiftDate,
  shiftDayCount,
  getShiftStatus,
} from "../components/employeeShift/shiftUtils";
import "../styles/attendance.css";
import canDo from "../../../../shared/utils/permissions";

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
          {canDo("attendance-shifts", "create") && (
            <button type="button" className="btn-printz-primary" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} strokeWidth={2.5} />
              Create Branch Shift
            </button>
          )}
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
          <SelectField
            searchable={false}
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
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
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {error && (
        <div className="attendance-alert error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Shifts Table ────────────────────────────────────────────── */}
      <DataTable
        mobileCards
        searchable={false}
        loading={loading}
        data={shifts}
        emptyMessage="No branch shifts found."
        serverPagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: (size) => { setPageSize(size); setPage(1); } }}
        columns={[
          { key: "sno", label: "#", width: "40px", className: "printz-cell-hide-mobile", render: (s, idx) => idx + 1 },
          {
            key: "employee",
            label: "Employee",
            className: "printz-cell-lead",
            render: (s) => {
              const emp = s.employeeId || {};
              return (
                <div className="attendance-employee-cell">
                  <div className="attendance-emp-info">
                    <span className="attendance-emp-code">{emp.employeeCode}</span>
                    <span className="attendance-emp-name">{emp.name}</span>
                  </div>
                </div>
              );
            },
          },
          {
            key: "route",
            label: "Shift Route",
            render: (s) => (
              <div className="shift-route-cell">
                <span>{s.sourceBranchId?.name || "-"}</span>
                <ArrowRight size={14} color="#94a3b8" />
                <strong>{s.branchId?.name || "-"}</strong>
              </div>
            ),
          },
          {
            key: "period",
            label: "Shift Period",
            render: (s) => {
              const days = shiftDayCount(s.fromDate, s.toDate);
              return (
                <div className="shift-period-cell">
                  <span>
                    {formatShiftDate(s.fromDate)} – {formatShiftDate(s.toDate)}
                  </span>
                  <span className="attendance-desig-sub">
                    {days} day{days === 1 ? "" : "s"}
                  </span>
                </div>
              );
            },
          },
          {
            key: "remarks",
            label: "Reason",
            className: "shift-reason-cell",
            render: (s) => <span title={s.remarks || ""}>{s.remarks || "-"}</span>,
          },
          {
            key: "status",
            label: "Status",
            render: (s) => {
              const status = getShiftStatus(s);
              return <span className={`status-badge shift-${status.toLowerCase()}`}>{status}</span>;
            },
          },
          {
            key: "action",
            label: "Action",
            width: "200px",
            className: "printz-cell-actions",
            render: (s) => {
              const status = getShiftStatus(s);
              return (
                <div className="action-icon-group">
                  <button type="button" className="action-btn-view" onClick={() => setViewShift(s)}>
                    <Eye size={13} strokeWidth={2.4} />
                    <span>View</span>
                  </button>
                  {status === "SCHEDULED" && (
                    <button type="button" className="action-btn-danger" onClick={() => setActionState({ shift: s, type: "cancel" })}>
                      <Ban size={13} strokeWidth={2.4} />
                      <span>Cancel</span>
                    </button>
                  )}
                  {status === "ACTIVE" && (
                    <button type="button" className="action-btn-warn" onClick={() => setActionState({ shift: s, type: "end" })}>
                      <CalendarX size={13} strokeWidth={2.4} />
                      <span>End Early</span>
                    </button>
                  )}
                </div>
              );
            },
          },
        ]}
      />

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
