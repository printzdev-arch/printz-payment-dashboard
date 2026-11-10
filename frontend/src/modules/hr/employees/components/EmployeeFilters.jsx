import React from "react";
import { RefreshCw, Search } from "lucide-react";

/**
 * Search box and dropdown filters for the employee list.
 * `filters` is { search, branchId, roleId, status }.
 */
export default function EmployeeFilters({
  filters,
  onChange,
  branches = [],
  roles = [],
  lockedBranchId = "",
  loading = false,
  onRefresh,
}) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="emp-filters">
      <div className="emp-search">
        <Search size={16} />
        <input
          className="emp-input"
          placeholder="Search by name, code, email or mobile"
          value={filters.search}
          onChange={set("search")}
        />
      </div>

      {!lockedBranchId && (
        <select className="emp-select" value={filters.branchId} onChange={set("branchId")} aria-label="Branch">
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b._id || b.id} value={b._id || b.id}>
              {b.name}
            </option>
          ))}
        </select>
      )}


      {roles.length > 0 && (
        <select className="emp-select" value={filters.roleId} onChange={set("roleId")} aria-label="Role">
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r._id || r.id} value={r._id || r.id}>
              {r.name}
            </option>
          ))}
        </select>
      )}

      <select className="emp-select" value={filters.status} onChange={set("status")} aria-label="Status">
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
        <option value="LEFT">Left company</option>
        <option value="">All statuses</option>
      </select>

      <button type="button" className="emp-btn" onClick={onRefresh} disabled={loading}>
        <RefreshCw size={14} /> {loading ? "Loading..." : "Refresh"}
      </button>
    </div>
  );
}
