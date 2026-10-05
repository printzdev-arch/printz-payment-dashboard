import React, { useState, useEffect, useRef, useMemo } from "react";
import { getBranchesCached } from "../../services/branchStore";
import {
  loadTotalsForDates,
  loadPrinterReadingsForDates,
  aggregateByBranchAcrossDates,
} from "../../services/dashboardStore";
import Popup from "../common/Popup.jsx";
import { usePopup } from "../../hooks/usePopup";
import HorizontalBarChart from "../common/HorizontalBarChart.jsx";
import PieBreakdownChart from "../common/PieBreakdownChart.jsx";
import SummaryTable from "../common/SummaryTable.jsx";
import AdminDashboardIllustration from "../illustrations/AdminDashboardIllustration.jsx";
import BranchSelect from "../common/BranchSelect.jsx";
import {
  Calendar,
  TrendingUp,
  Printer,
  PieChart,
  BarChart3,
  Table,
  Building2,
  Clock,
} from "lucide-react";
import CalendarSelect from "../common/CalendarSelect.jsx";
import "../../styles/printzTheme.css";
import "../../styles/admindashboard.css";
import "../../styles/addAssets.css";

const formatDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const [isLoading, setIsLoading] = useState(true);
  // A simple version tick used to recompute derived rows after async cache updates
  const [dataVersion, setDataVersion] = useState(0);

  // Date selection - default to single date (today)
  const [dateMode, setDateMode] = useState("single");
  const today = new Date();
  const [singleDate, setSingleDate] = useState(formatDate(today));
  const [fromDate, setFromDate] = useState(formatDate(today));
  const [toDate, setToDate] = useState(formatDate(today));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const popRef = useRef(null);

  // Responsive: collapse to single column when screen is narrow (avoids any horizontal scroll)
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const update = () => setIsNarrow(window.innerWidth < 1250);
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

  if (isLoading && branchRows.length === 0 && branches.length === 0) {
    return (
      <div className="printz-page-container">
        <div className="admin-loading-container">
          <div className="admin-loading-spinner"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="printz-page-container"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "8px 24px 14px 24px",
        minHeight: "auto",
        maxWidth: "100%",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Popup {...popup} />

      {/* Header Banner - Matching Add Admin style with illustration */}
      <div
        className="printz-header-banner-full"
        style={{
          width: "100%",
          background:
            "linear-gradient(90deg, #E8FAF2 0%, #F0FFF9 50%, #E8FAF2 100%)",
          border: "1px solid #dcfce7",
          borderRadius: "14px",
          padding: "8px 20px",
          marginBottom: "0px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 2px 10px rgba(4, 120, 87, 0.04)",
          boxSizing: "border-box",
        }}
      >
        {/* Left Side: Title */}
        <div className="printz-header-title-area" style={{ flexShrink: 0 }}>
          <h1
            style={{
              margin: "0 0 2px 0",
              fontSize: "22px",
              fontWeight: 700,
              color: "#111827",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Admin{" "}
            <span className="highlight" style={{ color: "#059669" }}>
              Dashboard
            </span>
          </h1>
          <p style={{ margin: 0, fontSize: "12.5px", color: "#475569" }}>
            Overview of branch performance, revenue breakdowns, and printer metrics.
          </p>
        </div>

        {/* Center / Right: Illustration Artwork (comfortable right alignment matching AddAdmin) */}
        <div
          className="branch-header-illustration-wrap admin-dashboard-header-illustration-wrap"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            width: "320px",
            height: "72px",
            flexShrink: 0,
            marginLeft: "auto",
          }}
        >
          <AdminDashboardIllustration height={72} width={320} />
        </div>
      </div>

      {/* Top Filter Bar Card - Compact height, preserved exact date selection */}
      <div
        className="add-assets-card"
        style={{
          padding: "8px 14px",
          overflow: "visible",
          position: "relative",
          zIndex: 40,
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {/* Branch dropdown with modern icon wrapper */}
          <div style={{ minWidth: "180px" }}>
            <BranchSelect
              value={selectedBranch}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__placeholder__") return;
                setSelectedBranch(v);
              }}
              branches={branches}
              placeholder="All Branches"
              allowAll={true}
              allOptionLabel="All Branches"
              triggerStyle={{ height: "36px", fontSize: "13px", fontWeight: 600 }}
            />
          </div>

          {/* Calendar icon and popover */}
          <div ref={popRef} style={{ position: "relative" }}>
            <button
              type="button"
              aria-label="Open calendar"
              onClick={() => setCalendarOpen((v) => !v)}
              style={{
                height: "36px",
                border: "1.5px solid #e2e8f0",
                background: calendarOpen ? "#f0fdf4" : "#ffffff",
                borderRadius: "8px",
                padding: "0 12px",
                display: "flex",
                alignItems: "center",
                gap: "7px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                color: "#1e293b",
                transition: "all 0.2s ease",
                fontFamily: "inherit",
              }}
            >
              <Calendar size={15} color="#059669" />
              <span>Calendar</span>
            </button>

            {calendarOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.04)",
                  padding: "14px",
                  zIndex: 100,
                  minWidth: "300px",
                  fontFamily: "'Poppins', -apple-system, sans-serif",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#f1f5f9",
                    padding: "3px",
                    borderRadius: "8px",
                    marginBottom: "12px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setDateMode("single")}
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "none",
                      background: dateMode === "single" ? "#ffffff" : "transparent",
                      color: dateMode === "single" ? "#059669" : "#64748b",
                      fontSize: "12px",
                      fontWeight: dateMode === "single" ? 700 : 500,
                      cursor: "pointer",
                      boxShadow: dateMode === "single" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    Single date
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateMode("range")}
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "none",
                      background: dateMode === "range" ? "#ffffff" : "transparent",
                      color: dateMode === "range" ? "#059669" : "#64748b",
                      fontSize: "12px",
                      fontWeight: dateMode === "range" ? 700 : 500,
                      cursor: "pointer",
                      boxShadow: dateMode === "range" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    Date range
                  </button>
                </div>

                {dateMode === "single" ? (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        color: "#64748b",
                        marginBottom: "6px",
                      }}
                    >
                      Select Date
                    </label>
                    <CalendarSelect
                      selected={singleDate ? new Date(singleDate) : null}
                      onChange={(d) => {
                        if (d) setSingleDate(formatDate(d));
                      }}
                      dateFormat="dd-MM-yyyy"
                      triggerStyle={{ height: "38px" }}
                    />
                  </div>
                ) : (
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        color: "#64748b",
                        marginBottom: "6px",
                      }}
                    >
                      Date Range (From – To)
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <CalendarSelect
                          selected={fromDate ? new Date(fromDate) : null}
                          onChange={(d) => {
                            if (d) setFromDate(formatDate(d));
                          }}
                          maxDate={toDate ? new Date(toDate) : null}
                          dateFormat="dd-MM-yyyy"
                          triggerStyle={{ height: "38px" }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#94a3b8",
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        to
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <CalendarSelect
                          selected={toDate ? new Date(toDate) : null}
                          onChange={(d) => {
                            if (d) setToDate(formatDate(d));
                          }}
                          minDate={fromDate ? new Date(fromDate) : null}
                          dateFormat="dd-MM-yyyy"
                          triggerStyle={{ height: "38px" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected text and analytics */}
          <div
            style={{
              color: "#6b7280",
              fontSize: "13px",
              marginLeft: "4px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span>
              Selected: <strong style={{ color: "#0f172a" }}>{selectedBranch || "All branches"}</strong> —{" "}
              <span style={{ color: "#059669", fontWeight: 600 }}>
                {dateMode === "single" ? singleDate : `${fromDate} to ${toDate}`}
              </span>
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "#ecfdf5",
                color: "#047857",
                border: "1px solid #a7f3d0",
                borderRadius: "20px",
                padding: "2px 10px",
                fontSize: "12px",
                fontWeight: 600,
                boxShadow: "0 1px 2px rgba(5, 150, 105, 0.06)",
              }}
            >
              <Clock size={12} color="#059669" />
              {dateMode === "single"
                ? singleDate === formatDate(new Date())
                  ? "Today"
                  : "Single Day"
                : selectedDates.length === 1
                ? "1 Day"
                : `${selectedDates.length} Days`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="admin-loading-container" style={{ margin: "20px auto", maxWidth: "480px" }}>
          <div className="admin-loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      ) : branchRows.length === 0 ? (
        <div
          className="add-assets-card"
          style={{
            padding: "40px 20px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "280px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "#e6f7f0",
              border: "1.5px solid #a7f3d0",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "14px",
            }}
          >
            <BarChart3 size={28} />
          </div>
          <h2
            style={{
              margin: "0 0 6px 0",
              fontSize: "18px",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            Welcome to Admin Dashboard
          </h2>
          <p
            style={{
              margin: "0 0 16px 0",
              fontSize: "13px",
              color: "#64748b",
              maxWidth: "500px",
              lineHeight: "1.5",
            }}
          >
            Please select a date range above to display analytics data and
            insights for your branches
          </p>
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "6px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
                color: "#475569",
                fontWeight: 500,
              }}
            >
              <TrendingUp size={14} color="#2563eb" /> Branch Revenue Comparisons
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "6px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
                color: "#475569",
                fontWeight: 500,
              }}
            >
              <Printer size={14} color="#059669" /> Printer Readings & Copies
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "6px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
                color: "#475569",
                fontWeight: 500,
              }}
            >
              <PieChart size={14} color="#d97706" /> Revenue Source Breakdowns
            </div>
          </div>
        </div>
      ) : (
        /* Two-row layout: each row has 2 cards side by side */
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            overflowX: "hidden",
          }}
        >
          {/* Row 1: Total Revenue by Branch | Total Printer Readings by Branch */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
              gap: "10px",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {/* Total Revenue Bar Chart Card */}
            <div className="add-assets-card" style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}>
              <div className="add-assets-card-header" style={{ padding: "6px 14px" }}>
                <div className="add-assets-card-header-left" style={{ gap: "8px" }}>
                  <div
                    className="add-assets-card-icon"
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "7px",
                      background: "#eff6ff",
                      borderColor: "#bfdbfe",
                      color: "#2563eb",
                    }}
                  >
                    <TrendingUp size={15} />
                  </div>
                  <div>
                    <h3 className="add-assets-card-title" style={{ fontSize: "15px" }}>
                      Total Revenue by Branch
                    </h3>
                  </div>
                </div>
              </div>
              <div style={{ padding: "6px 14px 10px 14px", overflowX: "hidden" }}>
                <HorizontalBarChart
                  title=""
                  labels={revenueLabels}
                  values={revenueValues}
                  xMax={xMax}
                  color="#3b82f6"
                  yAxisWidth={105}
                  valueFormatter={(v) =>
                    `₹${Number(v).toLocaleString("en-IN")}`
                  }
                  minPlotHeight={160}
                />
              </div>
            </div>

            {/* Total Printer Readings Bar Chart Card */}
            <div className="add-assets-card" style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}>
              <div className="add-assets-card-header" style={{ padding: "6px 14px" }}>
                <div className="add-assets-card-header-left" style={{ gap: "8px" }}>
                  <div
                    className="add-assets-card-icon"
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "7px",
                    }}
                  >
                    <Printer size={15} />
                  </div>
                  <div>
                    <h3 className="add-assets-card-title" style={{ fontSize: "15px" }}>
                      Total Printer Readings by Branch
                    </h3>
                  </div>
                </div>
              </div>
              <div style={{ padding: "6px 14px 10px 14px", overflowX: "hidden" }}>
                <HorizontalBarChart
                  title=""
                  labels={copiesLabels}
                  values={copiesValues}
                  xMax={copiesXMax}
                  color="#10b981"
                  yAxisWidth={105}
                  valueFormatter={(v) => `${Number(v).toLocaleString()}`}
                  minPlotHeight={160}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Branch Revenue Summary | Revenue Breakdown Pie Chart */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr",
              gap: "10px",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {/* Summary Table Card */}
            <div className="add-assets-card" style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}>
              <div className="add-assets-card-header" style={{ padding: "6px 14px" }}>
                <div className="add-assets-card-header-left" style={{ gap: "8px" }}>
                  <div
                    className="add-assets-card-icon"
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "7px",
                      background: "#f8fafc",
                      borderColor: "#cbd5e1",
                      color: "#475569",
                    }}
                  >
                    <Table size={15} />
                  </div>
                  <div>
                    <h3 className="add-assets-card-title" style={{ fontSize: "15px" }}>
                      Branch Revenue Summary
                    </h3>
                  </div>
                </div>
              </div>
              <div style={{ padding: "6px 10px 10px 10px", overflowX: "hidden" }}>
                <SummaryTable rows={branchRows} />
              </div>
            </div>

            {/* Revenue Breakdown Pie Chart Card */}
            <div
              className="add-assets-card"
              style={{
                width: "100%",
                minWidth: 0,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div className="add-assets-card-header" style={{ padding: "6px 14px" }}>
                <div className="add-assets-card-header-left" style={{ gap: "8px" }}>
                  <div
                    className="add-assets-card-icon"
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "7px",
                      background: "#fffbeb",
                      borderColor: "#fde68a",
                      color: "#d97706",
                    }}
                  >
                    <PieChart size={15} />
                  </div>
                  <div>
                    <h3 className="add-assets-card-title" style={{ fontSize: "15px" }}>
                      Revenue Breakdown — Total ₹
                      {totalsAggregate.total.toLocaleString("en-IN")}
                    </h3>
                  </div>
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "16px 14px 20px 14px",
                }}
              >
                <PieBreakdownChart
                  title=""
                  values={[
                    totalsAggregate.printer,
                    totalsAggregate.stock,
                    totalsAggregate.other,
                  ]}
                  labels={["Printer", "Stock", "Other"]}
                  colors={["#3b82f6", "#f59e0b", "#10b981"]}
                  height={240}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
