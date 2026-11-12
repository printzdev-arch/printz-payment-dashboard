import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  RotateCw,
  AlertTriangle,
  Info,
  Search,
  Calendar,
  X,
  Eye,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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

import DashboardHeader from "../components/DashboardHeader";
import dashboardService from "../api/dashboardApi";
import "../styles/dashboard.css";

// Register Chart.js elements
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

// Date range options matching mockup
const DATE_RANGE_OPTIONS = [
  { id: "mtd", label: (() => { const now = new Date(); const short = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }); return `This Month (${short(new Date(now.getFullYear(), now.getMonth(), 1))} - ${short(new Date(now.getFullYear(), now.getMonth() + 1, 0))}, ${now.getFullYear()})`; })() },
  { id: "today", label: "Today" },
  { id: "last7days", label: "Last 7 Days" },
  { id: "lastmonth", label: "Last Month" },
  { id: "custom", label: "Custom Range..." },
];

const STATUS_FILTER_OPTIONS = [
  { id: "ALL", label: "All Status" },
  { id: "Assigned", label: "Assigned" },
  { id: "In Progress", label: "In Progress" },
  { id: "Submitted", label: "Submitted" },
  { id: "Approved", label: "Approved" },
  { id: "Rejected", label: "Rejected" },
  { id: "Revision", label: "Revision" },
];

const PRIORITY_FILTER_OPTIONS = [
  { id: "ALL", label: "All Priority" },
  { id: "High", label: "High" },
  { id: "Medium", label: "Medium" },
  { id: "Low", label: "Low" },
];

const DEFAULT_ASSIGNED_JOBS = []; // no sample rows: only real data is shown

const DEFAULT_UPCOMING_DEADLINES = []; // no sample rows: only real data is shown

const DEFAULT_RECENT_SUBMISSIONS = []; // no sample rows: only real data is shown

const DEFAULT_ALERTS = []; // no sample rows: only real data is shown

