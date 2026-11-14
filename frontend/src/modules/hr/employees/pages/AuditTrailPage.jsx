import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Search } from "lucide-react";
import { toast } from "react-toastify";
import DataTable from "../../../../shared/ui/DataTable/DataTable";
import StyledSelect from "../../../../shared/ui/selects/StyledSelect";
import { DateField } from "../../../../shared/ui/selects/CalendarSelect";
import employeesApi from "../api/employeesApi";
import AccessControlNav from "../components/AccessControlNav";
import "../styles/employees.css";

/**
 * Audit trail: who changed which role's or person's pages and actions, and when.
 * Entries are only added by the system; nothing here can be edited or removed.
 */
const ACTION_LABEL = { view: "View", create: "Create", edit: "Edit", delete: "Delete" };
const EVENT_LABEL = { CREATED: "Created", UPDATED: "Changed", DELETED: "Deleted" };

const when = (v) =>
  v ? new Date(v).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const list = (actions) => (actions.length === 0 ? "No access" : actions.map((a) => ACTION_LABEL[a] || a).join(", "));
const errorMessage = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

export default function AuditTrailPage() {
  const [filters, setFilters] = useState({ search: "", targetType: "", from: "", to: "" });
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState("");

  // Search waits a moment after typing so each key does not reload the list
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.search === searchInput.trim() ? f : { ...f, search: searchInput.trim() }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await employeesApi.getPermissionAudit({
        page,
        limit: pageSize,
        search: filters.search || undefined,
        targetType: filters.targetType || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      setRows(result.items);
      setTotal(result.total);
    } catch (e) {
      setRows([]);
      setTotal(0);
      toast.error(errorMessage(e, "Could not load the audit trail."));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const change = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setPage(1);
  };

  const columns = [
    {
      key: "createdAt",
      label: "When",
      render: (r) => (
        <button type="button" className="emp-audit-toggle" onClick={() => setOpenId(openId === r._id ? "" : r._id)} aria-expanded={openId === r._id}>
          {openId === r._id ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {when(r.createdAt)}
        </button>
      ),
    },
    { key: "actorName", label: "Changed by", render: (r) => r.actorName || "—" },
    {
      key: "targetName",
      label: "Who or what",
      render: (r) => (
        <>
          <div className="emp-cell-name">{r.targetName || "—"}</div>
          <div className="emp-cell-sub">{r.targetType === "ROLE" ? "Role" : "Employee"}</div>
        </>
      ),
    },
    { key: "event", label: "What happened", render: (r) => <span className={`emp-badge ${r.event === "DELETED" ? "emp-badge-inactive" : "emp-badge-active"}`}>{EVENT_LABEL[r.event] || r.event}</span> },
    {
      key: "summary",
      label: "Details",
      render: (r) => (
        <div className="emp-audit-detail">
          <div>{r.summary || "—"}</div>
          {openId === r._id && (
            <ul className="emp-audit-changes">
              {(r.changes || []).length === 0 && <li>No page or action changes were recorded.</li>}
              {(r.changes || []).map((c) => (
                <li key={c.page}>
                  <strong>{c.label}</strong>
                  <span className="emp-audit-from">{list(c.before)}</span>
                  <span aria-hidden="true">→</span>
                  <span className="emp-audit-to">{list(c.after)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="emp-page">
      <div className="emp-header">
        <div>
          <h1>Audit trail</h1>
        </div>
        <div className="emp-header-actions">
          <AccessControlNav />
        </div>
      </div>

      <div className="emp-card">
        <DataTable
          mobileCards
          searchable={false}
          loading={loading}
          data={rows}
          emptyMessage="No permission changes have been saved yet."
          serverPagination={{
            page,
            pageSize,
            total,
            onPageChange: (n) => setPage(Math.max(1, n)),
            onPageSizeChange: (n) => {
              setPageSize(n);
              setPage(1);
            },
          }}
          filterComponent={
            <div className="emp-filters emp-audit-filters" style={{ margin: 0 }}>
              <div className="emp-search">
                <Search size={16} />
                <input className="emp-input" placeholder="Search by person, role, page or who changed it" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
              </div>
              <StyledSelect searchable={false} style={{ width: "170px" }} value={filters.targetType} onChange={change("targetType")}>
                <option value="">Roles and employees</option>
                <option value="ROLE">Roles only</option>
                <option value="EMPLOYEE">Employees only</option>
              </StyledSelect>
              <DateField placeholder="From date" value={filters.from} max={filters.to || undefined} onChange={change("from")} style={{ width: "160px" }} />
              <DateField placeholder="To date" value={filters.to} min={filters.from || undefined} onChange={change("to")} style={{ width: "160px" }} />
              <button type="button" className="emp-btn emp-btn-icon" onClick={load} disabled={loading} title="Refresh" aria-label="Refresh">
                <RefreshCw size={15} />
              </button>
            </div>
          }
          columns={columns}
        />
      </div>
    </div>
  );
}
