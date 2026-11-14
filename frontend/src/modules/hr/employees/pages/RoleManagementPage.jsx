import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import employeesApi from "../api/employeesApi";
import CapabilityGrid from "../components/CapabilityGrid";
import { allLeafKeys, expandKeys } from "../components/capabilityUtils";
import DataTable from "../../../../shared/ui/DataTable/DataTable";
import "../styles/employees.css";

/**
 * Role Management: create roles and tick the menu items (capabilities) each role may open.
 * A role signs in only when it has at least one page. Admin roles keep the Employees page so Role Management stays reachable.
 * Roles from before this screen have no page list yet; they stay unrestricted until one is saved here.
 */

const errorMessage = (e, fallback) => e?.response?.data?.message || e?.message || fallback;
const ADMIN_CODES = ["SUPER_ADMIN", "ADMIN"];
// Super Admin always has every page and cannot be limited
const isSuper = (role) => role.code === "SUPER_ADMIN";
const EMPTY = { id: null, code: "", name: "", description: "", pageAccess: [], loginAllowed: true, locked: false, legacy: false, readOnly: false };

const loginLabel = (role, requiresLogin = {}) => {
  if (ADMIN_CODES.includes(role.code)) return { text: "Can sign in", on: true };
  if (typeof role.loginAllowed === "boolean") return role.loginAllowed ? { text: "Can sign in", on: true } : { text: "No login", on: false };
  if (!Array.isArray(role.pageAccess)) return requiresLogin[role._id] === false ? { text: "No login", on: false } : { text: "Can sign in", on: true };
  return role.pageAccess.length > 0 ? { text: "Can sign in", on: true } : { text: "No login", on: false };
};

