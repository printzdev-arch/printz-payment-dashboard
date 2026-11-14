import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Pencil, Power, RefreshCw, Search } from "lucide-react";
import productionApi from "../api/productionApi";
import employeesApi from "../../../hr/employees/api/employeesApi";
import DataTable from "../../../../shared/ui/DataTable/DataTable";

/**
 * Production operators: add, edit and manage availability.
 * Operators do not log in; the manager assigns them to operations (Planning and Operation Queue).
 */

const STATUS_STYLE = {
  AVAILABLE: { label: "Available", bg: "#dcfce7", color: "#15803d" },
  WORKING: { label: "Working", bg: "#dbeafe", color: "#1d4ed8" },
  PAUSED: { label: "Paused", bg: "#fef3c7", color: "#b45309" },
  UNAVAILABLE: { label: "Unavailable", bg: "#f1f5f9", color: "#64748b" },
};

const EMPTY_FORM = { employeeId: "", name: "", phone: "", skill: "", notes: "" };

const errorMessage = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

export default function OperatorsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [form, setForm] = useState(null); // null = closed, { id?, ...fields }
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productionApi.getOperators({});
      const body = res?.data || res || {};
      setItems(Array.isArray(body) ? body : body.items || []);
    } catch (e) {
      setItems([]);
      toast.error(errorMessage(e, "Could not load operators."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Active employees an operator can be linked to. Attendance and salary live on the employee.
  const [employees, setEmployees] = useState([]);
  useEffect(() => {
    let cancelled = false;
    employeesApi
      .listAll({ status: "ACTIVE" })
      .then((list) => !cancelled && setEmployees(list))
      .catch(() => !cancelled && setEmployees([]));
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide employees that already are operators, except the one this operator is linked to
  const pickableEmployees = useMemo(() => {
    const taken = new Set(items.filter((o) => o.employeeId && o.id !== form?.id).map((o) => String(o.employeeId)));
    return employees.filter((e) => !taken.has(String(e._id)));
  }, [employees, items, form?.id]);

  const pickEmployee = (employeeId) => {
    const emp = employees.find((e) => String(e._id) === String(employeeId));
    setForm((p) => ({
      ...p,
      employeeId,
      // The employee record owns name and phone once linked
      name: emp ? emp.name : p.employeeId ? "" : p.name,
      phone: emp ? emp.mobile || "" : p.employeeId ? "" : p.phone,
    }));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((o) => [o.name, o.phone, o.role].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const save = async (e) => {
    e.preventDefault();
    if (!form.employeeId && form.name.trim().length < 2) return toast.error("Pick an employee or enter the operator's name.");
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), phone: form.phone.trim(), skill: form.skill.trim(), notes: form.notes.trim() };
      // With an employee picked, the server takes name, phone and branch from the employee
      if (form.employeeId) payload.employeeId = form.employeeId;
      if (form.id) {
        await productionApi.updateOperator(form.id, payload);
        toast.success("Operator updated.");
      } else {
        await productionApi.createOperator(payload);
        toast.success("Operator added.");
      }
      setForm(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not save the operator."));
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (op) => {
    setBusyId(op.id);
    try {
      await productionApi.updateOperator(op.id, { isActive: op.isActive === false });
      toast.success(`${op.name} is now ${op.isActive === false ? "available" : "unavailable"}.`);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not change availability."));
    } finally {
      setBusyId(null);
    }
  };

  const th = { textAlign: "left", padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#065f46", textTransform: "uppercase", background: "#f0fdf4", whiteSpace: "nowrap" };
  const td = { padding: "0.75rem 1rem", borderBottom: "1px solid #f1f5f3", whiteSpace: "nowrap", fontSize: "0.875rem" };

  return (
    <div style={{ padding: "1.25rem 0.75rem 3rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.375rem", fontWeight: 800, color: "#0f172a" }}>Operators</h2>
          
        </div>
      </div>

      <DataTable
        loading={loading}
        data={items}
        searchKeys={["name", "phone", "role"]}
        searchPlaceholder="Search by name, phone or skill"
        pageSize={10}
        pageSizeOptions={[5, 10, 20, 25, 50, 100]}
        emptyMessage={items.length === 0 ? "No operators yet. Add an employee with the Operator role in Employees." : "No operators match your search."}
        rowClassName={(o) => (o.isActive !== false ? "" : "printz-row-muted")}
        filterComponent={
          <button type="button" className="jf-btn jf-btn-secondary" onClick={load} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <RefreshCw size={14} /> {loading ? "Loading..." : "Refresh"}
          </button>
        }
        columns={[
          {
            key: "name",
            label: "Name",
            render: (o) => (
              <span style={{ fontWeight: 700, color: "#0f172a" }}>
                {o.name}
                {!o.employeeId && (
                  <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#b45309" }} title="Not linked to an employee, so not in attendance or salary">
                    Not linked to an employee
                  </div>
                )}
              </span>
            ),
          },
          { key: "phone", label: "Phone", render: (o) => o.phone || "—" },
          { key: "role", label: "Skill", render: (o) => o.role || "—" },
          {
            key: "status",
            label: "Status",
            render: (o) => {
              const st = STATUS_STYLE[o.status] || STATUS_STYLE.AVAILABLE;
              return (
                <span style={{ background: st.bg, color: st.color, padding: "0.2rem 0.6rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 700 }}>
                  {st.label}
                </span>
              );
            },
          },
          {
            key: "currentTask",
            label: "Current Task",
            render: (o) =>
              o.currentTask ? `${o.currentTask.jobNo || ""}${o.currentTask.operationName ? ` · ${o.currentTask.operationName}` : ""}` : "—",
          },
          { key: "queued", label: "Queued", align: "center", render: (o) => o.queued ?? 0 },
          { key: "completedToday", label: "Done Today", align: "center", render: (o) => o.completedToday ?? 0 },
          {
            key: "totalDone",
            label: "Total Done",
            align: "center",
            render: (o) => (
              <>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{(o.totalCompletedOps ?? 0).toLocaleString()} steps</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{(o.totalCompletedQty ?? 0).toLocaleString()} pcs</div>
              </>
            ),
          },
          {
            key: "actions",
            label: "Actions",
            align: "right",
            render: (o) => {
              const available = o.isActive !== false;
              return (
                <div style={{ display: "inline-flex", gap: "6px" }}>
                  <button
                    type="button"
                    className="jf-btn jf-btn-secondary jf-btn-sm"
                    style={{ padding: "0.3rem 0.5rem" }}
                    title="Edit operator"
                    aria-label="Edit operator"
                    onClick={() => setForm({ id: o.id, employeeId: o.employeeId || "", name: o.name || "", phone: o.phone || "", skill: o.role || "", notes: o.notes || "" })}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="jf-btn jf-btn-sm"
                    disabled={busyId === o.id}
                    style={{
                      padding: "0.3rem 0.5rem",
                      background: available ? "#fee2e2" : "#dcfce7",
                      color: available ? "#b91c1c" : "#15803d",
                      border: `1px solid ${available ? "#fecaca" : "#bbf7d0"}`,
                    }}
                    title={available ? "Make unavailable" : "Make available"}
                    aria-label={available ? "Make unavailable" : "Make available"}
                    onClick={() => toggleAvailability(o)}
                  >
                    <Power size={14} />
                  </button>
                </div>
              );
            },
          },
        ]}
      />

      {form && (
        <div className="jf-modal-overlay" onClick={() => !saving && setForm(null)}>
          <div className="jf-modal jf-modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="jf-modal-header">
              <h2 className="jf-modal-title">Edit Operator</h2>
            </div>
            <form onSubmit={save}>
              <div className="jf-modal-body" style={{ display: "grid", gap: "0.85rem" }}>
                <div className="jf-form-group">
                  <label className="jf-label">Employee</label>
                  <select className="jf-input" value={form.employeeId} onChange={(e) => pickEmployee(e.target.value)}>
                    <option value="">Not an employee yet (enter name below)</option>
                    {pickableEmployees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.employeeCode} · {emp.name}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {form.employeeId
                      ? "Name and phone come from the employee record. Their attendance and salary are linked."
                      : "Add them in Employees first so attendance and salary are linked."}
                  </span>
                </div>
                <div className="jf-form-group">
                  <label className="jf-label jf-label-required">Name</label>
                  <input className="jf-input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required={!form.employeeId} readOnly={Boolean(form.employeeId)} autoFocus />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                  <div className="jf-form-group">
                    <label className="jf-label">Phone</label>
                    <input className="jf-input" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} readOnly={Boolean(form.employeeId)} />
                  </div>
                  <div className="jf-form-group">
                    <label className="jf-label">Skill</label>
                    <input className="jf-input" placeholder="e.g. Press, Finishing, Packing" value={form.skill} onChange={(e) => setForm((p) => ({ ...p, skill: e.target.value }))} />
                  </div>
                </div>
                <div className="jf-form-group">
                  <label className="jf-label">Notes</label>
                  <input className="jf-input" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional" />
                </div>
              </div>
              <div className="jf-modal-footer">
                <button type="button" className="jf-btn jf-btn-secondary" onClick={() => setForm(null)} disabled={saving}>Cancel</button>
                <button type="submit" className="jf-btn jf-btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
