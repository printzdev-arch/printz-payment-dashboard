import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  Users,
  UserCheck,
  Palette,
  Star,
  Receipt,
  Clock,
  ArrowUpRight,
  Search,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  Eye,
  Filter,
} from "lucide-react";
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

import DashboardHeader from "../components/DashboardHeader";
import DashboardFilterBar from "../components/DashboardFilterBar";
import KpiCardsRow from "../components/KpiCardsRow";
import ModuleDashboard from "../components/ModuleDashboard";
import GraphsRow from "../components/GraphsRow";
import AdminTablesGrid from "../components/AdminTablesGrid";
import dashboardService from "../api/dashboardApi";
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

const AdminDashboard = () => {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedDataType, setSelectedDataType] = useState("overview");
  const [dateType, setDateType] = useState("mtd");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  // The picked module (sales orders, job orders, ...) has its own KPIs, graphs and table
  const [moduleData, setModuleData] = useState(null);
  const isModuleView = selectedDataType !== "overview";
  // Inventory and Employees show how things stand now, so the date range is not needed there
  const hideDateRange = selectedDataType === "inventory" || selectedDataType === "employees";
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobModal, setSelectedJobModal] = useState(null);
  const [compareWith, setCompareWith] = useState("previous_period");

  // Read stored user profile details
  const storedUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("printz_user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const userName =
    storedUser?.name ||
    localStorage.getItem("userName") ||
    "Administrator";

  const userRole =
    storedUser?.role ||
    localStorage.getItem("userRole") ||
    "Super Admin";

  // Load branches list on mount
  useEffect(() => {
    let active = true;
    dashboardService.getBranches().then((list) => {
      if (active && Array.isArray(list)) {
        setBranches(list);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Fetch Dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const filters = {
        branchId: selectedBranch !== "ALL" ? selectedBranch : undefined,
        dateType,
        startDate: dateType === "custom" ? startDate : undefined,
        endDate: dateType === "custom" ? endDate : undefined,
      };
      if (selectedDataType !== "overview") {
        setModuleData(await dashboardService.getAdminModule({ ...filters, module: selectedDataType }));
      } else {
        setData(await dashboardService.getAdminDashboard({ ...filters, dataType: "overview" }));
      }
    } catch (err) {
      console.error("Admin dashboard load failed:", err);
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to load company-wide dashboard metrics"
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranch, selectedDataType, dateType, startDate, endDate]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleApply = () => {
    loadDashboardData();
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Filter domain-specific table rows
  const filteredTableData = useMemo(() => {
    const list = data?.tableData || [];
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((item) =>
      Object.values(item).some((val) =>
        String(val).toLowerCase().includes(term)
      )
    );
  }, [data, searchTerm]);

  // Selected branch display name
  const currentBranchName = useMemo(() => {
    if (selectedBranch === "ALL") return "All Branches (Company-Wide)";
    const found = branches.find((b) => b._id === selectedBranch);
    return found ? found.name : "Selected Branch";
  }, [selectedBranch, branches]);

  // Domain-specific chart data for REVENUE
  const domainRevenueTrendChart = useMemo(() => {
    const trend = data?.charts?.revenue?.dailyTrend || [];
    return {
      labels: trend.map((d) => d.date),
      datasets: [
        {
          label: "Company Revenue (₹)",
          data: trend.map((d) => d.revenue),
          borderColor: "#0d6245",
          backgroundColor: "rgba(13, 98, 69, 0.08)",
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: "#0d6245",
        },
      ],
    };
  }, [data]);

  const domainPaymentBreakdownChart = useMemo(() => {
    const payments = data?.charts?.revenue?.paymentBreakdown || [];
    return {
      labels: payments.map((p) => p.method),
      datasets: [
        {
          data: payments.map((p) => p.amount),
          backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"],
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    };
  }, [data]);

  // Domain-specific chart data for STOCKS
  const domainStockCategoryChart = useMemo(() => {
    const categories = data?.charts?.stocks?.categoryValuation || [];
    return {
      labels: categories.map((c) => c.category),
      datasets: [
        {
          label: "Stock Valuation (₹)",
          data: categories.map((c) => c.value),
          backgroundColor: "#f59e0b",
          borderRadius: 8,
        },
      ],
    };
  }, [data]);

  const domainStockHealthChart = useMemo(() => {
    const health = data?.charts?.stocks?.stockHealth || [];
    return {
      labels: health.map((h) => h.status),
      datasets: [
        {
          data: health.map((h) => h.count),
          backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    };
  }, [data]);

  // Domain-specific chart data for EMPLOYEES
  const domainEmployeeBranchChart = useMemo(() => {
    const brs = data?.charts?.employees?.branchDistribution || [];
    return {
      labels: brs.map((b) => b.branch),
      datasets: [
        {
          label: "Staff Count",
          data: brs.map((b) => b.count),
          backgroundColor: "#6366f1",
          borderRadius: 8,
        },
      ],
    };
  }, [data]);

  // Domain-specific chart data for DESIGNERS
  const domainDesignerWorkloadChart = useMemo(() => {
    const workload = data?.charts?.designers?.workload || [];
    return {
      labels: workload.map((w) => w.designer),
      datasets: [
        {
          label: "Active Assigned Jobs",
          data: workload.map((w) => w.activeJobs),
          backgroundColor: "#8b5cf6",
          borderRadius: 8,
        },
      ],
    };
  }, [data]);

  const domainDesignerStagesChart = useMemo(() => {
    const stages = data?.charts?.designers?.stages || [];
    return {
      labels: stages.map((s) => s.stage.replace(/_/g, " ")),
      datasets: [
        {
          data: stages.map((s) => s.count),
          backgroundColor: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899"],
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    };
  }, [data]);

  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 10,
          usePointStyle: true,
          font: { size: 11, family: "Inter, sans-serif" },
        },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: "#f1f5f9" } },
    },
  };

  return (
    <div className="printz-dash-container">
      <div>
        {/* Top Header matching reference UI banner */}
        <DashboardHeader
          title="Admin Dashboard"
          userName={userName}
          userRole={userRole}
          branchName={currentBranchName}
          alertCount={data?.alerts?.length || 5}
        />

        {/* Filter Bar with Branch Dropdown, Data Type Dropdown, Date Range, Apply button, and Compare With */}
        <DashboardFilterBar
          branches={branches}
          selectedBranch={selectedBranch}
          onChangeBranch={setSelectedBranch}
          selectedDataType={selectedDataType}
          onChangeDataType={setSelectedDataType}
          selectedDateRange={dateType}
          onChangeDateRange={setDateType}
          startDate={startDate}
          endDate={endDate}
          onChangeStartDate={setStartDate}
          onChangeEndDate={setEndDate}
          onApply={handleApply}
          isLoading={isLoading}
          isBranchLocked={false}
          showCompareWith={!isModuleView}
          hideDateRange={hideDateRange}
          compareWith={compareWith}
          onChangeCompareWith={setCompareWith}
        />

        {/* Error notification banner if any */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadDashboardData}
              className="text-xs font-semibold underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {isModuleView ? (
          <ModuleDashboard data={moduleData && moduleData.module === selectedDataType ? moduleData : null} isLoading={isLoading} />
        ) : (
          <>
          {/* Important KPI Cards with old-model vibrant vertical gradient icons (7 cards for Admin overview) */}
          <KpiCardsRow
            kpis={data?.kpis || {}}
            dataType={selectedDataType}
            isAdmin={true}
            selectedBranch={selectedBranch}
            branchName={currentBranchName}
          />

          {/* 3 Main Graphs (Revenue Trend, Branch-wise Revenue/Category Sales, Job Order Status) */}
          <GraphsRow
            charts={data?.charts || {}}
            dataType={selectedDataType}
            isAdmin={true}
            selectedBranch={selectedBranch}
            branchName={currentBranchName}
          />

          {/* Admin 2-Row Tables & Alerts Grid */}
          <AdminTablesGrid
            branchPerformance={data?.branchPerformance || []}
            topBranches={data?.topBranches || []}
            recentJobOrders={data?.recentJobOrders || []}
            lowStockItems={data?.lowStockItems || []}
            alerts={data?.alerts || []}
            onViewJobOrder={(job) => setSelectedJobModal(job)}
            selectedBranch={selectedBranch}
            selectedBranchName={currentBranchName}
          />

          {/* Domain-specific Master Table when a specific category is selected */}
          {selectedDataType !== "overview" && filteredTableData.length > 0 && (
            <div className="printz-table-card" style={{ marginTop: "24px" }}>
              <div className="printz-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h3 className="printz-card-title" style={{ textTransform: "capitalize" }}>
                    {selectedDataType} Master Records
                  </h3>
                  <span className="printz-card-subtitle">
                    Showing {filteredTableData.length} records matching active filters
                  </span>
                </div>
                <div style={{ position: "relative" }}>
                  <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#475569" }} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Search ${selectedDataType}...`}
                    style={{
                      height: "36px",
                      paddingLeft: "32px",
                      paddingRight: "12px",
                      fontSize: "12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      outline: "none",
                      minWidth: "200px"
                    }}
                  />
                </div>
              </div>

              <div className="printz-table-wrap">
                <table className="printz-data-table">
                  <thead>
                    <tr>
                      {Object.keys(filteredTableData[0] || {})
                        .filter((k) => k !== "_id" && k !== "id")
                        .slice(0, 6)
                        .map((col) => (
                          <th key={col}>{col.replace(/([A-Z])/g, " $1")}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTableData.slice(0, 10).map((row, idx) => (
                      <tr key={row._id || row.id || idx}>
                        {Object.keys(filteredTableData[0] || {})
                          .filter((k) => k !== "_id" && k !== "id")
                          .slice(0, 6)
                          .map((col) => (
                            <td key={col}>
                              {typeof row[col] === "number" &&
                              (col.toLowerCase().includes("amount") ||
                                col.toLowerCase().includes("price") ||
                                col.toLowerCase().includes("total") ||
                                col.toLowerCase().includes("val"))
                                ? formatCurrency(row[col])
                                : String(row[col] ?? "-")}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          </>
        )}

        {/* Quick View Job Modal */}
        {selectedJobModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Job Order Details
                  </h3>
                  <p className="text-xs text-slate-500">
                    ID: {selectedJobModal.jobId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedJobModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
                >
                  ✕
                </button>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500">Customer Name:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedJobModal.customerName}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500">Design Status:</span>
                  <span className="font-semibold text-emerald-700">
                    {selectedJobModal.designStatus}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500">Production Status:</span>
                  <span className="font-semibold text-amber-700">
                    {selectedJobModal.productionStatus}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500">Delivery Date:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedJobModal.deliveryDate}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500">Priority:</span>
                  <span className="font-semibold text-rose-700">
                    {selectedJobModal.priority}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedJobModal(null)}
                  className="px-5 py-2 bg-[#0d6245] text-white text-xs font-semibold rounded-lg hover:bg-[#0a4f37] transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
