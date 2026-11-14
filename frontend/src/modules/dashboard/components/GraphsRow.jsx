import React, { useMemo } from "react";
import StyledSelect from "../../../shared/ui/selects/StyledSelect";
import { Line, Doughnut, Bar } from "react-chartjs-2";
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
import "../styles/dashboard.css";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Format currency for Y-axis and tooltips
const formatCurrencyCompact = (val) => {
  if (val >= 100000) {
    return `₹ ${(val / 100000).toFixed(0)}L`;
  }
  if (val >= 1000) {
    return `₹ ${(val / 1000).toFixed(0)}k`;
  }
  return `₹ ${val}`;
};

const formatCurrencyFull = (val) => {
  return "₹ " + Number(val || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const GraphsRow = ({
  charts = {},
  dataType = "overview",
  isAdmin = false,
  selectedBranch = "ALL",
  branchName = "",
}) => {
  const dt = String(dataType || "overview").toLowerCase().replace(/\s+/g, "");
  const isAll = !selectedBranch || String(selectedBranch).toUpperCase() === "ALL";
  const isBranchWise = isAdmin && dt === "overview" && isAll;
  const isSingleBranchOverview = isAdmin && dt === "overview" && !isAll;

  // ----------------------------------------------------
  // Graph 1: Line Chart (Adaptive by DataType & Branch)
  // ----------------------------------------------------
  const lineChartData = useMemo(() => {
    const defaultLabels = []; // no sample labels: only real data is drawn

    if (dt === "stocks") {
      return {
        labels: defaultLabels,
        datasets: [
          {
            label: "Stock Valuation (₹)",
            data: [],
            borderColor: "#0d6245",
            backgroundColor: "rgba(13, 98, 69, 0.08)",
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: "#0d6245",
          },
          {
            label: "Consumed Stock (₹)",
            data: [],
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245, 158, 11, 0.04)",
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3.5,
            pointBackgroundColor: "#f59e0b",
          },
        ],
      };
    }

    if (dt === "employees") {
      return {
        labels: [],
        datasets: [
          {
            label: "Present Staff",
            data: [],
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: "#10b981",
          },
          {
            label: "On Leave",
            data: [],
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245, 158, 11, 0.04)",
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3.5,
            pointBackgroundColor: "#f59e0b",
          },
        ],
      };
    }

    if (dt === "designers") {
      return {
        labels: defaultLabels,
        datasets: [
          {
            label: "Completed Designs",
            data: [],
            borderColor: "#8b5cf6",
            backgroundColor: "rgba(139, 92, 246, 0.08)",
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: "#8b5cf6",
          },
          {
            label: "New Requests",
            data: [],
            borderColor: "#06b6d4",
            backgroundColor: "rgba(6, 182, 212, 0.04)",
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3.5,
            pointBackgroundColor: "#06b6d4",
          },
        ],
      };
    }

    if (dt === "production") {
      return {
        labels: defaultLabels,
        datasets: [
          {
            label: "Printed Orders",
            data: [],
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: "#10b981",
          },
        ],
      };
    }

    // Default: REVENUE / OVERVIEW (real daily figures from the server)
    const trend = charts.revenueTrend || {};
    const revData = trend.revenue || [];
    const colData = trend.collected || [];

    return {
      labels: trend.labels || [],
      datasets: [
        {
          label: "Revenue",
          data: revData,
          borderColor: "#0d6245",
          backgroundColor: "rgba(13, 98, 69, 0.12)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: "#0d6245",
        },
        {
          label: "Collected",
          data: colData,
          borderColor: "#2dd4bf",
          backgroundColor: "rgba(45, 212, 191, 0.08)",
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3.5,
          pointBackgroundColor: "#2dd4bf",
        },
      ],
    };
  }, [dt, isAll, charts]);

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            boxWidth: 10,
            usePointStyle: true,
            font: { size: 11, family: "Inter, sans-serif" },
            color: "#475569",
          },
        },
        tooltip: {
          backgroundColor: "#1e293b",
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${dt === "employees" || dt === "designers" ? ctx.raw : formatCurrencyFull(ctx.raw)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: "#475569" } },
        y: {
          grid: { color: "#f1f5f9" },
          ticks: {
            callback: (val) => (dt === "employees" || dt === "designers" ? val : formatCurrencyCompact(val)),
            font: { size: 10.5 },
            color: "#475569",
          },
        },
      },
    }),
    [dt]
  );

  // ----------------------------------------------------
  // Graph: Doughnut Chart (Job Order Status)
  // ----------------------------------------------------
  const doughnutConfig = useMemo(() => {
    const js = charts.jobOrderStatus || {};
    const statusItems = [
      { label: "Completed", count: js.completed || 0, pct: js.completedPercentage || 0, color: "#0d6245" },
      { label: "In Production", count: js.inProgress || 0, pct: js.inProgressPercentage || 0, color: "#2dd4bf" },
      { label: "Pending", count: js.pending || 0, pct: js.pendingPercentage || 0, color: "#f59e0b" },
      { label: "On Hold", count: js.onHold || 0, pct: js.onHoldPercentage || 0, color: "#ef4444" },
    ];
    if (isAdmin && dt === "overview") {
      return {
        title: "Job Order Status",
        subtitle: isAll ? "(All Branches)" : `(${branchName || "Selected Branch"})`,
        totalText: String(js.total || 0),
        totalLabel: "Total Jobs",
        items: statusItems,
      };
    }

    if (dt === "stocks") {
      const available = charts.stockAvailability?.available ?? 0;
      const reserved = charts.stockAvailability?.reserved ?? 0;
      const lowStock = charts.stockAvailability?.lowStock ?? 0;
      const outOfStock = charts.stockAvailability?.outOfStock ?? 0;
      const total = available + reserved + lowStock + outOfStock;

      return {
        title: "Stock Health Status",
        subtitle: isAll ? "(Company Ratio)" : `(${branchName || "Branch"})`,
        totalText: total,
        totalLabel: "Total Units",
        items: [
          { label: "Available", count: available, pct: (total > 0 ? Math.round((available / total) * 100) : 0), color: "#10b981" },
          { label: "Reserved", count: reserved, pct: (total > 0 ? Math.round((reserved / total) * 100) : 0), color: "#0ea5e9" },
          { label: "Low Stock", count: lowStock, pct: (total > 0 ? Math.round((lowStock / total) * 100) : 0), color: "#f59e0b" },
          { label: "Out of Stock", count: outOfStock, pct: (total > 0 ? Math.round((outOfStock / total) * 100) : 0), color: "#f43f5e" },
        ],
      };
    }

    // Default
    return {
      title: "Job Order Status",
      subtitle: isAll ? "(Company Ratio)" : `(${branchName || "Branch"})`,
      totalText: String(js.total || 0),
      totalLabel: "Total Jobs",
      items: statusItems,
    };
  }, [charts, dt, isAdmin, isAll, branchName]);

  const doughnutData = useMemo(() => {
    return {
      labels: doughnutConfig.items.map((i) => i.label),
      datasets: [
        {
          data: doughnutConfig.items.map((i) => (typeof i.count === "number" ? i.count : i.pct)),
          backgroundColor: doughnutConfig.items.map((i) => i.color),
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    };
  }, [doughnutConfig]);

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "74%",
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: "#1e293b", padding: 10, cornerRadius: 8 },
      },
    }),
    []
  );

  // ----------------------------------------------------
  // Graph: Bar Chart (Branch-wise Revenue for ALL vs Category Sales for Single Branch)
  // ----------------------------------------------------
  const barChartData = useMemo(() => {
    if (isBranchWise) {
      const br = charts.branchRevenue || {};
      return {
        labels: br.labels || [],
        datasets: [
          { label: "Revenue", data: br.revenue || [], backgroundColor: "#0d6245", borderRadius: 4, barThickness: 14 },
          { label: "Collected", data: br.collected || [], backgroundColor: "#2dd4bf", borderRadius: 4, barThickness: 14 },
        ],
      };
    }

    if (isSingleBranchOverview) {
      // Category sales are not tracked yet, so nothing is drawn (no sample bars)
      return { labels: [], datasets: [] };
    }

    if (dt === "stocks") {
      const stock = charts.stockAvailability || {};
      return {
        labels: ["Available", "Reserved", "Low Stock", "Out of Stock"],
        datasets: [
          {
            label: "Stock Units",
            data: [
              stock.available ?? 0,
              stock.reserved ?? 0,
              stock.lowStock ?? 0,
              stock.outOfStock ?? 0,
            ],
            backgroundColor: ["#10b981", "#0ea5e9", "#f59e0b", "#f43f5e"],
            borderRadius: 6,
            barThickness: 34,
          },
        ],
      };
    }

    // Default bar
    return {
      labels: ["Available", "Reserved", "Low Stock", "Out of Stock"],
      datasets: [
        {
          label: "Stock Units",
          data: [],
          backgroundColor: ["#10b981", "#0ea5e9", "#f59e0b", "#f43f5e"],
          borderRadius: 6,
          barThickness: 34,
        },
      ],
    };
  }, [charts, dt, isBranchWise, isSingleBranchOverview, isAll]);

  const showGroupedLegend = isBranchWise || isSingleBranchOverview;

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: showGroupedLegend,
          position: "bottom",
          labels: {
            boxWidth: 10,
            usePointStyle: true,
            font: { size: 11, family: "Inter, sans-serif" },
            color: "#475569",
          },
        },
        tooltip: {
          backgroundColor: "#1e293b",
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label || ""}: ${showGroupedLegend ? formatCurrencyFull(ctx.raw) : `${ctx.raw} units`}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: "#475569" } },
        y: {
          grid: { color: "#f1f5f9" },
          ticks: {
            callback: (val) => (showGroupedLegend ? formatCurrencyCompact(val) : val),
            font: { size: 10.5 },
            color: "#475569",
          },
        },
      },
    }),
    [showGroupedLegend]
  );

  return (
    <div className="printz-graphs-grid">
      {/* ---------------- Graph 1: Revenue Trend (Line Chart) ---------------- */}
      <div className="printz-graph-card">
        <div className="printz-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 className="printz-card-title">
              Revenue Trend{" "}
              <span className="printz-card-subtitle">
                {isAll ? "(Company-Wide)" : `(${branchName || "Selected Branch"})`}
              </span>
            </h3>
          </div>
          <StyledSelect compact
            defaultValue="daily"
            style={{
              fontSize: "11px",
              padding: "3px 8px",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#475569",
              cursor: "pointer",
            }}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </StyledSelect>
        </div>
        <div className="printz-chart-area">
          <Line data={lineChartData} options={lineOptions} />
        </div>
      </div>

      {/* ---------------- Graph 2: Branch-wise Revenue (for ALL) OR Sales by Category (for Single Branch) ---------------- */}
      <div className="printz-graph-card">
        <div className="printz-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 className="printz-card-title">
              {isBranchWise ? (
                <>
                  Branch-wise Revenue <span className="printz-card-subtitle">(Company Comparison)</span>
                </>
              ) : isSingleBranchOverview ? (
                <>
                  Sales by Category{" "}
                  <span className="printz-card-subtitle">
                    ({branchName ? branchName.split(" ")[0] : "Branch"})
                  </span>
                </>
              ) : (
                <>
                  {dt === "stocks" ? "Stock Availability" : "Category Breakdown"}{" "}
                  <span className="printz-card-subtitle">
                    {isAll ? "(Company-Wide)" : `(${branchName || "Branch"})`}
                  </span>
                </>
              )}
            </h3>
          </div>
          <StyledSelect compact
            defaultValue="month"
            style={{
              fontSize: "11px",
              padding: "3px 8px",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#475569",
              cursor: "pointer",
            }}
          >
            <option value="month">This Month</option>
            <option value="lastmonth">Last Month</option>
            <option value="halfyear">Last 6 Months</option>
          </StyledSelect>
        </div>
        <div className="printz-chart-area">
          <Bar data={barChartData} options={barOptions} />
        </div>
      </div>

      {/* ---------------- Graph 3: Job Order Status (Doughnut Chart) ---------------- */}
      <div className="printz-graph-card">
        <div className="printz-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 className="printz-card-title">
              Job Order Status{" "}
              <span className="printz-card-subtitle">
                {isAll ? "(Company-Wide)" : `(${branchName || "Selected Branch"})`}
              </span>
            </h3>
          </div>
          <StyledSelect compact
            defaultValue="month"
            style={{
              fontSize: "11px",
              padding: "3px 8px",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#475569",
              cursor: "pointer",
            }}
          >
            <option value="month">This Month</option>
            <option value="lastmonth">Last Month</option>
          </StyledSelect>
        </div>

        <div className="printz-doughnut-container">
          <div className="printz-doughnut-canvas-wrap">
            <Doughnut data={doughnutData} options={doughnutOptions} />
            <div className="printz-doughnut-center">
              <div className="printz-doughnut-center-count">{doughnutConfig.totalText}</div>
              <div className="printz-doughnut-center-text">{doughnutConfig.totalLabel}</div>
            </div>
          </div>

          <div className="printz-legend-list">
            {doughnutConfig.items.map((item, idx) => (
              <div key={idx} className="printz-legend-item">
                <span className="printz-legend-label">
                  <span className="printz-legend-dot" style={{ background: item.color }} />
                  {item.label}
                </span>
                <span className="printz-legend-val">
                  {item.count} <span className="printz-legend-pct">({item.pct}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphsRow;
