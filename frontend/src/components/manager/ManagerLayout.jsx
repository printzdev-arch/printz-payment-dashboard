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
  FileSearch,
  Truck,
  Receipt
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
  if (pathname.includes("/stock-transfers")) return "Warehouse Stock Transfers";
  if (pathname.includes("/sla-dashboard") || pathname.includes("/sla")) return "SLA Monitoring & Designer Scorecard";
  if (pathname.includes("/audit-logs")) return "Enterprise Audit Log Explorer";
  if (pathname.includes("/delivery")) return "Delivery Management";
  if (pathname.includes("/settlement")) return "Settlement & Invoicing";
  if (pathname.includes("/qc") || pathname.includes("/quality-control")) return "Quality Control & Rework";
  if (pathname.includes("/production")) return "Production Operations";
  if (pathname.includes("/design")) return "Design Workflow";
  if (pathname.includes("/estimates")) return "Quotations & Cost Estimates";
  if (pathname.includes("/jobs")) return "Job Orders";
  if (pathname.includes("/customers")) return "Customer Master";
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

  // JobFlow Accordion Submenu States & Active Checks
  const [openDropdowns, setOpenDropdowns] = useState(() => {
    const p = window.location.pathname;
    return {
      customers: p.includes("/customers") || p.includes("/qr-request"),
      jobs: p.includes("/jobs"),
      design: p.includes("/design"),
      production: p.includes("/production"),
      delivery: p.includes("/delivery"),
    };
  });

  const toggleDropdown = (key) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  useEffect(() => {
    const p = location.pathname;
    setOpenDropdowns((prev) => ({
      ...prev,
      customers: prev.customers || p.includes("/customers") || p.includes("/qr-request"),
      jobs: prev.jobs || p.includes("/jobs"),
      design: prev.design || p.includes("/design"),
      production: prev.production || p.includes("/production"),
      delivery: prev.delivery || p.includes("/delivery"),
    }));
  }, [location.pathname]);

  const searchParams = new URLSearchParams(location.search);
  const urlView = searchParams.get("view");
  const urlTab = searchParams.get("tab");

  const isCustomersActive = location.pathname.includes("/customers") || location.pathname.includes("/qr-request");
  const isJobsActive = location.pathname.includes("/jobs");
  const isEstimatesActive = location.pathname.includes("/estimates");
  const isDesignActive = location.pathname.startsWith("/design") || location.pathname.startsWith("/jobflow/design");
  const isProductionActive = location.pathname.startsWith("/production") || location.pathname.startsWith("/jobflow/production");
  const isQcActive = location.pathname.includes("/quality-control") || location.pathname.includes("/qc");
  const isDeliveryActive = location.pathname.startsWith("/delivery") || location.pathname.startsWith("/jobflow/delivery");
  const isSettlementActive = location.pathname.includes("/settlement");

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

          {/* JobFlow - Customer Master & QR */}
          <li className="sidebar-nav-item">
            <div
              className={`sidebar-link ${isCustomersActive ? "active-link" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={() => {
                navigate("/customers");
                setOpenDropdowns((prev) => ({ ...prev, customers: true }));
              }}
            >
              <div className="sidebar-link-content">
                <Users size={18} className="sidebar-link-icon" />
                <span>Customers</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDropdown("customers");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                }}
                title={openDropdowns.customers ? "Collapse Customers" : "Expand Customers"}
              >
                {openDropdowns.customers ? (
                  <ChevronDown size={15} className="sidebar-active-arrow" />
                ) : (
                  <ChevronRight size={15} className="sidebar-active-arrow" />
                )}
              </button>
            </div>
            {openDropdowns.customers && (
              <ul className="sidebar-dropdown-list">
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/customers"
                    className={`sidebar-dropdown-link ${
                      location.pathname === "/customers" ||
                      location.pathname === "/jobflow/customers" ||
                      location.pathname === "/v3/customers"
                        ? "active"
                        : ""
                    }`}
                  >
                    Customer Master
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/jobflow/qr-request"
                    className={`sidebar-dropdown-link ${
                      location.pathname.includes("/qr-request") ? "active" : ""
                    }`}
                  >
                    Branch QR Form
                  </NavLink>
                </li>
              </ul>
            )}
          </li>

          {/* JobFlow - Job Orders */}
          <li className="sidebar-nav-item">
            <div
              className={`sidebar-link ${isJobsActive ? "active-link" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={() => {
                navigate("/jobs");
                setOpenDropdowns((prev) => ({ ...prev, jobs: true }));
              }}
            >
              <div className="sidebar-link-content">
                <Briefcase size={18} className="sidebar-link-icon" />
                <span>Job Orders</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDropdown("jobs");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                }}
                title={openDropdowns.jobs ? "Collapse Job Orders" : "Expand Job Orders"}
              >
                {openDropdowns.jobs ? (
                  <ChevronDown size={15} className="sidebar-active-arrow" />
                ) : (
                  <ChevronRight size={15} className="sidebar-active-arrow" />
                )}
              </button>
            </div>
            {openDropdowns.jobs && (
              <ul className="sidebar-dropdown-list">
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/jobs"
                    className={`sidebar-dropdown-link ${
                      (location.pathname === "/jobs" ||
                        location.pathname === "/jobflow/jobs" ||
                        location.pathname === "/v3/jobs") &&
                      !location.pathname.includes("/new")
                        ? "active"
                        : ""
                    }`}
                  >
                    All Job Orders
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/jobs/new"
                    className={`sidebar-dropdown-link ${
                      location.pathname.includes("/new") ? "active" : ""
                    }`}
                  >
                    Create Job Order
                  </NavLink>
                </li>
              </ul>
            )}
          </li>

          {/* JobFlow - Estimates & Quotations */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/estimates"
              className={`sidebar-link ${
                isActiveRoute("/estimates") ||
                isActiveRoute("/jobflow/estimates") ||
                isActiveRoute("/v3/estimates")
                  ? "active-link"
                  : ""
              }`}
            >
              <div className="sidebar-link-content">
                <Calculator size={18} className="sidebar-link-icon" />
                <span>Estimates & Quotes</span>
              </div>
              {(isActiveRoute("/estimates") ||
                isActiveRoute("/jobflow/estimates") ||
                isActiveRoute("/v3/estimates")) && (
                <ChevronRight size={15} className="sidebar-active-arrow" />
              )}
            </NavLink>
          </li>

          {/* JobFlow - Design Workflow */}
          <li className="sidebar-nav-item">
            <div
              className={`sidebar-link ${isDesignActive ? "active-link" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={() => {
                navigate("/design?view=queue");
                setOpenDropdowns((prev) => ({ ...prev, design: true }));
              }}
            >
              <div className="sidebar-link-content">
                <Palette size={18} className="sidebar-link-icon" />
                <span>Design</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDropdown("design");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                }}
                title={openDropdowns.design ? "Collapse Design" : "Expand Design"}
              >
                {openDropdowns.design ? (
                  <ChevronDown size={15} className="sidebar-active-arrow" />
                ) : (
                  <ChevronRight size={15} className="sidebar-active-arrow" />
                )}
              </button>
            </div>
            {openDropdowns.design && (
              <ul className="sidebar-dropdown-list">
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/design?view=queue"
                    className={`sidebar-dropdown-link ${
                      isDesignActive &&
                      (urlView === "queue" ||
                        (!urlView &&
                          !location.pathname.includes("/workbench") &&
                          !location.pathname.includes("/workspace")))
                        ? "active"
                        : ""
                    }`}
                  >
                    Design Queue (Supervisor)
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/design?view=workbench"
                    className={`sidebar-dropdown-link ${
                      urlView === "workbench" ||
                      location.pathname.includes("/workbench") ||
                      location.pathname.includes("/workspace")
                        ? "active"
                        : ""
                    }`}
                  >
                    Design Workbench
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/design?view=my-jobs"
                    className={`sidebar-dropdown-link ${
                      urlView === "my-jobs" ? "active" : ""
                    }`}
                  >
                    Designer My Jobs
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/design?view=customer-proof"
                    className={`sidebar-dropdown-link ${
                      urlView === "customer-proof" ? "active" : ""
                    }`}
                  >
                    WhatsApp Proof Review
                  </NavLink>
                </li>
              </ul>
            )}
          </li>

          {/* JobFlow - Production Operations */}
          <li className="sidebar-nav-item">
            <div
              className={`sidebar-link ${isProductionActive ? "active-link" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={() => {
                navigate("/production?tab=overview");
                setOpenDropdowns((prev) => ({ ...prev, production: true }));
              }}
            >
              <div className="sidebar-link-content">
                <Layers size={18} className="sidebar-link-icon" />
                <span>Production</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDropdown("production");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                }}
                title={openDropdowns.production ? "Collapse Production" : "Expand Production"}
              >
                {openDropdowns.production ? (
                  <ChevronDown size={15} className="sidebar-active-arrow" />
                ) : (
                  <ChevronRight size={15} className="sidebar-active-arrow" />
                )}
              </button>
            </div>
            {openDropdowns.production && (
              <ul className="sidebar-dropdown-list">
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/production?tab=overview"
                    className={`sidebar-dropdown-link ${
                      isProductionActive &&
                      (urlTab === "overview" ||
                        (!urlTab && !location.pathname.includes("/planning")))
                        ? "active"
                        : ""
                    }`}
                  >
                    Production Dashboard
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/production?tab=orders"
                    className={`sidebar-dropdown-link ${
                      urlTab === "orders" ? "active" : ""
                    }`}
                  >
                    Production Orders
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/production?tab=queue"
                    className={`sidebar-dropdown-link ${
                      urlTab === "queue" ? "active" : ""
                    }`}
                  >
                    Operation Queue
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/production?tab=reprints"
                    className={`sidebar-dropdown-link ${
                      urlTab === "reprints" ? "active" : ""
                    }`}
                  >
                    Reprint Management
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/production/planning"
                    className={`sidebar-dropdown-link ${
                      location.pathname.includes("/planning") || urlTab === "planning"
                        ? "active"
                        : ""
                    }`}
                  >
                    Production Planning
                  </NavLink>
                </li>
              </ul>
            )}
          </li>

          {/* JobFlow - Quality Control */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/quality-control"
              className={`sidebar-link ${
                isQcActive ? "active-link" : ""
              }`}
            >
              <div className="sidebar-link-content">
                <ShieldCheck size={18} className="sidebar-link-icon" />
                <span>Quality Control</span>
              </div>
              {isQcActive && (
                <ChevronRight size={15} className="sidebar-active-arrow" />
              )}
            </NavLink>
          </li>

          {/* JobFlow - Delivery Management */}
          <li className="sidebar-nav-item">
            <div
              className={`sidebar-link ${isDeliveryActive ? "active-link" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={() => {
                navigate("/delivery?tab=17A");
                setOpenDropdowns((prev) => ({ ...prev, delivery: true }));
              }}
            >
              <div className="sidebar-link-content">
                <Truck size={18} className="sidebar-link-icon" />
                <span>Delivery</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDropdown("delivery");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                }}
                title={openDropdowns.delivery ? "Collapse Delivery" : "Expand Delivery"}
              >
                {openDropdowns.delivery ? (
                  <ChevronDown size={15} className="sidebar-active-arrow" />
                ) : (
                  <ChevronRight size={15} className="sidebar-active-arrow" />
                )}
              </button>
            </div>
            {openDropdowns.delivery && (
              <ul className="sidebar-dropdown-list">
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/delivery?tab=17A"
                    className={`sidebar-dropdown-link ${
                      isDeliveryActive && (urlTab === "17A" || !urlTab)
                        ? "active"
                        : ""
                    }`}
                  >
                    Ready for Delivery Queue
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/delivery?tab=17B"
                    className={`sidebar-dropdown-link ${
                      urlTab === "17B" ? "active" : ""
                    }`}
                  >
                    Delivery Details (DO-xxxxx)
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/delivery?tab=18A"
                    className={`sidebar-dropdown-link ${
                      urlTab === "18A" ? "active" : ""
                    }`}
                  >
                    Pack & Dispatch
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/delivery?tab=18B"
                    className={`sidebar-dropdown-link ${
                      urlTab === "18B" ? "active" : ""
                    }`}
                  >
                    Handover Evidence & Proof
                  </NavLink>
                </li>
              </ul>
            )}
          </li>

          {/* JobFlow - Settlement */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/settlement"
              className={`sidebar-link ${
                isSettlementActive ? "active-link" : ""
              }`}
            >
              <div className="sidebar-link-content">
                <Receipt size={18} className="sidebar-link-icon" />
                <span>Settlement</span>
              </div>
              {isSettlementActive && (
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
