import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  MapPin,
  Calendar,
  ChevronDown,
  ClipboardList,
  Play,
  CheckCircle2,
  Clock,
  RotateCcw,
  Printer,
  Bell,
  RefreshCw,
} from "lucide-react";
import productionApi from "../api/productionApi";
import "../styles/production-dashboard.css";
import "../styles/production-theme.css";

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

const pad = (n) => String(n).padStart(2, "0");
const toInputDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const defaultRange = () => {
  const now = new Date();
  return { from: toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toInputDate(now) };
};

const unwrap = (res) => res?.data || res || {};
const listOf = (res) => {
  const d = unwrap(res);
  return Array.isArray(d) ? d : d.items || d.branches || [];
};

const formatShort = (value) => {
  const d = new Date(value);
  return isNaN(d) ? "" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const formatDay = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const DISTRIBUTION_COLORS = {
  UNASSIGNED: "#f59e0b",
  PLANNED: "#38bdf8",
  IN_PRODUCTION: "#14532d",
  QC: "#8b5cf6",
  ON_HOLD: "#ef4444",
  COMPLETED: "#16a34a",
  CANCELLED: "#94a3b8",
};

const MACHINE_COLORS = ["#14532d", "#16a34a", "#4ade80", "#86efac", "#bbf7d0"];

const ALERT_BADGES = {
  Delay: "pdb-badge-delay",
  Hold: "pdb-badge-maintenance",
  Failure: "pdb-badge-delay",
  Paused: "pdb-badge-maintenance",
  Approval: "pdb-badge-inventory",
};

const niceMax = (value) => {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value / 4) * magnitude;
  return Math.ceil(value / step) * step;
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Charts                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

function OrderStatusDonut({ data, total }) {
  const radius = 55;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;
  const slices = total
    ? data.map((item) => {
        const fraction = item.count / total;
        const slice = {
          ...item,
          strokeDasharray: `${fraction * circumference} ${circumference}`,
          strokeDashoffset: -currentOffset,
        };
        currentOffset += fraction * circumference;
        return slice;
      })
    : [];

  return (
    <div className="pdb-donut-visual">
      <svg width="140" height="140" viewBox="0 0 140 140" className="pdb-donut-svg">
        <circle cx="70" cy="70" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        {slices.map((slice) => (
          <circle
            key={slice.key}
            cx="70"
            cy="70"
            r={radius}
            fill="transparent"
            stroke={slice.color}
            strokeWidth={strokeWidth}
            strokeDasharray={slice.strokeDasharray}
            strokeDashoffset={slice.strokeDashoffset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="pdb-donut-center-text">
        <div className="pdb-donut-total">{total}</div>
        <div className="pdb-donut-sub">Total Orders</div>
      </div>
    </div>
  );
}

function ProductionProgressBarChart({ items }) {
  const maxData = Math.max(0, ...items.map((i) => Math.max(i.planned, i.completed)));
  const maxVal = niceMax(maxData);
  const ticks = [0, 1, 2, 3, 4].map((i) => (maxVal / 4) * i);
  const chartHeight = 150;
  const chartWidth = 460;
  const barWidth = 14;
  const gapBetweenBars = 3;
  const groupWidth = barWidth * 2 + gapBetweenBars;

  if (items.length === 0 || maxData === 0) {
    return <div className="pdb2-empty">No planned or completed quantity in this period.</div>;
  }

  return (
    <div className="pdb-bar-chart-wrap">
      <svg className="pdb-bar-chart-svg" viewBox={`0 0 ${chartWidth} 190`} preserveAspectRatio="none">
        {ticks.map((yVal) => {
          const yPos = chartHeight - (yVal / maxVal) * chartHeight + 15;
          return (
            <g key={yVal}>
              <line x1="45" y1={yPos} x2={chartWidth} y2={yPos} stroke="#f1f5f9" strokeWidth="1" />
              <text x="35" y={yPos + 4} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="inherit">
                {Math.round(yVal).toLocaleString()}
              </text>
            </g>
          );
        })}

        {items.map((item, idx) => {
          const groupX = 60 + idx * ((chartWidth - 75) / (items.length - 1 || 1)) - groupWidth / 2;
          const hPlanned = (item.planned / maxVal) * chartHeight;
          const hCompleted = (item.completed / maxVal) * chartHeight;
          const label = formatShort(item.date);

          return (
            <g key={idx}>
              <rect x={groupX} y={chartHeight - hCompleted + 15} width={barWidth} height={hCompleted} fill="#134e3a" rx="3">
                <title>{`${label} - Completed: ${item.completed.toLocaleString()} pcs`}</title>
              </rect>
              <rect x={groupX + barWidth + gapBetweenBars} y={chartHeight - hPlanned + 15} width={barWidth} height={hPlanned} fill="#6ee7b7" rx="3">
                <title>{`${label} - Planned: ${item.planned.toLocaleString()} pcs`}</title>
              </rect>
              <text x={groupX + groupWidth / 2} y={chartHeight + 32} fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="inherit">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* KPI card                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

// goodWhen: which direction is good news for this metric
function KpiCard({ icon, iconClass, label, kpi, goodWhen = "up" }) {
  const trend = kpi?.trend;
  let badge = null;
  if (trend !== null && trend !== undefined) {
    const up = trend > 0;
    const flat = trend === 0;
    const good = flat ? true : up === (goodWhen === "up");
    const cls = flat ? "pdb2-trend-flat" : up ? (good ? "up-good" : "up-warn") : good ? "down-good" : "pdb2-down-warn";
    badge = (
      <span className={`pdb-trend-badge ${cls}`}>
        {flat ? "—" : up ? "↑" : "↓"} {Math.abs(trend)}%
      </span>
    );
  }

  return (
    <div className="pdb-kpi-card">
      <div className="pdb-kpi-top">
        <span className={`pdb-kpi-icon ${iconClass}`}>{icon}</span>
        <span className="pdb-kpi-label">{label}</span>
      </div>
      <div className="pdb-kpi-value">{kpi?.value ?? 0}</div>
      <div className="pdb-kpi-trend">
        {badge ? (
          <>
            {badge}
            <span className="pdb-trend-sub">vs previous period</span>
          </>
        ) : (
          <span className="pdb-trend-sub">{kpi?.trend === null ? "Current count" : ""}</span>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Page                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export default function ProductionDashboardPage() {
  const navigate = useNavigate();
  const [branch, setBranch] = useState("ALL");
  const [range, setRange] = useState(defaultRange);
  const [branches, setBranches] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  useEffect(() => {
    productionApi.getBranches().then((r) => setBranches(listOf(r))).catch(() => setBranches([]));
  }, []);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    try {
      const params = { from: range.from, to: range.to };
      if (branch !== "ALL") params.branchId = branch;
      const res = await productionApi.getProductionDashboard(params);
      if (requestId !== requestRef.current) return;
      setData(unwrap(res));
    } catch (e) {
      if (requestId !== requestRef.current) return;
      setError(e?.response?.data?.message || e?.message || "Could not load the dashboard.");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [range, branch]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = data?.kpis || {};
  const totalOrders = data?.totalOrders || 0;

  const donutData = useMemo(
    () =>
      (data?.distribution || []).map((d) => ({
        ...d,
        color: DISTRIBUTION_COLORS[d.key] || "#94a3b8",
        pct: totalOrders ? `${Math.round((d.count / totalOrders) * 100)}%` : "0%",
      })),
    [data, totalOrders]
  );

  const updateRange = (key, value) => setRange((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="pdb-container">
      <header className="pdb-header">
        <div className="pdb-header-left">
          <div className="pdb-header-icon" title="Production Performance">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="pdb-title">Production Dashboard</h1>
            
          </div>
        </div>

        <div className="pdb-header-right">
          {branches.length > 1 && (
            <div className="pdb-control-pill">
              <MapPin size={16} color="#134e3a" />
              <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Select Branch">
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b._id || b.id} value={b._id || b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} color="#64748b" />
            </div>
          )}

          <div className="pdb-control-pill">
            <Clock size={15} color="#64748b" />
            <input type="date" className="pdb2-date" aria-label="From date" value={range.from} max={range.to || undefined} onChange={(e) => updateRange("from", e.target.value)} />
            <span>-</span>
            <input type="date" className="pdb2-date" aria-label="To date" value={range.to} min={range.from || undefined} onChange={(e) => updateRange("to", e.target.value)} />
            <Calendar size={15} color="#64748b" />
          </div>

          <button type="button" className="pdb2-refresh" onClick={load} disabled={loading}>
            <RefreshCw size={14} /> {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div className="pdb2-error" role="alert">
          <span>{error}</span>
          <button type="button" className="pdb2-refresh" onClick={load}>Retry</button>
        </div>
      )}

      <div className={`pdb-contents-wrap ${loading && data ? "pdb2-loading" : ""}`}>
        <section className="pdb-kpi-row">
          <KpiCard icon={<ClipboardList size={26} />} iconClass="icon-green-flat" label="Total Production Orders" kpi={kpis.totalOrders} />
          <KpiCard icon={<Play size={15} fill="#ffffff" />} iconClass="icon-green-circle" label="In Production" kpi={kpis.inProduction} />
          <KpiCard icon={<CheckCircle2 size={18} />} iconClass="icon-green-check" label="Completed" kpi={kpis.completed} />
          <KpiCard icon={<Clock size={16} />} iconClass="icon-amber-circle" label="Pending Planning" kpi={kpis.pendingPlanning} />
          <KpiCard icon={<RotateCcw size={16} />} iconClass="icon-teal-circle" label="Rework in Production" kpi={kpis.rework} goodWhen="down" />
          <KpiCard icon={<Printer size={26} />} iconClass="icon-printer-flat" label="Reprint Batches" kpi={kpis.reprints} goodWhen="down" />
        </section>

        <section className="pdb-charts-row">
          <div className="pdb-card">
            <div className="pdb-card-header">
              <h3 className="pdb-card-title">Production Progress</h3>
              <div className="pdb-chart-legend">
                <span className="pdb-legend-item">
                  <span className="pdb-legend-dot dot-planned" /> Planned Qty
                </span>
                <span className="pdb-legend-item">
                  <span className="pdb-legend-dot dot-completed" /> Completed Qty
                </span>
              </div>
            </div>
            <ProductionProgressBarChart items={data?.progress || []} />
          </div>

          <div className="pdb-card">
            <div className="pdb-card-header">
              <h3 className="pdb-card-title">Order Status Distribution</h3>
            </div>
            {totalOrders === 0 ? (
              <div className="pdb2-empty">No production orders created in this period.</div>
            ) : (
              <div className="pdb-donut-content">
                <OrderStatusDonut data={donutData} total={totalOrders} />
                <div className="pdb-donut-legend-list">
                  {donutData.map((d) => (
                    <div key={d.key} className="pdb-donut-legend-row">
                      <span className="pdb-donut-label">
                        <span className="pdb-legend-dot" style={{ backgroundColor: d.color }} />
                        {d.label}
                      </span>
                      <span className="pdb-donut-val">
                        {d.count} ({d.pct})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pdb-card">
            <div className="pdb-card-header">
              <h3 className="pdb-card-title">Machine Utilization</h3>
            </div>
            {(data?.machines || []).length === 0 ? (
              <div className="pdb2-empty">No machine activity in this period.</div>
            ) : (
              <div className="pdb-machine-list">
                {data.machines.map((m, idx) => (
                  <div key={m.id} className="pdb-machine-item">
                    <span className="pdb-machine-name" title={m.name}>
                      {m.name}
                    </span>
                    <div className="pdb-machine-bar-track">
                      <div className="pdb-machine-bar-fill" style={{ width: `${m.utilization}%`, backgroundColor: MACHINE_COLORS[idx % MACHINE_COLORS.length] }} />
                    </div>
                    <span className="pdb-machine-pct">{m.utilization}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="pdb-bottom-grid">
          <div className="pdb-bottom-col">
            <div className="pdb-card">
              <div className="pdb-card-header">
                <h3 className="pdb-card-title">
                  <ClipboardList size={18} color="#16a34a" />
                  Ongoing Production Orders
                </h3>
                <button type="button" className="pdb-card-link" onClick={() => navigate("/production/orders")}>
                  View All
                </button>
              </div>
              <div className="pdb-table-wrap">
                <table className="pdb-table">
                  <thead>
                    <tr>
                      <th className="pdb-col-num">#</th>
                      <th>PO Number</th>
                      <th>Job Number</th>
                      <th>Product</th>
                      <th>Planned Qty</th>
                      <th>Completed Qty</th>
                      <th>Progress</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.ongoingOrders || []).length === 0 ? (
                      <tr>
                        <td colSpan={9} className="pdb2-empty">{loading ? "Loading..." : "No orders are in production right now."}</td>
                      </tr>
                    ) : (
                      data.ongoingOrders.map((row, idx) => (
                        <tr key={row.id}>
                          <td className="pdb-col-num">{idx + 1}</td>
                          <td className="pdb-strong">{row.productionNo}</td>
                          <td className="pdb-muted">{row.jobNo || "—"}</td>
                          <td>{row.product || "—"}</td>
                          <td>{Number(row.plannedQty).toLocaleString()}</td>
                          <td>{Number(row.completedQty).toLocaleString()}</td>
                          <td>
                            <div className="pdb-table-progress">
                              <div className="pdb-t-prog-track">
                                <div className="pdb-t-prog-fill" style={{ width: `${row.progress}%` }} />
                              </div>
                              <span className="pdb-t-prog-text">{row.progress}%</span>
                            </div>
                          </td>
                          <td>
                            <span className="pdb-badge pdb-badge-in-prod">In Production</span>
                          </td>
                          <td>
                            <button type="button" className="pdb-btn-view" onClick={() => navigate("/production/orders")}>
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pdb-card">
              <div className="pdb-card-header">
                <h3 className="pdb-card-title">
                  <Clock size={18} color="#f59e0b" />
                  Pending Planning Orders
                </h3>
                <button type="button" className="pdb-card-link" onClick={() => navigate("/production/planning")}>
                  View All
                </button>
              </div>
              <div className="pdb-table-wrap">
                <table className="pdb-table">
                  <thead>
                    <tr>
                      <th className="pdb-col-num">#</th>
                      <th>PO Number</th>
                      <th>Job Number</th>
                      <th>Customer</th>
                      <th>Product</th>
                      <th>Total Qty</th>
                      <th>Required Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.pendingPlanning || []).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="pdb2-empty">{loading ? "Loading..." : "Nothing is waiting to be planned."}</td>
                      </tr>
                    ) : (
                      data.pendingPlanning.map((row, idx) => (
                        <tr key={row.id}>
                          <td className="pdb-col-num">{idx + 1}</td>
                          <td className="pdb-strong">{row.productionNo}</td>
                          <td className="pdb-muted">{row.jobNo || "—"}</td>
                          <td>{row.customer || "—"}</td>
                          <td>{row.product || "—"}</td>
                          <td>{Number(row.totalQty).toLocaleString()}</td>
                          <td className="pdb-muted">{formatDay(row.requiredDate)}</td>
                          <td>
                            <button
                              type="button"
                              className="pdb-btn-plan"
                              onClick={() => navigate("/production/planning", { state: { jobNo: row.jobNo, productionOrderId: row.id } })}
                            >
                              Plan
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="pdb-bottom-col">
            <div className="pdb-card">
              <div className="pdb-card-header">
                <h3 className="pdb-card-title">
                  <RotateCcw size={18} color="#16a34a" />
                  Rework &amp; Reprint Status
                </h3>
                <button type="button" className="pdb-card-link" onClick={() => navigate("/production/rework")}>
                  View All
                </button>
              </div>
              <div className="pdb-table-wrap">
                <table className="pdb-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Total</th>
                      <th>Pending</th>
                      <th>In Production</th>
                      <th>Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.corrections || [{ type: "Rework" }, { type: "Reprint" }]).map((row) => {
                      const Icon = row.type === "Rework" ? RotateCcw : Printer;
                      return (
                        <tr key={row.type}>
                          <td>
                            <span className="pdb-type-cell">
                              <Icon size={14} color="#1e293b" />
                              {row.type}
                            </span>
                          </td>
                          <td className="pdb-strong">{row.total ?? 0}</td>
                          <td className="pdb-count-red">{row.pending ?? 0}</td>
                          <td className="pdb-count-blue">{row.inProduction ?? 0}</td>
                          <td className="pdb-count-green">{row.completed ?? 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pdb-card">
              <div className="pdb-card-header">
                <h3 className="pdb-card-title">
                  <Bell size={18} color="#ef4444" />
                  Production Alerts
                </h3>
              </div>
              <div className="pdb-table-wrap">
                <table className="pdb-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Message</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.alerts || []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="pdb2-empty">{loading ? "Loading..." : "No alerts. Everything is on track."}</td>
                      </tr>
                    ) : (
                      data.alerts.map((alert, idx) => (
                        <tr key={idx}>
                          <td className="pdb-muted">{formatDay(alert.at)}</td>
                          <td className="pdb-strong">{alert.message}</td>
                          <td>
                            <span className={`pdb-badge ${ALERT_BADGES[alert.type] || "pdb-badge-inventory"}`}>{alert.type}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}