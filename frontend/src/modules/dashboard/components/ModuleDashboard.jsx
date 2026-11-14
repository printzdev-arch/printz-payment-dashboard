import React from "react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { BarChart3, Inbox } from "lucide-react";
import DataTable from "../../../shared/ui/DataTable/DataTable";
import "../styles/dashboard.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const PALETTE = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#ef4444", "#14b8a6", "#6366f1", "#84cc16", "#f97316"];
// Icon colours already styled by the dashboard (printz-summary-icon.<colour>)
const TONES = ["green", "blue", "orange", "purple", "rose", "teal"];

const inr = (v) =>
  "₹ " + Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const formatKpi = (k) => {
  if (k.unit === "INR") return inr(k.value);
  if (typeof k.value === "number") return k.value.toLocaleString("en-IN");
  return k.value ?? "-";
};

const toneClass = (tone, index) => (tone === "red" ? "rose" : tone && TONES.includes(tone) ? tone : TONES[index % TONES.length]);

const baseOptions = (legend, extra = {}) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: legend, position: "bottom", labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 } } },
    tooltip: { backgroundColor: "#1e293b", padding: 10, cornerRadius: 8 },
  },
  ...extra,
});

function ChartCard({ spec }) {
  const hasData = spec.labels.length > 0 && spec.datasets.some((d) => d.data.some((v) => Number(v) > 0));
  let body = null;

  if (!hasData) {
    body = (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#64748b", gap: "6px" }}>
        <Inbox size={28} />
        <span style={{ fontSize: "13px" }}>No data for the selected branch and dates</span>
      </div>
    );
  } else if (spec.type === "doughnut") {
    body = (
      <Doughnut
        data={{
          labels: spec.labels,
          datasets: [{ data: spec.datasets[0].data, backgroundColor: PALETTE, borderWidth: 2, borderColor: "#ffffff" }],
        }}
        options={baseOptions(true, { cutout: "62%" })}
      />
    );
  } else {
    const hasRight = spec.datasets.some((d) => d.axis === "right");
    const datasets = spec.datasets.map((d, i) => ({
      label: d.label,
      data: d.data,
      yAxisID: d.axis === "right" ? "y1" : "y",
      backgroundColor: spec.type === "bar" ? PALETTE[i % PALETTE.length] : `${PALETTE[i % PALETTE.length]}22`,
      borderColor: PALETTE[i % PALETTE.length],
      borderRadius: spec.type === "bar" ? 8 : undefined,
      fill: spec.type === "line",
      tension: 0.35,
      pointRadius: 3,
    }));
    const scales = {
      x: { grid: { display: false } },
      y: { grid: { color: "#f1f5f9" }, beginAtZero: true },
      ...(hasRight ? { y1: { position: "right", grid: { display: false }, beginAtZero: true } } : {}),
    };
    const Chart = spec.type === "bar" ? Bar : Line;
    body = <Chart data={{ labels: spec.labels, datasets }} options={baseOptions(spec.datasets.length > 1, { scales })} />;
  }

  return (
    <div className="printz-graph-card">
      <div className="printz-card-header">
        <h3 className="printz-card-title">{spec.title}</h3>
      </div>
      <div className="printz-chart-area">{body}</div>
    </div>
  );
}

const cellFor = (col, row) => {
  const v = row[col.key];
  if (col.unit === "INR") return <span style={{ fontWeight: 600 }}>{inr(v)}</span>;
  return v ?? "-";
};

/**
 * One module of the admin dashboard: KPI cards, graphs and a details table.
 * `data` is what GET /dashboards/admin/module returns.
 */
export default function ModuleDashboard({ data, isLoading }) {
  if (isLoading && !data) {
    return (
      <div className="printz-table-card" style={{ marginTop: "16px", textAlign: "center", color: "#475569" }}>
        Loading dashboard…
      </div>
    );
  }
  if (!data) return null;

  const { kpis = [], charts = [], table } = data;

  return (
    <div style={{ opacity: isLoading ? 0.6 : 1, transition: "opacity 0.15s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 2px 12px", color: "#0f172a" }}>
        <BarChart3 size={18} color="#059669" />
        <strong style={{ fontSize: "16px" }}>{data.label}</strong>
        <span style={{ fontSize: "12.5px", color: "#475569" }}>
          · {data.selectedBranch?.name}{data.period ? ` · ${data.period.label}` : ""}
        </span>
      </div>

      <div className="printz-kpi-grid admin-overview">
        {kpis.map((k, i) => (
          <div key={k.key} className="printz-kpi-card">
            <div className="printz-kpi-top">
              <div className={`printz-summary-icon ${toneClass(k.tone, i)}`}>
                <BarChart3 size={20} strokeWidth={2.3} color="#ffffff" />
              </div>
              <div className="printz-kpi-values">
                <div className="printz-kpi-number">{formatKpi(k)}</div>
                <div className="printz-kpi-label">{k.label}</div>
              </div>
            </div>
            <div className="printz-kpi-bottom">
              {k.subtitle && <span className="printz-kpi-trend-neutral">{k.subtitle}</span>}
            </div>
          </div>
        ))}
      </div>

      {charts.length > 0 && (
        <div className="printz-graphs-grid">
          {charts.map((c) => (
            <ChartCard key={c.key} spec={c} />
          ))}
        </div>
      )}

      {table && (
        <DataTable mobileCards
          title={table.title}
          subtitle={`${table.rows.length} record${table.rows.length === 1 ? "" : "s"}`}
          data={table.rows}
          pageSize={10}
          emptyMessage="No records for the selected branch and dates."
          columns={table.columns.map((col) => ({
            key: col.key,
            label: col.label,
            align: col.align || "left",
            render: (row) => cellFor(col, row),
          }))}
        />
      )}
    </div>
  );
}
