import React, { useMemo } from "react";
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
    const defaultLabels = ["Oct 1", "Oct 5", "Oct 10", "Oct 15", "Oct 20", "Oct 25", "Oct 31"];

    if (dt === "stocks") {
      return {
        labels: defaultLabels,
        datasets: [
          {
            label: "Stock Valuation (₹)",
            data: [1650000, 1680000, 1720000, 1750000, 1810000, 1830000, 1845200],
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
            data: [210000, 240000, 260000, 290000, 310000, 340000, 380000],
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
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"],
        datasets: [
          {
            label: "Present Staff",
            data: isAll ? [26, 27, 28, 27, 26, 28, 26] : [14, 15, 14, 15, 14, 15, 14],
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
            data: isAll ? [2, 1, 0, 1, 2, 0, 2] : [1, 0, 0, 1, 1, 0, 1],
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
            data: isAll ? [14, 18, 22, 19, 25, 23, 28] : [4, 6, 8, 7, 9, 8, 10],
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
            data: isAll ? [16, 20, 24, 21, 28, 26, 32] : [5, 7, 9, 8, 11, 9, 12],
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
            data: isAll ? [25, 30, 28, 35, 40, 38, 45] : [10, 12, 11, 14, 16, 15, 18],
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

    // Default: REVENUE / OVERVIEW
    const revData = isAll
      ? [220000, 240000, 310000, 290000, 480000, 450000, 620000]
      : [65000, 72000, 94000, 88000, 142000, 138000, 185000];
    const colData = isAll
      ? [180000, 210000, 260000, 240000, 410000, 390000, 540000]
      : [52000, 61000, 79000, 74000, 121000, 118000, 162000];

    return {
      labels: defaultLabels,
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
  }, [dt, isAll]);

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
    if (isAdmin && dt === "overview") {
      if (isAll) {
        return {
          title: "Job Order Status",
          subtitle: "(All Branches)",
          totalText: "1,248",
          totalLabel: "Total Jobs",
          items: [
            { label: "Completed", count: "942", pct: 75, color: "#0d6245" },
            { label: "In Production", count: "110", pct: 9, color: "#2dd4bf" },
            { label: "Design", count: "68", pct: 5, color: "#8b5cf6" },
            { label: "QC", count: "45", pct: 4, color: "#f59e0b" },
            { label: "Pending Approval", count: "52", pct: 4, color: "#f97316" },
            { label: "On Hold", count: "31", pct: 3, color: "#ef4444" },
          ],
        };
      }

      // Specific Branch Doughnut
      return {
        title: "Job Order Status",
        subtitle: `(${branchName || "Selected Branch"})`,
        totalText: "186",
        totalLabel: "Total Jobs",
        items: [
          { label: "Completed", count: "142", pct: 76, color: "#0d6245" },
          { label: "In Production", count: "24", pct: 13, color: "#2dd4bf" },
          { label: "Pending Approval", count: "12", pct: 6, color: "#f59e0b" },
          { label: "On Hold", count: "8", pct: 5, color: "#ef4444" },
        ],
      };
    }

    if (dt === "stocks") {
      const available = charts.stockAvailability?.available ?? (isAll ? 620 : 180);
      const reserved = charts.stockAvailability?.reserved ?? (isAll ? 280 : 75);
      const lowStock = charts.stockAvailability?.lowStock ?? (isAll ? 90 : 25);
      const outOfStock = charts.stockAvailability?.outOfStock ?? (isAll ? 35 : 10);
      const total = available + reserved + lowStock + outOfStock;

      return {
        title: "Stock Health Status",
        subtitle: isAll ? "(Company Ratio)" : `(${branchName || "Branch"})`,
        totalText: total,
        totalLabel: "Total Units",
        items: [
          { label: "Available", count: available, pct: Math.round((available / total) * 100), color: "#10b981" },
          { label: "Reserved", count: reserved, pct: Math.round((reserved / total) * 100), color: "#0ea5e9" },
          { label: "Low Stock", count: lowStock, pct: Math.round((lowStock / total) * 100), color: "#f59e0b" },
          { label: "Out of Stock", count: outOfStock, pct: Math.round((outOfStock / total) * 100), color: "#f43f5e" },
        ],
      };
    }

    // Default
    return {
      title: "Job Order Status",
      subtitle: isAll ? "(Company Ratio)" : `(${branchName || "Branch"})`,
      totalText: isAll ? "1,248" : "186",
      totalLabel: "Total Jobs",
      items: [
        { label: "Completed", count: isAll ? 942 : 142, pct: 76, color: "#10b981" },
        { label: "In Production", count: isAll ? 110 : 24, pct: 13, color: "#0ea5e9" },
        { label: "Pending", count: isAll ? 52 : 12, pct: 6, color: "#f59e0b" },
        { label: "On Hold", count: isAll ? 31 : 8, pct: 5, color: "#f43f5e" },
      ],
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
      return {
        labels: ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem", "Others"],
        datasets: [
          {
            label: "Revenue",
            data: [1550000, 1150000, 1100000, 1050000, 950000, 750000],
            backgroundColor: "#0d6245",
            borderRadius: 4,
            barThickness: 14,
          },
          {
            label: "Collected",
            data: [1245230, 950000, 880000, 820000, 750000, 600000],
            backgroundColor: "#2dd4bf",
            borderRadius: 4,
            barThickness: 14,
          },
        ],
      };
    }

    if (isSingleBranchOverview) {
      return {
        labels: ["Flex & Vinyl", "Offset Prints", "Digital Prints", "Signage", "Sublimation", "Accessories"],
        datasets: [
          {
            label: "Revenue",
            data: [380000, 290000, 240000, 180000, 110000, 45230],
            backgroundColor: "#0d6245",
            borderRadius: 4,
            barThickness: 14,
          },
          {
            label: "Collected",
            data: [320000, 240000, 210000, 140000, 85000, 25450],
            backgroundColor: "#2dd4bf",
            borderRadius: 4,
            barThickness: 14,
          },
        ],
      };
    }

    if (dt === "stocks") {
      const stock = charts.stockAvailability || {};
      return {
        labels: ["Available", "Reserved", "Low Stock", "Out of Stock"],
        datasets: [
          {
            label: "Stock Units",
            data: [
              stock.available ?? (isAll ? 620 : 180),
              stock.reserved ?? (isAll ? 280 : 75),
              stock.lowStock ?? (isAll ? 90 : 25),
              stock.outOfStock ?? (isAll ? 35 : 10),
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
          data: isAll ? [620, 280, 90, 35] : [180, 75, 25, 10],
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
          <select
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
          </select>
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
          <select
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
          </select>
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
          <select
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
          </select>
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
