import React, { useEffect, useMemo, useState } from "react";
import employeesApi from "../api/employeesApi";
import { allLeafKeys, expandKeys, namedPages } from "./capabilityUtils";
import { isAdminUser } from "../../../../shared/utils/deleteRequest";

/**
 * Read-only details of one employee: personal details, role and pages, and login.
 * Admins also get a shortcut to Role Setup, where role and pages are changed.
 */

const idOf = (ref) => (ref && typeof ref === "object" ? ref._id || ref.id || "" : ref || "");
const nameOf = (ref) => (ref && typeof ref === "object" ? ref.name || "" : "");
const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const STATUS_LABEL = { ACTIVE: "Active", INACTIVE: "Inactive", LEFT: "Left company" };

const Row = ({ label, children }) => (
  <div className="emp-detail-row">
    <span className="emp-detail-label">{label}</span>
    <span className="emp-detail-value">{children || "—"}</span>
  </div>
);

export default function EmployeeDetailsModal({ employee, roles = [], onClose, onOpenRoleSetup }) {
  const [catalog, setCatalog] = useState([]);

  useEffect(() => {
    let cancelled = false;
    employeesApi.getEmployeePageCatalog().then((c) => !cancelled && setCatalog(c));
    return () => {
      cancelled = true;
    };
  }, []);

  const role = roles.find((r) => String(r._id) === String(idOf(employee.roleId))) || null;
  const roleName = role?.name || nameOf(employee.roleId) || "";
  const ownPages = Array.isArray(employee.pageAccess);

  // The pages this employee gets: their own list, else their role's (no list on the role means no limit)
  const pageKeys = ownPages ? employee.pageAccess : Array.isArray(role?.pageAccess) ? role.pageAccess : null;
  const allKeys = useMemo(() => allLeafKeys(catalog), [catalog]);
  const shownKeys = pageKeys === null ? (role?.requiresLogin ? allKeys : []) : expandKeys(pageKeys, catalog);

  // Pages grouped by area, with sub-pages named after their menu (for example "Attendance › Reports")
  const groups = useMemo(() => {
    const byGroup = new Map();
    namedPages(catalog, shownKeys).forEach((p) => {
      if (!byGroup.has(p.group)) byGroup.set(p.group, []);
      byGroup.get(p.group).push({ key: p.key, label: p.label });
    });
    return [...byGroup.entries()].map(([group, items]) => ({ group, items }));
  }, [catalog, shownKeys]);

  const source = !roleName
    ? "No role yet"
    : ownPages
      ? "Pages saved for this employee"
      : pageKeys === null
        ? `Following the ${roleName} role (no page limit set)`
        : `Following the ${roleName} role`;

  return (
    <div className="emp-overlay" onClick={onClose}>
      <div className="emp-modal emp-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="emp-modal-header">
          <h2>{employee.name}</h2>
        </div>
        <div className="emp-modal-body">
          <h3 className="emp-detail-title">Details</h3>
          <div className="emp-detail-grid">
            <Row label="Employee code">{employee.employeeCode}</Row>
            <Row label="Status">{STATUS_LABEL[employee.employmentStatus] || employee.employmentStatus}</Row>
            <Row label="Mobile">{employee.mobile}</Row>
            <Row label="Email">{employee.email}</Row>
            <Row label="Branch">{nameOf(employee.branchId)}</Row>
            <Row label="Date of birth">{formatDate(employee.dateOfBirth)}</Row>
            <Row label="Joining date">{formatDate(employee.joiningDate)}</Row>
            <Row label="Leaving date">{employee.leavingDate ? formatDate(employee.leavingDate) : ""}</Row>
            <Row label="Address">{employee.address}</Row>
          </div>

          <h3 className="emp-detail-title">Role and access</h3>
          <div className="emp-detail-grid">
            <Row label="Role">{roleName}</Row>
            <Row label="Login">{employee.hasLogin ? "Has a login" : "No login yet"}</Row>
            {employee.extraPages?.reason && (
              <Row label="Extra pages, reason">
                {employee.extraPages.reason}
                {employee.extraPages.setByName ? ` (${employee.extraPages.setByName})` : ""}
              </Row>
            )}
            {employee.loginException?.reason && (
              <Row label="Login allowed as an exception">
                {employee.loginException.reason}
                {employee.loginException.setByName ? ` (${employee.loginException.setByName})` : ""}
              </Row>
            )}
          </div>
          <p className="emp-hint" style={{ margin: "8px 0" }}>{source}</p>

          {roleName && (
            groups.length === 0 ? (
              <p className="emp-hint emp-hint-warn">No pages assigned, so this employee cannot sign in.</p>
            ) : (
              <div className="emp-cap-grid">
                {groups.map((g) => (
                  <div key={g.group} className="emp-cap-group">
                    <div className="emp-cap-title" style={{ cursor: "default" }}>{g.group}</div>
                    {g.items.map((i) => (
                      <span key={i.key} className="emp-detail-chip">{i.label}</span>
                    ))}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        <div className="emp-modal-footer">
          <button type="button" className="emp-btn" onClick={onClose}>Close</button>
          {isAdminUser() && onOpenRoleSetup && (
            <button type="button" className="emp-btn emp-btn-primary" onClick={onOpenRoleSetup}>
              Change role and pages
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
