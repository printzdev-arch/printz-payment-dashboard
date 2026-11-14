import { passwordError } from "../../../../shared/utils/validation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ShieldCheck, UserCog } from "lucide-react";
import { toast } from "react-toastify";
import employeesApi from "../api/employeesApi";
import EmployeeFilters from "../components/EmployeeFilters";
import EmployeeTable from "../components/EmployeeTable";
import EmployeeForm from "../components/EmployeeForm";
import EmployeeDetailsModal from "../components/EmployeeDetailsModal";
import "../styles/employees.css";

/**
 * Employees: the one place people are added, edited and deactivated.
 * Admins, managers, designers and operators are all employees; the role is a field.
 * Attendance, salary and production link to the employee created here.
 *
 * Buttons are shown to everyone who can open the page. The server decides who may
 * actually create, edit or deactivate, and its message is shown when it refuses.
 */

const errorMessage = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

export default function EmployeesPage() {
  const lockedBranchId = employeesApi.getLockedBranchId();

  const [filters, setFilters] = useState({ search: "", branchId: lockedBranchId, roleId: "", status: "ACTIVE" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [viewing, setViewing] = useState(null); // employee whose details are open
  const navigate = useNavigate();
  // Role Management is for admins; the server also refuses anyone else
  const canManageRoles = lockedBranchId === "";

  // null = closed, { employee, startWithLogin } = open (employee null means add)
  const [formState, setFormState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(null); // employee being deactivated
  const [deactivateForm, setDeactivateForm] = useState({ reason: "", leftCompany: false });
  const [busyId, setBusyId] = useState(null);
  const [resetting, setResetting] = useState(null); // employee whose password is being reset
  const [newPassword, setNewPassword] = useState("");

  // Ignore responses from searches that were replaced by a newer one
  const requestId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      employeesApi.getBranches(),
      employeesApi.getRoleOptions(),
    ]).then(([b, r]) => {
      if (cancelled) return;
      setBranches(b);
      setRoles(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    try {
      const result = await employeesApi.list({
        page,
        limit: pageSize,
        search: filters.search.trim(),
        status: filters.status,
        roleId: filters.roleId,
        filterBranchId: filters.branchId,
      });
      if (current !== requestId.current) return;
      setRows(result.employees);
      setTotal(result.total);
    } catch (e) {
      if (current !== requestId.current) return;
      setRows([]);
      setTotal(0);
      toast.error(errorMessage(e, "Could not load employees."));
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [page, pageSize, filters]);

  // Wait briefly after typing so each keystroke does not send a request
  useEffect(() => {
    const timer = setTimeout(load, filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, filters.search]);

  const changeFilters = (next) => {
    setFilters(next);
    setPage(1);
  };

  const save = async (payload, login) => {
    setSaving(true);
    const editing = formState?.employee;
    try {
      const saved = editing
        ? await employeesApi.update(editing._id, payload)
        : await employeesApi.create(payload);

      if (login) {
        try {
          await employeesApi.createLogin({ employeeId: saved._id || editing?._id, email: payload.email, password: login.password });
          toast.success(editing ? "Employee updated and login created." : "Employee added and login created.");
        } catch (loginErr) {
          // The employee is saved; only the login failed, so say that clearly
          toast.warn(`${editing ? "Employee updated" : "Employee added"}, but the login was not created: ${errorMessage(loginErr, "unknown error")}`);
        }
      } else {
        toast.success(editing ? "Employee updated." : "Employee added.");
      }

      setFormState(null);
      await load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not save the employee."));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = async () => {
    const target = deactivating;
    setBusyId(target._id);
    try {
      await employeesApi.deactivate(target._id, deactivateForm);
      toast.success(`${target.name} deactivated. Any login was disabled.`);
      setDeactivating(null);
      await load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not deactivate the employee."));
    } finally {
      setBusyId(null);
    }
  };

  const confirmResetPassword = async () => {
    const passwordMsg = passwordError(newPassword);
    if (passwordMsg) return toast.error(passwordMsg);
    const target = resetting;
    setBusyId(target._id);
    try {
      await employeesApi.resetPassword(target._id, newPassword);
      toast.success(`Password updated for ${target.name}.`);
      setResetting(null);
      setNewPassword("");
    } catch (e) {
      toast.error(errorMessage(e, "Could not update the password."));
    } finally {
      setBusyId(null);
    }
  };

  const startDeactivate = (employee) => {
    setDeactivateForm({ reason: "", leftCompany: false });
    setDeactivating(employee);
  };

  return (
    <div className="emp-page">
      <div className="emp-header">
        <div>
          <h1>Employees</h1>
          
        </div>
        <div className="emp-header-actions">
          {canManageRoles && (
            <button type="button" className="emp-btn" onClick={() => navigate("/employees/roles")}>
              <ShieldCheck size={15} /> Role Management
            </button>
          )}
          {canManageRoles && (
            <button type="button" className="emp-btn" onClick={() => navigate("/employees/role-setup")}>
              <UserCog size={15} /> Role Setup
            </button>
          )}
          <button type="button" className="emp-btn emp-btn-primary" onClick={() => setFormState({ employee: null, startWithLogin: false })}>
            <Plus size={15} /> Add employee
          </button>
        </div>
      </div>


      <div className="emp-card">
        <EmployeeFilters
          filters={filters}
          onChange={changeFilters}
          branches={branches}
          roles={roles}
          lockedBranchId={lockedBranchId}
          loading={loading}
          onRefresh={load}
        />
        <EmployeeTable
          employees={rows}
          roles={roles}
          loading={loading}
          canEdit
          canDeactivate
          busyId={busyId}
          onView={setViewing}
          onEdit={(employee, opts = {}) => setFormState({ employee, startWithLogin: Boolean(opts.focusLogin) })}
          onDeactivate={startDeactivate}
          onResetPassword={(employee) => {
            setNewPassword("");
            setResetting(employee);
          }}
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
        />
      </div>

      {viewing && (
        <EmployeeDetailsModal
          employee={viewing}
          roles={roles}
          onClose={() => setViewing(null)}
          onOpenRoleSetup={() => navigate("/employees/role-setup")}
        />
      )}

      {formState && (
        <div className="emp-overlay" onClick={() => !saving && setFormState(null)}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <h2>{formState.employee ? `Edit ${formState.employee.name}` : "Add employee"}</h2>
            </div>
            <EmployeeForm
              employee={formState.employee}
              branches={branches}
              roles={roles}
              lockedBranchId={lockedBranchId}
              canCreateLogin
              startWithLogin={formState.startWithLogin}
              saving={saving}
              onSubmit={save}
              onCancel={() => setFormState(null)}
            />
          </div>
        </div>
      )}

      {resetting && (
        <div className="emp-overlay" onClick={() => !busyId && setResetting(null)}>
          <div className="emp-modal emp-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <h2>Reset password for {resetting.name}</h2>
            </div>
            <div className="emp-modal-body">
              <div className="emp-field">
                <label className="emp-label emp-required">New password</label>
                <input
                  className="emp-input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                />
                <span className="emp-hint">They sign in with {resetting.email} and this password.</span>
              </div>
            </div>
            <div className="emp-modal-footer">
              <button type="button" className="emp-btn" onClick={() => setResetting(null)} disabled={Boolean(busyId)}>Cancel</button>
              <button type="button" className="emp-btn emp-btn-primary" onClick={confirmResetPassword} disabled={Boolean(busyId)}>
                {busyId ? "Saving..." : "Update password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deactivating && (
        <div className="emp-overlay" onClick={() => !busyId && setDeactivating(null)}>
          <div className="emp-modal emp-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <h2>Deactivate {deactivating.name}?</h2>
            </div>
            <div className="emp-modal-body">
              <p className="emp-hint" style={{ marginTop: 0 }}>
                They will be removed from attendance and payroll from now on and their login (if any) will be disabled. Past records are kept.
              </p>
              <div className="emp-field">
                <label className="emp-label">Reason (optional)</label>
                <input className="emp-input" value={deactivateForm.reason} onChange={(e) => setDeactivateForm((p) => ({ ...p, reason: e.target.value }))} />
              </div>
              <label className="emp-checkbox" style={{ marginTop: 12 }}>
                <input type="checkbox" checked={deactivateForm.leftCompany} onChange={(e) => setDeactivateForm((p) => ({ ...p, leftCompany: e.target.checked }))} />
                They have left the company
              </label>
            </div>
            <div className="emp-modal-footer">
              <button type="button" className="emp-btn" onClick={() => setDeactivating(null)} disabled={Boolean(busyId)}>Cancel</button>
              <button type="button" className="emp-btn emp-btn-danger" onClick={confirmDeactivate} disabled={Boolean(busyId)}>
                {busyId ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
