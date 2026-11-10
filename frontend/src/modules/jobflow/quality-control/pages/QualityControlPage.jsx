import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ClipboardCheck, FileDown, RefreshCw } from "lucide-react";
import JobFlowLayout from "../../../../layouts/JobFlowLayout/JobFlowLayout";
import PriorityBadge from "../../shared/components/PriorityBadge";
import JobFlowDataTable from "../../shared/components/JobFlowDataTable";
import EnhancedQCModal from "../components/EnhancedQCModal";
import qcApi from "../api/qcApi";
import "../styles/quality-control.css";

/**
 * Quality Control
 * - Inspection Queue: production orders that finished production and wait for inspection (from the server).
 * - History & Reports: every saved inspection (from the server). Nothing on this page is sample data.
 * Rework and reprint steps are tracked in Production > Rework & Reprint.
 */

const listOf = (res) => {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d;
  return d?.items || d?.data || [];
};

const errorMessage = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

const fmtDateTime = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const pill = (label, bg, color) => (
  <span style={{ display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap", background: bg, color }}>
    {label}
  </span>
);

const resultPill = (result) => {
  if (result === "PASS") return pill("Passed", "#dcfce7", "#15803d");
  if (result === "CONDITIONAL") return pill("Conditional", "#fef3c7", "#b45309");
  return pill("Issue found", "#fee2e2", "#b91c1c");
};

const actionLabel = (a) => (a === "REWORK" ? "Rework" : a === "REPRINT" ? "Reprint" : "—");

const defectsSummary = (c) => {
  const text = (c.defects || []).map((d) => d.description || d.code).filter(Boolean).join(", ");
  return text || c.issueDetails || "—";
};

const checkJobNo = (c) => c.jobOrderId?.jobNo || "—";
const checkCustomer = (c) => c.jobOrderId?.customerName || c.jobOrderId?.customerSnapshot?.name || "—";
const checkInspector = (c) => c.inspectorId?.name || c.checkedBy?.name || "—";

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "ALL", label: "All time" },
];

const Stat = ({ label, value, sub }) => (
  <div className="jf-card" style={{ padding: "1rem 1.25rem", minWidth: 0 }}>
    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginTop: "0.25rem" }}>{value}</div>
    {sub ? <div style={{ fontSize: "0.8125rem", color: "#64748b" }}>{sub}</div> : null}
  </div>
);

const TabButton = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="jf-btn"
    style={{
      padding: "0.55rem 1rem",
      borderRadius: "8px",
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      border: active ? "1px solid var(--jf-primary, #059669)" : "1px solid #cbd5e1",
      background: active ? "var(--jf-primary, #059669)" : "#ffffff",
      color: active ? "#ffffff" : "#334155",
      boxShadow: active ? "0 2px 4px rgba(21,128,61,0.2)" : "none",
    }}
  >
    {children}
  </button>
);

