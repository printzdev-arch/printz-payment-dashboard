import React from "react";
import { RefreshCw, Search } from "lucide-react";
import BranchSelect from "../../../../shared/ui/selects/BranchSelect";
import SelectField from "../../../../shared/ui/selects/SelectField";

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
        <BranchSelect
          valueKey="id"
          allowAll
          allOptionLabel="All branches"
          allOptionValue=""
          branches={branches}
          value={filters.branchId}
          onChange={set("branchId")}
          style={{ minWidth: "200px" }}
          triggerStyle={{ height: "40px" }}
        />
      )}


      {roles.length > 0 && (
        <SelectField
          searchable={false}
          value={filters.roleId}
          onChange={set("roleId")}
          options={[{ value: "", label: "All roles" }, ...roles.map((r) => ({ value: r._id || r.id, label: r.name }))]}
        />
      )}

      <SelectField
        searchable={false}
        value={filters.status}
        onChange={set("status")}
        options={[
          { value: "ACTIVE", label: "Active" },
          { value: "INACTIVE", label: "Inactive" },
          { value: "LEFT", label: "Left company" },
          { value: "", label: "All statuses" },
        ]}
      />

      <button type="button" className="emp-btn" onClick={onRefresh} disabled={loading}>
        <RefreshCw size={14} /> {loading ? "Loading..." : "Refresh"}
      </button>
    </div>
  );
}
