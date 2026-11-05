import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Pencil, Plus, Power, RefreshCw, Search } from "lucide-react";
import productionApi from "../api/productionApi";
import Pagination from "../../../../components/common/Pagination";

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

const EMPTY_FORM = { name: "", phone: "", skill: "", notes: "" };

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
    if (form.name.trim().length < 2) return toast.error("Enter the operator's name.");
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), phone: form.phone.trim(), skill: form.skill.trim(), notes: form.notes.trim() };
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
        <button type="button" className="jf-btn jf-btn-primary" onClick={() => setForm({ ...EMPTY_FORM })} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Plus size={15} /> Add Operator
        </button>
      </div>

      <div className="jf-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", padding: "0.875rem 1rem", flexWrap: "wrap", borderBottom: "1px solid #eef3f0" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "220px", maxWidth: "380px" }}>
            <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            <input
              className="jf-input"
              style={{ paddingLeft: "2.25rem" }}
              placeholder="Search by name, phone or skill"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <button type="button" className="jf-btn jf-btn-secondary" onClick={load} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <RefreshCw size={14} /> {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Phone</th>
                <th style={th}>Skill</th>
                <th style={th}>Status</th>
                <th style={th}>Current Task</th>
                <th style={{ ...th, textAlign: "center" }}>Queued</th>
                <th style={{ ...th, textAlign: "center" }}>Done Today</th>
                <th style={{ ...th, textAlign: "center" }}>Total Done</th>
                <th style={{ ...th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td style={{ ...td, textAlign: "center", color: "#64748b" }} colSpan={9}>Loading operators...</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td style={{ ...td, textAlign: "center", color: "#64748b", padding: "2rem" }} colSpan={9}>
                    {items.length === 0 ? "No operators yet. Add the first operator." : "No operators match your search."}
                  </td>
                </tr>
              ) : (
                rows.map((o) => {
                  const st = STATUS_STYLE[o.status] || STATUS_STYLE.AVAILABLE;
                  const available = o.isActive !== false;
                  return (
                    <tr key={o.id} style={{ opacity: available ? 1 : 0.7 }}>
                      <td style={{ ...td, fontWeight: 700, color: "#0f172a" }}>{o.name}</td>
                      <td style={td}>{o.phone || "—"}</td>
                      <td style={td}>{o.role || "—"}</td>
                      <td style={td}>
                        <span style={{ background: st.bg, color: st.color, padding: "0.2rem 0.6rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 700 }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={td}>
                        {o.currentTask ? `${o.currentTask.jobNo || ""}${o.currentTask.operationName ? ` · ${o.currentTask.operationName}` : ""}` : "—"}
                      </td>
                      <td style={{ ...td, textAlign: "center" }}>{o.queued ?? 0}</td>
                      <td style={{ ...td, textAlign: "center" }}>{o.completedToday ?? 0}</td>
                      <td style={{ ...td, textAlign: "center" }}>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{(o.totalCompletedOps ?? 0).toLocaleString()} steps</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{(o.totalCompletedQty ?? 0).toLocaleString()} pcs</div>
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="jf-btn jf-btn-secondary jf-btn-sm"
                            style={{ padding: "0.3rem 0.5rem" }}
                            title="Edit operator"
                            aria-label="Edit operator"
                            onClick={() => setForm({ id: o.id, name: o.name || "", phone: o.phone || "", skill: o.role || "", notes: o.notes || "" })}
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          variant="compact"
          currentPage={currentPage}
          totalItems={filtered.length}
          itemsPerPage={pageSize}
          onPageChange={(n) => setPage(Math.min(Math.max(1, n), totalPages))}
          onItemsPerPageChange={(n) => setPageSize(n)}
          pageSizeOptions={[5, 10, 20, 25, 50, 100]}
          itemLabel="operators"
        />
      </div>

      {form && (
        <div className="jf-modal-overlay" onClick={() => !saving && setForm(null)}>
          <div className="jf-modal jf-modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="jf-modal-header">
              <h2 className="jf-modal-title">{form.id ? "Edit Operator" : "Add Operator"}</h2>
            </div>
            <form onSubmit={save}>
              <div className="jf-modal-body" style={{ display: "grid", gap: "0.85rem" }}>
                <div className="jf-form-group">
                  <label className="jf-label jf-label-required">Name</label>
                  <input className="jf-input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required autoFocus />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                  <div className="jf-form-group">
                    <label className="jf-label">Phone</label>
                    <input className="jf-input" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
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
                <button type="submit" className="jf-btn jf-btn-primary" disabled={saving}>{saving ? "Saving..." : form.id ? "Save Changes" : "Add Operator"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
