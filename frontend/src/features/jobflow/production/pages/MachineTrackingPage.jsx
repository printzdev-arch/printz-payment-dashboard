import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Clock,
  Eye,
  FileText,
  History,
  Pause,
  Play,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Timer,
  Users,
  Wrench,
  X,
} from "lucide-react";
import productionApi from "../api/productionApi";
import "../styles/machine-tracking.css";
import "../styles/production-theme.css";

const MACHINE_STATUS = {
  RUNNING: { label: "Running", tone: "running" },
  PAUSED: { label: "Paused", tone: "paused" },
  IDLE: { label: "Idle", tone: "idle" },
  MAINTENANCE: { label: "Maintenance", tone: "maintenance" },
};

const OPERATOR_STATUS = {
  WORKING: { label: "Working", tone: "running" },
  PAUSED: { label: "Paused", tone: "paused" },
  AVAILABLE: { label: "Available", tone: "available" },
};

const MACHINE_STATUS_OPTIONS = Object.entries(MACHINE_STATUS).map(([value, m]) => ({ value, label: m.label }));
const OPERATOR_STATUS_OPTIONS = Object.entries(OPERATOR_STATUS).map(([value, m]) => ({ value, label: m.label }));

const MACHINE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "job", label: "Current Job" },
  { id: "history", label: "Operator History" },
  { id: "downtime", label: "Downtime" },
  { id: "production", label: "Recent Operations" },
];

const OPERATOR_TABS = [
  { id: "overview", label: "Overview" },
  { id: "production", label: "Recent Operations" },
  { id: "machines", label: "Machines Used" },
];

const toInputDate = (d) => {
  const dt = new Date(d);
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${m}-${day}`;
};

const defaultFilters = () => {
  const now = new Date();
  return {
    search: "",
    branch: "ALL",
    type: "ALL",
    status: "ALL",
    dateFrom: toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    dateTo: toInputDate(now),
  };
};

const initials = (name) =>
  String(name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const efficiencyTone = (value) => (value >= 90 ? "good" : value >= 75 ? "mid" : "low");

const num = (n) => (n === undefined || n === null ? "—" : Number(n).toLocaleString("en-US"));
const pct = (n) => (n === undefined || n === null ? "—" : `${n}%`);
const hrs = (n) => (n === undefined || n === null ? "—" : `${n} hrs`);

const fmtDateTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt)
    ? "—"
    : dt.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const fmtMinutes = (m) => {
  const n = Math.round(Number(m) || 0);
  if (!n) return "—";
  const h = Math.floor(n / 60);
  const r = n % 60;
  return h ? `${h}h ${r}m` : `${r}m`;
};

const errorMessage = (err, fallback) => {
  const d = err?.response?.data;
  const details = Array.isArray(d?.details) ? d.details.map((x) => x?.message).filter(Boolean).join(" ") : "";
  return details || d?.message || err?.message || fallback;
};

const unwrap = (res) => res?.data || res || {};

function StatusBadge({ meta }) {
  const m = meta || { label: "—", tone: "idle" };
  return (
    <span className={`mt-badge mt-badge--${m.tone}`}>
      <span className="mt-dot" />
      {m.label}
    </span>
  );
}

function EfficiencyCell({ value }) {
  if (value === null || value === undefined) return <span className="mt-muted">—</span>;
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className={`mt-eff mt-eff--${efficiencyTone(value)}`}>
      <span className="mt-eff-value">{value}%</span>
      <div className="mt-eff-bar">
        <div className="mt-eff-fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone, onClick }) {
  const content = (
    <>
      <div className={`mt-stat-icon mt-stat-icon--${tone}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="mt-stat-label">{label}</div>
        <div className="mt-stat-value">{value}</div>
      </div>
    </>
  );

  if (!onClick) return <div className="mt-stat">{content}</div>;

  return (
    <button type="button" className="mt-stat mt-stat--interactive" onClick={onClick}>
      {content}
    </button>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="mt-section">
      <h4 className="mt-section-title">
        {Icon && <Icon size={16} />}
        {title}
      </h4>
      {children}
    </section>
  );
}

