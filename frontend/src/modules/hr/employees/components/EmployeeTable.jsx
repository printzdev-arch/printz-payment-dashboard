import React from "react";
import { Eye, Pencil, Power, KeyRound, Lock } from "lucide-react";
import DataTable from "../../../../shared/ui/DataTable/DataTable";

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
  serverPagination,
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
  const isActive = (e) => e.isActive !== false && e.employmentStatus === "ACTIVE";

  const columns = [
    { key: "employeeCode", label: "Code", render: (e) => e.employeeCode },
    {
      key: "name",
      label: "Name",
      className: "printz-cell-lead",
      render: (e) => (
        <>
          <div className="emp-cell-name">{e.name}</div>
          <div className="emp-cell-sub">{e.email}</div>
        </>
      ),
    },
    { key: "mobile", label: "Mobile", render: (e) => e.mobile },
    { key: "branch", label: "Branch", render: (e) => nameOf(e.branchId) || "—" },
    { key: "role", label: "Role", render: (e) => roleLabel(e) },
    { key: "joiningDate", label: "Joined", render: (e) => formatDate(e.joiningDate) },
    {
      key: "employmentStatus",
      label: "Status",
      render: (e) => (
        <span className={`emp-badge ${STATUS_CLASS[e.employmentStatus] || "emp-badge-inactive"}`}>
          {STATUS_LABEL[e.employmentStatus] || e.employmentStatus}
        </span>
      ),
    },
  ];

  if (showActions) {
    columns.push({
      key: "actions",
      label: "Actions",
      align: "right",
      className: "printz-cell-actions",
      render: (e) => {
        const active = isActive(e);
        return (
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
        );
      },
    });
  }

  return (
    <DataTable
      searchable={false}
      mobileCards
      loading={loading}
      data={employees}
      columns={columns}
      emptyMessage="No employees found."
      rowClassName={(e) => (isActive(e) ? "" : "printz-row-muted")}
      serverPagination={serverPagination}
    />
  );
}
