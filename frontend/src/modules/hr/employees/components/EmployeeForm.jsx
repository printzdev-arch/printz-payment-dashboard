import React, { useState } from "react";

/**
 * Add / edit form for one employee. The same form serves both.
 * Role is a dropdown, so Admin, Manager, Designer and Operator are all created here.
 * A login is optional and only needs a password (email, role and branch come from the employee).
 */

const idOf = (ref) => (ref && typeof ref === "object" ? ref._id || ref.id || "" : ref || "");
const dateInput = (value) => (value ? String(value).slice(0, 10) : "");
const today = () => new Date().toISOString().slice(0, 10);

const buildInitial = (employee, lockedBranchId) => ({
  name: employee?.name || "",
  mobile: employee?.mobile || "",
  email: employee?.email || "",
  branchId: String(idOf(employee?.branchId) || lockedBranchId || ""),
  roleId: String(idOf(employee?.roleId) || ""),
  joiningDate: dateInput(employee?.joiningDate) || today(),
  dateOfBirth: dateInput(employee?.dateOfBirth),
  address: employee?.address || "",
  defaultSalary: employee?.defaultSalary ?? "",
});

export default function EmployeeForm({
  employee = null,
  branches = [],
  roles = [],
  lockedBranchId = "",
  canCreateLogin = false,
  startWithLogin = false,
  saving = false,
  onSubmit,
  onCancel,
}) {
  const isEdit = Boolean(employee);
  const [values, setValues] = useState(() => buildInitial(employee, lockedBranchId));
  const [createLogin, setCreateLogin] = useState(startWithLogin);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});

  // The chosen role decides whether a login is needed (operators do not sign in)
  const selectedRole = roles.find((r) => String(r._id || r.id) === values.roleId);
  // An employee that already has a login cannot be given a second one
  const loginAvailable = canCreateLogin && !employee?.hasLogin && Boolean(selectedRole?.requiresLogin);
  // A new employee on a login role must get a login; when editing it stays optional
  const loginRequired = loginAvailable && !isEdit;
  const loginOn = loginRequired || (loginAvailable && createLogin);

  const set = (key) => (e) => {
    const value = e.target.value;
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (values.name.trim().length < 2) next.name = "Enter the employee's name.";
    if (!/^\d{10}$/.test(values.mobile.trim())) next.mobile = "Mobile must be exactly 10 digits.";
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) next.email = "Enter a valid email.";
    if (!values.branchId) next.branchId = "Select a branch.";
    if (!isEdit && !values.roleId) next.roleId = "Select a role.";
    if (values.defaultSalary !== "" && (Number.isNaN(Number(values.defaultSalary)) || Number(values.defaultSalary) < 0)) {
      next.defaultSalary = "Salary must be a positive number.";
    }
    if (values.dateOfBirth && values.joiningDate && values.dateOfBirth > values.joiningDate) {
      next.dateOfBirth = "Date of birth cannot be after the joining date.";
    }
    if (loginOn && password.length < 6) {
      next.password = "Password must be at least 6 characters.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: values.name.trim().replace(/\s+/g, " "),
      mobile: values.mobile.trim(),
      email: values.email.trim().toLowerCase(),
      branchId: values.branchId,
      roleId: values.roleId || null,
      dateOfBirth: values.dateOfBirth || null,
      address: values.address.trim(),
      defaultSalary: values.defaultSalary === "" ? null : Number(values.defaultSalary),
    };
    // Joining date is set once, when the employee is created
    if (!isEdit) payload.joiningDate = values.joiningDate;

    onSubmit(payload, loginOn ? { password } : null);
  };

  const field = (key, label, input, { required = false, full = false, hint = "" } = {}) => (
    <div className={`emp-field${full ? " full" : ""}`}>
      <label className={`emp-label${required ? " emp-required" : ""}`}>{label}</label>
      {input}
      {errors[key] ? <span className="emp-error">{errors[key]}</span> : hint ? <span className="emp-hint">{hint}</span> : null}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate>
      <div className="emp-modal-body">
        <div className="emp-form-grid">
          {field("name", "Full name", <input className="emp-input" value={values.name} onChange={set("name")} autoFocus />, { required: true })}
          {field("mobile", "Mobile", <input className="emp-input" inputMode="numeric" maxLength={10} value={values.mobile} onChange={set("mobile")} />, { required: true })}
          {field("email", "Email", <input className="emp-input" type="email" value={values.email} onChange={set("email")} />, { required: true })}
          {field(
            "branchId",
            "Branch",
            <select className="emp-select" value={values.branchId} onChange={set("branchId")} disabled={Boolean(lockedBranchId)}>
              <option value="">Select branch</option>
              {branches.map((b) => (
                <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
              ))}
            </select>,
            { required: true }
          )}

          {field(
            "roleId",
            "Role",
            <select className="emp-select" value={values.roleId} onChange={set("roleId")} disabled={roles.length === 0}>
              <option value="">{roles.length === 0 ? "Roles unavailable" : "Select role"}</option>
              {/* An older employee may have a role that is not in the list; keep it visible */}
              {values.roleId && !selectedRole && <option value={values.roleId}>Current role</option>}
              {roles.map((r) => (
                <option key={r._id || r.id} value={r._id || r.id}>{r.name}</option>
              ))}
            </select>,
            { required: !isEdit }
          )}
          {field("defaultSalary", "Monthly salary", <input className="emp-input" type="number" min="0" step="0.01" value={values.defaultSalary} onChange={set("defaultSalary")} />)}
          {field("joiningDate", "Joining date", <input className="emp-input" type="date" value={values.joiningDate} onChange={set("joiningDate")} disabled={isEdit} />, { required: true })}
          {field("dateOfBirth", "Date of birth", <input className="emp-input" type="date" max={today()} value={values.dateOfBirth} onChange={set("dateOfBirth")} />)}
          {field("address", "Address", <input className="emp-input" value={values.address} onChange={set("address")} />, { full: true })}

          {loginAvailable && (
            <div className="emp-login full">
              <label className="emp-checkbox">
                <input
                  type="checkbox"
                  checked={loginOn}
                  disabled={loginRequired}
                  onChange={(e) => setCreateLogin(e.target.checked)}
                />
                {loginRequired ? "Login required for this role (they sign in with the email above)" : "Create a login (they sign in with the email above)"}
              </label>
              {loginOn && (
                <div className="emp-field">
                  <input
                    className="emp-input"
                    type="password"
                    placeholder="Password (min 6 characters)"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors((p) => ({ ...p, password: undefined }));
                    }}
                  />
                  {errors.password && <span className="emp-error">{errors.password}</span>}
                </div>
              )}
            </div>
          )}
          {isEdit && employee?.hasLogin && <span className="emp-hint emp-login full">This employee already has a login.</span>}
          {selectedRole && !selectedRole.requiresLogin && !employee?.hasLogin && (
            <span className="emp-hint emp-login full">{selectedRole.name} does not sign in, so no login is needed.</span>
          )}
        </div>
      </div>
      <div className="emp-modal-footer">
        <button type="button" className="emp-btn" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="emp-btn emp-btn-primary" disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Save changes" : "Add employee"}
        </button>
      </div>
    </form>
  );
}