function KeyValue({ label, value }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value === undefined || value === null || value === "" ? "—" : value}</dd>
    </>
  );
}

function EmptyRow({ colSpan, message, onReset }) {
  return (
    <tr>
      <td colSpan={colSpan} className="mt-empty-cell">
        <div>{message}</div>
        {onReset && (
          <button type="button" className="mt-btn mt-btn--ghost mt-btn--sm" onClick={onReset}>
            <RotateCcw size={13} /> Reset filters
          </button>
        )}
      </td>
    </tr>
  );
}

function JobSection({ job }) {
  return (
    <Section icon={FileText} title="Current Job">
      {job ? (
        <>
          <dl className="mt-kv">
            <KeyValue label="Production Order" value={job.productionNo} />
            <KeyValue label="Job Number" value={job.jobNo} />
            <KeyValue label="Product" value={job.productName} />
            <KeyValue label="Operation" value={job.operationName} />
            <KeyValue label="Quantity" value={`${num(job.quantity)} pcs`} />
            <KeyValue label="Started At" value={fmtDateTime(job.startedAt)} />
            <KeyValue label="Expected End" value={fmtDateTime(job.expectedEnd)} />
            <KeyValue label="Worked" value={fmtMinutes(job.workedMinutes)} />
            {job.pausedReason && <KeyValue label="Paused Because" value={job.pausedReason} />}
          </dl>
          <div>
            <div className="mt-progress-meta">
              <span>Progress</span>
              <strong>{job.progress}%</strong>
            </div>
            <div className="mt-progress">
              <div className="mt-progress-fill" style={{ width: `${job.progress}%` }} />
            </div>
          </div>
        </>
      ) : (
        <p className="mt-muted">No active job right now.</p>
      )}
    </Section>
  );
}

