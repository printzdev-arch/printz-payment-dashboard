import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  Settings,
  Search,
  Printer,
  Layers,
  PenTool,
  Package,
  BookOpen,
  User,
  Clock,
  Hourglass,
  Play,
  Pause,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  FileText,
  RotateCcw,
  Eye,
  Wrench,
  Flag,
  Cog,
  RefreshCw,
  SkipForward,
  XCircle,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import productionApi from "../api/productionApi";
import OperationStartModal from "../components/OperationStartModal";
import OperationCompleteModal from "../components/OperationCompleteModal";
import OperationFailModal from "../components/OperationFailModal";
import OperationSkipModal from "../components/OperationSkipModal";
import OperationPauseModal from "../components/OperationPauseModal";
import "../styles/operation-queue.css";
import "../styles/production-theme.css";

/* ────────────────────────────────────────────────────────────────────────── */
/* Constants                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

const PAGE_SIZE = 25;

const DEFAULT_FILTERS = { search: "", operation: "ALL", priority: "ALL", machine: "ALL" };
const PRIORITY_OPTIONS = ["URGENT", "HIGH", "NORMAL", "LOW"];

// status: sent to the server (matches the row's availability status or status)
// keys: which counts from /queue/counts belong to this tab
const STATUS_TABS = [
  { id: "ALL", label: "All", icon: Layers, status: "", keys: null },
  { id: "AVAILABLE", label: "Available", icon: Clock, status: "READY", keys: ["READY"] },
  // Operations that cannot start yet because an earlier step is not finished
  { id: "WAITING", label: "Waiting", icon: Hourglass, status: "BLOCKED", keys: ["BLOCKED"] },
  { id: "IN_PROGRESS", label: "In Progress", icon: Play, status: "IN_PROGRESS", keys: ["IN_PROGRESS"] },
  { id: "PAUSED", label: "Paused", icon: Pause, status: "PAUSED,ON_HOLD", keys: ["PAUSED", "ON_HOLD"] },
  { id: "FAILED", label: "Failed", icon: AlertTriangle, status: "FAILED", keys: ["FAILED"] },
  { id: "COMPLETED", label: "Completed", icon: CheckCircle2, status: "COMPLETED,SKIPPED", keys: ["COMPLETED", "SKIPPED"] },
];

const STATUS_LABEL = {
  READY: "Available",
  BLOCKED: "Waiting",
  IN_PROGRESS: "In Progress",
  PAUSED: "Paused",
  ON_HOLD: "On Hold",
  FAILED: "Failed",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
  PENDING: "Pending",
};

const STATUS_TONE = {
  READY: "pending",
  BLOCKED: "blocked",
  IN_PROGRESS: "progress",
  PAUSED: "paused",
  ON_HOLD: "hold",
  FAILED: "failed",
  COMPLETED: "completed",
  SKIPPED: "completed",
  PENDING: "pending",
};

const PRIORITY_TONE = { URGENT: "high", RUSH: "high", HIGH: "high", NORMAL: "normal", LOW: "low" };
const PRIORITY_RANK = { URGENT: 0, RUSH: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

const DETAIL_TABS = [
  { id: "EXECUTION", label: "Execution" },
  { id: "INSTRUCTIONS", label: "Instructions" },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

const num = (n) => (n === undefined || n === null ? "—" : Number(n).toLocaleString("en-US"));

const fmtDateTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt)
    ? "—"
    : dt.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? "—" : dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtMinutes = (m) => {
  const n = Math.round(Number(m) || 0);
  if (!n) return "—";
  const h = Math.floor(n / 60);
  const r = n % 60;
  return h ? `${h}h ${r}m` : `${r}m`;
};

const title = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : "");

const errorMessage = (err, fallback) => {
  const d = err?.response?.data;
  const details = Array.isArray(d?.details) ? d.details.map((x) => x?.message).filter(Boolean).join(" ") : "";
  return details || d?.message || err?.message || fallback;
};

const isEssential = (row) => /PRINT|PACK/i.test(row?.operationCode || "");

const iconFor = (row) => {
  const code = `${row?.operationCode || ""} ${row?.operationName || ""}`.toUpperCase();
  if (code.includes("PRINT")) return Printer;
  if (code.includes("LAM")) return Layers;
  if (code.includes("CUT")) return PenTool;
  if (code.includes("FOLD") || code.includes("BIND")) return BookOpen;
  if (code.includes("PACK")) return Package;
  return Cog;
};

// Props the operation modals expect
const modalOperation = (row) => ({ ...row, operatorName: row.operator });
const modalOrder = (row) => ({
  productionNo: row.productionNo,
  jobNo: row.jobNo,
  plannedQty: row.plannedQty,
});

function OperationIcon({ row, size = 18 }) {
  const Icon = iconFor(row);
  return <Icon size={size} strokeWidth={1.8} />;
}

function StatusBadge({ status }) {
  return (
    <span className={`oq-badge oq-badge--${STATUS_TONE[status] || "pending"}`}>{STATUS_LABEL[status] || status}</span>
  );
}

function PriorityBadge({ priority }) {
  return <span className={`oq-badge oq-badge--${PRIORITY_TONE[priority] || "normal"}`}>{title(priority)}</span>;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* List view parts                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function PageHeader({ title: heading, subtitle, children }) {
  return (
    <header className="oq-header">
      <div className="oq-title-wrap">
        <div className="oq-title-icon">
          <Settings size={22} />
        </div>
        <div>
          <h2 className="oq-title">{heading}</h2>
          <p className="oq-subtitle">{subtitle}</p>
        </div>
      </div>
      {children}
    </header>
  );
}

function StatusTabs({ activeTab, counts, onChange }) {
  return (
    <nav className="oq-tabs" aria-label="Queue filters">
      {STATUS_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const count = counts[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            className={`oq-tab ${isActive ? "oq-tab--active" : ""}`}
            aria-pressed={isActive}
            onClick={() => onChange(tab.id)}
          >
            <Icon size={17} />
            <span>
              {tab.label}
              {count !== undefined ? ` (${count})` : ""}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// A select that reads "Label: Value" with a leading icon; the native <select> sits invisibly on top.
function FilterSelect({ icon: Icon, label, value, options, onChange, format = (v) => v }) {
  return (
    <div className="oq-select-wrap">
      <Icon size={17} className="oq-select-icon" />
      <span className="oq-select-text">
        {label}: {value === "ALL" ? "All" : format(value)}
      </span>
      <ChevronDown size={16} className="oq-select-chevron" />
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="ALL">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {format(o)}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterBar({ filters, operations, machines, onChange, onReset, onRefresh, refreshing }) {
  return (
    <section className="oq-filters">
      <div className="oq-search">
        <Search size={17} />
        <input
          type="text"
          aria-label="Search operations"
          placeholder="Search by PO, job number, customer, product..."
          value={filters.search}
          onChange={(e) => onChange("search", e.target.value)}
        />
      </div>

      <FilterSelect
        icon={Wrench}
        label="Operation"
        value={filters.operation}
        options={operations}
        onChange={(v) => onChange("operation", v)}
      />
      <FilterSelect
        icon={Flag}
        label="Priority"
        value={filters.priority}
        options={PRIORITY_OPTIONS}
        format={title}
        onChange={(v) => onChange("priority", v)}
      />
      <FilterSelect
        icon={Cog}
        label="Machine"
        value={filters.machine}
        options={machines}
        onChange={(v) => onChange("machine", v)}
      />

      <button type="button" className="oq-btn oq-btn--reset" onClick={onReset}>
        <RotateCcw size={14} /> Reset
      </button>
      <button type="button" className="oq-btn oq-btn--reset" onClick={onRefresh} disabled={refreshing}>
        <RefreshCw size={14} /> {refreshing ? "Refreshing..." : "Refresh"}
      </button>
    </section>
  );
}

function rowButton(row) {
  switch (row.availabilityStatus) {
    case "READY":
      return { label: "Start", variant: "oq-btn--primary" };
    case "IN_PROGRESS":
      return { label: "Continue", variant: "oq-btn--outline-accent" };
    case "PAUSED":
      return { label: "Resume", variant: "oq-btn--outline-accent" };
    case "FAILED":
      return { label: "Review", variant: "oq-btn--outline-accent" };
    default:
      return { label: "View", variant: "oq-btn--outline-accent" };
  }
}

function QueueTable({ rows, loading, error, onOpen, onReset, onRetry }) {
  return (
    <section className="oq-card oq-card--flush">
      <div className="oq-table-wrap">
        <table className="oq-table">
          <thead>
            <tr>
              <th className="oq-col-num">#</th>
              <th>Job / PO</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Operation</th>
              <th className="oq-td-center">Required Qty</th>
              <th>Machine</th>
              <th>Operator</th>
              <th className="oq-td-center">Priority</th>
              <th className="oq-td-center">Status</th>
              <th className="oq-td-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="oq-empty-cell">
                  Loading operations...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={11} className="oq-empty-cell">
                  <div>{error}</div>
                  <button type="button" className="oq-btn oq-btn--reset oq-btn--row" onClick={onRetry}>
                    <RefreshCw size={13} /> Try again
                  </button>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="oq-empty-cell">
                  <div>No operations match the selected filters.</div>
                  <button type="button" className="oq-btn oq-btn--reset oq-btn--row" onClick={onReset}>
                    <RotateCcw size={13} /> Reset filters
                  </button>
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const btn = rowButton(row);
                return (
                  <tr key={row.id} onClick={() => onOpen(row)}>
                    <td className="oq-col-num">{index + 1}</td>
                    <td data-label="Job / PO">
                      <span className="oq-strong">{row.productionNo || "—"}</span>
                      <span className="oq-sub">{row.jobNo || "—"}</span>
                    </td>
                    <td data-label="Customer">{row.customerName || "—"}</td>
                    <td data-label="Product">{row.productName || "—"}</td>
                    <td data-label="Operation">
                      <span className="oq-op">
                        <span className="oq-op-icon">
                          <OperationIcon row={row} />
                        </span>
                        {row.operationName || row.operationCode}
                        {row.isRework && <span className="oq2-tag">Rework</span>}
                        {row.isReprint && <span className="oq2-tag">Reprint</span>}
                      </span>
                    </td>
                    <td data-label="Required Qty" className="oq-td-center">
                      {num(row.plannedQty)}
                    </td>
                    <td data-label="Machine">{row.machine || "—"}</td>
                    <td data-label="Operator">{row.operator || "—"}</td>
                    <td data-label="Priority" className="oq-td-center">
                      <PriorityBadge priority={row.priority} />
                    </td>
                    <td data-label="Status" className="oq-td-center">
                      <StatusBadge status={row.availabilityStatus} />
                    </td>
                    <td className="oq-td-center oq-td-action" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`oq-btn oq-btn--row ${btn.variant}`}
                        onClick={() => onOpen(row)}
                      >
                        {btn.label === "View" && <Eye size={14} />}
                        {btn.label}
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
  );
}

function Pager({ page, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total <= PAGE_SIZE) return null;
  return (
    <div className="oq2-pager">
      <span>
        Page {page} of {pages} · {total} operations
      </span>
      <div>
        <button type="button" className="oq-btn oq-btn--reset oq-btn--row" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={14} /> Previous
        </button>
        <button
          type="button"
          className="oq-btn oq-btn--reset oq-btn--row"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Operation detail view                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

function TaskSummary({ row }) {
  const stats = [
    { label: "Operation", value: row.operationName || row.operationCode, icon: <OperationIcon row={row} size={22} /> },
    { label: "Machine", value: row.machine || "Not set", icon: <Cog size={22} strokeWidth={1.8} /> },
    { label: "Operator", value: row.operator || "Unassigned", icon: <User size={22} strokeWidth={1.8} /> },
    { label: "Required Quantity", value: `${num(row.plannedQty)} pcs`, icon: <Layers size={22} strokeWidth={1.8} /> },
  ];

  return (
    <section className="oq-summary">
      <div className="oq-thumb">
        <ImageIcon size={26} />
      </div>

      <div className="oq-summary-main">
        <div className="oq-summary-ids">
          <span>{row.productionNo || "—"}</span>
          <span className="oq-divider">|</span>
          <span>{row.jobNo || "—"}</span>
        </div>
        <h3 className="oq-summary-title">{row.productName || "—"}</h3>
        <p className="oq-summary-desc">
          {row.customerName || "—"} · Due {fmtDate(row.dueDate)} · Step #{row.sequenceNo}
        </p>
      </div>

      <div className="oq-stats">
        {stats.map((s) => (
          <div key={s.label} className="oq-stat">
            <span className="oq-stat-icon">{s.icon}</span>
            <div>
              <span className="oq-stat-label">{s.label}</span>
              <strong className="oq-stat-value">{s.value}</strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Info({ label, children }) {
  return (
    <div className="oq2-info-item">
      <span>{label}</span>
      <strong>{children || "—"}</strong>
    </div>
  );
}

function DetailsCard({ row }) {
  return (
    <section className="oq-card">
      <header className="oq-card-head">
        <Settings size={18} />
        <h4>Operation Details</h4>
      </header>
      <div className="oq2-info">
        <Info label="Status">{STATUS_LABEL[row.availabilityStatus] || row.availabilityStatus}</Info>
        <Info label="Sequence">#{row.sequenceNo}</Info>
        <Info label="Planned Qty">{num(row.plannedQty)}</Info>
        <Info label="Input Qty">{row.inputQty ? num(row.inputQty) : "—"}</Info>
        <Info label="Good Output">{row.outputQty ? num(row.outputQty) : "—"}</Info>
        <Info label="Completed Qty">{row.completedQty ? num(row.completedQty) : "—"}</Info>
        <Info label="Wastage">{row.wastageQty ? num(row.wastageQty) : "—"}</Info>
        <Info label="Progress">{`${row.progress || 0}%`}</Info>
        <Info label="Planned Start">{fmtDateTime(row.plannedStart)}</Info>
        <Info label="Planned End">{fmtDateTime(row.plannedEnd)}</Info>
        <Info label="Started">{fmtDateTime(row.startAt)}</Info>
        <Info label="Finished">{fmtDateTime(row.endAt)}</Info>
        <Info label="Worked Time">{fmtMinutes(row.workedMinutes)}</Info>
        <Info label="Estimated Time">{fmtMinutes(row.estimatedMinutes)}</Info>
      </div>
      {row.pausedReason && row.availabilityStatus === "PAUSED" && (
        <div className="oq2-note oq2-note--warn">Paused: {row.pausedReason}</div>
      )}
      {row.failureReason && row.availabilityStatus === "FAILED" && (
        <div className="oq2-note oq2-note--danger">
          Failed: {row.failureReason}
          {row.remarks ? ` — ${row.remarks}` : ""}
        </div>
      )}
      {row.availabilityStatus === "BLOCKED" && (
        <div className="oq2-note">Waiting for the earlier operations in this order to finish.</div>
      )}
      {row.availabilityStatus === "ON_HOLD" && (
        <div className="oq2-note oq2-note--warn">The production order is on hold. Operations cannot continue.</div>
      )}
    </section>
  );
}

function InstructionsPanel({ row }) {
  const items = [
    { label: "Operation Instructions", value: row.instructions },
    { label: "Depends On Step(s)", value: (row.dependsOn || []).length ? row.dependsOn.map((n) => `#${n}`).join(", ") : "" },
    { label: "Remarks", value: row.remarks },
  ].filter((i) => i.value);

  return (
    <section className="oq-card">
      <header className="oq-card-head">
        <FileText size={18} />
        <h4>Job Instructions</h4>
      </header>
      {items.length === 0 ? (
        <div className="oq2-note">No special instructions were recorded for this operation.</div>
      ) : (
        <div className="oq-instructions">
          {items.map((item) => (
            <div key={item.label} className="oq-instruction">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ActionBar({ row, busy, onAction }) {
  const s = row.availabilityStatus;
  const canSkip = !isEssential(row) && ["READY", "BLOCKED", "PAUSED", "FAILED"].includes(s);

  return (
    <section className="oq-card oq-footer">
      <header className="oq-card-head oq-footer-head">
        <Play size={18} />
        <h4>Actions</h4>
      </header>
      <div className="oq-actions">
        {canSkip && (
          <button type="button" className="oq-btn oq-btn--outline" disabled={busy} onClick={() => onAction("SKIP")}>
            <SkipForward size={16} /> Skip
          </button>
        )}
        {(s === "IN_PROGRESS" || s === "PAUSED") && (
          <button type="button" className="oq-btn oq-btn--outline" disabled={busy} onClick={() => onAction("FAIL")}>
            <XCircle size={16} /> Report Failure
          </button>
        )}
        {s === "IN_PROGRESS" && (
          <button type="button" className="oq-btn oq-btn--outline" disabled={busy} onClick={() => onAction("PAUSE")}>
            <Pause size={16} /> Pause
          </button>
        )}
        {s === "READY" && (
          <button type="button" className="oq-btn oq-btn--primary oq-btn--lg" disabled={busy} onClick={() => onAction("START")}>
            <Play size={17} /> Start Operation
          </button>
        )}
        {s === "PAUSED" && (
          <button type="button" className="oq-btn oq-btn--primary oq-btn--lg" disabled={busy} onClick={() => onAction("RESUME")}>
            <Play size={17} /> Resume
          </button>
        )}
        {s === "FAILED" && (
          <button type="button" className="oq-btn oq-btn--primary oq-btn--lg" disabled={busy} onClick={() => onAction("RETRY")}>
            <RotateCcw size={17} /> Retry Operation
          </button>
        )}
        {s === "IN_PROGRESS" && (
          <button type="button" className="oq-btn oq-btn--primary oq-btn--lg" disabled={busy} onClick={() => onAction("COMPLETE")}>
            <Check size={17} strokeWidth={3} /> Complete Operation
          </button>
        )}
        {["BLOCKED", "ON_HOLD", "COMPLETED", "SKIPPED"].includes(s) && !canSkip && (
          <span className="oq2-muted">No actions available right now.</span>
        )}
      </div>
    </section>
  );
}

function OperationDetailView({ row, busy, detailTab, onDetailTabChange, onBack, onAction }) {
  const tone = STATUS_TONE[row.availabilityStatus] || "pending";
  return (
    <div className="oq-page">
      <PageHeader title="Operation Execution" >
        <span className={`oq-status-pill oq-status-pill--${tone}`}>
          <span className={`oq-dot oq-dot--${tone}`} />
          {STATUS_LABEL[row.availabilityStatus] || row.availabilityStatus}
        </span>
      </PageHeader>

      <div>
        <button type="button" className="oq-back" onClick={onBack}>
          <ChevronLeft size={16} /> Back to Queue
        </button>
      </div>

      <TaskSummary row={row} />

      <nav className="oq-detail-tabs" role="tablist">
        {DETAIL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={detailTab === tab.id}
            className={`oq-detail-tab ${detailTab === tab.id ? "oq-detail-tab--active" : ""}`}
            onClick={() => onDetailTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {detailTab === "EXECUTION" ? (
        <>
          <DetailsCard row={row} />
          <ActionBar row={row} busy={busy} onAction={onAction} />
        </>
      ) : (
        <InstructionsPanel row={row} />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Page                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export default function OperationQueuePage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState("ALL");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState("EXECUTION");
  const [modal, setModal] = useState(null); // { type, row }
  const [busy, setBusy] = useState(false);

  /* debounce the search box */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [filters.search]);

  const queueParams = useMemo(() => {
    const def = STATUS_TABS.find((t) => t.id === tab);
    const p = { page, limit: PAGE_SIZE };
    if (def?.status) p.status = def.status;
    if (debouncedSearch) p.search = debouncedSearch;
    if (filters.operation !== "ALL") p.operationCode = filters.operation;
    if (filters.priority !== "ALL") p.priority = filters.priority;
    if (filters.machine !== "ALL") p.machine = filters.machine;
    return p;
  }, [tab, page, debouncedSearch, filters.operation, filters.priority, filters.machine]);

  const loadCounts = useCallback(async () => {
    try {
      const c = await productionApi.getOperationQueueCounts();
      setCounts(c?.data || c);
    } catch (e) {
      /* the tabs simply show no numbers */
    }
  }, []);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await productionApi.getOperationQueue(queueParams);
      const list = Array.isArray(res?.data) ? res.data : res?.items || [];
      const sorted = [...list].sort((a, b) => {
        const pr = (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2);
        if (pr !== 0) return pr;

        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;

        if (a.productionNo !== b.productionNo) {
          return String(b.productionNo || "").localeCompare(String(a.productionNo || ""));
        }

        return (a.sequenceNo || 0) - (b.sequenceNo || 0);
      });
      setRows(sorted);
      setTotal(res?.total ?? res?.meta?.total ?? sorted.length);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(errorMessage(e, "Could not load the operation queue."));
    } finally {
      setLoading(false);
    }
  }, [queueParams]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const refreshAll = () => {
    loadQueue();
    loadCounts();
  };

  /* After an action, re-read the open operation so the view shows its new state */
  const reselect = useCallback(
    async (row) => {
      try {
        const res = await productionApi.getOperationQueue({ search: row.productionNo, limit: 200 });
        const list = Array.isArray(res?.data) ? res.data : res?.items || [];
        const fresh = list.find((r) => r.id === row.id);
        setSelected(fresh || null);
        if (!fresh) toast.info("This operation has left the queue.");
      } catch (e) {
        setSelected(null);
      }
    },
    []
  );

  const afterAction = async (row) => {
    refreshAll();
    await reselect(row);
  };

  /* Every filter runs on the server, so paging and the tab counts stay accurate */
  const visibleRows = rows;

  // Dropdown options come from the whole queue, not just the page on screen
  const machines = counts?.machines || [];
  const operationCodes = counts?.operationCodes || Object.keys(counts?.byOperation || {}).sort();

  const tabCounts = useMemo(() => {
    const out = {};
    if (!counts) return out;
    STATUS_TABS.forEach((t) => {
      if (t.id === "ALL") out[t.id] = counts.total;
      else out[t.id] = (t.keys || []).reduce((sum, k) => sum + (counts.byStatus?.[k] || 0), 0);
    });
    return out;
  }, [counts]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (key !== "search") setPage(1);
  };
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setDebouncedSearch("");
    setPage(1);
  };
  const changeTab = (id) => {
    setTab(id);
    setPage(1);
  };

  const openRow = (row) => {
    setSelected(row);
    setDetailTab("EXECUTION");
  };

  /* Actions that need no form run straight away; the rest open a modal */
  const runDirect = async (type, row) => {
    const id = row.id;
    setBusy(true);
    try {
      if (type === "CLAIM") {
        await productionApi.claimOperation(id);
        toast.success("Operation claimed.");
      } else if (type === "RESUME") {
        await productionApi.resumeOperation(id);
        toast.success("Operation resumed.");
      } else if (type === "RETRY") {
        await productionApi.retryOperation(id);
        toast.success("Operation reset. It is back in the queue.");
      }
      await afterAction(row);
    } catch (e) {
      toast.error(errorMessage(e, "That action could not be completed."));
    } finally {
      setBusy(false);
    }
  };

  const handleAction = (type) => {
    if (!selected) return;
    if (["CLAIM", "RESUME", "RETRY"].includes(type)) {
      runDirect(type, selected);
      return;
    }
    setModal({ type, row: selected });
  };

  const closeModal = () => setModal(null);
  const modalSuccess = () => {
    const row = modal?.row;
    if (row) afterAction(row);
  };

  const modalProps = modal
    ? {
        isOpen: true,
        operation: modalOperation(modal.row),
        productionOrder: modalOrder(modal.row),
        onClose: closeModal,
        onSuccess: modalSuccess,
      }
    : null;

  const modals = modalProps && (
    <>
      {modal.type === "START" && <OperationStartModal {...modalProps} />}
      {modal.type === "COMPLETE" && <OperationCompleteModal {...modalProps} />}
      {modal.type === "FAIL" && <OperationFailModal {...modalProps} />}
      {modal.type === "SKIP" && <OperationSkipModal {...modalProps} />}
      {modal.type === "PAUSE" && <OperationPauseModal {...modalProps} />}
    </>
  );

  /* ── Detail view ── */
  if (selected) {
    return (
      <>
        <OperationDetailView
          row={selected}
          busy={busy}
          detailTab={detailTab}
          onDetailTabChange={setDetailTab}
          onBack={() => setSelected(null)}
          onAction={handleAction}
        />
        {modals}
      </>
    );
  }

  /* ── List view ── */
  return (
    <div className="oq-page">
      <PageHeader title="Production Tracking"/>

      <StatusTabs activeTab={tab} counts={tabCounts} onChange={changeTab} />

      <FilterBar
        filters={filters}
        operations={operationCodes}
        machines={machines}
        onChange={updateFilter}
        onReset={resetFilters}
        onRefresh={refreshAll}
        refreshing={loading}
      />

      <QueueTable
        rows={visibleRows}
        loading={loading}
        error={error}
        onOpen={openRow}
        onReset={resetFilters}
        onRetry={refreshAll}
      />

      <Pager page={page} total={total} onChange={setPage} />
      {modals}
    </div>
  );
}