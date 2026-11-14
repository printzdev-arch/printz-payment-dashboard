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
import DataTable from "../../../../../shared/ui/DataTable/DataTable";
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

        <DataTable
          searchable={false}
          pagination={false}
          data={INSPECTOR_PERFORMANCE}
          columns={[
            {
              key: "name",
              label: "Inspector Name",
              render: (insp) => (
                <span style={{ fontWeight: 600, color: "#0f172a" }}>
                  <User size={13} style={{ display: "inline", marginRight: "6px", color: "#475569" }} />
                  {insp.name}
                </span>
              ),
            },
            { key: "totalInspected", label: "Batches Inspected", render: (insp) => <span style={{ color: "#334155" }}>{insp.totalInspected} batches</span> },
            {
              key: "passedFirstTime",
              label: "Passed First-Pass",
              render: (insp) => <span style={{ color: "#16a34a", fontWeight: 600 }}>{insp.passedFirstTime} batches</span>,
            },
            {
              key: "reworkTriggered",
              label: "Rework Dispatched",
              render: (insp) => <span style={{ color: "#d97706", fontWeight: 600 }}>{insp.reworkTriggered} batches</span>,
            },
            { key: "fpy", label: "First-Pass Yield", render: (insp) => <span style={{ fontWeight: 700, color: "#059669" }}>{insp.fpy}</span> },
          ]}
        />
      </div>
    </div>
  );
};

export default QcReportsTab;
