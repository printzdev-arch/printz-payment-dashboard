import React from "react";
import { Eye, Pencil, Power, KeyRound, Lock } from "lucide-react";

const STATUS_CLASS = { ACTIVE: "emp-badge-active", INACTIVE: "emp-badge-inactive", LEFT: "emp-badge-left" };
const STATUS_LABEL = { ACTIVE: "Active", INACTIVE: "Inactive", LEFT: "Left" };

// Populated references come back as { _id, name }; unpopulated ones are plain ids
const nameOf = (ref) => (ref && typeof ref === "object" ? ref.name || "" : "");

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

/**
 * Employee rows with edit / deactivate actions.
 * Actions are hidden for people without the matching permission.
 */
export default function EmployeeTable({
  employees = [],
  roles = [],
  loading = false,
  canEdit = false,
  canDeactivate = false,
  busyId = null,
  onView,
  onEdit,
  onDeactivate,
  onResetPassword,
}) {
  const showActions = canEdit || canDeactivate || Boolean(onView);
  // Show the name from the Employee Roles list (for example "Manager"), else the role record's own name
  const roleOf = (e) => {
    const id = String((e.roleId && e.roleId._id) || e.roleId || "");
    return roles.find((r) => String(r._id) === id);
  };
  const roleLabel = (e) => (roleOf(e) && roleOf(e).name) || nameOf(e.roleId) || "—";
  // The "create login" action needs a role and pages to sign in with (set in Role Setup)
  const canHaveLogin = (e) => {
    if (!roleOf(e) && !(e.roleId && (e.roleId._id || e.roleId))) return false;
    if (Array.isArray(e.pageAccess)) return e.pageAccess.length > 0;
    return roleOf(e) ? roleOf(e).requiresLogin : true;
  };
  const colCount = showActions ? 8 : 7;

  return (
    <div className="emp-table-wrap">
      <table className="emp-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Mobile</th>
            <th>Branch</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Status</th>
            {showActions && <th className="emp-th-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td className="emp-empty" colSpan={colCount}>Loading employees...</td></tr>
          ) : employees.length === 0 ? (
            <tr><td className="emp-empty" colSpan={colCount}>No employees found.</td></tr>
          ) : (
            employees.map((e) => {
              const active = e.isActive !== false && e.employmentStatus === "ACTIVE";
              return (
                <tr key={e._id} className={active ? "" : "is-inactive"}>
                  <td>{e.employeeCode}</td>
                  <td>
                    <div className="emp-cell-name">{e.name}</div>
                    <div className="emp-cell-sub">{e.email}</div>
                  </td>
                  <td>{e.mobile}</td>
                  <td>{nameOf(e.branchId) || "—"}</td>
                  <td>{roleLabel(e)}</td>
                  <td>{formatDate(e.joiningDate)}</td>
                  <td>
                    <span className={`emp-badge ${STATUS_CLASS[e.employmentStatus] || "emp-badge-inactive"}`}>
                      {STATUS_LABEL[e.employmentStatus] || e.employmentStatus}
                    </span>
                  </td>
                  {showActions && (
                    <td>
                      <div className="emp-actions">
                        {onView && (
                          <button
                            type="button"
                            className="emp-btn emp-btn-icon"
                            title="View details"
                            aria-label="View details"
                            onClick={() => onView(e)}
                          >
                            <Eye size={14} />
                          </button>
                        )}
                        {canEdit && !e.hasLogin && active && canHaveLogin(e) && (
                          <button
                            type="button"
                            className="emp-btn emp-btn-icon"
                            title="Create login"
                            aria-label="Create login"
                            onClick={() => onEdit(e, { focusLogin: true })}
                          >
                            <KeyRound size={14} />
                          </button>
                        )}
                        {canEdit && e.hasLogin && (
                          <button
                            type="button"
                            className="emp-btn emp-btn-icon"
                            title="Reset password"
                            aria-label="Reset password"
                            onClick={() => onResetPassword(e)}
                          >
                            <Lock size={14} />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            className="emp-btn emp-btn-icon"
                            title="Edit employee"
                            aria-label="Edit employee"
                            onClick={() => onEdit(e)}
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {canDeactivate && active && (
                          <button
                            type="button"
                            className="emp-btn emp-btn-icon emp-btn-danger"
                            title="Deactivate employee"
                            aria-label="Deactivate employee"
                            disabled={busyId === e._id}
                            onClick={() => onDeactivate(e)}
                          >
                            <Power size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
