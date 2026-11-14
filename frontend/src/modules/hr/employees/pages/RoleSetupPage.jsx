import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import employeesApi from "../api/employeesApi";
import PermissionMatrix from "../components/PermissionMatrix";
import AccessControlNav from "../components/AccessControlNav";
import { allLeafKeys, expandKeys, labelMap, availableActionsMap, sameActions } from "../components/capabilityUtils";
import BranchSelect from "../../../../shared/ui/selects/BranchSelect";
import SelectField from "../../../../shared/ui/selects/SelectField";
import "../styles/employees.css";

/**
 * Role Setup: pick an employee and choose their role. The pages of that role are shown ticked and locked.
 * If the person needs more than their role gives, tick the extra pages and give a reason (saved on the employee).
 * A role that does not sign in has no pages; an admin can still allow one person a login, with a reason.
 * A login is created here too: the password typed is the one the person uses.
 */

const errorMessage = (e, fallback) => e?.response?.data?.message || e?.message || fallback;
const idOf = (ref) => (ref && typeof ref === "object" ? ref._id || ref.id || "" : ref || "");

export default function RoleSetupPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");

  const [selectedId, setSelectedId] = useState("");
  const [roleId, setRoleId] = useState(""); // the role chosen for the selected employee
  const [pages, setPages] = useState([]); // role pages plus any extras
  const [actions, setActions] = useState({}); // what this person can do on each page ({ key: ["view", "edit", ...] })
  const [dirty, setDirty] = useState(false);
  const [extraReason, setExtraReason] = useState(""); // why this person has pages beyond the role's
  // A person on a no-login role can still be given a login, with a reason on record
  const [exception, setException] = useState("");
  const [askingReason, setAskingReason] = useState(false);
  const [reasonText, setReasonText] = useState("");
  // Login: the password typed here is the real one (no temporary password, no forced change)
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, roleOptions, groups, branchList] = await Promise.all([
        employeesApi.listAll({ status: "ACTIVE" }),
        employeesApi.getRoleOptions(),
        employeesApi.getEmployeePageCatalog(),
        employeesApi.getBranches(),
      ]);
      setBranches(branchList);
      setEmployees(list);
      setRoles(roleOptions);
      setCatalog(groups);
    } catch (e) {
      toast.error(errorMessage(e, "Could not load employees."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allKeys = useMemo(() => allLeafKeys(catalog), [catalog]);
  const labelOf = useMemo(() => labelMap(catalog), [catalog]);
  const selected = useMemo(() => employees.find((e) => e._id === selectedId) || null, [employees, selectedId]);
  const roleById = useCallback((id) => roles.find((r) => String(r._id) === String(id)) || null, [roles]);

  // Pages the role itself gives (empty for a role that does not sign in, or one with no page list yet)
  const pagesOfRole = useCallback((r) => (r && Array.isArray(r.pageAccess) ? expandKeys(r.pageAccess, catalog) : []), [catalog]);

  // Show one employee: their role's pages, plus whatever extras are saved for them
  const showEmployee = (employee) => {
    const rid = String(idOf(employee.roleId) || "");
    const r = roleById(rid);
    const own = Array.isArray(employee.pageAccess) ? expandKeys(employee.pageAccess, catalog) : [];
    setRoleId(rid);
    setPages([...new Set([...pagesOfRole(r), ...own])]);
    // Their own actions when they have their own list, otherwise the role's
    setActions(Array.isArray(employee.pageAccess) ? { ...(employee.pageActions || {}) } : { ...((r && r.pageActions) || {}) });
    setExtraReason(employee.extraPages?.reason || "");
    setException(employee.loginException?.reason || "");
    setAskingReason(false);
    setReasonText("");
    setPassword("");
    setShowPassword(false);
    setDirty(false);
  };

  const pick = (employee) => {
    if (dirty && !window.confirm("You have unsaved changes for this employee. Switch anyway?")) return;
    setSelectedId(employee._id);
    showEmployee(employee);
  };

  // Employees shown in the dropdown: those of the chosen branch
  const filtered = useMemo(
    () => employees.filter((e) => !branchId || String(idOf(e.branchId)) === String(branchId)),
    [employees, branchId]
  );

  const clearSelection = () => {
    setSelectedId("");
    setRoleId("");
    setPages([]);
    setExtraReason("");
    setException("");
    setAskingReason(false);
    setReasonText("");
    setPassword("");
    setDirty(false);
  };

  // Changing the branch hides employees; drop the selection if it is no longer in the list
  const guardSelection = (nextList) => {
    if (selectedId && !nextList.some((e) => e._id === selectedId)) {
      if (dirty && !window.confirm("You have unsaved changes for this employee. Switch anyway?")) return false;
      clearSelection();
    }
    return true;
  };
  const onBranchChange = (value) => {
    const next = employees.filter((e) => !value || String(idOf(e.branchId)) === String(value));
    if (!guardSelection(next)) return;
    setBranchId(value);
  };

  const role = roleById(roleId);
  const roleNoLogin = Boolean(role && role.requiresLogin === false);
  const roleHasList = Boolean(role && Array.isArray(role.pageAccess)) && !roleNoLogin;
  const legacyRole = Boolean(role) && !roleNoLogin && !roleHasList; // signs in, but has no page list yet
  const rolePages = roleHasList ? expandKeys(role.pageAccess, catalog) : [];
  const extras = pages.filter((k) => !rolePages.includes(k));

  const onRoleChange = (value) => {
    setRoleId(value);
    const next = roleById(value);
    // The new role's pages replace the old ones; extras and exceptions start again
    setPages(pagesOfRole(next && next.requiresLogin !== false ? next : null));
    setActions({ ...((next && next.pageActions) || {}) });
    setExtraReason("");
    setException("");
    setAskingReason(false);
    setReasonText("");
    setDirty(true);
  };

  // The matrix changes pages and actions together; a role's own pages stay open
  const changeMatrix = (nextPages, nextActions) => {
    setPages([...new Set([...rolePages, ...nextPages])]);
    setActions(nextActions);
    setDirty(true);
  };
  const addAll = () => {
    setPages(allKeys);
    setDirty(true);
  };
  const removeExtras = () => {
    setPages(rolePages);
    setActions({ ...((role && role.pageActions) || {}) });
    setExtraReason("");
    setDirty(true);
  };

  // "Allow login" for a person on a no-login role: the reason is required and is kept on the employee
  const confirmException = () => {
    const why = reasonText.trim();
    if (why.length < 5) return toast.error("Enter a reason of at least 5 characters.");
    setException(why);
    setAskingReason(false);
    setPages([]);
    setDirty(true);
  };
  const removeException = () => {
    setException("");
    setPages([]);
    setReasonText("");
    setDirty(true);
  };

  // Undo unsaved changes: back to what is saved for this employee
  const reset = () => showEmployee(selected);

  const save = async () => {
    if (!roleId) return toast.error("Choose a role for this employee.");

    let body;
    if (roleNoLogin) {
      if (exception && pages.length === 0) return toast.error("Tick at least one page for this person, or remove the exception.");
      body = { pageAccess: exception ? pages : null, ...(exception ? { pageActions: actions } : {}), loginException: exception ? { reason: exception } : null, extraPages: null };
    } else if (roleHasList || legacyRole) {
      if (extras.length > 0 && extraReason.trim().length < 5) return toast.error("Enter a reason for the extra pages.");
      // Different actions from the role's count as the person's own setting, like extra pages do
      const actionsDiffer = !sameActions(pages, actions, (role && role.pageActions) || {}, availableActionsMap(catalog));
      body =
        extras.length > 0
          ? { pageAccess: pages, pageActions: actions, extraPages: { reason: extraReason.trim() }, loginException: null }
          : actionsDiffer
            ? { pageAccess: pages, pageActions: actions, extraPages: null, loginException: null }
            : { pageAccess: null, extraPages: null, loginException: null }; // follows the role
    } else {
      body = { pageAccess: null, extraPages: null, loginException: null };
    }
    if (roleId !== String(idOf(selected.roleId) || "")) body.roleId = roleId;

    setSaving(true);
    try {
      await employeesApi.update(selected._id, body);
      toast.success("Role and pages saved.");
      setDirty(false);
      const fresh = await employeesApi.listAll({ status: "ACTIVE" });
      setEmployees(fresh);
    } catch (e) {
      toast.error(errorMessage(e, "Could not save the pages."));
    } finally {
      setSaving(false);
    }
  };

  // A login can be made once the role and pages are SAVED, so use what is saved for this employee
  const savedRole = selected ? roleById(idOf(selected.roleId)) : null;
  const savedCanSignIn = selected
    ? Boolean(idOf(selected.roleId)) && (Array.isArray(selected.pageAccess) ? selected.pageAccess.length > 0 : Boolean(savedRole?.requiresLogin))
    : false;

  const refreshEmployees = async () => setEmployees(await employeesApi.listAll({ status: "ACTIVE" }));

  const createLogin = async () => {
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    setLoginBusy(true);
    try {
      await employeesApi.createLogin({ employeeId: selected._id, email: selected.email, password });
      toast.success(`Login created. ${selected.name} signs in with ${selected.email} and this password.`);
      setPassword("");
      setShowPassword(false);
      await refreshEmployees();
    } catch (err) {
      toast.error(errorMessage(err, "Could not create the login."));
    } finally {
      setLoginBusy(false);
    }
  };

  const resetPassword = async () => {
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    setLoginBusy(true);
    try {
      await employeesApi.resetPassword(selected._id, password);
      toast.success(`Password updated for ${selected.name}.`);
      setPassword("");
      setShowPassword(false);
    } catch (err) {
      toast.error(errorMessage(err, "Could not update the password."));
    } finally {
      setLoginBusy(false);
    }
  };

  const canSignIn = Boolean(roleId) && (roleNoLogin ? Boolean(exception) && pages.length > 0 : roleHasList ? pages.length > 0 : Boolean(role?.requiresLogin));
  const showGrid = roleHasList || legacyRole || (roleNoLogin && Boolean(exception));

  const optionNote = (e) => (e.extraPages?.reason ? " - extra pages" : e.loginException?.reason ? " - login exception" : "");

  return (
    <div className="emp-page">
      <div className="emp-header">
        <div>
          <h1>Role Setup</h1>
        </div>
        <div className="emp-header-actions">
          <AccessControlNav />
        </div>
      </div>

      <div className="emp-card" style={{ marginBottom: 16 }}>
        <div className="emp-filters" style={{ borderBottom: 0 }}>
          <BranchSelect
            valueKey="id"
            allowAll
            allOptionLabel="All branches"
            allOptionValue=""
            branches={branches}
            value={branchId}
            onChange={(e) => onBranchChange(e.target.value)}
            style={{ minWidth: "200px" }}
            triggerStyle={{ height: "40px" }}
          />
          <div className="emp-employee-pick">
            <SelectField
              value={selectedId}
              disabled={loading}
              placeholder={loading ? "Loading employees..." : filtered.length === 0 ? "No employees found" : "Select employee"}
              options={[
                { value: "", label: loading ? "Loading employees..." : filtered.length === 0 ? "No employees found" : "Select employee" },
                ...(selected && !filtered.some((x) => x._id === selected._id) ? [selected, ...filtered] : filtered).map((e) => ({
                  value: e._id,
                  label: `${e.name} (${roleById(idOf(e.roleId))?.name || "No role"})${optionNote(e)}`,
                })),
              ]}
              onChange={(e) => {
                const next = employees.find((x) => x._id === e.target.value);
                if (next) pick(next);
                else if (!dirty || window.confirm("You have unsaved changes for this employee. Switch anyway?")) clearSelection();
              }}
            />
          </div>
        </div>
      </div>

      <div className="emp-card emp-setup-main">
        {!selected ? (
          <div className="emp-setup-empty">Choose an employee above to set their role and pages.</div>
        ) : (
          <>
            <div className="emp-setup-person">
              <div>
                <h2>{selected.name}</h2>
                <span className="emp-hint">
                  {selected.employeeCode} · {selected.hasLogin ? "Has a login" : "No login yet"}
                </span>
              </div>
              <span className={`emp-badge ${canSignIn ? "emp-badge-active" : "emp-badge-inactive"}`}>
                {canSignIn ? "Can sign in" : "No login"}
              </span>
            </div>

            <div className="emp-role-fields" style={{ marginTop: 12 }}>
              <div className="emp-field">
                <label className="emp-label emp-required">Role</label>
                <SelectField
                  searchable={false}
                  value={roleId}
                  placeholder="Select role"
                  onChange={(ev) => onRoleChange(ev.target.value)}
                  options={[{ value: "", label: "Select role" }, ...roles.map((r) => ({ value: r._id, label: `${r.name}${r.requiresLogin === false ? " (no login)" : ""}` }))]}
                />
              </div>
            </div>

            {!roleId && <p className="emp-hint emp-hint-warn">Choose a role. Its pages are shown here.</p>}

            {roleNoLogin && (
              <div className="emp-login-note">
                {exception ? (
                  <>
                    <span><strong>Login allowed for this person.</strong> Reason: {exception}</span>
                    <button type="button" className="emp-btn" onClick={removeException}>Remove</button>
                  </>
                ) : askingReason ? (
                  <>
                    <strong>Reason for allowing a login</strong>
                    <textarea
                      className="emp-input"
                      rows={2}
                      style={{ height: "auto", marginTop: 6 }}
                      placeholder="Reason (at least 5 characters). It is saved on the employee."
                      value={reasonText}
                      onChange={(ev) => setReasonText(ev.target.value)}
                      autoFocus
                    />
                    <div className="emp-login-note-actions">
                      <button type="button" className="emp-btn emp-btn-primary" onClick={confirmException}>Continue</button>
                      <button type="button" className="emp-btn" onClick={() => { setAskingReason(false); setReasonText(""); }}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <strong>{role.name} is a no-login role.</strong>
                    <button type="button" className="emp-btn" onClick={() => setAskingReason(true)}>
                      Allow login
                    </button>
                  </>
                )}
              </div>
            )}

            {legacyRole && (
              <div className="emp-login-note">
                <strong>{role.name} has no page list.</strong>
                <span>Pages ticked below are for this person only.</span>
              </div>
            )}

            {showGrid && (
              <>
                <div className="emp-cap-head">
                  <h2>Capabilities</h2>
                  <div>
                    <button type="button" className="emp-link" onClick={addAll}>Select all</button>
                    {extras.length > 0 && (
                      <>
                        <span> · </span>
                        <button type="button" className="emp-link" onClick={removeExtras}>Remove extras</button>
                      </>
                    )}
                  </div>
                </div>
               

                <PermissionMatrix catalog={catalog} pages={pages} actions={actions} onChange={changeMatrix} lockedKeys={rolePages} />

                {(roleHasList || legacyRole) && extras.length > 0 && (
                  <div className="emp-login-note" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                    <strong>Reason for extra pages: {extras.map((k) => labelOf[k] || k).join(", ")}</strong>
                    <textarea
                      className="emp-input"
                      rows={2}
                      style={{ height: "auto", marginTop: 6 }}
                      placeholder="Reason (at least 5 characters). It is saved on the employee."
                      value={extraReason}
                      onChange={(ev) => {
                        setExtraReason(ev.target.value);
                        setDirty(true);
                      }}
                    />
                  </div>
                )}
              </>
            )}

            <div className="emp-role-actions">
              <button type="button" className="emp-btn" disabled={saving || !dirty} onClick={reset}>
                Reset
              </button>
              <button type="button" className="emp-btn emp-btn-primary" onClick={save} disabled={saving || !dirty}>
                {saving ? "Saving..." : "Save pages"}
              </button>
            </div>

            <div className="emp-login-section">
              <h2>Login</h2>
              {!selected.hasLogin && !savedCanSignIn && (
                <p className="emp-hint">
                  {dirty
                    ? "Save the role and pages first. A login can be created once they are saved."
                    : !idOf(selected.roleId)
                      ? "Choose a role and save first. A login can be created once the employee has a role."
                      : "This employee has no pages to sign in with, so a login cannot be created."}
                </p>
              )}
              {(selected.hasLogin || savedCanSignIn) && (
                <>
                  <p className="emp-hint">
                    {selected.hasLogin
                      ? `${selected.name} already has a login (${selected.email}). Type a new password to replace the current one.`
                      : `${selected.name} will sign in with ${selected.email}. The password you type here is the one they use; there is no temporary password.`}
                    {dirty ? " You have unsaved role or page changes; save them first." : ""}
                  </p>
                  <div className="emp-login-row">
                    <div className="emp-password-wrap">
                      <input
                        className="emp-input"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Password (at least 6 characters)"
                        value={password}
                        onChange={(ev) => setPassword(ev.target.value)}
                      />
                      <button
                        type="button"
                        className="emp-password-toggle"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="emp-btn emp-btn-primary"
                      disabled={loginBusy || dirty || password.length < 6}
                      onClick={selected.hasLogin ? resetPassword : createLogin}
                    >
                      {loginBusy ? "Saving..." : selected.hasLogin ? "Update password" : "Create login"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
