import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "../../styles/sidebar.css";
import { useAuth } from "../../context/AuthContext.jsx";
import logo from "../../assets/logo.png";

import {
  LayoutDashboard,
  Users,
  Building2,
  UserPlus,
  Printer,
  Package,
  TrendingUp,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  Menu,
  Clock,
  Calendar,
  ShoppingCart,
  Layers,
  ArrowLeftRight,
  Timer,
  Gauge,
  FileSearch,
} from "lucide-react";
import PrintZSidebarIllustration from "../illustrations/PrintZSidebarIllustration";

/**
 * 3D Isometric Faceted Cube Logo matching PrintZ design references
 */
const PrintZLogoIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Top facet */}
    <path
      d="M20 4L34 12L20 20L6 12L20 4Z"
      fill="url(#cube-top)"
    />
    {/* Left facet */}
    <path
      d="M6 12L20 20V36L6 28V12Z"
      fill="url(#cube-left)"
    />
    {/* Right facet */}
    <path
      d="M20 20L34 12V28L20 36V20Z"
      fill="url(#cube-right)"
    />
    <defs>
      <linearGradient
        id="cube-top"
        x1="6"
        y1="4"
        x2="34"
        y2="20"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#00F0FF" />
        <stop offset="1" stopColor="#0072FF" />
      </linearGradient>
      <linearGradient
        id="cube-left"
        x1="6"
        y1="12"
        x2="20"
        y2="36"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FF007A" />
        <stop offset="1" stopColor="#7928CA" />
      </linearGradient>
      <linearGradient
        id="cube-right"
        x1="20"
        y1="12"
        x2="34"
        y2="36"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#00DF89" />
        <stop offset="1" stopColor="#009245" />
      </linearGradient>
    </defs>
  </svg>
);

const getPageTitle = (pathname) => {
  if (pathname.includes("/operator-console")) return "Operator Machine Console (V3)";
  if (pathname === "/admin-dashboard" || pathname === "/") return "Dashboard";
  if (pathname === "/add-admin") return "Administrator Management";
  if (pathname === "/add-branch") return "Branch Management";
  if (pathname === "/add-manager") return "Manager Management";
  if (pathname.includes("/admin-daily-readings-revenue")) return "Daily Readings Revenue";
  if (pathname.includes("/admin-stock-readings-revenue")) return "Stock Readings Revenue";
  if (pathname.includes("/add-printer-manager")) return "Add Printer";
  if (pathname.includes("/move-printer-manager")) return "Move Printer";
  if (pathname.includes("/printer-list")) return "Printer List";
  if (pathname.includes("/display-printer-readings")) return "Printer Readings";
  if (pathname.includes("/add-stock-manager")) return "Add Stock";
  if (pathname.includes("/move-stock-manager")) return "Move Stock";
  if (pathname.includes("/stock-list")) return "Stock List";
  if (pathname.includes("/search-stock-list-admin")) return "Search Stock";
  if (pathname.includes("/pastDateRequests")) return "Past Date Requests";
  if (pathname.includes("/previous-balance-list")) return "Previous Balance List";
  if (pathname.includes("/inventory-tracking")) return "Inventory Tracking";
  if (pathname.includes("/export-data")) return "Export Data";
  if (pathname.includes("/jumbo-xerox-csv-verifier")) return "Jumbo Xerox CSV Verifier";
  if (pathname.includes("/total-amount-list-admin")) return "Total Amount Readings";
  if (pathname.includes("/jumbo-xerox-list-admin")) return "Jumbo Xerox Revenue";
  if (pathname.includes("/profile")) return "Profile";
  return "Overview";
};