export const QualityControlPage = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const preselectedOrderId = searchParams.get("orderId");
  const preselectedJobId = searchParams.get("jobId");

  const [pending, setPending] = useState([]);
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspecting, setInspecting] = useState(null);

  // "queue" or "history"; inside history: ALL | PASSED | ISSUES | REPORTS
  const [tab, setTab] = useState(["history", "reports", "passed", "failed"].includes(tabParam) ? "history" : "queue");
  const [historyView, setHistoryView] = useState(
    tabParam === "reports" ? "REPORTS" : tabParam === "passed" ? "PASSED" : tabParam === "failed" ? "ISSUES" : "ALL"
  );
  const [range, setRange] = useState("30");

  const load = useCallback(async () => {
    setLoading(true);
    const [p, c] = await Promise.allSettled([qcApi.getPendingQualityChecks(), qcApi.getQualityChecks({ limit: 500 })]);
    if (p.status === "fulfilled") {
      setPending(listOf(p.value));
    } else {
      setPending([]);
      toast.error(errorMessage(p.reason, "Could not load the inspection queue."));
    }
    if (c.status === "fulfilled") {
      setChecks(listOf(c.value));
    } else {
      setChecks([]);
      toast.error(errorMessage(c.reason, "Could not load the inspection history."));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Opened from another page with ?orderId= or ?jobId=: go straight to that inspection
  useEffect(() => {
    if (loading || (!preselectedOrderId && !preselectedJobId)) return;
    const match = pending.find(
      (o) =>
        (preselectedOrderId && String(o._id || o.id) === preselectedOrderId) ||
        (preselectedJobId && (String(o.jobOrderId?._id || o.jobOrderId) === preselectedJobId || o.jobNo === preselectedJobId))
    );
    if (match) setInspecting(match);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("orderId");
        next.delete("jobId");
        return next;
      },
      { replace: true }
    );
  }, [loading, pending, preselectedOrderId, preselectedJobId, setSearchParams]);

  const inRange = useMemo(() => {
    if (range === "ALL") return checks;
    const since = Date.now() - Number(range) * 86400000;
    return checks.filter((c) => new Date(c.checkedAt || c.createdAt || 0).getTime() >= since);
  }, [checks, range]);

  const passedChecks = useMemo(() => inRange.filter((c) => c.result === "PASS" || c.result === "CONDITIONAL"), [inRange]);
  const issueChecks = useMemo(() => inRange.filter((c) => c.result !== "PASS" && c.result !== "CONDITIONAL"), [inRange]);
  const passRate = inRange.length > 0 ? Math.round((passedChecks.length / inRange.length) * 100) : 0;

  const historyRows = historyView === "PASSED" ? passedChecks : historyView === "ISSUES" ? issueChecks : inRange;

  /* ---------- Reports (computed from the saved inspections) ---------- */
  const report = useMemo(() => {
    const unitsChecked = inRange.reduce((s, c) => s + (Number(c.quantityChecked) || 0), 0);
    const unitsAccepted = inRange.reduce((s, c) => s + (Number(c.acceptedQty) || 0), 0);
    const unitsRejected = inRange.reduce((s, c) => s + (Number(c.rejectedQty) || 0), 0);

    const defects = {};
    inRange.forEach((c) => {
      (c.defects || []).forEach((d) => {
        const key = d.description || d.code;
        if (!key) return;
        const row = (defects[key] = defects[key] || { type: key, count: 0, affected: 0 });
        row.count += 1;
        row.affected += Number(d.affectedQuantity) || 0;
      });
    });
    const defectRows = Object.values(defects).sort((a, b) => b.count - a.count).slice(0, 10);
    const defectTotal = defectRows.reduce((s, r) => s + r.count, 0);

    const people = {};
    inRange.forEach((c) => {
      const name = checkInspector(c);
      const row = (people[name] = people[name] || { name, total: 0, passed: 0, issues: 0 });
      row.total += 1;
      if (c.result === "PASS" || c.result === "CONDITIONAL") row.passed += 1;
      else row.issues += 1;
    });
    const inspectorRows = Object.values(people).sort((a, b) => b.total - a.total);

    return { unitsChecked, unitsAccepted, unitsRejected, defectRows, defectTotal, inspectorRows };
  }, [inRange]);

  const exportCsv = () => {
    if (inRange.length === 0) {
      toast.info("There are no inspections in this period to export.");
      return;
    }
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Date", "Job No", "Customer", "Checked", "Accepted", "Rejected", "Result", "Action", "Inspector", "Defects"];
    const lines = inRange.map((c) =>
      [
        fmtDateTime(c.checkedAt),
        checkJobNo(c),
        checkCustomer(c),
        c.quantityChecked ?? "",
        c.acceptedQty ?? "",
        c.rejectedQty ?? "",
        c.result,
        actionLabel(c.correctiveAction),
        checkInspector(c),
        defectsSummary(c),
      ]
        .map(esc)
        .join(",")
    );
    const blob = new Blob([[header.map(esc).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qc-inspections-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- Tables ---------- */
  const queueColumns = [
    {
      key: "jobNo",
      label: "Job No",
      sortable: true,
      minWidth: "170px",
      render: (val, row) => (
        <div style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>{val || "—"}</div>
      ),
    },
    { key: "priority", label: "Priority", sortable: true, render: (val) => <PriorityBadge priority={val} /> },
    { key: "customerName", label: "Customer", sortable: true, render: (val) => val || "—" },
    { key: "productName", label: "Product", sortable: true, render: (val) => val || "—" },
    {
      key: "quantity",
      label: "Qty to Inspect",
      sortable: true,
      render: (val) => <strong>{Number(val || 0).toLocaleString()}</strong>,
    },
    {
      key: "cycleType",
      label: "Type",
      render: (val, row) =>
        val === "REWORK" || val === "REPRINT" || (row.cycleNo || 0) > 0
          ? pill(val === "REPRINT" ? "Reprint re-check" : "Rework re-check", "#ede9fe", "#6d28d9")
          : pill("First inspection", "#f1f5f9", "#475569"),
    },
    { key: "updatedAt", label: "Ready Since", sortable: true, render: (val) => fmtDateTime(val) },
    {
      key: "actions",
      label: "Action",
      sortable: false,
      align: "right",
      render: (_, row) => (
        <button type="button" className="jf-btn jf-btn-primary jf-btn-sm" onClick={() => setInspecting(row)}>
          Inspect
        </button>
      ),
    },
  ];

  const historyColumns = [
    { key: "checkedAt", label: "Date", sortable: true, render: (val) => fmtDateTime(val) },
    {
      key: "jobOrderId",
      label: "Job No",
      render: (_, c) => (
        <div style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>{checkJobNo(c)}</div>
      ),
    },
    { key: "customer", label: "Customer", render: (_, c) => checkCustomer(c) },
    { key: "quantityChecked", label: "Checked", sortable: true, render: (v) => Number(v || 0).toLocaleString() },
    { key: "acceptedQty", label: "Accepted", sortable: true, render: (v) => <span style={{ color: "#15803d", fontWeight: 600 }}>{Number(v || 0).toLocaleString()}</span> },
    { key: "rejectedQty", label: "Rejected", sortable: true, render: (v) => <span style={{ color: Number(v) > 0 ? "#b91c1c" : "#64748b", fontWeight: 600 }}>{Number(v || 0).toLocaleString()}</span> },
    { key: "result", label: "Result", sortable: true, render: (v) => resultPill(v) },
    { key: "correctiveAction", label: "Action", render: (v) => actionLabel(v) },
    { key: "inspector", label: "Inspector", render: (_, c) => checkInspector(c) },
    {
      key: "defects",
      label: "Defects",
      render: (_, c) => (
        <span title={defectsSummary(c)} style={{ display: "inline-block", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}>
          {defectsSummary(c)}
        </span>
      ),
    },
  ];

  /* ---------- Page ---------- */
  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <TabButton active={tab === "queue"} onClick={() => setTab("queue")}>Inspection Queue ({pending.length})</TabButton>
          <TabButton active={tab === "history"} onClick={() => setTab("history")}>History &amp; Reports</TabButton>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          {tab === "history" && (
            <select className="jf-input jf-input-sm" value={range} onChange={(e) => setRange(e.target.value)} style={{ width: "160px", height: "40px", fontWeight: 600 }}>
              {RANGES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          )}
          <button type="button" className="jf-btn jf-btn-secondary" onClick={() => navigate("/production/rework")}>
            Rework &amp; Reprint
          </button>
          <button type="button" className="jf-btn jf-btn-secondary" onClick={load} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <RefreshCw size={14} /> {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {tab === "queue" && (
        <JobFlowDataTable
          columns={queueColumns}
          data={pending}
          loading={loading}
          sortable
          sortControls={false}
          searchPlaceholder="Search by job, customer or product..."
          searchKeys={["jobNo", "customerName", "productName"]}
          rowKey="_id"
          emptyMessage="Nothing is waiting for inspection. Orders appear here when their last production step is completed."
        />
      )}

      {tab === "history" && (
        <>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <TabButton active={historyView === "ALL"} onClick={() => setHistoryView("ALL")}>All ({inRange.length})</TabButton>
              <TabButton active={historyView === "PASSED"} onClick={() => setHistoryView("PASSED")}>Passed ({passedChecks.length})</TabButton>
              <TabButton active={historyView === "ISSUES"} onClick={() => setHistoryView("ISSUES")}>Issues ({issueChecks.length})</TabButton>
              <TabButton active={historyView === "REPORTS"} onClick={() => setHistoryView("REPORTS")}>Reports</TabButton>
            </div>
            <button type="button" className="jf-btn jf-btn-secondary" onClick={exportCsv} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <FileDown size={15} /> Export CSV
            </button>
          </div>

          {historyView !== "REPORTS" ? (
            <JobFlowDataTable
              key={`history-${historyView}`}
              columns={historyColumns}
              data={historyRows}
              loading={loading}
              sortable
              sortControls={false}
              defaultSortKey="checkedAt"
              defaultSortDir="desc"
              searchPlaceholder="Search by job or customer..."
              searchKeys={["jobOrderId.jobNo", "jobOrderId.customerName"]}
              rowKey="_id"
              emptyMessage="No inspections in this period."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <Stat label="Inspections" value={inRange.length} />
                <Stat label="Units checked" value={report.unitsChecked.toLocaleString()} />
                <Stat
                  label="Units accepted"
                  value={report.unitsChecked > 0 ? `${Math.round((report.unitsAccepted / report.unitsChecked) * 100)}%` : "—"}
                  sub={`${report.unitsAccepted.toLocaleString()} units`}
                />
                <Stat label="Units rejected" value={report.unitsRejected.toLocaleString()} />
              </div>

              <div className="jf-card" style={{ padding: "1.25rem" }}>
                <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700 }}>Defects logged</h3>
                {report.defectRows.length === 0 ? (
                  <p style={{ margin: 0, color: "#64748b" }}>No defects were logged in this period.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="jf-table">
                      <thead>
                        <tr>
                          <th>Defect</th>
                          <th style={{ textAlign: "right" }}>Times logged</th>
                          <th style={{ textAlign: "right" }}>Pieces affected</th>
                          <th style={{ textAlign: "right" }}>Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.defectRows.map((r) => (
                          <tr key={r.type}>
                            <td style={{ fontWeight: 600, color: "#0f172a" }}>{r.type}</td>
                            <td style={{ textAlign: "right" }}>{r.count}</td>
                            <td style={{ textAlign: "right" }}>{r.affected.toLocaleString()}</td>
                            <td style={{ textAlign: "right" }}>{report.defectTotal > 0 ? `${Math.round((r.count / report.defectTotal) * 100)}%` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="jf-card" style={{ padding: "1.25rem" }}>
                <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 700 }}>By inspector</h3>
                {report.inspectorRows.length === 0 ? (
                  <p style={{ margin: 0, color: "#64748b" }}>No inspections in this period.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="jf-table">
                      <thead>
                        <tr>
                          <th>Inspector</th>
                          <th style={{ textAlign: "right" }}>Inspections</th>
                          <th style={{ textAlign: "right" }}>Passed</th>
                          <th style={{ textAlign: "right" }}>Issues</th>
                          <th style={{ textAlign: "right" }}>Pass rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.inspectorRows.map((r) => (
                          <tr key={r.name}>
                            <td style={{ fontWeight: 600, color: "#0f172a" }}>{r.name}</td>
                            <td style={{ textAlign: "right" }}>{r.total}</td>
                            <td style={{ textAlign: "right" }}>{r.passed}</td>
                            <td style={{ textAlign: "right" }}>{r.issues}</td>
                            <td style={{ textAlign: "right" }}>{Math.round((r.passed / r.total) * 100)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {inspecting && (
        <EnhancedQCModal
          isOpen
          productionOrder={inspecting}
          onClose={() => setInspecting(null)}
          onSuccess={() => {
            setInspecting(null);
            load();
          }}
        />
      )}
    </div>
  );

  if (embedded) return content;
  return <JobFlowLayout title="Quality Control">{content}</JobFlowLayout>;
};

export default QualityControlPage;