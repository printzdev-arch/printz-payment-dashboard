import React from "react";
import { Calendar } from "lucide-react";
import "../styles/dashboard.css";

const DATA_TYPE_OPTIONS = [
  { value: "overview", label: "Overview" },
  { value: "revenue", label: "Revenue" },
  { value: "stocks", label: "Stocks" },
  { value: "employees", label: "Employees" },
  { value: "designers", label: "Designers" },
  { value: "production", label: "Production" },
  { value: "joborders", label: "Job Orders" },
];

// The label shows the real current month (it used to be fixed to "Oct 1 - Oct 31, 2026")
const currentMonthLabel = () => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const short = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `This Month (${short(first)} - ${short(last)}, ${now.getFullYear()})`;
};

const DATE_RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "mtd", label: currentMonthLabel() },
  { value: "lastmonth", label: "Last Month" },
  { value: "custom", label: "Custom Range..." },
];

const DashboardFilterBar = ({
  branches = [],
  selectedBranch = "ALL",
  onChangeBranch,
  selectedDataType = "overview",
  onChangeDataType,
  selectedDateRange = "mtd",
  onChangeDateRange,
  startDate = "",
  endDate = "",
  onChangeStartDate,
  onChangeEndDate,
  onApply,
  isLoading = false,
  isBranchLocked = false,
  lockedBranchName = "Branch",
  showCompareWith = false,
  compareWith = "previous_period",
  onChangeCompareWith,
}) => {
  return (
    <div className="printz-dash-filter-card">
      <div className="printz-dash-filter-flex">
        {/* Left Inputs Row */}
        <div className="printz-dash-inputs-row">
          {/* 1. Branch Selection Field */}
          <div className="printz-dash-field-group">
            <label className="printz-dash-label">
              Branch {isBranchLocked && <span className="printz-dash-label-sub">(fixed for manager)</span>}
            </label>
            {isBranchLocked ? (
              <div className="printz-dash-locked-branch">
                <span className="printz-dash-status-dot" />
                <span>{lockedBranchName || "Branch"}</span>
              </div>
            ) : (
              <select
                value={selectedBranch}
                onChange={(e) => onChangeBranch && onChangeBranch(e.target.value)}
                className="printz-dash-select"
              >
                <option value="ALL">All Branches (Company-Wide)</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} {b.code ? `(${b.code})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Data Type Selection Field */}
          <div className="printz-dash-field-group">
            <label className="printz-dash-label">
              Data Type
            </label>
            <select
              value={selectedDataType}
              onChange={(e) => onChangeDataType && onChangeDataType(e.target.value)}
              className="printz-dash-select"
            >
              {DATA_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Date Range Filter Field */}
          <div className="printz-dash-field-group">
            <label className="printz-dash-label">
              <Calendar size={13} style={{ display: "inline-block", verticalAlign: "middle" }} />
              Date Range
            </label>
            <select
              value={selectedDateRange}
              onChange={(e) => onChangeDateRange && onChangeDateRange(e.target.value)}
              className="printz-dash-select"
            >
              {DATE_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Range Inputs (if custom chosen) */}
        {selectedDateRange === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onChangeStartDate && onChangeStartDate(e.target.value)}
              className="printz-dash-date-input"
              style={{ width: "135px" }}
            />
            <span style={{ fontSize: "12px", color: "#475569" }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onChangeEndDate && onChangeEndDate(e.target.value)}
              className="printz-dash-date-input"
              style={{ width: "135px" }}
            />
          </div>
        )}

        {/* Actions: Apply Button & optional Compare With */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <button
              type="button"
              onClick={onApply}
              disabled={isLoading}
              className="printz-dash-btn-apply"
            >
              {isLoading ? "Applying..." : "Apply"}
            </button>
          </div>

          {showCompareWith && (
            <div className="printz-dash-field-group">
              <label className="printz-dash-label">Compare With</label>
              <select
                value={compareWith}
                onChange={(e) => onChangeCompareWith && onChangeCompareWith(e.target.value)}
                className="printz-dash-select"
                style={{ width: "150px" }}
              >
                <option value="previous_period">Previous Period</option>
                <option value="previous_year">Previous Year</option>
                <option value="none">None</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardFilterBar;