const AdminLayout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  const [isRevenueToggled, setIsRevenueToggled] = useState(false);
  const [isPrinterToggled, setIsPrinterToggled] = useState(false);
  const [isStockToggled, setIsStockToggled] = useState(false);
  const [isAdditionalToggled, setIsAdditionalToggled] = useState(false);

  const initialProfilePic = (() => {
    try {
      const raw = localStorage.getItem("profilePicUrl");
      return raw ? raw : "";
    } catch (e) {
      return "";
    }
  })();

  const initialUserName = (() => {
    try {
      const stored = localStorage.getItem("userName");
      if (stored) return stored;
    } catch (e) {}
    return "Dev Admin";
  })();

  const [profilePicUrl, setProfilePicUrl] = useState(initialProfilePic);
  const [userName, setUserName] = useState(initialUserName);

  // Dynamic user initials (e.g. "Dev Admin" -> "DA")
  const userInitials = (() => {
    if (!userName) return "DA";
    const parts = userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  })();

  // Live Day, Date & Time clock in navbar
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentDay = currentTime.toLocaleDateString("en-US", { weekday: "long" });
  const currentDate = currentTime.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const initialGradient = (() => {
    try {
      const raw = localStorage.getItem("sidebarGradientEnabled");
      return raw !== null ? JSON.parse(raw) : false;
    } catch (e) {
      return false;
    }
  })();

  const [gradientEnabled, setGradientEnabled] = useState(initialGradient);

  const location = useLocation();
  const navigate = useNavigate();
  const { permissions, logout, currentUser, role } = useAuth();

  const isAdmin = role === "admin" || currentUser?.role === "admin";
  const {
    isDashboardCapability = isAdmin,
    isPrinterCapability = isAdmin,
    isStockCapability = isAdmin,
    isRevenueCapability = isAdmin,
    isAddAdmin = isAdmin,
    isAddManager = isAdmin,
    isExtraCapability = isAdmin,
  } = permissions || {};

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  useEffect(() => {
    if (currentUser) {
      const pic =
        currentUser.profilePicUrl ||
        currentUser.photoURL ||
        "";
      setProfilePicUrl(pic);
      if (currentUser.name) {
        setUserName(currentUser.name);
      }
      try {
        if (pic) localStorage.setItem("profilePicUrl", pic);
        if (currentUser.name) localStorage.setItem("userName", currentUser.name);
      } catch (e) {
        // ignore
      }
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "sidebarGradientEnabled",
        JSON.stringify(gradientEnabled)
      );
    } catch (e) {
      // ignore
    }
  }, [gradientEnabled]);

  const isRevenueDataOpen =
    isRevenueToggled ||
    location.pathname.includes("/admin-daily-readings-revenue") ||
    location.pathname.includes("/admin-stock-readings-revenue");

  const isPrinterDataOpen =
    isPrinterToggled ||
    location.pathname.includes("/add-printer-manager") ||
    location.pathname.includes("/move-printer-manager") ||
    location.pathname.includes("/printer-list") ||
    location.pathname.includes("/display-printer-readings");

  const isStockDataOpen =
    isStockToggled ||
    location.pathname.includes("/add-stock-manager") ||
    location.pathname.includes("/move-stock-manager") ||
    location.pathname.includes("/stock-list") ||
    location.pathname.includes("/search-stock-list-admin");

  const isAdditionalOpen =
    isAdditionalToggled ||
    location.pathname.includes("/pastDateRequests") ||
    location.pathname.includes("/previous-balance-list") ||
    location.pathname.includes("/inventory-tracking") ||
    location.pathname.includes("/export-data") ||
    location.pathname.includes("/jumbo-xerox-csv-verifier");

  const toggleRevenueData = () => setIsRevenueToggled((prev) => !prev);
  const togglePrinterData = () => setIsPrinterToggled((prev) => !prev);
  const toggleStockData = () => setIsStockToggled((prev) => !prev);
  const toggleAdditionalData = () => setIsAdditionalToggled((prev) => !prev);

  const isActiveRoute = (route) => location.pathname === route;

  const handleLogout = async () => {
    try {
      localStorage.removeItem("userBranchName");
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleProfile = () => {
    navigate("/profile");
  };



  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
        {/* Brand Logo Header */}
        <div
          className="sidebar-logo-header"
          onClick={() => navigate("/admin-dashboard")}
        >
          <img
            src={logo}
            alt="PrintZ Shop"
            className="sidebar-brand-logo-img"
          />
        </div>

        {/* Navigation Items */}
        <ul className="sidebar-nav-list">
          {/* Dashboard */}
          {isDashboardCapability && (
            <li className="sidebar-nav-item">
              <NavLink
                to="/admin-dashboard"
                className={`sidebar-link ${
                  isActiveRoute("/admin-dashboard") ? "active-link" : ""
                }`}
              >
                <div className="sidebar-link-content">
                  <LayoutDashboard size={18} className="sidebar-link-icon" />
                  <span>Dashboard</span>
                </div>
                {isActiveRoute("/admin-dashboard") && (
                  <ChevronRight size={16} className="sidebar-active-arrow" />
                )}
              </NavLink>
            </li>
          )}

          {/* Sales & POS (Direct Counter Billing) */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/v3/sales-pos"
              className={`sidebar-link ${
                isActiveRoute("/v3/sales-pos") ||
                isActiveRoute("/sales-pos") ||
                isActiveRoute("/v3/sales-pos/new") ||
                isActiveRoute("/sales-pos/new") ||
                isActiveRoute("/v3/sales-pos/history") ||
                isActiveRoute("/sales-pos/history") ||
                isActiveRoute("/v3/sales-pos/invoices") ||
                isActiveRoute("/sales-pos/invoices") ||
                isActiveRoute("/v3/sales-pos/payments") ||
                isActiveRoute("/sales-pos/payments") ||
                isActiveRoute("/v3/sales-pos/receipts") ||
                isActiveRoute("/sales-pos/receipts") ||
                isActiveRoute("/v3/sales-pos/returns") ||
                isActiveRoute("/sales-pos/returns")
                  ? "active-link"
                  : ""
              }`}
            >
              <div className="sidebar-link-content">
                <ShoppingCart size={18} className="sidebar-link-icon" />
                <span>Sales & POS (V3)</span>
              </div>
              {(isActiveRoute("/v3/sales-pos") ||
                isActiveRoute("/sales-pos") ||
                isActiveRoute("/v3/sales-pos/new") ||
                isActiveRoute("/sales-pos/new") ||
                isActiveRoute("/v3/sales-pos/history") ||
                isActiveRoute("/sales-pos/history") ||
                isActiveRoute("/v3/sales-pos/invoices") ||
                isActiveRoute("/sales-pos/invoices") ||
                isActiveRoute("/v3/sales-pos/payments") ||
                isActiveRoute("/sales-pos/payments") ||
                isActiveRoute("/v3/sales-pos/receipts") ||
                isActiveRoute("/sales-pos/receipts") ||
                isActiveRoute("/v3/sales-pos/returns") ||
                isActiveRoute("/sales-pos/returns")) && (
                <ChevronRight size={16} className="sidebar-active-arrow" />
              )}
            </NavLink>
          </li>

          {/* Production (Planning & Orders) */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/v3/production/planning"
              className={`sidebar-link ${
                isActiveRoute("/v3/production") ||
                isActiveRoute("/production") ||
                isActiveRoute("/v3/production/planning") ||
                isActiveRoute("/production/planning") ||
                isActiveRoute("/v3/production/orders") ||
                isActiveRoute("/production/orders")
                  ? "active-link"
                  : ""
              }`}
            >
              <div className="sidebar-link-content">
                <Layers size={18} className="sidebar-link-icon" />
                <span>Production (V3)</span>
              </div>
              {(isActiveRoute("/v3/production") ||
                isActiveRoute("/production") ||
                isActiveRoute("/v3/production/planning") ||
                isActiveRoute("/production/planning") ||
                isActiveRoute("/v3/production/orders") ||
                isActiveRoute("/production/orders")) && (
                <ChevronRight size={16} className="sidebar-active-arrow" />
              )}
            </NavLink>
          </li>

          {/* Admins */}
          {isAddAdmin && (
            <>
              <li className="sidebar-nav-item">
                <NavLink
                  to="/add-admin"
                  className={`sidebar-link ${
                    isActiveRoute("/add-admin") ? "active-link" : ""
                  }`}
                >
                  <div className="sidebar-link-content">
                    <Users size={18} className="sidebar-link-icon" />
                    <span>Admins</span>
                  </div>
                  {isActiveRoute("/add-admin") && (
                    <ChevronRight size={16} className="sidebar-active-arrow" />
                  )}
                </NavLink>
              </li>

              {/* Branch Management */}
              <li className="sidebar-nav-item">
                <NavLink
                  to="/add-branch"
                  className={`sidebar-link ${
                    isActiveRoute("/add-branch") ? "active-link" : ""
                  }`}
                >
                  <div className="sidebar-link-content">
                    <Building2 size={18} className="sidebar-link-icon" />
                    <span>Branch Management</span>
                  </div>
                  {isActiveRoute("/add-branch") && (
                    <ChevronRight size={16} className="sidebar-active-arrow" />
                  )}
                </NavLink>
              </li>
            </>
          )}

          {/* Add Manager */}
          {isAddManager && (
            <li className="sidebar-nav-item">
              <NavLink
                to="/add-manager"
                className={`sidebar-link ${
                  isActiveRoute("/add-manager") ? "active-link" : ""
                }`}
              >
                <div className="sidebar-link-content">
                  <UserPlus size={18} className="sidebar-link-icon" />
                  <span>Add Manager</span>
                </div>
                {isActiveRoute("/add-manager") && (
                  <ChevronRight size={16} className="sidebar-active-arrow" />
                )}
              </NavLink>
            </li>
          )}

          {/* Printer Dropdown */}
          {isPrinterCapability && (
            <li className="sidebar-nav-item">
              <button
                type="button"
                onClick={togglePrinterData}
                className="sidebar-dropdown-toggle"
              >
                <div className="sidebar-link-content">
                  <Printer size={18} className="sidebar-link-icon" />
                  <span>Printer</span>
                </div>
                {isPrinterDataOpen ? (
                  <ChevronDown size={16} className="sidebar-link-icon" />
                ) : (
                  <ChevronRight size={16} className="sidebar-link-icon" />
                )}
              </button>

              {isPrinterDataOpen && (
                <ul className="sidebar-dropdown-list">
                  <li className="sidebar-dropdown-item">
                    <NavLink
                      to="/add-printer-manager"
                      className={`sidebar-dropdown-link ${
                        isActiveRoute("/add-printer-manager") ? "active" : ""
                      }`}
                    >
                      Add Printer
                    </NavLink>
                  </li>
                  <li className="sidebar-dropdown-item">
                    <NavLink
                      to="/move-printer-manager"
                      className={`sidebar-dropdown-link ${
                        isActiveRoute("/move-printer-manager") ? "active" : ""
                      }`}
                    >
                      Move Printer
                    </NavLink>
                  </li>
                  <li className="sidebar-dropdown-item">
                    <NavLink
                      to="/printer-list"
                      className={`sidebar-dropdown-link ${
                        isActiveRoute("/printer-list") ? "active" : ""
                      }`}
                    >
                      Printer List
                    </NavLink>
                  </li>
                  <li className="sidebar-dropdown-item">
                    <NavLink
                      to="/display-printer-readings-admin"
                      className={`sidebar-dropdown-link ${
                        isActiveRoute("/display-printer-readings-admin") ? "active" : ""
                      }`}
                    >
                      Display Readings
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
          )}

          {/* Stock Dropdown */}
          {isStockCapability && (
            <li className="sidebar-nav-item">
              <button
                type="button"
                onClick={toggleStockData}
                className="sidebar-dropdown-toggle"
              >
                <div className="sidebar-link-content">
                  <Package size={18} className="sidebar-link-icon" />
                  <span>Stock</span>
                </div>
                {isStockDataOpen ? (
                  <ChevronDown size={16} className="sidebar-link-icon" />
                ) : (
                  <ChevronRight size={16} className="sidebar-link-icon" />
                )}
              </button>

              {isStockDataOpen && (
                <ul className="sidebar-dropdown-list">
                  <li className="sidebar-dropdown-item">
                    <NavLink
                      to="/add-stock-manager"
                      className={`sidebar-dropdown-link ${
                        isActiveRoute("/add-stock-manager") ? "active" : ""
                      }`}
                    >
                      Add Stock
                    </NavLink>
                  </li>
                  <li className="sidebar-dropdown-item">
                    <NavLink
                      to="/move-stock-manager"
                      className={`sidebar-dropdown-link ${
                        isActiveRoute("/move-stock-manager") ? "active" : ""
                      }`}
                    >
                      Move Stock
                    </NavLink>
                  </li>
                  <li className="sidebar-dropdown-item">
                    <NavLink
                      to="/stock-list"
                      className={`sidebar-dropdown-link ${
                        isActiveRoute("/stock-list") ? "active" : ""
                      }`}
                    >
                      Stock List
                    </NavLink>
                  </li>
                  <li className="sidebar-dropdown-item">
                    <NavLink
                      to="/search-stock-list-admin"
                      className={`sidebar-dropdown-link ${
                        isActiveRoute("/search-stock-list-admin") ? "active" : ""
                      }`}
                    >
                      Search Stock
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
          )}

          {/* Revenue Data Dropdown */}
          {isRevenueCapability && (
            <li className="sidebar-nav-item">
              <button
                type="button"
                onClick={toggleRevenueData}
                className="sidebar-dropdown-toggle"
              >
                <div className="sidebar-link-content">
                  <TrendingUp size={18} className="sidebar-link-icon" />
                  <span>Revenue Data</span>
                </div>
                {isRevenueDataOpen ? (
                  <ChevronDown size={16} className="sidebar-link-icon" />
                ) : (
                  <ChevronRight size={16} className="sidebar-link-icon" />
                )}
              </button>

              {isRevenueDataOpen && (
                <ul className="sidebar-dropdown-list">
                  <li className="sidebar-dropdown-item">
                    <NavLink
                      to="/admin-daily-readings-revenue"
                      className={`sidebar-dropdown-link ${
                        isActiveRoute("/admin-daily-readings-revenue")
                          ? "active"
                          : ""
                      }`}
                    >
                      Daily Readings Revenue
                    </NavLink>
                  </li>
                  <li className="sidebar-dropdown-item">
                    <NavLink
                      to="/admin-stock-readings-revenue"
                      className={`sidebar-dropdown-link ${
                        isActiveRoute("/admin-stock-readings-revenue")
                          ? "active"
                          : ""
                      }`}
                    >
                      Stock Readings Revenue
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
          )}

          {/* Extra Features Dropdown */}
          {isExtraCapability && (
            <li className="sidebar-nav-item">
              <button
                type="button"
                onClick={toggleAdditionalData}
                className="sidebar-dropdown-toggle"
              >
                <div className="sidebar-link-content">
                  <Settings size={18} className="sidebar-link-icon" />
                  <span>Extra Features</span>
                </div>
                {isAdditionalOpen ? (
                  <ChevronDown size={16} className="sidebar-link-icon" />
                ) : (
                  <ChevronRight size={16} className="sidebar-link-icon" />
                )}
              </button>

              {isAdditionalOpen && (
                <ul className="sidebar-dropdown-list">
                  <li className="sidebar-dropdown-item">
                    <NavLink
                      to="/pastDateRequests"
                      className={`sidebar-dropdown-link ${
                        isActiveRoute("/pastDateRequests") ? "active" : ""
                      }`}
                    >
                      Past Date Requests
                    </NavLink>
                  </li>
                  <li className="sidebar-dropdown-item">
                    <NavLink
                      to="/previous-balance-list"
                      className={`sidebar-dropdown-link ${
                        isActiveRoute("/previous-balance-list") ? "active" : ""
                      }`}
                    >
                      Previous Balance List
                    </NavLink>
                  </li>
                  <li className="sidebar-dropdown-item">
                    <NavLink
                      to="/inventory-tracking"
                      className={`sidebar-dropdown-link ${
                        isActiveRoute("/inventory-tracking") ? "active" : ""
                      }`}
                    >
                      Inventory Tracking
                    </NavLink>
                  </li>
                  <li className="sidebar-dropdown-item">
                    <NavLink
                      to="/export-data"
                      className={`sidebar-dropdown-link ${
                        isActiveRoute("/export-data") ? "active" : ""
                      }`}
                    >
                      Export Data
                    </NavLink>
                  </li>
                  <li className="sidebar-dropdown-item">
                    <NavLink
                      to="/jumbo-xerox-csv-verifier"
                      className={`sidebar-dropdown-link ${
                        isActiveRoute("/jumbo-xerox-csv-verifier") ? "active" : ""
                      }`}
                    >
                      Jumbo Xerox CSV Verifier
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
          )}

          {/* SLA Monitoring & Designer Scorecard */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/sla-dashboard"
              className={`sidebar-link ${
                isActiveRoute("/sla-dashboard") || isActiveRoute("/v3/sla") ? "active-link" : ""
              }`}
            >
              <div className="sidebar-link-content">
                <Gauge size={18} className="sidebar-link-icon" />
                <span>SLA & Scorecards (V3)</span>
              </div>
              {(isActiveRoute("/sla-dashboard") || isActiveRoute("/v3/sla")) && (
                <ChevronRight size={15} className="sidebar-active-arrow" />
              )}
            </NavLink>
          </li>

          {/* Enterprise Audit Log Explorer */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/audit-logs"
              className={`sidebar-link ${
                isActiveRoute("/audit-logs") || isActiveRoute("/v3/audit-logs") ? "active-link" : ""
              }`}
            >
              <div className="sidebar-link-content">
                <FileSearch size={18} className="sidebar-link-icon" />
                <span>Audit Logs (V3)</span>
              </div>
              {(isActiveRoute("/audit-logs") || isActiveRoute("/v3/audit-logs")) && (
                <ChevronRight size={15} className="sidebar-active-arrow" />
              )}
            </NavLink>
          </li>

          {/* Sequential Machine Operator Timers */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/operator-console"
              className={`sidebar-link ${
                isActiveRoute("/operator-console") || isActiveRoute("/v3/operator-console") ? "active-link" : ""
              }`}
            >
              <div className="sidebar-link-content">
                <Timer size={18} className="sidebar-link-icon" />
                <span>Operator Timers (V3)</span>
              </div>
              {(isActiveRoute("/operator-console") || isActiveRoute("/v3/operator-console")) && (
                <ChevronRight size={15} className="sidebar-active-arrow" />
              )}
            </NavLink>
          </li>
        </ul>

        {/* Bottom Section: PrintZ Sidebar Illustration, Divider & Logout */}
        <div className="sidebar-bottom-section">
          <div className="sidebar-illustration-container">
            <PrintZSidebarIllustration width="100%" height={190} />
          </div>

          <div className="sidebar-divider" />

          <button
            type="button"
            className="sidebar-logout-item"
            onClick={handleLogout}
          >
            <LogOut size={18} className="sidebar-logout-icon" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area with Modern Topbar */}
      <div className="main-content-wrap">
        {/* Topbar: clean, neat alignment, professional */}
        <header className="printz-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="topbar-toggle-btn"
              onClick={toggleSidebar}
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumb Navigation */}
            <div className="topbar-breadcrumb">
              <span className="breadcrumb-root">Admin</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{getPageTitle(location.pathname)}</span>
            </div>
          </div>

          <div className="topbar-right">
            {/* Day badge — standalone */}
            <span className="topbar-datetime-day-badge">
              {currentDay.toUpperCase()}
            </span>

            {/* Date & Time capsule — separate from day */}
            <div
              className="topbar-datetime-badge"
              title={`${currentDay}, ${currentDate} ${formattedTime}`}
            >
              <div className="topbar-datetime-section">
                <Calendar size={15} className="topbar-date-icon" />
                <span className="topbar-datetime-date">{currentDate}</span>
              </div>
              <div className="topbar-datetime-divider" />
              <div className="topbar-datetime-section">
                <Clock size={16} className="topbar-time-icon" />
                <span className="topbar-datetime-time">{formattedTime}</span>
              </div>
            </div>

            {/* User Profile Pill with Dropdown */}
            <div
              className="topbar-user-menu-wrapper"
              ref={profileDropdownRef}
            >
              <div
                className="topbar-user-profile"
                onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
                title="Account Settings"
              >
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt={userName}
                    className="topbar-avatar-img"
                  />
                ) : (
                  <div className="user-avatar-badge">{userInitials}</div>
                )}
                <div className="user-info-text">
                  <span className="user-info-name">{userName}</span>
                  <span className="user-info-role">Admin</span>
                </div>
                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  className={`user-chevron ${isProfileDropdownOpen ? "rotated" : ""}`}
                />
              </div>

              {/* Profile Dropdown */}
              {isProfileDropdownOpen && (
                <div className="topbar-dropdown-menu">
                  <div className="dropdown-user-header">
                    <p className="dropdown-user-name">{userName}</p>
                    <p className="dropdown-user-email">
                      {currentUser?.email || "Admin Account"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      handleProfile();
                    }}
                  >
                    <User size={15} color="#059669" />
                    <span>My Profile</span>
                  </button>
                  <div className="dropdown-divider" />
                  <button
                    type="button"
                    className="dropdown-item dropdown-logout"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut size={15} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="content-body">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
