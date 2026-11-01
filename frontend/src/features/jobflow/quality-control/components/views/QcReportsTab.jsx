import React, { useState } from "react";
import {
  BarChart2,
  TrendingUp,
  Percent,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  FileDown,
  User,
} from "lucide-react";
import { toast } from "react-toastify";

export const QcReportsTab = () => {
  const [timeRange, setTimeRange] = useState("THIS_MONTH");

  const DEFECT_CATEGORIES = [
    { type: "Cutting & Bleed Alignment", count: 28, share: 38, severity: "MAJOR" },
    { type: "Lamination Bubbles / Wrinkling", count: 18, share: 24, severity: "MAJOR" },
    { type: "Color Shift / Density Deviation", count: 14, share: 19, severity: "MINOR" },
    { type: "Binding / Folding Crack", count: 9, share: 12, severity: "MAJOR" },
    { type: "Printhead Smear / Nozzle Drop", count: 5, share: 7, severity: "CRITICAL" },
  ];

  const INSPECTOR_PERFORMANCE = [
    { name: "Senior Inspector Ravi", totalInspected: 124, passedFirstTime: 120, reworkTriggered: 4, fpy: "96.8%" },
    { name: "Inspector Manoj K.", totalInspected: 98, passedFirstTime: 92, reworkTriggered: 6, fpy: "93.9%" },
    { name: "QC Staff Priya R.", totalInspected: 65, passedFirstTime: 63, reworkTriggered: 2, fpy: "96.9%" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div className="jf-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 750, color: "#0f172a" }}>
              Quality Control Analytics & Defect Intelligence
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#475569" }}>
              First-Pass Yield (FPY), rejection rates, Pareto defect distribution, and inspector audit metrics.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <select
              className="jf-input jf-input-sm"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              style={{ width: "160px", height: "36px", borderRadius: "6px", fontWeight: 600 }}
            >
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_30_DAYS">Last 30 Days</option>
              <option value="THIS_QUARTER">This Quarter</option>
            </select>

            <button
              type="button"
              className="jf-btn jf-btn-secondary jf-btn-sm"
              style={{ display: "flex", alignItems: "center", gap: "4px", height: "36px" }}
              onClick={() => toast.success("Exporting QC Analytics report as CSV...")}
            >
              <FileDown size={14} /> Export QC Report
            </button>
          </div>
        </div>
      </div>

      {/* 4 High-Level KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <div className="jf-card" style={{ padding: "1.25rem", borderLeft: "4px solid #10b981" }}>
          <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700, textTransform: "uppercase" }}>
            First-Pass Yield (FPY)
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
            96.4%
          </div>
          <div style={{ fontSize: "0.78rem", color: "#16a34a", marginTop: "4px", fontWeight: 600 }}>
            ↑ 1.2% higher yield this month
          </div>
        </div>

        <div className="jf-card" style={{ padding: "1.25rem", borderLeft: "4px solid #f59e0b" }}>
          <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700, textTransform: "uppercase" }}>
            Rework Rate
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
            3.1% <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#475569" }}>(Target &lt; 4%)</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "#16a34a", marginTop: "4px", fontWeight: 600 }}>
            Controlled floor rework
          </div>
        </div>

        <div className="jf-card" style={{ padding: "1.25rem", borderLeft: "4px solid #dc2626" }}>
          <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700, textTransform: "uppercase" }}>
            Full Scrap Rejection Rate
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
            0.5%
          </div>
          <div style={{ fontSize: "0.78rem", color: "#16a34a", marginTop: "4px", fontWeight: 600 }}>
            Well below industry 1.5% threshold
          </div>
        </div>

        <div className="jf-card" style={{ padding: "1.25rem", borderLeft: "4px solid #6366f1" }}>
          <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700, textTransform: "uppercase" }}>
            Total Batches Inspected
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
            287 <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#475569" }}>orders</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "4px" }}>
            100% physically verified
          </div>
        </div>
      </div>

      {/* Defect Categories Pareto Breakdown */}
      <div className="jf-card" style={{ padding: "1.25rem" }}>
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem", fontWeight: 700, color: "#0f172a" }}>
          Top Defect Categories (Pareto Analysis)
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {DEFECT_CATEGORIES.map((def, idx) => (
            <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                <span style={{ fontWeight: 600, color: "#1e293b" }}>
                  {idx + 1}. {def.type}
                </span>
                <span style={{ color: "#475569" }}>
                  <strong>{def.count} incidents</strong> ({def.share}% of all defects)
                </span>
              </div>
              <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${def.share}%`,
                    height: "100%",
                    background: def.severity === "CRITICAL" ? "#dc2626" : def.severity === "MAJOR" ? "#f59e0b" : "#3b82f6",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inspector Throughput Table */}
      <div className="jf-card" style={{ padding: "1.25rem" }}>
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem", fontWeight: 700, color: "#0f172a" }}>
          Inspector Workload & First-Pass Yield by Staff
        </h3>

        <div style={{ overflowX: "auto" }}>
          <table className="jf-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                <th style={{ padding: "0.75rem 1rem" }}>Inspector Name</th>
                <th style={{ padding: "0.75rem 1rem" }}>Batches Inspected</th>
                <th style={{ padding: "0.75rem 1rem" }}>Passed First-Pass</th>
                <th style={{ padding: "0.75rem 1rem" }}>Rework Dispatched</th>
                <th style={{ padding: "0.75rem 1rem" }}>First-Pass Yield</th>
              </tr>
            </thead>
            <tbody>
              {INSPECTOR_PERFORMANCE.map((insp, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.875rem 1rem", fontWeight: 600, color: "#0f172a" }}>
                    <User size={13} style={{ display: "inline", marginRight: "6px", color: "#475569" }} />
                    {insp.name}
                  </td>
                  <td style={{ padding: "0.875rem 1rem", color: "#334155" }}>
                    {insp.totalInspected} batches
                  </td>
                  <td style={{ padding: "0.875rem 1rem", color: "#16a34a", fontWeight: 600 }}>
                    {insp.passedFirstTime} batches
                  </td>
                  <td style={{ padding: "0.875rem 1rem", color: "#d97706", fontWeight: 600 }}>
                    {insp.reworkTriggered} batches
                  </td>
                  <td style={{ padding: "0.875rem 1rem", fontWeight: 700, color: "#059669" }}>
                    {insp.fpy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QcReportsTab;
