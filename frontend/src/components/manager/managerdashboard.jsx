import React, { useState, useEffect } from "react";
import api from "../../services/api";
import "../../styles/printzTheme.css";
import "../../styles/managerdashboard.css";
import Popup from "../common/Popup.jsx";
import { usePopup } from "../../hooks/usePopup";
import ManagerIllustration from "../illustrations/ManagerIllustration.jsx";
import {
  Calendar,
  Printer,
  Package,
  Layers,
  Clock,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  TrendingUp,
  Activity,
  IndianRupee,
  CalendarDays,
  DollarSign,
} from "lucide-react";

const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) {
    return "₹0";
  }
  let [integer, decimal] = Number.parseFloat(amount).toFixed(0).split(".");
  integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (integer.length > 4 && integer.includes(",,")) {
    integer = integer.replace(",,", ",");
  }

  return `₹${integer}${decimal ? "." + decimal : ""}`;
};

const ManagerDashboard = () => {
  const { popup, showError } = usePopup();
  const [branchName, setBranchName] = useState("");
  const [userInfo, setUserInfo] = useState({ name: "", email: "", phone: "" });
  const [activePrinterCount, setActivePrinterCount] = useState(0);
  const [jumboXeroxCount, setJumboXeroxCount] = useState(0);
  const [stockCount, setStockCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        let userData = storedUser ? JSON.parse(storedUser) : null;

        try {
          const profileRes = await api.get("/users/profile");
          if (profileRes.data?.data || profileRes.data) {
            userData = profileRes.data.data || profileRes.data;
          }
        } catch (e) {
          // fallback to cached user
        }

        const detectedBranch =
          userData?.branch ||
          userData?.branchName ||
          localStorage.getItem("userBranchName") ||
          "";

        setBranchName(detectedBranch);
        setUserInfo({
          name: userData?.name || localStorage.getItem("userName") || "Manager",
          email: userData?.email || "",
          phone: userData?.phone || "N/A",
        });

        if (!detectedBranch) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (!branchName) {
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Printers
        try {
          const printersRes = await api.get("/printers", {
            params: { branchName },
          });
          const printersList =
            printersRes.data?.data ||
            (Array.isArray(printersRes.data) ? printersRes.data : []);

          let activePrinters = 0;
          let jumboXeroxPrinters = 0;

          printersList.forEach((printerData) => {
            if (
              (printerData.printerType === "MFP" ||
                printerData.printerType === "SFP") &&
              printerData.isActive === true
            ) {
              activePrinters++;
            }
            if (
              printerData.printerType === "LFP" &&
              printerData.isActive === true
            ) {
              jumboXeroxPrinters++;
            }
          });

          setActivePrinterCount(activePrinters);
          setJumboXeroxCount(jumboXeroxPrinters);
        } catch (err) {
          console.warn("Could not fetch printers:", err?.message);
        }

        // 2. Total amounts
        let totalBranchRevenue = 0;
        let todayTotal = 0;
        let monthlyTotal = 0;

        try {
          const totalAmountRes = await api.get("/total-amounts", {
            params: { branchName },
          });
          const totalAmountData =
            totalAmountRes.data?.data ||
            (Array.isArray(totalAmountRes.data) ? totalAmountRes.data : []);

          const today = new Date();
          const todayString = today.toISOString().split("T")[0];
          const currentMonth = today.getMonth();
          const currentYear = today.getFullYear();

          totalAmountData.forEach((data) => {
            const amt = Number(data.totalAmount || 0);
            totalBranchRevenue += amt;

            if (data.date === todayString) {
              todayTotal += amt;
            }
            if (data.date) {
              const d = new Date(data.date);
              if (
                d.getFullYear() === currentYear &&
                d.getMonth() === currentMonth
              ) {
                monthlyTotal += amt;
              }
            }
          });
        } catch (err) {
          console.warn("Could not fetch total amounts:", err?.message);
        }

        setTotalRevenue(totalBranchRevenue);
        setTodayRevenue(todayTotal);
        setMonthlyRevenue(monthlyTotal);

        // 3. Stocks count
        try {
          const stockRes = await api.get("/stocks/items", {
            params: { branchName },
          });
          const stockList =
            stockRes.data?.data ||
            (Array.isArray(stockRes.data) ? stockRes.data : []);
          setStockCount(stockList.length);
        } catch (err) {
          console.warn("Could not fetch stock items:", err?.message);
        }

        // 4. Recent Activity
        const activities = [];

        try {
          const printerReadingsRes = await api.get("/printer-readings", {
            params: { branchName },
          });
          const printerReadings =
            printerReadingsRes.data?.data ||
            (Array.isArray(printerReadingsRes.data)
              ? printerReadingsRes.data
              : []);

          printerReadings.forEach((data) => {
            const updated = data.lastUpdated || data.updatedAt || data.createdAt;
            if (updated) {
              activities.push({
                id: data.id || data._id,
                type: "Printer Reading",
                description: `Updated printer counter readings`,
                date: data.date,
                timestamp: new Date(updated),
                icon: "printer",
              });
            }
          });
        } catch (e) {
          console.warn("Error loading printer reading activities:", e?.message);
        }

        try {
          const stockReadingsRes = await api.get("/stocks/readings", {
            params: { branchName },
          });
          const stockReadings =
            stockReadingsRes.data?.data ||
            (Array.isArray(stockReadingsRes.data)
              ? stockReadingsRes.data
              : []);

          stockReadings.forEach((data) => {
            const updated = data.lastUpdated || data.updatedAt || data.createdAt;
            if (updated) {
              activities.push({
                id: (data.id || data._id) + "_stock",
                type: "Stock Reading",
                description: `Updated stock readings (${
                  data.stocks?.length || 0
                } items)`,
                date: data.date,
                timestamp: new Date(updated),
                icon: "stock",
              });
            }
          });
        } catch (e) {
          console.warn("Error loading stock reading activities:", e?.message);
        }

        try {
          const jumboReadingsRes = await api.get("/jumbo-xerox/readings", {
            params: { branchName },
          });
          const jumboReadings =
            jumboReadingsRes.data?.data ||
            (Array.isArray(jumboReadingsRes.data)
              ? jumboReadingsRes.data
              : []);

          jumboReadings.forEach((data) => {
            const updated = data.lastUpdated || data.updatedAt || data.createdAt;
            if (updated) {
              activities.push({
                id: (data.id || data._id) + "_jumbo",
                type: "Large Format Reading",
                description: `Updated large format machine reading`,
                date: data.date,
                timestamp: new Date(updated),
                icon: "jumbo",
              });
            }
          });
        } catch (e) {
          console.warn("Error loading jumbo reading activities:", e?.message);
        }

        activities.sort((a, b) => b.timestamp - a.timestamp);
        setRecentActivity(activities.slice(0, 5));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [branchName]);

  const initials = (() => {
    if (!userInfo.name) return "M";
    const parts = userInfo.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  })();

  const formatActivityTime = (date, timestamp) => {
    try {
      if (timestamp && !isNaN(timestamp.getTime())) {
        return timestamp.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
    } catch (e) {}
    return date || "";
  };

  if (loading) {
    return (
      <div className="printz-page-container">
        <div className="manager-dashboard-loading">
          <div className="manager-dashboard-loading-spinner"></div>
          <p>Loading manager dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="printz-page-container manager-dashboard-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        padding: "8px 24px 24px 24px",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <Popup {...popup} />

      {/* Header Banner - Matching Admin style with illustration */}
      <div
        className="printz-header-banner-full"
        style={{
          width: "100%",
          background:
            "linear-gradient(90deg, #E8FAF2 0%, #F0FFF9 50%, #E8FAF2 100%)",
          border: "1px solid #dcfce7",
          borderRadius: "16px",
          padding: "14px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          boxShadow: "0 2px 10px rgba(4, 120, 87, 0.04)",
          boxSizing: "border-box",
          flexWrap: "wrap",
        }}
      >
        {/* Left Side: Welcome Info */}
        <div className="printz-header-title-area" style={{ flex: 1, minWidth: "260px" }}>
          <h1
            style={{
              margin: "0 0 6px 0",
              fontSize: "1.5rem",
              fontWeight: "700",
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            Welcome back, <span style={{ color: "#059669" }}>{userInfo.name}</span>!
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              color: "#475569",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Building2 size={15} color="#059669" />
              Branch: <strong style={{ color: "#0f172a" }}>{branchName || "Assigned Branch"}</strong>
            </span>
            <span style={{ color: "#cbd5e1" }}>•</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Calendar size={15} color="#059669" />
              <span style={{ color: "#334155", fontWeight: 500 }}>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </span>
          </p>
        </div>

        {/* Right Side: Manager Illustration */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            flexShrink: 0,
          }}
        >
          <ManagerIllustration height={82} width={300} />
        </div>
      </div>

      {/* Summary KPI Cards Grid - Exactly matching Admin Management & Dashboard */}
      <div
        className="printz-summary-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
          marginBottom: "6px",
        }}
      >
        {/* KPI 1: Active Printers */}
        <div
          className="printz-summary-card"
          style={{ padding: "14px 16px", minHeight: "84px", boxSizing: "border-box" }}
        >
          <div className="printz-summary-card-main" style={{ gap: "12px", alignItems: "center" }}>
            <div className="printz-summary-icon green">
              <Printer size={20} strokeWidth={2.4} color="#ffffff" />
            </div>
            <div className="printz-summary-content" style={{ minWidth: 0, flex: 1 }}>
              <div
                className="printz-summary-label"
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#01050bff",
                  marginBottom: "4px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Active Printers
              </div>
              <div className="printz-summary-value-row" style={{ alignItems: "center" }}>
                <span className="printz-summary-value" style={{ fontSize: "20px", fontWeight: 800 }}>
                  {activePrinterCount}
                </span>
                <span
                  className="printz-summary-badge-pill"
                  style={{
                    background: "#ecfdf5",
                    color: "#059669",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                  }}
                >
                  MFP / SFP
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 2: Stock Items */}
        <div
          className="printz-summary-card"
          style={{ padding: "14px 16px", minHeight: "84px", boxSizing: "border-box" }}
        >
          <div className="printz-summary-card-main" style={{ gap: "12px", alignItems: "center" }}>
            <div className="printz-summary-icon blue">
              <Package size={20} strokeWidth={2.4} color="#ffffff" />
            </div>
            <div className="printz-summary-content" style={{ minWidth: 0, flex: 1 }}>
              <div
                className="printz-summary-label"
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#01050bff",
                  marginBottom: "4px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Stock Items
              </div>
              <div className="printz-summary-value-row" style={{ alignItems: "center" }}>
                <span className="printz-summary-value" style={{ fontSize: "20px", fontWeight: 800 }}>
                  {stockCount}
                </span>
                <span
                  className="printz-summary-badge-pill"
                  style={{
                    background: "#eff6ff",
                    color: "#2563eb",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                  }}
                >
                  Inventory
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3: Large Format Printers */}
        <div
          className="printz-summary-card"
          style={{ padding: "14px 16px", minHeight: "84px", boxSizing: "border-box" }}
        >
          <div className="printz-summary-card-main" style={{ gap: "12px", alignItems: "center" }}>
            <div className="printz-summary-icon green">
              <TrendingUp size={20} strokeWidth={2.4} color="#ffffff" />
            </div>
            <div className="printz-summary-content" style={{ minWidth: 0, flex: 1 }}>
              <div
                className="printz-summary-label"
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#01050bff",
                  marginBottom: "4px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title="Large Format Printers"
              >
                Large Format Printers
              </div>
              <div className="printz-summary-value-row" style={{ alignItems: "center" }}>
                <span className="printz-summary-value" style={{ fontSize: "20px", fontWeight: 800 }}>
                  {jumboXeroxCount}
                </span>
                <span
                  className="printz-summary-badge-pill"
                  style={{
                    background: "#ecfdf5",
                    color: "#059669",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                  }}
                >
                  LFP
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 4: Today's Revenue */}
        <div
          className="printz-summary-card"
          style={{ padding: "14px 16px", minHeight: "84px", boxSizing: "border-box" }}
        >
          <div className="printz-summary-card-main" style={{ gap: "12px", alignItems: "center" }}>
            <div className="printz-summary-icon orange">
              <IndianRupee size={20} strokeWidth={2.4} color="#ffffff" />
            </div>
            <div className="printz-summary-content" style={{ minWidth: 0, flex: 1 }}>
              <div
                className="printz-summary-label"
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#01050bff",
                  marginBottom: "4px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Today's Revenue
              </div>
              <div className="printz-summary-value-row" style={{ alignItems: "center" }}>
                <span
                  className="printz-summary-value"
                  style={{ fontSize: "20px", fontWeight: 800 }}
                >
                  {formatCurrency(todayRevenue)}
                </span>
                <span
                  className="printz-summary-badge-pill"
                  style={{
                    background: "#fffbeb",
                    color: "#d97706",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                  }}
                >
                  Today
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 5: Monthly Revenue */}
        <div
          className="printz-summary-card"
          style={{ padding: "14px 16px", minHeight: "84px", boxSizing: "border-box" }}
        >
          <div className="printz-summary-card-main" style={{ gap: "12px", alignItems: "center" }}>
            <div className="printz-summary-icon green">
              <TrendingUp size={20} strokeWidth={2.4} color="#ffffff" />
            </div>
            <div className="printz-summary-content" style={{ minWidth: 0, flex: 1 }}>
              <div
                className="printz-summary-label"
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#01050bff",
                  marginBottom: "4px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Monthly Revenue
              </div>
              <div className="printz-summary-value-row" style={{ alignItems: "center" }}>
                <span
                  className="printz-summary-value"
                  style={{ fontSize: "20px", fontWeight: 800 }}
                >
                  {formatCurrency(monthlyRevenue)}
                </span>
                <span
                  className="printz-summary-badge-pill"
                  style={{
                    background: "#ecfdf5",
                    color: "#059669",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                  }}
                >
                  This Month
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Details Grid: Manager Info & Recent Activity */}
      <div className="manager-details-grid" style={{ marginTop: "4px" }}>
        {/* Left Card: Manager & Branch Info */}
        <div className="manager-content-card">
          <div className="manager-card-header">
            <div className="manager-card-title-group">
              <Building2 size={18} className="manager-card-title-icon" />
              <h2 className="manager-card-title">Manager & Branch Info</h2>
            </div>
            <span className="manager-badge-pill">Active Station</span>
          </div>

          <div className="manager-card-body">
            <div className="manager-profile-box">
              <div className="manager-profile-top">
                <div className="manager-avatar-large">{initials}</div>
                <div className="manager-profile-name-group">
                  <h3 className="manager-profile-name">{userInfo.name}</h3>
                  <span className="manager-profile-tag">
                    <CheckCircle2 size={14} color="#059669" />
                    Authorized Branch Manager
                  </span>
                </div>
              </div>

              <div className="manager-info-list">
                <div className="manager-info-item">
                  <div className="manager-info-item-left">
                    <Building2 size={16} color="#059669" />
                    <span>Branch</span>
                  </div>
                  <span className="manager-info-item-right">
                    {branchName || "N/A"}
                  </span>
                </div>

                <div className="manager-info-item">
                  <div className="manager-info-item-left">
                    <Mail size={16} color="#2563eb" />
                    <span>Email</span>
                  </div>
                  <span className="manager-info-item-right" style={{ wordBreak: "break-all" }}>
                    {userInfo.email || "N/A"}
                  </span>
                </div>

                <div className="manager-info-item">
                  <div className="manager-info-item-left">
                    <Phone size={16} color="#7c3aed" />
                    <span>Contact</span>
                  </div>
                  <span className="manager-info-item-right">
                    {userInfo.phone || "N/A"}
                  </span>
                </div>

                <div className="manager-info-item">
                  <div className="manager-info-item-left">
                    <Activity size={16} color="#059669" />
                    <span>System Status</span>
                  </div>
                  <span
                    className="manager-info-item-right"
                    style={{
                      color: "#059669",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    ● Operational
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Recent Activity Feed */}
        <div className="manager-content-card">
          <div className="manager-card-header">
            <div className="manager-card-title-group">
              <Clock size={18} className="manager-card-title-icon" />
              <h2 className="manager-card-title">Recent Activity</h2>
            </div>
            <span className="manager-badge-pill">
              {recentActivity.length} Recent Logs
            </span>
          </div>

          <div className="manager-card-body">
            {recentActivity.length > 0 ? (
              <div className="manager-activity-list">
                {recentActivity.map((activity) => {
                  const isPrinter = activity.icon === "printer";
                  const isStock = activity.icon === "stock";
                  return (
                    <div key={activity.id} className="manager-activity-item">
                      <div
                        className="manager-activity-icon-bubble"
                        style={{
                          background: isPrinter
                            ? "#ecfdf5"
                            : isStock
                            ? "#eff6ff"
                            : "#fdf2f8",
                          color: isPrinter
                            ? "#059669"
                            : isStock
                            ? "#2563eb"
                            : "#db2777",
                          borderColor: isPrinter
                            ? "#a7f3d0"
                            : isStock
                            ? "#bfdbfe"
                            : "#fbcfe8",
                        }}
                      >
                        {isPrinter ? (
                          <Printer size={16} />
                        ) : isStock ? (
                          <Package size={16} />
                        ) : (
                          <Layers size={16} />
                        )}
                      </div>

                      <div className="manager-activity-content">
                        <div className="manager-activity-title-row">
                          <p className="manager-activity-title">
                            {activity.type}
                          </p>
                          <span className="manager-activity-time-pill">
                            <Clock size={12} />
                            {formatActivityTime(activity.date, activity.timestamp)}
                          </span>
                        </div>
                        <p className="manager-activity-subtitle">
                          {activity.description} • {activity.date}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="manager-no-activity">
                <Clock size={36} color="#cbd5e1" />
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  No recent activities recorded for this branch.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
