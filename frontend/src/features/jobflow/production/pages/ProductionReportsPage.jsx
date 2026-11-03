import "../styles/production-reports.css";
import "../styles/production-theme.css";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileDown, FileText, Printer, RefreshCw, Search } from "lucide-react";
import { toast } from "react-toastify";
import productionApi from "../api/productionApi";

const REPORT_TYPES = [
  { id: "SUMMARY", label: "1. Production Summary" },
  { id: "OP_PERFORMANCE", label: "2. Operation Performance" },
  { id: "MACHINE_UTILIZATION", label: "3. Machine Utilization"},
  { id: "OPERATOR_PRODUCTIVITY", label: "4. Operator Productivity" },
  { id: "PRODUCTION_WASTAGE", label: "5. Production Wastage" },
  { id: "REWORK_ANALYSIS", label: "6. Rework Analysis"},
  { id: "REPRINT_ANALYSIS", label: "7. Reprint Analysis"},
  { id: "DELIVERY_DELAYS", label: "8. Delivery Delay Analysis"},
  { id: "MATERIAL_CONSUMPTION", label: "9. Material Consumption" },
  { id: "JOB_HISTORY", label: "10. Job Production History"},
];

const DATE_PRESETS = [
  { id: "TODAY", label: "Today" },
  { id: "THIS_WEEK", label: "This Week" },
  { id: "THIS_MONTH", label: "This Month" },
  { id: "LAST_QUARTER", label: "Last 90 Days" },
  { id: "CUSTOM", label: "Custom Range" },
];

const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT", "RUSH"];

// Reports where a filter has no effect are hidden for that report
const FILTER_SUPPORT = {
  SUMMARY: { machine: true, operator: true, priority: true },
  OP_PERFORMANCE: { machine: true, operator: true },
  MACHINE_UTILIZATION: { machine: true, operator: true },
  OPERATOR_PRODUCTIVITY: { machine: true, operator: true },
  PRODUCTION_WASTAGE: { machine: true, operator: true },
  REWORK_ANALYSIS: { machine: true, operator: true },
  REPRINT_ANALYSIS: {},
  DELIVERY_DELAYS: { machine: true, operator: true, priority: true },
  MATERIAL_CONSUMPTION: { machine: true, operator: true, priority: true },
  JOB_HISTORY: { job: true },
};

const STATUS_COLORS = {
  COMPLETED: ["#dcfce7", "#15803d"],
  WITHIN: ["#dcfce7", "#15803d"],
  APPROVED: ["#dcfce7", "#15803d"],
  IN_PROGRESS: ["#dbeafe", "#1d4ed8"],
  IN_PRODUCTION: ["#dbeafe", "#1d4ed8"],
  QC: ["#dbeafe", "#1d4ed8"],
  PLANNED: ["#fef3c7", "#b45309"],
  PENDING: ["#fef3c7", "#b45309"],
  ON_HOLD: ["#fef3c7", "#b45309"],
  OVER: ["#ffedd5", "#c2410c"],
  UNPLANNED: ["#f1f5f9", "#475569"],
  UNASSIGNED: ["#f1f5f9", "#475569"],
  FAILED: ["#fee2e2", "#b91c1c"],
  REJECTED: ["#fee2e2", "#b91c1c"],
  CANCELLED: ["#fee2e2", "#b91c1c"],
  REWORK_REQUIRED: ["#ffedd5", "#c2410c"],
  REPRINT_REQUIRED: ["#ffedd5", "#c2410c"],
  QC_ISSUE: ["#ffedd5", "#c2410c"],
};

const pad = (n) => String(n).padStart(2, "0");
const toInputDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const presetRange = (preset) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === "TODAY") return { from: toInputDate(today), to: toInputDate(today) };
  if (preset === "THIS_WEEK") {
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return { from: toInputDate(monday), to: toInputDate(today) };
  }
  if (preset === "LAST_QUARTER") {
    const start = new Date(today);
    start.setDate(today.getDate() - 89);
    return { from: toInputDate(start), to: toInputDate(today) };
  }
  return { from: toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toInputDate(today) };
};

const unwrap = (res) => res?.data || res || {};
const listOf = (res) => {
  const d = unwrap(res);
  return Array.isArray(d) ? d : d.items || d.branches || [];
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d)
    ? "—"
    : d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const formatCell = (value, type) => {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "number") return Number(value).toLocaleString("en-US");
  if (type === "percent") return `${value}%`;
  if (type === "hours") return `${value} hrs`;
  if (type === "date") return formatDate(value);
  return String(value);
};

const prettyStatus = (s) => String(s || "").replace(/_/g, " ");

const efficiencyColor = (value) => (value >= 90 ? "#16a34a" : value >= 75 ? "#d97706" : "#dc2626");

const TONE_COLORS = { good: "#15803d", bad: "#b91c1c", warn: "#b45309", neutral: "#0f172a" };