function OperationsList({ items }) {
  if (!items || items.length === 0) {
    return <div className="mt-empty">No operations in this date range.</div>;
  }
  return (
    <div className="mt-table-wrap">
      <table className="mt-table">
        <thead>
          <tr>
            <th>Production Order</th>
            <th>Operation</th>
            <th>Status</th>
            <th>Started</th>
            <th>Finished</th>
            <th className="mt-td-right">Output</th>
            <th className="mt-td-right">Waste</th>
            <th className="mt-td-right">Worked</th>
          </tr>
        </thead>
        <tbody>
          {items.map((op) => (
            <tr key={op.id}>
              <td>
                <span className="mt-strong">{op.productionNo || "—"}</span>
                <span className="mt-sub">{op.jobNo}</span>
              </td>
              <td>{op.operationName}</td>
              <td>{op.status}</td>
              <td>{fmtDateTime(op.startAt)}</td>
              <td>{fmtDateTime(op.endAt)}</td>
              <td className="mt-td-right">{op.outputQty ? num(op.outputQty) : "—"}</td>
              <td className="mt-td-right">{op.wastageQty ? num(op.wastageQty) : "—"}</td>
              <td className="mt-td-right">{fmtMinutes(op.workedMinutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Drawer({ title, badge, meta, tabs, activeTab, onTab, onClose, icon: Icon, children }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="mt-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="mt-drawer" role="dialog" aria-modal="true" aria-label={`${title} details`}>
        <header className="mt-drawer-header">
          <div className="mt-stat-icon mt-stat-icon--green">
            <Icon size={20} />
          </div>

          <div className="mt-drawer-header-main">
            <div className="mt-drawer-title-row">
              <h3 className="mt-drawer-title">{title}</h3>
              {badge}
            </div>
            <div className="mt-drawer-meta">
              {meta.map(([label, value]) => (
                <div key={label}>
                  <span className="mt-meta-label">{label}</span>
                  <span>{value || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          <button type="button" className="mt-icon-btn" onClick={onClose} aria-label="Close details">
            <X size={18} />
          </button>
        </header>

        <nav className="mt-drawer-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`mt-drawer-tab ${activeTab === tab.id ? "mt-drawer-tab--active" : ""}`}
              onClick={() => onTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-drawer-body">{children}</div>
      </aside>
    </div>
  );
}

function useDetail(loader, id, params) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setDetail(null);
    setError("");
    loader(id, params)
      .then((res) => alive && setDetail(unwrap(res)))
      .catch((e) => alive && setError(errorMessage(e, "Could not load the details.")));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, params.from, params.to, params.branchId]);

  return { detail, error };
}

function MachineDrawer({ machine, params, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const { detail, error } = useDetail(productionApi.getMachineById, machine.id, params);
  const m = detail?.machine || machine;
  const status = MACHINE_STATUS[m.status];

  return (
    <Drawer
      title={m.name}
      icon={Settings}
      badge={<StatusBadge meta={status} />}
      meta={[
        ["Type", m.type],
        ["Model", m.model],
        ["Serial No", m.serial],
        ["Operator", m.operatorName],
      ]}
      tabs={MACHINE_TABS}
      activeTab={activeTab}
      onTab={setActiveTab}
      onClose={onClose}
    >
      {error && <div className="mt-empty">{error}</div>}

      {activeTab === "overview" && (
        <>
          <div className="mt-kpis">
            <div className="mt-kpi">
              <div className="mt-stat-icon mt-stat-icon--green"><Activity size={18} /></div>
              <div>
                <div className="mt-kpi-label">Utilization</div>
                <div className="mt-kpi-value">{pct(m.utilization)}</div>
              </div>
            </div>
            <div className="mt-kpi">
              <div className="mt-stat-icon mt-stat-icon--green"><FileText size={18} /></div>
              <div>
                <div className="mt-kpi-label">Operations</div>
                <div className="mt-kpi-value">{num(m.totalOps)}</div>
              </div>
            </div>
            <div className="mt-kpi">
              <div className="mt-stat-icon mt-stat-icon--green"><Timer size={18} /></div>
              <div>
                <div className="mt-kpi-label">Running Time</div>
                <div className="mt-kpi-value">{hrs(m.runningHours)}</div>
              </div>
            </div>
            <div className="mt-kpi">
              <div className="mt-stat-icon mt-stat-icon--amber"><Pause size={18} /></div>
              <div>
                <div className="mt-kpi-label">Idle Time</div>
                <div className="mt-kpi-value">{hrs(m.idleHours)}</div>
              </div>
            </div>
          </div>

          <div className="mt-grid-2">
            <JobSection job={m.currentJob} />
            <Section icon={BarChart3} title="Performance (Selected Dates)">
              <dl className="mt-kv">
                <KeyValue label="Total Operations" value={num(m.totalOps)} />
                <KeyValue label="Completed" value={num(m.completedOps)} />
                <KeyValue label="Failed" value={num(m.failedOps)} />
                <KeyValue label="Downtime (pauses)" value={hrs(m.downtimeHours)} />
                <KeyValue label="Yield" value={pct(m.yield)} />
                <KeyValue label="Good Output" value={num(m.outputQty)} />
                <KeyValue label="Wastage" value={num(m.wastageQty)} />
                <KeyValue label="Queued Operations" value={num(m.queuedOps)} />
              </dl>
            </Section>
          </div>
        </>
      )}

      {activeTab === "job" && <JobSection job={m.currentJob} />}

      {activeTab === "history" && (
        <Section icon={History} title="Operator History">
          {!detail ? (
            <p className="mt-muted">Loading…</p>
          ) : detail.operatorHistory.length === 0 ? (
            <p className="mt-muted">No operator activity on this machine in the selected dates.</p>
          ) : (
            <ul className="mt-list">
              {detail.operatorHistory.map((h) => (
                <li key={h.operatorId || h.name} className="mt-list-item">
                  <span>
                    <strong>{h.name}</strong>
                    <span className="mt-sub">{h.ops} operation(s)</span>
                  </span>
                  <span className="mt-muted">Last active {fmtDateTime(h.lastAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {activeTab === "downtime" && (
        <Section icon={Wrench} title="Downtime (operation pauses)">
          {m.status === "MAINTENANCE" && <p className="mt-muted">This machine is currently marked as under maintenance.</p>}
          {!detail ? (
            <p className="mt-muted">Loading…</p>
          ) : detail.downtime.length === 0 ? (
            <p className="mt-muted">No pauses were recorded in the selected dates.</p>
          ) : (
            <ul className="mt-list">
              {detail.downtime.map((d, i) => (
                <li key={i} className="mt-list-item">
                  <span>
                    <strong>{d.reason || "No reason given"}</strong>
                    <span className="mt-sub">
                      {d.productionNo} · {d.operationName}
                    </span>
                  </span>
                  <span className="mt-muted">
                    {fmtDateTime(d.pausedAt)} · {fmtMinutes(d.minutes)}
                    {!d.resumedAt ? " (still paused)" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {activeTab === "production" && (
        <Section icon={BarChart3} title="Recent Operations">
          {!detail ? <p className="mt-muted">Loading…</p> : <OperationsList items={detail.recentOperations} />}
        </Section>
      )}
    </Drawer>
  );
}

function OperatorDrawer({ operator, params, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const { detail, error } = useDetail(productionApi.getOperatorById, operator.id, params);
  const o = detail?.operator || operator;
  const status = OPERATOR_STATUS[o.status];

  return (
    <Drawer
      title={o.name}
      icon={Users}
      badge={<StatusBadge meta={status} />}
      meta={[
        ["Role", o.role],
        ["Email", o.email],
        ["Phone", o.phone],
        ["Last Active", o.lastActiveAt ? fmtDateTime(o.lastActiveAt) : ""],
      ]}
      tabs={OPERATOR_TABS}
      activeTab={activeTab}
      onTab={setActiveTab}
      onClose={onClose}
    >
      {error && <div className="mt-empty">{error}</div>}

      {activeTab === "overview" && (
        <>
          <div className="mt-kpis">
            <div className="mt-kpi">
              <div className="mt-stat-icon mt-stat-icon--green"><Activity size={18} /></div>
              <div>
                <div className="mt-kpi-label">Yield</div>
                <div className="mt-kpi-value">{pct(o.yield)}</div>
              </div>
            </div>
            <div className="mt-kpi">
              <div className="mt-stat-icon mt-stat-icon--green"><FileText size={18} /></div>
              <div>
                <div className="mt-kpi-label">Completed</div>
                <div className="mt-kpi-value">{num(o.completedOps)}</div>
              </div>
            </div>
            <div className="mt-kpi">
              <div className="mt-stat-icon mt-stat-icon--green"><Timer size={18} /></div>
              <div>
                <div className="mt-kpi-label">Time Logged</div>
                <div className="mt-kpi-value">{hrs(o.workedHours)}</div>
              </div>
            </div>
            <div className="mt-kpi">
              <div className="mt-stat-icon mt-stat-icon--amber"><Clock size={18} /></div>
              <div>
                <div className="mt-kpi-label">Queued</div>
                <div className="mt-kpi-value">{num(o.queued)}</div>
              </div>
            </div>
          </div>

          <div className="mt-grid-2">
            <JobSection job={o.currentTask} />
            <Section icon={BarChart3} title="Productivity (Selected Dates)">
              <dl className="mt-kv">
                <KeyValue label="Operations" value={num(o.totalOps)} />
                <KeyValue label="Completed Today" value={num(o.completedToday)} />
                <KeyValue label="Failed" value={num(o.failedOps)} />
                <KeyValue label="Good Output" value={num(o.outputQty)} />
                <KeyValue label="Wastage" value={num(o.wastageQty)} />
                <KeyValue label="Pieces / Hour" value={o.productivity === null ? "—" : num(o.productivity)} />
              </dl>
            </Section>
          </div>
        </>
      )}

      {activeTab === "production" && (
        <Section icon={BarChart3} title="Recent Operations">
          {!detail ? <p className="mt-muted">Loading…</p> : <OperationsList items={detail.recentOperations} />}
        </Section>
      )}

      {activeTab === "machines" && (
        <Section icon={Printer} title="Machines Used">
          {!detail ? (
            <p className="mt-muted">Loading…</p>
          ) : detail.machinesUsed.length === 0 ? (
            <p className="mt-muted">No machine activity in the selected dates.</p>
          ) : (
            <ul className="mt-list">
              {detail.machinesUsed.map((mu) => (
                <li key={mu.name} className="mt-list-item">
                  <strong>{mu.name}</strong>
                  <span className="mt-muted">{mu.operations} operation(s)</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </Drawer>
  );
}

export default function MachineTrackingPage() {
  const [tab, setTab] = useState("MACHINES");
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [machineSummary, setMachineSummary] = useState({});
  const [operatorSummary, setOperatorSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [branches, setBranches] = useState([]);
  const [selected, setSelected] = useState(null); // { kind, item }

  const isMachinesTab = tab === "MACHINES";

  useEffect(() => {
    productionApi
      .getBranches()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : res?.items || res?.branches || [];
        setBranches(list);
      })
      .catch(() => setBranches([]));
  }, []);

  const params = useMemo(() => {
    const p = {};
    if (filters.dateFrom) p.from = filters.dateFrom;
    if (filters.dateTo) p.to = filters.dateTo;
    if (filters.branch !== "ALL") p.branchId = filters.branch;
    return p;
  }, [filters.dateFrom, filters.dateTo, filters.branch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [m, o] = await Promise.all([productionApi.getMachines(params), productionApi.getOperators(params)]);
      const md = unwrap(m);
      const od = unwrap(o);
      setMachines(md.items || []);
      setMachineSummary(md.summary || {});
      setOperators(od.items || []);
      setOperatorSummary(od.summary || {});
    } catch (e) {
      setMachines([]);
      setOperators([]);
      setMachineSummary({});
      setOperatorSummary({});
      setError(errorMessage(e, "Could not load machines and operators."));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const query = filters.search.trim().toLowerCase();
  const matches = (...fields) => !query || fields.some((f) => f && String(f).toLowerCase().includes(query));

  const machineTypes = useMemo(() => [...new Set(machines.map((m) => m.type).filter(Boolean))], [machines]);

  const filteredMachines = machines.filter(
    (m) =>
      (filters.type === "ALL" || m.type === filters.type) &&
      (filters.status === "ALL" || m.status === filters.status) &&
      matches(m.name, m.type, m.model, m.serial, m.operatorName, m.currentJob?.jobNo, m.currentJob?.productionNo, m.currentJob?.productName)
  );

  const filteredOperators = operators.filter(
    (o) =>
      (filters.status === "ALL" || o.status === filters.status) &&
      matches(o.name, o.role, o.email, o.machine, o.currentTask?.jobNo, o.currentTask?.productName)
  );

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const resetFilters = () => setFilters(defaultFilters());

  const switchTab = (next) => {
    setTab(next);
    setFilters((prev) => ({ ...prev, status: "ALL", type: "ALL" }));
  };

  const focusMachinesByStatus = (status) => {
    setTab("MACHINES");
    setFilters((prev) => ({ ...prev, status, type: "ALL" }));
  };

  const statusOptions = isMachinesTab ? MACHINE_STATUS_OPTIONS : OPERATOR_STATUS_OPTIONS;
  const detailParams = params;

  return (
    <div className="mt-page">

      <header className="mt-header">
        <div className="mt-title-wrap">
          <div className="mt-title-icon">
            <Settings size={24} />
          </div>
          <div>
            <h2 className="mt-title">Machine &amp; Operator Tracking</h2>
            
          </div>
        </div>
        <button type="button" className="mt-btn mt-btn--outline" onClick={load} disabled={loading}>
          <RefreshCw size={14} /> {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <section className="mt-stats">
        <StatCard icon={Printer} label="Total Machines" value={loading ? "—" : machineSummary.machines ?? 0} tone="neutral" onClick={() => focusMachinesByStatus("ALL")} />
        <StatCard icon={Users} label="Total Operators" value={loading ? "—" : operatorSummary.operators ?? 0} tone="neutral" onClick={() => switchTab("OPERATORS")} />
        <StatCard icon={Play} label="Running" value={loading ? "—" : machineSummary.running ?? 0} tone="green" onClick={() => focusMachinesByStatus("RUNNING")} />
        <StatCard icon={Pause} label="Idle" value={loading ? "—" : (machineSummary.idle ?? 0) + (machineSummary.paused ?? 0)} tone="amber" onClick={() => focusMachinesByStatus("IDLE")} />
        <StatCard icon={Wrench} label="Maintenance" value={loading ? "—" : machineSummary.maintenance ?? 0} tone="red" onClick={() => focusMachinesByStatus("MAINTENANCE")} />
      </section>

      <section className="mt-filters">
        <div className="mt-field mt-field--search">
          <label htmlFor="mt-search">Search</label>
          <div className="mt-input-wrap">
            <Search size={15} />
            <input
              id="mt-search"
              type="text"
              className="mt-input mt-input--icon"
              placeholder={isMachinesTab ? "Search machine, operator, job number..." : "Search operator, role, task..."}
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
          </div>
        </div>

        {branches.length > 1 && (
          <div className="mt-field">
            <label htmlFor="mt-branch">Branch</label>
            <select id="mt-branch" className="mt-select" value={filters.branch} onChange={(e) => updateFilter("branch", e.target.value)}>
              <option value="ALL">All branches</option>
              {branches.map((b) => (
                <option key={b._id || b.id} value={b._id || b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isMachinesTab && (
          <div className="mt-field">
            <label htmlFor="mt-type">Type</label>
            <select id="mt-type" className="mt-select" value={filters.type} onChange={(e) => updateFilter("type", e.target.value)}>
              <option value="ALL">All types</option>
              {machineTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-field">
          <label htmlFor="mt-status">Status</label>
          <select id="mt-status" className="mt-select" value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
            <option value="ALL">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="mt-field mt-field--date">
          <label htmlFor="mt-date-from">Date range</label>
          <div className="mt-date-range">
            <input id="mt-date-from" type="date" className="mt-input" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(e) => updateFilter("dateFrom", e.target.value)} />
            <span className="mt-muted">to</span>
            <input id="mt-date-to" type="date" className="mt-input" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(e) => updateFilter("dateTo", e.target.value)} />
          </div>
        </div>

        <button type="button" className="mt-btn mt-btn--ghost mt-reset" onClick={resetFilters}>
          <RotateCcw size={14} /> Reset
        </button>
      </section>

      {error && (
        <div className="mt-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="mt-btn mt-btn--outline mt-btn--sm" onClick={load}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      <nav className="mt-tabs">
        <button type="button" className={`mt-tab ${isMachinesTab ? "mt-tab--active" : ""}`} onClick={() => switchTab("MACHINES")}>
          <Printer size={15} /> Machines ({machines.length})
        </button>
        <button type="button" className={`mt-tab ${!isMachinesTab ? "mt-tab--active" : ""}`} onClick={() => switchTab("OPERATORS")}>
          <Users size={15} /> Operators ({operators.length})
        </button>
      </nav>

      {isMachinesTab && (
        <section className="mt-card">
          <div className="mt-card-header">
            <h3 className="mt-card-title">Machines</h3>
            <span className="mt-muted">Showing {filteredMachines.length} of {machines.length}</span>
          </div>
          <div className="mt-table-wrap">
            <table className="mt-table">
              <thead>
                <tr>
                  <th className="mt-td-num">#</th>
                  <th>Machine Name</th>
                  <th>Type</th>
                  <th>Operator</th>
                  <th>Status</th>
                  <th>Current Job</th>
                  <th>Utilization</th>
                  <th className="mt-td-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow colSpan={8} message="Loading machines..." />
                ) : filteredMachines.length === 0 ? (
                  <EmptyRow colSpan={8} message="No machines match your filters." onReset={resetFilters} />
                ) : (
                  filteredMachines.map((m, index) => (
                    <tr key={m.id}>
                      <td className="mt-td-num">{index + 1}</td>
                      <td><span className="mt-strong">{m.name}</span></td>
                      <td>{m.type}</td>
                      <td>{m.operatorName || "—"}</td>
                      <td><StatusBadge meta={MACHINE_STATUS[m.status]} /></td>
                      <td>
                        {m.currentJob ? (
                          <>
                            <span className="mt-strong">{m.currentJob.jobNo || m.currentJob.productionNo}</span>
                            <span className="mt-sub">{m.currentJob.productName}</span>
                          </>
                        ) : (
                          <span className="mt-muted">{m.status === "MAINTENANCE" ? "Under service" : "Standby"}</span>
                        )}
                      </td>
                      <td><EfficiencyCell value={m.utilization} /></td>
                      <td className="mt-td-right">
                        <button type="button" className="mt-btn mt-btn--outline mt-btn--sm" onClick={() => setSelected({ kind: "machine", item: m })}>
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!isMachinesTab && (
        <section className="mt-card">
          <div className="mt-card-header">
            <h3 className="mt-card-title">Operators</h3>
            <span className="mt-muted">Showing {filteredOperators.length} of {operators.length}</span>
          </div>
          <div className="mt-table-wrap">
            <table className="mt-table">
              <thead>
                <tr>
                  <th>Operator</th>
                  <th>Machine</th>
                  <th>Current Task</th>
                  <th className="mt-td-center">Completed Today</th>
                  <th className="mt-td-center">Queued</th>
                  <th>Time Logged</th>
                  <th>Yield</th>
                  <th>Status</th>
                  <th className="mt-td-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow colSpan={9} message="Loading operators..." />
                ) : filteredOperators.length === 0 ? (
                  <EmptyRow colSpan={9} message="No operators match your filters." onReset={resetFilters} />
                ) : (
                  filteredOperators.map((op) => {
                    const isWorking = op.status === "WORKING";
                    return (
                      <tr key={op.id}>
                        <td>
                          <div className="mt-person">
                            <div className="mt-avatar">{initials(op.name)}</div>
                            <div>
                              <div className="mt-strong">{op.name}</div>
                              <div className="mt-sub">{op.role || "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td>{op.machine || "—"}</td>
                        <td className={isWorking ? "mt-task--active" : "mt-muted"}>
                          {op.currentTask ? `${op.currentTask.jobNo || op.currentTask.productionNo} · ${op.currentTask.operationName}` : "Standby"}
                        </td>
                        <td className="mt-td-center"><span className="mt-count">{op.completedToday}</span></td>
                        <td className="mt-td-center"><span className="mt-count mt-count--queued">{op.queued}</span></td>
                        <td>
                          <span className="mt-inline-icon"><Clock size={13} /> {hrs(op.workedHours)}</span>
                        </td>
                        <td><EfficiencyCell value={op.yield} /></td>
                        <td><StatusBadge meta={OPERATOR_STATUS[op.status]} /></td>
                        <td className="mt-td-right">
                          <button type="button" className="mt-btn mt-btn--outline mt-btn--sm" onClick={() => setSelected({ kind: "operator", item: op })}>
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="mt-note">
        Utilization compares worked time with an 8-hour shift per day in the selected dates. Yield is good output divided
        by input on completed operations.
      </p>

      {selected?.kind === "machine" && (
        <MachineDrawer key={selected.item.id} machine={selected.item} params={detailParams} onClose={() => setSelected(null)} />
      )}
      {selected?.kind === "operator" && (
        <OperatorDrawer key={selected.item.id} operator={selected.item} params={detailParams} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}