import { useState, useEffect, useRef, useMemo } from "react";
import { getBranchesCached } from "../../services/branchStore";
import {
  loadTotalsForDates,
  loadPrinterReadingsForDates,
  aggregateByBranchAcrossDates,
} from "../../services/dashboardStore";
import Popup from "../common/Popup";
import { usePopup } from "../../hooks/usePopup";
import HorizontalBarChart from "../common/HorizontalBarChart";
import PieBreakdownChart from "../common/PieBreakdownChart";
import SummaryTable from "../common/SummaryTable";

// Minimal, clean slate dashboard top bar
// Requirements implemented:
// - Branch dropdown at top-left; first option "Select a branch" which means all branches
// - Calendar icon next to it that opens a popover with date range or single date
// - Default selection is yesterday
// - Populate branches from Firestore 'branches' collection once and cache globally

const formatDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getYesterday = () => {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return y;
};

const AdminDashboard = () => {
  const { popup, showError } = usePopup();
  // Keep a stable ref to showError so effects don't re-run on its identity changes
  const showErrorRef = useRef(showError);
  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  // Branches
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(""); // empty = all
  // Loading state to control spinners and ensure UI updates across async loads
  const [isLoading, setIsLoading] = useState(false);
  // A simple version tick used to recompute derived rows after async cache updates
  const [dataVersion, setDataVersion] = useState(0);

  // Date selection
  const [dateMode, setDateMode] = useState("range"); // default to range UI
  const y = getYesterday();
  const [singleDate, setSingleDate] = useState(formatDate(y));
  const [fromDate, setFromDate] = useState(formatDate(y));
  const [toDate, setToDate] = useState(formatDate(y));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const popRef = useRef(null);
  // Responsive: collapse to single column when screen is narrow
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const update = () => setIsNarrow(window.innerWidth < 1100);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Build the list of dates to load/aggregate based on mode
  const selectedDates = useMemo(() => {
    if (dateMode === "single") return [singleDate];
    const dates = [];
    try {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      if (isNaN(start) || isNaN(end)) return [];
      const d = new Date(start);
      while (d <= end) {
        dates.push(formatDate(d));
        d.setDate(d.getDate() + 1);
      }
    } catch (_) {
      // ignore
    }
    return dates;
  }, [dateMode, singleDate, fromDate, toDate]);

  // Load totals and printer readings for selected dates on change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedDates.length) return;
      try {
        setIsLoading(true);
        await loadTotalsForDates(selectedDates);
        await loadPrinterReadingsForDates(selectedDates);
        if (cancelled) return;
        // data in cache ready; bump version so derived rows refresh
        setDataVersion((v) => v + 1);
      } catch (e) {
        console.error("Failed to load dashboard data", e);
        if (!cancelled && showErrorRef.current) {
          showErrorRef.current(
            "Error Loading Data",
            "Couldn't load dashboard data for the selected dates."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDates]);

  // Prepare per-branch rows from cache
  // Prepare per-branch rows from cache (recomputed when dates/branch/version change)
  const [branchRows, setBranchRows] = useState([]);
  useEffect(() => {
    if (!selectedDates.length) {
      setBranchRows([]);
      return;
    }
    const filter = selectedBranch ? [selectedBranch] : null;
    const rows = aggregateByBranchAcrossDates(selectedDates, filter);
    setBranchRows(rows);
  }, [selectedDates, selectedBranch, dataVersion]);

  // Chart 1: Horizontal bar - total revenue per branch
  const maxRevenue = useMemo(() => {
    return branchRows.reduce((m, r) => Math.max(m, r.totalRevenue), 0);
  }, [branchRows]);
  const xMax = maxRevenue > 0 ? Math.ceil(maxRevenue * 1.1) : 10; // 10% headroom
  const revenueLabels = useMemo(
    () => branchRows.map((r) => r.branchName),
    [branchRows]
  );
  const revenueValues = useMemo(
    () => branchRows.map((r) => r.totalRevenue),
    [branchRows]
  );

  // Chart 2: Horizontal bar - total printer readings (copies) per branch
  const copiesLabels = useMemo(
    () => branchRows.map((r) => r.branchName),
    [branchRows]
  );
  const copiesValues = useMemo(
    () => branchRows.map((r) => r.printerCopies),
    [branchRows]
  );
  const maxCopies = useMemo(
    () => branchRows.reduce((m, r) => Math.max(m, r.printerCopies), 0),
    [branchRows]
  );
  const copiesXMax = maxCopies > 0 ? Math.ceil(maxCopies * 1.1) : 10;

  // Aggregates for pie chart below the summary table (all branches)
  const [allRows, setAllRows] = useState([]);
  useEffect(() => {
    if (!selectedDates.length) {
      setAllRows([]);
      return;
    }
    const rows = aggregateByBranchAcrossDates(selectedDates, null);
    setAllRows(rows);
  }, [selectedDates, dataVersion]);

  const totalsAggregate = useMemo(() => {
    const sum = (arr, key) => arr.reduce((t, r) => t + Number(r[key] || 0), 0);
    const stock = sum(allRows, "stockRevenue");
    const printer = sum(allRows, "printerRevenue");
    const other = sum(allRows, "otherRevenue");
    const total = stock + printer + other;
    return { stock, printer, other, total };
  }, [allRows]);

  // Fetch branches once, cache globally
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getBranchesCached();
        if (mounted) setBranches(list);
      } catch (e) {
        console.error("Failed to load branches", e);
        showError(
          "Error Loading Branches",
          "Couldn't load branches. Please refresh and try again."
        );
      }
    })();
    return () => {
      mounted = false;
    };
  }, [showError]);

  // Close calendar when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target)) setCalendarOpen(false);
    };
    if (calendarOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [calendarOpen]);

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Branch dropdown (all branches when empty) */}
        <select
          value={selectedBranch}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__placeholder__") return;
            setSelectedBranch(v);
          }}
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid #ddd",
          }}
        >
          <option value="__placeholder__" disabled>
            Select an option
          </option>
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        {/* Calendar icon and popover */}
        <div style={{ position: "relative" }}>
          <button
            aria-label="Open calendar"
            onClick={() => setCalendarOpen((v) => !v)}
            style={{
              border: "1px solid #ddd",
              background: "#fff",
              borderRadius: 6,
              padding: "6px 10px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            {/* Simple calendar icon (SVG) */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#111"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span style={{ fontSize: 14, color: "#111" }}>Calendar</span>
          </button>

          {calendarOpen && (
            <div
              ref={popRef}
              style={{
                position: "absolute",
                top: "110%",
                left: 0,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                padding: 12,
                zIndex: 50,
                minWidth: 280,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <button
                  onClick={() => setDateMode("single")}
                  style={{
                    padding: "6px 8px",
                    borderRadius: 6,
                    border:
                      dateMode === "single"
                        ? "2px solid #111"
                        : "1px solid #ddd",
                    background: dateMode === "single" ? "#f9fafb" : "#fff",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Single date
                </button>
                <button
                  onClick={() => setDateMode("range")}
                  style={{
                    padding: "6px 8px",
                    borderRadius: 6,
                    border:
                      dateMode === "range"
                        ? "2px solid #111"
                        : "1px solid #ddd",
                    background: dateMode === "range" ? "#f9fafb" : "#fff",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Date range
                </button>
              </div>

              {dateMode === "single" ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    style={{
                      padding: 8,
                      border: "1px solid #ddd",
                      borderRadius: 6,
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    style={{
                      padding: 8,
                      border: "1px solid #ddd",
                      borderRadius: 6,
                    }}
                  />
                  <span
                    style={{
                      alignSelf: "center",
                      fontSize: 12,
                      color: "#6b7280",
                    }}
                  >
                    to
                  </span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    style={{
                      padding: 8,
                      border: "1px solid #ddd",
                      borderRadius: 6,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected text and analytics */}
      <div style={{ marginTop: 24, color: "#6b7280", fontSize: 14 }}>
        <div>
          Selected: {selectedBranch || "All branches"} —{" "}
          {dateMode === "single" ? singleDate : `${fromDate} to ${toDate}`}
        </div>
      </div>

      {/* Conditional rendering: Show welcome message or data */}
      {isLoading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 8,
            marginTop: 12,
          }}
        >
          <div style={{ textAlign: "center", color: "#6b7280" }}>
            <div style={{ fontSize: "18px", marginBottom: "8px" }}>
              Loading...
            </div>
            <div>Fetching dashboard data</div>
          </div>
        </div>
      ) : branchRows.length === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            marginTop: 12,
            textAlign: "center",
            minHeight: "400px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              margin: "0 0 16px 0",
              fontSize: "28px",
              fontWeight: "600",
              color: "#111",
            }}
          >
            Welcome to Admin Dashboard
          </h2>
          <p
            style={{
              margin: "0 0 20px 0",
              fontSize: "18px",
              color: "#6b7280",
              maxWidth: "600px",
              lineHeight: "1.5",
            }}
          >
            Please select a date range above to display analytics data and
            insights for your branches
          </p>
          <div
            style={{
              padding: "16px",
              fontSize: "14px",
              color: "#6b7280",
            }}
          >
            📊 View revenue breakdowns, printer readings, and branch performance
            metrics
          </div>
        </div>
      ) : (
        /* Two-part vertical split: left charts, right table */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isNarrow ? "1fr" : "1.2fr 1fr",
            gap: 16,
            marginTop: 12,
            alignItems: "start",
          }}
        >
          <div
            style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 16 }}
          >
            <div
              style={{
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: 8,
                padding: 12,
                minHeight: 180,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                overflow: "visible",
              }}
            >
              <HorizontalBarChart
                title="Total Revenue by Branch"
                labels={revenueLabels}
                values={revenueValues}
                xMax={xMax}
                color="#3b82f6"
                valueFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
                maxVisible={8}
              />
            </div>
            <div
              style={{
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: 8,
                padding: 12,
                minHeight: 180,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <HorizontalBarChart
                title="Total Printer Readings by Branch"
                labels={copiesLabels}
                values={copiesValues}
                xMax={copiesXMax}
                color="#10b981"
                valueFormatter={(v) => `${Number(v).toLocaleString()}`}
                maxVisible={8}
              />
            </div>
          </div>
          <div>
            <SummaryTable rows={branchRows} />
            {/* Pie chart under the summary table */}
            <div
              style={{
                marginTop: 16,
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: 8,
                padding: 12,
              }}
            >
              <PieBreakdownChart
                title={`Revenue Breakdown — Total ₹${totalsAggregate.total.toLocaleString(
                  "en-IN"
                )}`}
                values={[
                  totalsAggregate.printer,
                  totalsAggregate.stock,
                  totalsAggregate.other,
                ]}
                labels={["Printer", "Stock", "Other"]}
                colors={["#3b82f6", "#f59e0b", "#10b981"]}
              />
            </div>
          </div>
        </div>
      )}

      <Popup {...popup} />
    </div>
  );
};

export default AdminDashboard;