const errorMessage = (err, fallback) => {
  const d = err?.response?.data;
  const details = Array.isArray(d?.details) ? d.details.map((x) => x?.message).filter(Boolean).join(" ") : "";
  return details || d?.message || err?.message || fallback;
};

function Cell({ column, value }) {
  if (column.type === "status") {
    if (!value) return "—";
    const [bg, fg] = STATUS_COLORS[value] || ["#f1f5f9", "#475569"];
    return (
      <span className="pr2-badge" style={{ background: bg, color: fg }}>
        {prettyStatus(value)}
      </span>
    );
  }
  if (column.type === "percent" && value !== null && value !== undefined && /efficiency|utilization|yield/i.test(column.key + column.label)) {
    return <strong style={{ color: efficiencyColor(value) }}>{value}%</strong>;
  }
  return formatCell(value, column.type);
}

export const ProductionReportsPage = () => {
  const [selectedReport, setSelectedReport] = useState("SUMMARY");
  const [preset, setPreset] = useState("THIS_MONTH");
  const [range, setRange] = useState(() => presetRange("THIS_MONTH"));
  const [branch, setBranch] = useState("ALL");
  const [machine, setMachine] = useState("ALL");
  const [operator, setOperator] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [jobInput, setJobInput] = useState("");
  const [jobNo, setJobNo] = useState("");

  const [branches, setBranches] = useState([]);
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  const meta = REPORT_TYPES.find((r) => r.id === selectedReport);
  const support = FILTER_SUPPORT[selectedReport] || {};

  useEffect(() => {
    productionApi.getBranches().then((r) => setBranches(listOf(r))).catch(() => setBranches([]));
    productionApi.getMachines({ lookup: true }).then((r) => setMachines(listOf(r))).catch(() => setMachines([]));
    productionApi.getOperators({ lookup: true }).then((r) => setOperators(listOf(r))).catch(() => setOperators([]));
  }, []);

  const params = useMemo(() => {
    const p = { from: range.from, to: range.to };
    if (branch !== "ALL") p.branchId = branch;
    if (support.machine && machine !== "ALL") p.machineId = machine;
    if (support.operator && operator !== "ALL") p.operatorId = operator;
    if (support.priority && priority !== "ALL") p.priority = priority;
    if (support.job && jobNo) p.jobNo = jobNo;
    return p;
  }, [range, branch, machine, operator, priority, jobNo, support.machine, support.operator, support.priority, support.job]);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    setPage(1);
    try {
      const res = await productionApi.getReport(selectedReport, params);
      if (requestId !== requestRef.current) return;
      setReport(unwrap(res));
    } catch (e) {
      if (requestId !== requestRef.current) return;
      setReport(null);
      setError(errorMessage(e, "Could not load this report."));
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [selectedReport, params]);

  useEffect(() => {
    load();
  }, [load]);

  const changePreset = (next) => {
    setPreset(next);
    if (next !== "CUSTOM") setRange(presetRange(next));
  };

  const changeDate = (key, value) => {
    setPreset("CUSTOM");
    setRange((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await productionApi.exportReport(selectedReport, params);
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const header = res.headers?.["content-disposition"] || "";
      const match = /filename="?([^";]+)"?/i.exec(header);
      const filename = match ? match[1] : `production-${selectedReport.toLowerCase()}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded. Open it with Excel.");
    } catch (e) {
      toast.error(errorMessage(e, "Could not export the report."));
    } finally {
      setExporting(false);
    }
  };

  const submitJob = (e) => {
    e.preventDefault();
    setJobNo(jobInput.trim());
    setPage(1);
  };

  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const rawColumns = report?.columns || [];
  const columns = useMemo(() => {
    return rawColumns
      .filter((c) => c.key !== "productionNo" && !/production\s*order/i.test(c.label || ""))
      .map((c) => {
        if (c.key === "jobNo") {
          return { ...c, label: "Job Order No" };
        }
        return c;
      });
  }, [rawColumns]);

  const rows = useMemo(() => {
    const rawRows = report?.rows || [];
    return rawRows.map((r) => ({
      ...r,
      jobNo: r.jobNo || r.productionNo || "-",
    }));
  }, [report?.rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const pagedRows = rows.slice(startIdx, startIdx + rowsPerPage);

  const pageNumbers = useMemo(() => {
    const list = [];
    const maxButtons = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }
    for (let i = start; i <= end; i++) list.push(i);
    return list;
  }, [currentPage, totalPages]);

  return (
    <div className="pr2-page">
      <div className="jf-card pr2-card">
        <div className="pr2-header-row">
          <div>
            <h2 className="pr2-title">Production Reports</h2>
            
          </div>

          <div className="pr2-no-print pr2-actions-bar">
            <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm pr2-btn" onClick={load} disabled={loading}>
              <RefreshCw size={14} /> {loading ? "Loading..." : "Refresh"}
            </button>
            <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm pr2-btn" onClick={handleExport} disabled={exporting || loading || rows.length === 0}>
              <FileDown size={14} /> {exporting ? "Exporting..." : "Export Excel (CSV)"}
            </button>
            <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm pr2-btn" onClick={() => window.print()} disabled={loading}>
              <FileText size={14} /> Save as PDF
            </button>
            <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm pr2-btn" onClick={() => window.print()} disabled={loading}>
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        <div className="pr2-filters pr2-no-print">
          <div>
            <label className="pr2-label">Report Category</label>
            <select className="jf-input jf-input-sm pr2-select-bold" value={selectedReport} onChange={(e) => setSelectedReport(e.target.value)}>
              {REPORT_TYPES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="pr2-label">Date Range</label>
            <select className="jf-input jf-input-sm" value={preset} onChange={(e) => changePreset(e.target.value)}>
              {DATE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {preset === "CUSTOM" && (
            <>
              <div>
                <label className="pr2-label">From</label>
                <input type="date" className="jf-input jf-input-sm" value={range.from} max={range.to || undefined} onChange={(e) => changeDate("from", e.target.value)} />
              </div>
              <div>
                <label className="pr2-label">To</label>
                <input type="date" className="jf-input jf-input-sm" value={range.to} min={range.from || undefined} onChange={(e) => changeDate("to", e.target.value)} />
              </div>
            </>
          )}

          {branches.length > 1 && (
            <div>
              <label className="pr2-label">Branch</label>
              <select className="jf-input jf-input-sm" value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {support.machine && (
            <div>
              <label className="pr2-label">Machine</label>
              <select className="jf-input jf-input-sm" value={machine} onChange={(e) => setMachine(e.target.value)}>
                <option value="ALL">All Machines</option>
                {machines.map((m) => (
                  <option key={m.id || m._id} value={m.id || m._id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          {support.operator && (
            <div>
              <label className="pr2-label">Operator</label>
              <select className="jf-input jf-input-sm" value={operator} onChange={(e) => setOperator(e.target.value)}>
                <option value="ALL">All Operators</option>
                {operators.map((o) => (
                  <option key={o.id || o._id} value={o.id || o._id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          {support.priority && (
            <div>
              <label className="pr2-label">Priority</label>
              <select className="jf-input jf-input-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="ALL">All Priorities</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          {support.job && (
            <form onSubmit={submitJob}>
              <label className="pr2-label">Job Order No</label>
              <div className="pr2-job">
                <input className="jf-input jf-input-sm" placeholder="e.g. JOB-20261103-0001" value={jobInput} onChange={(e) => setJobInput(e.target.value)} />
                <button type="submit" className="jf-btn jf-btn-secondary jf-btn-sm pr2-btn">
                  <Search size={14} /> Find
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="jf-card pr2-card">
        <div className="pr2-report-header">
          <h3 className="pr2-report-title">{meta?.label}</h3>
          <span className="pr2-report-desc">{meta?.desc}</span>
          <div className="pr2-print-title">
            {range.from} to {range.to}
          </div>
        </div>

        {error && (
          <div className="pr2-error" role="alert">
            <span>{error}</span>
            <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm pr2-no-print" onClick={load}>Retry</button>
          </div>
        )}

        <div className="pr2-table-wrap">
          <table className="jf-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={c.align === "right" ? "pr2-right" : undefined}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={Math.max(columns.length, 1)} className="pr2-empty">Loading report...</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(columns.length, 1)} className="pr2-empty">
                    {report?.note && selectedReport === "JOB_HISTORY" ? report.note : "No data for the selected filters."}
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, i) => (
                  <tr key={`${selectedReport}-${startIdx + i}`}>
                    {columns.map((c, ci) => (
                      <td key={c.key} className={c.align === "right" ? "pr2-right" : undefined}>
                        {ci === 0 ? <strong><Cell column={c} value={row[c.key]} /></strong> : <Cell column={c} value={row[c.key]} />}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="pr2-card-foot">
          <span className="pr2-showing">
            {rows.length === 0
              ? "Showing 0 records"
              : `Showing ${startIdx + 1} to ${Math.min(startIdx + rowsPerPage, rows.length)} of ${rows.length} records`}
          </span>
          <nav className="pr2-pager" aria-label="Pagination">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                className={n === currentPage ? "is-active" : ""}
                onClick={() => setPage(n)}
                aria-current={n === currentPage ? "page" : undefined}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </nav>
        </footer>

        {report?.truncated && <p className="pr2-note">Showing the first {rows.length} rows. Narrow the date range to see the rest.</p>}
        {report?.note && rows.length > 0 && <p className="pr2-note">{report.note}</p>}
      </div>
    </div>
  );
};

export default ProductionReportsPage;