const DesignerDashboard = () => {
  // Filter states
  const [dateRange, setDateRange] = useState("mtd");
  const [designStatusFilter, setDesignStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [appliedFilters, setAppliedFilters] = useState({
    dateRange: "mtd",
    designStatus: "ALL",
    priority: "ALL",
  });

  // Trend timeframe dropdowns
  const [trendGranularity, setTrendGranularity] = useState("daily");
  const [priorityPeriod, setPriorityPeriod] = useState("month");
  const [perfRange, setPerfRange] = useState("5m");

  // Search & pagination for Table 1 (My Design Jobs)
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Quick view modal
  const [selectedJob, setSelectedJob] = useState(null);

  // Loading & data states
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);

  // Stored user profile details
  const storedUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("printz_user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const userName = storedUser?.name || localStorage.getItem("userName") || "Priya";
  const userRole = storedUser?.role || localStorage.getItem("userRole") || "Graphic Designer";

  // Fetch designer dashboard metrics
  const loadDesignerMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await dashboardService.getDesignerDashboard({
        dateType: appliedFilters.dateRange,
      });
      setData(res);
    } catch (err) {
      console.warn("Backend metrics unavailable, using offline preview:", err);
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters.dateRange]);

  useEffect(() => {
    loadDesignerMetrics();
  }, [loadDesignerMetrics]);

  // Apply filters handler
  const handleApplyFilters = () => {
    setAppliedFilters({
      dateRange,
      designStatus: designStatusFilter,
      priority: priorityFilter,
    });
    setCurrentPage(1);
  };

  // Reset filters handler
  const handleResetFilters = () => {
    setDateRange("mtd");
    setDesignStatusFilter("ALL");
    setPriorityFilter("ALL");
    setSearchQuery("");
    setAppliedFilters({
      dateRange: "mtd",
      designStatus: "ALL",
      priority: "ALL",
    });
    setCurrentPage(1);
  };

  // All jobs pool
  const allAssignedJobs = useMemo(() => {
    return data?.assignedJobs && data.assignedJobs.length > 0
      ? data.assignedJobs
      : DEFAULT_ASSIGNED_JOBS;
  }, [data]);

  // Filtered assigned design jobs based on search, status filter, and priority filter
  const filteredJobs = useMemo(() => {
    return allAssignedJobs.filter((job) => {
      // Status filter
      if (
        appliedFilters.designStatus !== "ALL" &&
        job.status?.toLowerCase() !== appliedFilters.designStatus.toLowerCase()
      ) {
        return false;
      }
      // Priority filter
      if (
        appliedFilters.priority !== "ALL" &&
        job.priority?.toLowerCase() !== appliedFilters.priority.toLowerCase()
      ) {
        return false;
      }
      // Search term
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = job.jobId?.toLowerCase().includes(query);
        const matchesCustomer = job.customerName?.toLowerCase().includes(query);
        const matchesRequirement = job.designRequirement?.toLowerCase().includes(query);
        if (!matchesId && !matchesCustomer && !matchesRequirement) {
          return false;
        }
      }
      return true;
    });
  }, [allAssignedJobs, appliedFilters, searchQuery]);

  // Paginated jobs for Table 1
  const totalEntries = filteredJobs.length; // the real number of matching jobs
  const totalPages = Math.max(1, Math.ceil(totalEntries / itemsPerPage));
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredJobs.slice(start, start + itemsPerPage);
  }, [filteredJobs, currentPage]);

  const upcomingDeadlinesList = useMemo(() => {
    return data?.upcomingDeadlines && data.upcomingDeadlines.length > 0
      ? data.upcomingDeadlines
      : DEFAULT_UPCOMING_DEADLINES;
  }, [data]);

  const recentSubmissionsList = useMemo(() => {
    return data?.recentSubmissions && data.recentSubmissions.length > 0
      ? data.recentSubmissions
      : DEFAULT_RECENT_SUBMISSIONS;
  }, [data]);

  const alertsList = useMemo(() => {
    return data?.alerts && data.alerts.length > 0 ? data.alerts : DEFAULT_ALERTS;
  }, [data]);

  // ==========================================
  // Graph 1: Design Progress Trend (Line Chart)
  // ==========================================
  const trendLineData = useMemo(() => {
    // Real figures from the server; when it has none the chart stays empty (no sample points)
    const trend = data?.charts?.progressTrend || {};
    const labels = trend.labels || [];
    const assigned = trend.assigned || [];
    const completed = trend.completed || [];

    return {
      labels,
      datasets: [
        {
          label: "Assigned",
          data: assigned,
          borderColor: "#0d6245",
          backgroundColor: "rgba(13, 98, 69, 0.08)",
          borderWidth: 2.5,
          pointBackgroundColor: "#0d6245",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4.5,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true,
        },
        {
          label: "Completed",
          data: completed,
          borderColor: "#0ea5e9",
          backgroundColor: "rgba(14, 165, 233, 0.08)",
          borderWidth: 2.5,
          pointBackgroundColor: "#0ea5e9",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4.5,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true,
        },
      ],
    };
  }, [data, trendGranularity]);

  const trendLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          padding: 18,
          font: { family: "Inter, sans-serif", size: 12, weight: "600" },
          color: "#334155",
        },
      },
      tooltip: {
        backgroundColor: "#0f172a",
        titleFont: { size: 12, weight: "600" },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, family: "Inter, sans-serif" }, color: "#475569" },
      },
      y: {
        min: 0,
        ticks: {
          stepSize: 5,
          font: { size: 11, family: "Inter, sans-serif" },
          color: "#475569",
        },
        grid: { color: "#f1f5f9" },
      },
    },
  };

  // ==========================================
  // Graph 2: Design Status Distribution (Doughnut)
  // ==========================================
  const statusDoughnutData = useMemo(() => {
    const statusItems = data?.charts?.statusDistribution?.items || [];
    return {
      labels: statusItems.map((i) => i.label),
      datasets: [
        {
          data: statusItems.map((i) => i.count),
          backgroundColor: statusItems.map((i) => i.color),
          borderWidth: 2,
          borderColor: "#ffffff",
          hoverOffset: 4,
          cutout: "72%",
        },
      ],
    };
  }, [data]);

  const statusDoughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context) => ` ${context.label}: ${context.raw} designs`,
        },
      },
    },
  };

  // ==========================================
  // Graph 3: Designs by Priority (Bar Chart)
  // ==========================================
  const priorityBarData = useMemo(() => {
    const priorities = data?.charts?.priorityDistribution || [];
    return {
      labels: priorities.map((i) => i.priority),
      datasets: [
        {
          data: priorities.map((i) => i.count),
          backgroundColor: priorities.map((i) => i.color),
          borderRadius: 4,
          barPercentage: 0.5,
        },
      ],
    };
  }, [data]);

  const priorityBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        cornerRadius: 8,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, family: "Inter, sans-serif" }, color: "#475569" },
      },
      y: {
        min: 0,
        ticks: {
          stepSize: 2,
          font: { size: 11, family: "Inter, sans-serif" },
          color: "#475569",
        },
        grid: { color: "#f1f5f9" },
      },
    },
  };

  // ==========================================
  // Graph 4: Monthly Design Performance (Bar Chart)
  // ==========================================
  const performanceBarData = useMemo(() => {
    const perf = data?.charts?.monthlyPerformance || {};
    return {
      labels: perf.months || [],
      datasets: [
        {
          label: "Approved",
          data: perf.approved || [],
          backgroundColor: "#10b981",
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
        },
        {
          label: "Rejected",
          data: perf.rejected || [],
          backgroundColor: "#ef4444",
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
        },
      ],
    };
  }, [data]);

  const performanceBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          padding: 12,
          font: { family: "Inter, sans-serif", size: 11, weight: "600" },
          color: "#334155",
        },
      },
      tooltip: {
        backgroundColor: "#0f172a",
        cornerRadius: 8,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, family: "Inter, sans-serif" }, color: "#475569" },
      },
      y: {
        min: 0,
        ticks: {
          stepSize: 5,
          font: { size: 11, family: "Inter, sans-serif" },
          color: "#475569",
        },
        grid: { color: "#f1f5f9" },
      },
    },
  };

  // Status badge styling helper
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "badge-approved";
      case "in progress":
        return "badge-progress";
      case "submitted":
        return "badge-ontime";
      case "revision":
        return "badge-revision";
      case "rejected":
        return "badge-delayed";
      case "pending":
        return "badge-pending";
      default:
        return "badge-progress";
    }
  };

  // Priority badge styling helper
  const getPriorityBadgeClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "badge-high";
      case "medium":
        return "badge-medium";
      case "low":
        return "badge-low";
      default:
        return "badge-medium";
    }
  };

  return (
    <div className="printz-dash-container">
      {/* 1. Dashboard Header */}
      <DashboardHeader
        title="Designer Dashboard"
        subtitle={`Welcome, ${userName} | ${userRole}`}
        userName={userName}
        userRole={userRole}
        alertCount={5}
      />

      {/* 2. Filter Bar */}
      <div className="printz-dash-filter-card">
        <div className="printz-dash-filter-flex">
          <div className="printz-dash-inputs-row">
            {/* Date Range Filter */}
            <div className="printz-dash-field-group">
              <label className="printz-dash-label">
                <Calendar size={14} className="text-slate-500" />
                Date Range
              </label>
              <select
                className="printz-dash-select"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Design Status Filter */}
            <div className="printz-dash-field-group">
              <label className="printz-dash-label">Design Status</label>
              <select
                className="printz-dash-select"
                value={designStatusFilter}
                onChange={(e) => setDesignStatusFilter(e.target.value)}
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="printz-dash-field-group">
              <label className="printz-dash-label">Priority</label>
              <select
                className="printz-dash-select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                {PRIORITY_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons: Apply & Reset */}
          <div className="printz-dash-actions-row">
            <button
              type="button"
              className="printz-dash-btn-apply"
              onClick={handleApplyFilters}
            >
              Apply
            </button>
            <button
              type="button"
              className="printz-dash-btn-reset"
              onClick={handleResetFilters}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* 3. 7 KPI Cards Row */}
      <div className="printz-kpi-grid admin-overview mb-6">
        {/* Card 1: Total Assigned Designs */}
        <div className="printz-kpi-card">
          <div className="printz-kpi-top">
            <div className="printz-summary-icon blue">
              <FileText size={20} />
            </div>
            <div className="printz-kpi-values">
              <div className="printz-kpi-number">{data?.kpis?.totalAssignedDesigns?.value ?? 0}</div>
              <div className="printz-kpi-label">Total Assigned Designs</div>
            </div>
          </div>
          <div className="printz-kpi-bottom">
          </div>
        </div>

        {/* Card 2: In Progress */}
        <div className="printz-kpi-card">
          <div className="printz-kpi-top">
            <div className="printz-summary-icon green">
              <Clock size={20} />
            </div>
            <div className="printz-kpi-values">
              <div className="printz-kpi-number">{data?.kpis?.inProgressDesigns?.value ?? 0}</div>
              <div className="printz-kpi-label">In Progress</div>
            </div>
          </div>
          <div className="printz-kpi-bottom">
          </div>
        </div>

        {/* Card 3: Submitted */}
        <div className="printz-kpi-card">
          <div className="printz-kpi-top">
            <div className="printz-summary-icon orange">
              <Send size={20} />
            </div>
            <div className="printz-kpi-values">
              <div className="printz-kpi-number">{data?.kpis?.submittedDesigns?.value ?? 0}</div>
              <div className="printz-kpi-label">Submitted</div>
            </div>
          </div>
          <div className="printz-kpi-bottom">
          </div>
        </div>

        {/* Card 4: Approved */}
        <div className="printz-kpi-card">
          <div className="printz-kpi-top">
            <div className="printz-summary-icon green">
              <CheckCircle2 size={20} />
            </div>
            <div className="printz-kpi-values">
              <div className="printz-kpi-number">{data?.kpis?.approvedDesigns?.value ?? 0}</div>
              <div className="printz-kpi-label">Approved</div>
            </div>
          </div>
          <div className="printz-kpi-bottom">
          </div>
        </div>

        {/* Card 5: Rejected */}
        <div className="printz-kpi-card">
          <div className="printz-kpi-top">
            <div className="printz-summary-icon rose">
              <XCircle size={20} />
            </div>
            <div className="printz-kpi-values">
              <div className="printz-kpi-number">{data?.kpis?.rejectedDesigns?.value ?? 0}</div>
              <div className="printz-kpi-label">Rejected</div>
            </div>
          </div>
          <div className="printz-kpi-bottom">
          </div>
        </div>

        {/* Card 6: Revision Requested */}
        <div className="printz-kpi-card">
          <div className="printz-kpi-top">
            <div className="printz-summary-icon purple">
              <RotateCw size={20} />
            </div>
            <div className="printz-kpi-values">
              <div className="printz-kpi-number">{data?.kpis?.revisionRequested?.value ?? 0}</div>
              <div className="printz-kpi-label">Revision Requested</div>
            </div>
          </div>
          <div className="printz-kpi-bottom">
          </div>
        </div>

        {/* Card 7: Overdue Designs */}
        <div className="printz-kpi-card">
          <div className="printz-kpi-top">
            <div className="printz-summary-icon rose">
              <AlertTriangle size={20} />
            </div>
            <div className="printz-kpi-values">
              <div className="printz-kpi-number">{data?.kpis?.overdueDesigns?.value ?? 0}</div>
              <div className="printz-kpi-label">Overdue Designs</div>
            </div>
          </div>
          <div className="printz-kpi-bottom">
          </div>
        </div>
      </div>

      {/* 4. Row 1 Graphs (3 Columns) */}
      <div className="printz-graphs-grid mb-6">
        {/* Graph 1: Design Progress Trend */}
        <div className="printz-graph-card">
          <div className="printz-card-header">
            <div>
              <h3 className="printz-card-title">Design Progress Trend</h3>
              <span className="printz-card-subtitle">(Assigned vs Completed)</span>
            </div>
            <select
              className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none cursor-pointer"
              value={trendGranularity}
              onChange={(e) => setTrendGranularity(e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="printz-chart-area">
            <Line data={trendLineData} options={trendLineOptions} />
          </div>
        </div>

        {/* Graph 2: Design Status Distribution */}
        <div className="printz-graph-card">
          <div className="printz-card-header">
            <div>
              <h3 className="printz-card-title">Design Status Distribution</h3>
              <span className="printz-card-subtitle">(Design Status)</span>
            </div>
          </div>
          <div className="printz-doughnut-container">
            <div className="printz-doughnut-canvas-wrap">
              <Doughnut data={statusDoughnutData} options={statusDoughnutOptions} />
              <div className="printz-doughnut-center">
                <div className="printz-doughnut-center-count">{data?.charts?.statusDistribution?.total ?? 0}</div>
                <div className="printz-doughnut-center-text">Total Designs</div>
              </div>
            </div>
            <div className="printz-legend-list">
              <div className="printz-legend-item">
                <span className="printz-legend-label">
                  <span className="printz-legend-dot" style={{ backgroundColor: "#10b981" }} />
                  Approved
                </span>
                <span>
                  <strong className="printz-legend-val">{((data?.charts?.statusDistribution?.items || []).find((x) => x.label === "Approved") || {}).count ?? 0}</strong>{" "}
                  <span className="printz-legend-pct">({((data?.charts?.statusDistribution?.items || []).find((x) => x.label === "Approved") || {}).percentage ?? 0}%)</span>
                </span>
              </div>
              <div className="printz-legend-item">
                <span className="printz-legend-label">
                  <span className="printz-legend-dot" style={{ backgroundColor: "#0ea5e9" }} />
                  In Progress
                </span>
                <span>
                  <strong className="printz-legend-val">{((data?.charts?.statusDistribution?.items || []).find((x) => x.label === "In Progress") || {}).count ?? 0}</strong>{" "}
                  <span className="printz-legend-pct">({((data?.charts?.statusDistribution?.items || []).find((x) => x.label === "In Progress") || {}).percentage ?? 0}%)</span>
                </span>
              </div>
              <div className="printz-legend-item">
                <span className="printz-legend-label">
                  <span className="printz-legend-dot" style={{ backgroundColor: "#f59e0b" }} />
                  Submitted
                </span>
                <span>
                  <strong className="printz-legend-val">{((data?.charts?.statusDistribution?.items || []).find((x) => x.label === "Submitted") || {}).count ?? 0}</strong>{" "}
                  <span className="printz-legend-pct">({((data?.charts?.statusDistribution?.items || []).find((x) => x.label === "Submitted") || {}).percentage ?? 0}%)</span>
                </span>
              </div>
              <div className="printz-legend-item">
                <span className="printz-legend-label">
                  <span className="printz-legend-dot" style={{ backgroundColor: "#f97316" }} />
                  Revision
                </span>
                <span>
                  <strong className="printz-legend-val">{((data?.charts?.statusDistribution?.items || []).find((x) => x.label === "Revision") || {}).count ?? 0}</strong>{" "}
                  <span className="printz-legend-pct">({((data?.charts?.statusDistribution?.items || []).find((x) => x.label === "Revision") || {}).percentage ?? 0}%)</span>
                </span>
              </div>
              <div className="printz-legend-item">
                <span className="printz-legend-label">
                  <span className="printz-legend-dot" style={{ backgroundColor: "#ef4444" }} />
                  Rejected
                </span>
                <span>
                  <strong className="printz-legend-val">{((data?.charts?.statusDistribution?.items || []).find((x) => x.label === "Rejected") || {}).count ?? 0}</strong>{" "}
                  <span className="printz-legend-pct">({((data?.charts?.statusDistribution?.items || []).find((x) => x.label === "Rejected") || {}).percentage ?? 0}%)</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Graph 3: Designs by Priority */}
        <div className="printz-graph-card">
          <div className="printz-card-header">
            <div>
              <h3 className="printz-card-title">Designs by Priority</h3>
              <span className="printz-card-subtitle">(Priority)</span>
            </div>
            <select
              className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none cursor-pointer"
              value={priorityPeriod}
              onChange={(e) => setPriorityPeriod(e.target.value)}
            >
              <option value="month">This Month</option>
              <option value="last">Last Month</option>
            </select>
          </div>
          <div className="printz-chart-area">
            <Bar data={priorityBarData} options={priorityBarOptions} />
          </div>
        </div>
      </div>

      {/* 5. Row 2: Tables (My Design Jobs & Upcoming Deadlines) */}
      <div className="printz-tables-row printz-tables-row-1 mb-6">
        {/* Table 1: My Design Jobs */}
        <div className="printz-table-card">
          <div className="printz-card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="printz-card-title">My Design Jobs</h3>
              <span className="printz-card-subtitle">(Assigned Design Jobs)</span>
            </div>
            <div className="relative">
              <Search
                size={14}
                className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              />
              <input
                type="text"
                placeholder="Search job ID or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0d6245] w-56"
              />
            </div>
          </div>

          <div className="printz-table-wrap">
            <table className="printz-data-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Customer Name</th>
                  <th>Design Name / Requirement</th>
                  <th>Assigned Date</th>
                  <th>Deadline</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Revision</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedJobs.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-6 text-slate-400">
                      No design jobs found matching current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedJobs.map((job) => (
                    <tr key={job.id || job.jobId}>
                      <td className="font-semibold text-slate-800">{job.jobId}</td>
                      <td>{job.customerName}</td>
                      <td className="max-w-[150px] truncate" title={job.designRequirement}>
                        {job.designRequirement}
                      </td>
                      <td>{job.assignedDate}</td>
                      <td>{job.deadline}</td>
                      <td>
                        <span className={`printz-badge ${getPriorityBadgeClass(job.priority)}`}>
                          {job.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`printz-badge ${getStatusBadgeClass(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="text-center font-medium">{job.revisionCount ?? 0}</td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="printz-pill-btn"
                          onClick={() => setSelectedJob(job)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table 1 Footer with Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <div>
              Showing {filteredJobs.length === 0 ? 0 : 1} to{" "}
              {Math.min(filteredJobs.length, itemsPerPage)} of {totalEntries} entries
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.max(1, Math.ceil((totalEntries || 0) / (itemsPerPage || 1))) }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 flex items-center justify-center rounded text-xs font-semibold transition ${
                    currentPage === pageNum
                      ? "bg-[#0d6245] text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === 5}
                onClick={() => setCurrentPage((p) => Math.min(5, p + 1))}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Table 2: Upcoming Deadlines */}
        <div className="printz-table-card">
          <div className="printz-card-header">
            <div>
              <h3 className="printz-card-title">Upcoming Deadlines</h3>
              <span className="printz-card-subtitle">(Upcoming Design Deadlines)</span>
            </div>
          </div>

          <div className="printz-table-wrap">
            <table className="printz-data-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Customer Name</th>
                  <th>Deadline</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingDeadlinesList.map((job) => (
                  <tr key={job.id || job.jobId}>
                    <td className="font-semibold text-slate-800">{job.jobId}</td>
                    <td>{job.customerName}</td>
                    <td>{job.deadline}</td>
                    <td>
                      <span className={`printz-badge ${getPriorityBadgeClass(job.priority)}`}>
                        {job.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`printz-badge ${getStatusBadgeClass(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 6. Row 3: Recent Submissions, Monthly Performance & Alerts */}
      <div className="printz-tables-row printz-tables-row-2 mb-6">
        {/* Table 3: Recent Submissions */}
        <div className="printz-table-card">
          <div className="printz-card-header">
            <div>
              <h3 className="printz-card-title">Recent Submissions</h3>
              <span className="printz-card-subtitle">(Recent Submitted Designs)</span>
            </div>
          </div>

          <div className="printz-table-wrap">
            <table className="printz-data-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Customer Name</th>
                  <th>Submitted Date</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentSubmissionsList.map((job) => (
                  <tr key={job.id || job.jobId}>
                    <td className="font-semibold text-slate-800">{job.jobId}</td>
                    <td>{job.customerName}</td>
                    <td>{job.submittedDate}</td>
                    <td>
                      <span className={`printz-badge ${getStatusBadgeClass(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="max-w-[120px] truncate text-slate-500" title={job.remarks}>
                      {job.remarks}
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="printz-pill-btn"
                        onClick={() => setSelectedJob(job)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Graph 4: Design Performance */}
        <div className="printz-graph-card">
          <div className="printz-card-header">
            <div>
              <h3 className="printz-card-title">Design Performance</h3>
              <span className="printz-card-subtitle">(Monthly Performance)</span>
            </div>
            <select
              className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none cursor-pointer"
              value={perfRange}
              onChange={(e) => setPerfRange(e.target.value)}
            >
              <option value="5m">Last 5 Months</option>
              <option value="1y">Last 1 Year</option>
            </select>
          </div>
          <div className="printz-chart-area">
            <Bar data={performanceBarData} options={performanceBarOptions} />
          </div>
        </div>

        {/* Card 5: Alerts & Notifications */}
        <div className="printz-table-card">
          <div className="printz-card-header">
            <div>
              <h3 className="printz-card-title">Alerts & Notifications</h3>
              <span className="printz-card-subtitle">(Important Alerts)</span>
            </div>
          </div>

          <div className="printz-alert-list">
            {alertsList.map((item) => (
              <div key={item.id} className="printz-alert-item justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`printz-alert-icon ${
                      item.severity === "danger" ? "danger" : "info"
                    }`}
                  >
                    {item.severity === "danger" ? (
                      <AlertTriangle size={14} />
                    ) : (
                      <Info size={14} />
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-700">
                    {item.message}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap">
                  {item.timeAgo}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7. Quick View Design Job Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>Job Details: {selectedJob.jobId}</span>
                  <span className={`printz-badge ${getStatusBadgeClass(selectedJob.status)}`}>
                    {selectedJob.status}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customer: <strong>{selectedJob.customerName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">
                    Requirement / Name
                  </label>
                  <p className="font-semibold text-sm text-slate-800 mt-0.5">
                    {selectedJob.designRequirement || "Print Design Order"}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">
                    Priority
                  </label>
                  <div className="mt-0.5">
                    <span className={`printz-badge ${getPriorityBadgeClass(selectedJob.priority)}`}>
                      {selectedJob.priority}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">
                    Assigned Date
                  </label>
                  <p className="font-medium text-slate-700 mt-0.5">
                    {selectedJob.assignedDate || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">
                    Deadline
                  </label>
                  <p className="font-medium text-rose-600 mt-0.5">
                    {selectedJob.deadline || "-"}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 uppercase font-semibold">
                  Remarks / Notes
                </label>
                <div className="mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 leading-relaxed">
                  {selectedJob.remarks ||
                    "Client requested sample verification before production print run."}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition"
              >
                Close
              </button>
              <Link
                to={`/jobflow/design?jobNo=${selectedJob.jobId}&view=my-jobs`}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0d6245] hover:bg-[#094732] rounded-lg transition inline-flex items-center gap-1.5 shadow-2xs"
              >
                Open Studio
                <ExternalLink size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignerDashboard;