export default function RoleManagementPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [requiresLogin, setRequiresLogin] = useState({}); // role id -> can sign in, for roles saved before this setting existed
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // null = showing the list; an object = editing (id null means a new role)
  const [draft, setDraft] = useState(null);
  const [deleting, setDeleting] = useState(null); // role waiting for delete confirmation
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Role options first: it creates the role records for the roles listed in Master Defaults
      const options = await employeesApi.getRoleOptions();
      setRequiresLogin(Object.fromEntries(options.map((o) => [o._id, o.requiresLogin])));
      const [list, groups] = await Promise.all([employeesApi.listRoles(), employeesApi.getPageCatalog()]);
      setRoles(list.filter((r) => r.isActive !== false));
      setCatalog(groups);
    } catch (e) {
      toast.error(errorMessage(e, "Could not load roles."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);


  const allKeys = useMemo(() => allLeafKeys(catalog), [catalog]);

  const open = (role, readOnly) =>
    setDraft({
      id: role._id,
      code: role.code,
      name: role.name || "",
      description: role.description || "",
      // An Admin role with no list yet can open everything, so editing starts from every page ticked
      pageAccess: isSuper(role) ? allKeys : Array.isArray(role.pageAccess) ? expandKeys(role.pageAccess, catalog) : ADMIN_CODES.includes(role.code) ? allKeys : [],
      // Admin roles always sign in; other roles use their own setting, or what was worked out for older roles
      loginAllowed: ADMIN_CODES.includes(role.code)
        ? true
        : typeof role.loginAllowed === "boolean"
          ? role.loginAllowed
          : Array.isArray(role.pageAccess)
            ? role.pageAccess.length > 0
            : requiresLogin[role._id] !== false,
      // Admin roles keep their name; only their pages can change
      locked: ADMIN_CODES.includes(role.code),
      legacy: !Array.isArray(role.pageAccess) && !ADMIN_CODES.includes(role.code),
      // Super Admin can only be viewed
      readOnly: readOnly || isSuper(role),
    });

  // Admin roles always keep Employees, otherwise nobody could reach Role Management again
  const setPages = (pageAccess) =>
    setDraft((d) => ({ ...d, legacy: false, pageAccess: d.locked ? [...new Set([...pageAccess, "employees"])] : pageAccess }));

  // Unticking "can sign in" clears the pages: a role that cannot sign in has none
  const setLoginAllowed = (allowed) =>
    setDraft((d) => ({ ...d, legacy: false, loginAllowed: allowed, pageAccess: allowed ? d.pageAccess : [] }));

  // Ticks or unticks a page or a whole menu: if every key is ticked they are all unticked, otherwise all are ticked
  const toggleMany = (keys) => {
    if (keys.length === 0) return;
    const all = keys.every((k) => draft.pageAccess.includes(k));
    setPages(all ? draft.pageAccess.filter((k) => !keys.includes(k)) : [...new Set([...draft.pageAccess, ...keys])]);
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await employeesApi.deleteRole(deleting._id);
      toast.success(`${deleting.name} deleted.`);
      setDeleting(null);
      await load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not delete the role."));
    } finally {
      setDeleteBusy(false);
    }
  };

  const save = async () => {
    if (!draft.name.trim()) return toast.error("Enter a role name.");
    if (!draft.locked && draft.loginAllowed && draft.pageAccess.length === 0) {
      return toast.error("Tick at least one page for a role that can sign in.");
    }
    setSaving(true);
    try {
      const payload = { name: draft.name.trim(), description: draft.description, pageAccess: draft.pageAccess };
      if (!draft.locked) payload.loginAllowed = draft.loginAllowed;
      if (draft.id) await employeesApi.updateRole(draft.id, payload);
      else await employeesApi.createRole(payload);
      toast.success(draft.id ? "Role updated." : "Role created.");
      setDraft(null);
      await load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not save the role."));
    } finally {
      setSaving(false);
    }
  };

  // ─── Editor ───────────────────────────────────────────────────────────────
  if (draft) {
    // The View screen cannot be changed
    const frozen = draft.readOnly;
    const nameFrozen = draft.readOnly || draft.locked;
    const noPages = !frozen && draft.loginAllowed && !draft.legacy && draft.pageAccess.length === 0;
    return (
      <div className="emp-page">
        <div className="emp-header">
          <div>
            <h1>{draft.readOnly ? `View ${draft.name}` : draft.id ? `Edit ${draft.name || "role"}` : "New role"}</h1>
           
          </div>
          <div className="emp-header-actions">
            <button type="button" className="emp-btn" onClick={() => setDraft(null)} disabled={saving}>
              <ArrowLeft size={15} /> Back to roles
            </button>
          </div>
        </div>

        <div className="emp-card emp-role-form">
          <div className="emp-role-fields">
            <div className="emp-field">
              <label className="emp-label emp-required">Role name</label>
              <input
                className="emp-input"
                value={draft.name}
                disabled={nameFrozen}
                placeholder="e.g. Store Incharge"
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="emp-field">
              <label className="emp-label">Description</label>
              <input
                className="emp-input"
                value={draft.description}
                disabled={nameFrozen}
                placeholder="Optional"
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
          </div>

          {!draft.locked && (
            <label className="emp-checkbox" style={{ margin: "12px 0 4px", fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={draft.loginAllowed}
                disabled={frozen}
                onChange={(e) => setLoginAllowed(e.target.checked)}
              />
              This role can sign in
            </label>
          )}
          {!draft.locked && !draft.loginAllowed && (
            <p className="emp-hint">
              People with this role cannot have a login, so no pages are needed. An admin can still give one employee pages in Role Setup.
            </p>
          )}

          {(draft.locked || draft.loginAllowed) && (
          <>
          <div className="emp-cap-head">
            <h2>Capabilities</h2>
            {!frozen && (
              <div>
                <button type="button" className="emp-link" onClick={() => setPages(allKeys)}>Select all</button>
                <span> · </span>
                <button type="button" className="emp-link" onClick={() => setPages([])}>Clear</button>
              </div>
            )}
          </div>

          {draft.locked && !draft.readOnly && (
            <p className="emp-hint">The Employees page always stays ticked for Admin roles so Role Management stays reachable.</p>
          )}
          {draft.legacy && !draft.locked && (
            <p className="emp-hint">This role has no page list yet, so it can open everything it could before. Saving limits it to the pages ticked.</p>
          )}
          {noPages && <p className="emp-hint emp-hint-warn">No page ticked, so this role cannot sign in.</p>}

          <CapabilityGrid
            catalog={catalog}
            selected={draft.pageAccess}
            onToggleKeys={toggleMany}
            lockedKeys={draft.locked ? ["employees"] : []}
            disabled={frozen}
          />
          </>
          )}

          <div className="emp-role-actions">
            <button type="button" className="emp-btn" onClick={() => setDraft(null)} disabled={saving}>{frozen ? "Back" : "Cancel"}</button>
            {!frozen && (
              <button type="button" className="emp-btn emp-btn-primary" onClick={save} disabled={saving}>
                {saving ? "Saving..." : draft.id ? "Save role" : "Create role"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Role list ────────────────────────────────────────────────────────────
  return (
    <div className="emp-page">
      <div className="emp-header">
        <div>
          <h1>Role Management</h1>
          
        </div>
        <div className="emp-header-actions">
          <button type="button" className="emp-btn" onClick={() => navigate("/employees")}>
            <ArrowLeft size={15} /> Employees
          </button>
          <button type="button" className="emp-btn emp-btn-primary" onClick={() => setDraft({ ...EMPTY })}>
            <Plus size={15} /> New role
          </button>
        </div>
      </div>

      <div className="emp-card">
        <DataTable
          searchable={false}
          loading={loading}
          data={roles}
          pageSize={10}
          emptyMessage="No roles yet."
          columns={[
            { key: "name", label: "Role", render: (r) => <div className="emp-cell-name">{r.name}</div> },
            {
              key: "login",
              label: "Login",
              render: (r) => {
                const login = loginLabel(r, requiresLogin);
                return <span className={`emp-badge ${login.on ? "emp-badge-active" : "emp-badge-inactive"}`}>{login.text}</span>;
              },
            },
            {
              key: "actions",
              label: "Actions",
              align: "right",
              render: (r) => (
                <div className="emp-actions">
                  <button type="button" className="emp-btn emp-btn-icon" title="View" aria-label={`View ${r.name}`} onClick={() => open(r, true)}>
                    <Eye size={15} />
                  </button>
                  {isSuper(r) ? (
                    <span className="emp-btn emp-btn-icon emp-btn-ghost" aria-hidden="true"><Pencil size={15} /></span>
                  ) : (
                    <button type="button" className="emp-btn emp-btn-icon" title="Edit" aria-label={`Edit ${r.name}`} onClick={() => open(r, false)}>
                      <Pencil size={15} />
                    </button>
                  )}
                  {ADMIN_CODES.includes(r.code) ? (
                    <span className="emp-btn emp-btn-icon emp-btn-ghost" aria-hidden="true"><Trash2 size={15} /></span>
                  ) : (
                    <button type="button" className="emp-btn emp-btn-icon emp-btn-danger" title="Delete" aria-label={`Delete ${r.name}`} onClick={() => setDeleting(r)}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      {deleting && (
        <div className="emp-overlay" onClick={() => !deleteBusy && setDeleting(null)}>
          <div className="emp-modal emp-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <h2>Delete {deleting.name}?</h2>
            </div>
            <div className="emp-modal-body">
              <p className="emp-hint" style={{ marginTop: 0 }}>
                This removes the role and its page list. It cannot be undone. A role that employees still use cannot be deleted.
              </p>
            </div>
            <div className="emp-modal-footer">
              <button type="button" className="emp-btn" onClick={() => setDeleting(null)} disabled={deleteBusy}>Cancel</button>
              <button type="button" className="emp-btn emp-btn-danger" onClick={confirmDelete} disabled={deleteBusy}>
                {deleteBusy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
