import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "../../styles/sidebar.css";
import "../../styles/printzTheme.css";
import { useAuth } from "../../context/AuthContext.jsx";
import logo from "../../assets/logo.png";

import {
  LayoutDashboard,
  FileText,
  Printer,
  FileDown,
  Package,
  Layers,
  LogOut,
  User,
  Users,
  UserPlus,
  Menu,
  Clock,
  Calendar,
  Building2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Search,
  Briefcase,
  Calculator,
  Palette,
  ShieldCheck,
  ArrowLeftRight,
  Timer,
  Gauge,
  FileSearch
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
      fill="url(#cube-top-mgr)"
    />
    {/* Left facet */}
    <path
      d="M6 12L20 20V36L6 28V12Z"
      fill="url(#cube-left-mgr)"
    />
    {/* Right facet */}
    <path
      d="M20 20L34 12V28L20 36V20Z"
      fill="url(#cube-right-mgr)"
    />
    <defs>
      <linearGradient
        id="cube-top-mgr"
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
        id="cube-left-mgr"
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
        id="cube-right-mgr"
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

const getManagerPageTitle = (pathname) => {
  if (pathname.includes("/operator-console")) return "Operator Machine Console (V3)";
  if (pathname.includes("/stock-transfers")) return "Warehouse Stock Transfers (V3)";
  if (pathname.includes("/sla-dashboard") || pathname.includes("/sla")) return "SLA Monitoring & Designer Scorecard (V3)";
  if (pathname.includes("/audit-logs")) return "Enterprise Audit Log Explorer (V3)";
  if (pathname.includes("/quality-control/reprints")) return "Reprint & Rework Authorizations (V3)";
  if (pathname.includes("/quality-control/queue")) return "Quality Control Queue (V3)";
  if (pathname.includes("/quality-control")) return "Quality Control & Rework / Reprint (V3)";
  if (pathname.includes("/production/queue")) return "Production Queue & Execution (V3)";
  if (pathname.includes("/production/operations")) return "Operation Execution (V3)";
  if (pathname.includes("/production/planning")) return "Production Planning (V3)";
  if (pathname.includes("/production/orders")) return "Production Orders (V3)";
  if (pathname.includes("/production")) return "Production Workflow & Queue (V3)";
  if (pathname.includes("/design/my-queue")) return "My Design Queue (V3)";
  if (pathname.includes("/design/workspace")) return "Design Workspace (V3)";
  if (pathname.includes("/design")) return "Designer Allocation & Queue (V3)";
  if (pathname.includes("/estimates/new")) return "Create Commercial Quotation (V3)";
  if (pathname.includes("/estimates")) return "Quotations & Cost Estimates (V3)";
  if (pathname.includes("/jobs/new")) return "Create Print Job Order (V3)";
  if (pathname.includes("/jobs")) return "Job Orders & Requirement Capture (V3)";
  if (pathname.includes("/customers") || pathname.includes("/v3/customers")) return "Customer Entry & Registration (V3)";
  if (pathname === "/manager-dashboard" || pathname === "/") return "Manager Dashboard";
  if (pathname.includes("/printer-readings-manager")) return "Account Sheet Generation";
  if (pathname.includes("/pdf-generator")) return "Generate PDF Report";
  if (pathname.includes("/printer-list-manager")) return "Printer List";
  if (pathname.includes("/display-printer-readings-manager")) return "Printer Readings";
  if (pathname.includes("/jumbo-xerox-list-manager")) return "Large Format Records";
  if (pathname.includes("/jumbo-xerox")) return "Large Format Printing";
  if (pathname.includes("/total-amount-display")) return "Total Amount Display";
  if (pathname.includes("/total-amount-list-manager")) return "Total Amount Readings";
  if (pathname.includes("/search-stock-list-manager")) return "Search Stock";
  if (pathname.includes("/stock-list-manager")) return "Stock List";
  if (pathname.includes("/stock-item-list-manager")) return "Stock Items";
  if (pathname.includes("/profile")) return "Profile";
  return "Overview";
};

const ManagerLayout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  // Synchronous initialization from localStorage
  const [profilePicUrl, setProfilePicUrl] = useState(() => {
    try {
      return localStorage.getItem("profilePicUrl") || "";
    } catch (e) {
      return "";
    }
  });

  const [branchName, setBranchName] = useState(() => {
    try {
      return localStorage.getItem("userBranchName") || "";
    } catch (e) {
      return "";
    }
  });

  const [userName, setUserName] = useState(() => {
    try {
      return localStorage.getItem("userName") || "Branch Manager";
    } catch (e) {
      return "Branch Manager";
    }
  });

  const location = useLocation();
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();

  // Dynamic user initials
  const userInitials = (() => {
    if (!userName) return "BM";
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
        try {
          localStorage.setItem("userName", currentUser.name);
        } catch (e) { }
      }
      if (currentUser.branch) {
        setBranchName(currentUser.branch);
        try {
          localStorage.setItem("userBranchName", currentUser.branch);
        } catch (e) { }
      }
      try {
        if (pic) localStorage.setItem("profilePicUrl", pic);
        else localStorage.removeItem("profilePicUrl");
      } catch (e) { }
    }
  }, [currentUser]);

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
      {/* Sidebar matching Admin aesthetic */}
      <aside className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
        {/* Brand Logo Header */}
        <div
          className="sidebar-logo-header"
          onClick={() => navigate("/manager-dashboard")}
        >
          <img
            src={logo}
            alt="PrintZ Shop"
            className="sidebar-brand-logo-img"
          />
        </div>

        {/* Branch Identifier Badge */}
        {branchName && (
          <div
            style={{
              margin: "0 14px 14px 14px",
              padding: "8px 12px",
              borderRadius: "10px",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Building2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
            <div style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "rgba(255, 255, 255, 0.6)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  lineHeight: 1.1,
                  fontWeight: 600,
                }}
              >
                Branch
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#ffffff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {branchName}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <ul className="sidebar-nav-list">
          {/* Dashboard */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/manager-dashboard"
              className={`sidebar-link ${isActiveRoute("/manager-dashboard") ? "active-link" : ""
                }`}
            >
              <div className="sidebar-link-content">
                <LayoutDashboard size={18} className="sidebar-link-icon" />
                <span>Dashboard</span>
              </div>
              {isActiveRoute("/manager-dashboard") && (
                <ChevronRight size={15} className="sidebar-active-arrow" />
              )}
            </NavLink>
          </li>

          {/* Account Sheet Generation */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/printer-readings-manager"
              className={`sidebar-link ${isActiveRoute("/printer-readings-manager") ? "active-link" : ""
                }`}
            >
              <div className="sidebar-link-content">
                <FileText size={18} className="sidebar-link-icon" />
                <span>Account Sheet</span>
              </div>
              {isActiveRoute("/printer-readings-manager") && (
                <ChevronRight size={15} className="sidebar-active-arrow" />
              )}
            </NavLink>
          </li>

          {/* Generate PDF Report */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/pdf-generator"
              className={`sidebar-link ${isActiveRoute("/pdf-generator") ? "active-link" : ""
                }`}
            >
              <div className="sidebar-link-content">
                <FileDown size={18} className="sidebar-link-icon" />
                <span>Generate PDF Report</span>
              </div>
              {isActiveRoute("/pdf-generator") && (
                <ChevronRight size={15} className="sidebar-active-arrow" />
              )}
            </NavLink>
          </li>

          {/* PrintZ V3 - Customer Entry (Positioned Below Previous Modules) */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/v3/customers"
              className={`sidebar-link ${isActiveRoute("/v3/customers") || isActiveRoute("/customers") ? "active-link" : ""
                }`}
            >
              <div className="sidebar-link-content">
                <Users size={18} className="sidebar-link-icon" />
                <span>Customer Entry (V3)</span>
              </div>
              {(isActiveRoute("/v3/customers") || isActiveRoute("/customers")) && (
                <ChevronRight size={15} className="sidebar-active-arrow" />
              )}
            </NavLink>
          </li>

          {/* PrintZ V3 - Job Orders (Positioned Below Customer Entry) */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/v3/jobs"
              className={`sidebar-link ${isActiveRoute("/v3/jobs") || isActiveRoute("/jobs") || isActiveRoute("/v3/jobs/new") ? "active-link" : ""
                }`}
            >
              <div className="sidebar-link-content">
                <Briefcase size={18} className="sidebar-link-icon" />
                <span>Job Orders (V3)</span>
              </div>
              {(isActiveRoute("/v3/jobs") || isActiveRoute("/jobs") || isActiveRoute("/v3/jobs/new")) && (
                <ChevronRight size={15} className="sidebar-active-arrow" />
              )}
            </NavLink>
          </li>

          {/* PrintZ V3 - Estimates & Quotations (Positioned Below Job Orders) */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/v3/estimates"
              className={`sidebar-link ${isActiveRoute("/v3/estimates") || isActiveRoute("/estimates") || isActiveRoute("/v3/estimates/new") ? "active-link" : ""
                }`}
            >
              <div className="sidebar-link-content">
                <Calculator size={18} className="sidebar-link-icon" />
                <span>Estimates & Quotes (V3)</span>
              </div>
              {(isActiveRoute("/v3/estimates") || isActiveRoute("/estimates") || isActiveRoute("/v3/estimates/new")) && (
                <ChevronRight size={15} className="sidebar-active-arrow" />
              )}
            </NavLink>
          </li>

          {/* PrintZ V3 - Design Workflow (Positioned Below Estimates) */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/v3/design"
              className={`sidebar-link ${isActiveRoute("/v3/design") || isActiveRoute("/design") ? "active-link" : ""
                }`}
            >
              <div className="sidebar-link-content">
                <Palette size={18} className="sidebar-link-icon" />
                <span>Design Workflow (V3)</span>
              </div>
              {(isActiveRoute("/v3/design") || isActiveRoute("/design")) && (
                <ChevronRight size={15} className="sidebar-active-arrow" />
              )}
            </NavLink>
          </li>

          {/* PrintZ V3 - Production Planning & Orders (Positioned Below Design) */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/v3/production/planning"
              className={`sidebar-link ${isActiveRoute("/v3/production") ||
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
                  <ChevronRight size={15} className="sidebar-active-arrow" />
                )}
            </NavLink>
          </li>

          {/* PrintZ V3 - Step 10: Quality Control & Rework / Reprint */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/v3/quality-control"
              className={`sidebar-link ${isActiveRoute("/v3/quality-control") ||
                  isActiveRoute("/quality-control")
                  ? "active-link"
                  : ""
                }`}
            >
              <div className="sidebar-link-content">
                <ShieldCheck size={18} className="sidebar-link-icon" />
                <span>Quality Control (V3)</span>
              </div>
              {(isActiveRoute("/v3/quality-control") ||
                isActiveRoute("/quality-control")) && (
                  <ChevronRight size={15} className="sidebar-active-arrow" />
                )}
            </NavLink>
          </li>

          {/* PrintZ V3 - Machine Operator Console & Timers */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/v3/operator-console"
              className={`sidebar-link ${isActiveRoute("/v3/operator-console") ||
                  isActiveRoute("/operator-console")
                  ? "active-link"
                  : ""
                }`}
            >
              <div className="sidebar-link-content">
                <Timer size={18} className="sidebar-link-icon" />
                <span>Operator Timers (V3)</span>
              </div>
              {(isActiveRoute("/v3/operator-console") ||
                isActiveRoute("/operator-console")) && (
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
        {/* Topbar matching Admin aesthetics */}
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
              <span className="breadcrumb-root">Manager</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">
                {getManagerPageTitle(location.pathname)}
              </span>
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
                  <span className="user-info-role">
                    Manager {branchName ? `• ${branchName}` : ""}
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  className={`user-chevron ${isProfileDropdownOpen ? "rotated" : ""
                    }`}
                />
              </div>

              {/* Profile Dropdown */}
              {isProfileDropdownOpen && (
                <div className="topbar-dropdown-menu">
                  <div className="dropdown-user-header">
                    <p className="dropdown-user-name">{userName}</p>
                    <p className="dropdown-user-email">
                      {currentUser?.email || "Manager Account"}
                    </p>
                    {branchName && (
                      <div
                        style={{
                          marginTop: "4px",
                          fontSize: "0.75rem",
                          color: "#059669",
                          fontWeight: 600,
                        }}
                      >
                        📍 {branchName} Branch
                      </div>
                    )}
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

export default ManagerLayout;
