import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "../styles/sidebar.css";
import { useAuth } from "../../app/providers/AuthContext.jsx";
import { PageTransition, MotionDropdown, MotionAccordion } from "../../shared/ui/motion";
import logo from "../../shared/assets/logo.png";

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
  ChevronLeft,
  Sliders,
  LogOut,
  User,
  Menu,
  Clock,
  Calendar,
  Banknote,
  PackageCheck,
  ShoppingCart,
  Layers,
  ArrowLeftRight,
} from "lucide-react";
import PrintZSidebarIllustration from "../../shared/assets/illustrations/PrintZSidebarIllustration";

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
  if (pathname.includes("/master-settings") || pathname.includes("/jobflow/master-settings")) return "Master Defaults & Specifications";
  if (pathname.includes("/operator-console")) return "Operator Machine Console";
  if (pathname === "/admin-dashboard" || pathname === "/") return "Dashboard";
  if (pathname === "/add-branch") return "Branch Management";
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
  if (pathname.includes("/pos") || pathname.includes("/sales-pos")) return "POS Counter Billing";
  if (pathname.includes("/profile")) return "Profile";
  if (pathname.includes("/attendance/setup")) return "Attendance Setup";
  if (pathname.includes("/attendance/daily")) return "Daily Attendance";
  if (pathname.includes("/attendance/permissions")) return "Attendance Permissions";
  if (pathname.includes("/attendance/reports")) return "Attendance Reports";
  if (pathname.includes("/attendance")) return "Daily Attendance";
  return "Overview";
};

const AdminLayout = ({ children }) => {
  // On phones/tablets the sidebar is an off-canvas drawer, so it starts closed.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 1024
  );
  const [isAutoCollapseEnabled, setIsAutoCollapseEnabled] = useState(() => {
    try {
      return localStorage.getItem("sidebar_auto_collapse") === "true";
    } catch (e) {
      return false;
    }
  });

  const [isHoveringLeftZone, setIsHoveringLeftZone] = useState(false);
  const leftZoneTimerRef = useRef(null);
  const autoCloseTimerRef = useRef(null);

  const handleToggleAutoCollapse = (enabled) => {
    setIsAutoCollapseEnabled(enabled);
    try {
      localStorage.setItem("sidebar_auto_collapse", String(enabled));
    } catch (e) {}
  };

  useEffect(() => {
    if (!isAutoCollapseEnabled) {
      if (leftZoneTimerRef.current) {
        clearTimeout(leftZoneTimerRef.current);
        leftZoneTimerRef.current = null;
      }
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      setIsHoveringLeftZone(false);
      return;
    }

    const handleWindowMouseMove = (e) => {
      if (isSidebarCollapsed) {
        if (e.clientX <= 25) {
          if (!leftZoneTimerRef.current) {
            setIsHoveringLeftZone(true);
            leftZoneTimerRef.current = setTimeout(() => {
              setIsSidebarCollapsed(false);
              setIsHoveringLeftZone(false);
              leftZoneTimerRef.current = null;
            }, 1000); // 1 seconds hold to open
          }
        } else {
          if (leftZoneTimerRef.current) {
            clearTimeout(leftZoneTimerRef.current);
            leftZoneTimerRef.current = null;
            setIsHoveringLeftZone(false);
          }
        }
      } else {
        if (e.clientX > 270) {
          if (!autoCloseTimerRef.current) {
            autoCloseTimerRef.current = setTimeout(() => {
              setIsSidebarCollapsed(true);
              autoCloseTimerRef.current = null;
            }, 180);
          }
        } else {
          if (autoCloseTimerRef.current) {
            clearTimeout(autoCloseTimerRef.current);
            autoCloseTimerRef.current = null;
          }
        }
      }
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      if (leftZoneTimerRef.current) clearTimeout(leftZoneTimerRef.current);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, [isAutoCollapseEnabled, isSidebarCollapsed]);

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  const [isRevenueToggled, setIsRevenueToggled] = useState(false);
  const [isPrinterToggled, setIsPrinterToggled] = useState(false);
  const [isStockToggled, setIsStockToggled] = useState(false);
  const [isAdditionalToggled, setIsAdditionalToggled] = useState(false);
  const [isAttendanceToggled, setIsAttendanceToggled] = useState(false);
  const [isSalaryToggled, setIsSalaryToggled] = useState(false);

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

  // Close the drawer after navigating on small screens.
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 1024) {
      setIsSidebarCollapsed(true);
    }
  }, [location.pathname]);
  const navigate = useNavigate();
  const { permissions, logout, currentUser, role } = useAuth();

  const isAdmin = role === "admin" || currentUser?.role === "admin";
  const {
    isDashboardCapability = isAdmin,
    isPrinterCapability = isAdmin,
    isStockCapability = isAdmin,
    isRevenueCapability = isAdmin,
    isAddAdmin = isAdmin,
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

  // Groups the user closed by hand while the current route would keep them open.
  const [collapsedGroups, setCollapsedGroups] = useState({});
  useEffect(() => {
    setCollapsedGroups({});
  }, [location.pathname]);

  const isRevenueDataOpen =
    !collapsedGroups.revenue && (
    isRevenueToggled ||
    location.pathname.includes("/admin-daily-readings-revenue") ||
    location.pathname.includes("/admin-stock-readings-revenue"));

  const isPrinterDataOpen =
    !collapsedGroups.printer && (
    isPrinterToggled ||
    location.pathname.includes("/add-printer-manager") ||
    location.pathname.includes("/move-printer-manager") ||
    location.pathname.includes("/printer-list") ||
    location.pathname.includes("/display-printer-readings"));

  const isStockDataOpen =
    !collapsedGroups.stock && (
    isStockToggled ||
    location.pathname.includes("/add-stock-manager") ||
    location.pathname.includes("/move-stock-manager") ||
    location.pathname.includes("/stock-list") ||
    location.pathname.includes("/search-stock-list-admin"));

  const isAdditionalOpen =
    !collapsedGroups.additional && (
    isAdditionalToggled ||
    location.pathname.includes("/pastDateRequests") ||
    location.pathname.includes("/previous-balance-list") ||
    location.pathname.includes("/inventory-tracking") ||
    location.pathname.includes("/export-data") ||
    location.pathname.includes("/jumbo-xerox-csv-verifier"));

  const isAttendanceOpen =
    !collapsedGroups.attendance && (
    isAttendanceToggled ||
    location.pathname.startsWith("/attendance"));

  const isSalaryOpen =
    !collapsedGroups.salary && (
    isSalaryToggled ||
    location.pathname.startsWith("/salary"));

  const [isSaleOrdersToggled, setIsSaleOrdersToggled] = useState(false);
  const isSaleOrdersOpen =
    !collapsedGroups.saleOrders && (
    isSaleOrdersToggled ||
    location.pathname.startsWith("/sale-orders"));

  // Closing a group must also override the route-based auto-open, otherwise a
  // group whose page is currently open could never be collapsed.
  const makeGroupToggle = (key, isOpen, setToggled) => () => {
    setToggled(!isOpen);
    setCollapsedGroups((prev) => ({ ...prev, [key]: isOpen }));
  };

  const toggleRevenueData = makeGroupToggle("revenue", isRevenueDataOpen, setIsRevenueToggled);
  const togglePrinterData = makeGroupToggle("printer", isPrinterDataOpen, setIsPrinterToggled);
  const toggleStockData = makeGroupToggle("stock", isStockDataOpen, setIsStockToggled);
  const toggleAdditionalData = makeGroupToggle("additional", isAdditionalOpen, setIsAdditionalToggled);
  const toggleAttendanceData = makeGroupToggle("attendance", isAttendanceOpen, setIsAttendanceToggled);
  const toggleSalaryData = makeGroupToggle("salary", isSalaryOpen, setIsSalaryToggled);
  const toggleSaleOrdersData = makeGroupToggle("saleOrders", isSaleOrdersOpen, setIsSaleOrdersToggled);

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
        {/* Brand Logo Header with Close Arrow Button */}
        <div className="sidebar-logo-header-row">
          <div
            className="sidebar-logo-header"
            onClick={() => navigate("/admin-dashboard")}
            style={{ cursor: "pointer" }}
          >
            <img
              src={logo}
              alt="PrintZ Shop"
              className="sidebar-brand-logo-img"
            />
          </div>
          <button
            type="button"
            className="sidebar-collapse-arrow-btn"
            onClick={() => setIsSidebarCollapsed(true)}
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <ChevronLeft size={18} />
          </button>
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

          {/* Sale Orders Dropdown */}
          <li className="sidebar-nav-item">
            <button
              type="button"
              onClick={toggleSaleOrdersData}
              className={`sidebar-dropdown-toggle ${
                location.pathname.startsWith("/sale-orders") ? "active-link" : ""
              }`}
            >
              <div className="sidebar-link-content">
                <PackageCheck size={18} className="sidebar-link-icon" />
                <span>Sale Orders</span>
              </div>
              {isSaleOrdersOpen ? (
                <ChevronDown size={16} className="sidebar-link-icon" />
              ) : (
                <ChevronRight size={16} className="sidebar-link-icon" />
              )}
            </button>

            <MotionAccordion isOpen={isSaleOrdersOpen}>
              <ul className="sidebar-dropdown-list">
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/sale-orders"
                    className={`sidebar-dropdown-link ${
                      isActiveRoute("/sale-orders") ? "active" : ""
                    }`}
                  >
                    All Orders
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/sale-orders/new"
                    className={`sidebar-dropdown-link ${
                      isActiveRoute("/sale-orders/new") ? "active" : ""
                    }`}
                  >
                    New Order
                  </NavLink>
                </li>
              </ul>
            </MotionAccordion>
          </li>

          {/* Attendance Dropdown */}
          <li className="sidebar-nav-item">
            <button
              type="button"
              onClick={toggleAttendanceData}
              className={`sidebar-dropdown-toggle ${
                location.pathname.startsWith("/attendance") ? "active-link" : ""
              }`}
            >
              <div className="sidebar-link-content">
                <Clock size={18} className="sidebar-link-icon" />
                <span>Attendance</span>
              </div>
              {isAttendanceOpen ? (
                <ChevronDown size={16} className="sidebar-link-icon" />
              ) : (
                <ChevronRight size={16} className="sidebar-link-icon" />
              )}
            </button>

            <MotionAccordion isOpen={isAttendanceOpen}>
              <ul className="sidebar-dropdown-list">
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/attendance/setup"
                    className={`sidebar-dropdown-link ${
                      isActiveRoute("/attendance/setup") ? "active" : ""
                    }`}
                  >
                    Setup
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/attendance/daily"
                    className={`sidebar-dropdown-link ${
                      isActiveRoute("/attendance/daily") || isActiveRoute("/attendance") ? "active" : ""
                    }`}
                  >
                    Daily Attendance
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/attendance/branch-shifts"
                    className={`sidebar-dropdown-link ${
                      isActiveRoute("/attendance/branch-shifts") ? "active" : ""
                    }`}
                  >
                    Branch Shifts
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/attendance/permissions"
                    className={`sidebar-dropdown-link ${
                      isActiveRoute("/attendance/permissions") ? "active" : ""
                    }`}
                  >
                    Permissions
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/attendance/reports"
                    className={`sidebar-dropdown-link ${
                      isActiveRoute("/attendance/reports") ? "active" : ""
                    }`}
                  >
                    Reports
                  </NavLink>
                </li>
              </ul>
            </MotionAccordion>
          </li>

          {/* Employees (add / edit / deactivate everyone: admin, manager, designer, operator) */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/employees"
              className={`sidebar-link ${isActiveRoute("/employees") ? "active-link" : ""}`}
            >
              <div className="sidebar-link-content">
                <Users size={18} className="sidebar-link-icon" />
                <span>Employees</span>
              </div>
            </NavLink>
          </li>

          {/* Salary & Payroll Dropdown */}
          <li className="sidebar-nav-item">
            <button
              type="button"
              onClick={toggleSalaryData}
              className={`sidebar-dropdown-toggle ${
                location.pathname.startsWith("/salary") ? "active-link" : ""
              }`}
            >
              <div className="sidebar-link-content">
                <Banknote size={18} className="sidebar-link-icon" />
                <span>Salary & Payroll</span>
              </div>
              {isSalaryOpen ? (
                <ChevronDown size={16} className="sidebar-link-icon" />
              ) : (
                <ChevronRight size={16} className="sidebar-link-icon" />
              )}
            </button>

            <MotionAccordion isOpen={isSalaryOpen}>
              <ul className="sidebar-dropdown-list">
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/salary/setup"
                    className={`sidebar-dropdown-link ${
                      isActiveRoute("/salary/setup") ? "active" : ""
                    }`}
                  >
                    Salary Setup
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/salary/loans-adjustments"
                    className={`sidebar-dropdown-link ${
                      isActiveRoute("/salary/loans-adjustments") ? "active" : ""
                    }`}
                  >
                    Loans & Adjustments
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/salary/processing"
                    className={`sidebar-dropdown-link ${
                      isActiveRoute("/salary/processing") || isActiveRoute("/salary") ? "active" : ""
                    }`}
                  >
                    Payroll Processing
                  </NavLink>
                </li>
                <li className="sidebar-dropdown-item">
                  <NavLink
                    to="/salary/records"
                    className={`sidebar-dropdown-link ${
                      isActiveRoute("/salary/records") ? "active" : ""
                    }`}
                  >
                    Salary Records
                  </NavLink>
                </li>
              </ul>
            </MotionAccordion>
          </li>

          {/* Sales & POS (Direct Counter Billing) */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/pos"
              className={`sidebar-link ${
                isActiveRoute("/pos") ||
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
                <span>Sales & POS</span>
              </div>
              {(isActiveRoute("/pos") ||
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
                <span>Production</span>
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

          {isAddAdmin && (
            <>
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

              <MotionAccordion isOpen={isPrinterDataOpen}>
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
              </MotionAccordion>
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

              <MotionAccordion isOpen={isStockDataOpen}>
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
              </MotionAccordion>
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

              <MotionAccordion isOpen={isRevenueDataOpen}>
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
              </MotionAccordion>
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

              <MotionAccordion isOpen={isAdditionalOpen}>
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
              </MotionAccordion>
            </li>
          )}

          {/* Master Defaults & Specifications */}
          <li className="sidebar-nav-item">
            <NavLink
              to="/jobflow/master-settings"
              className={`sidebar-link ${
                isActiveRoute("/master-settings") || isActiveRoute("/jobflow/master-settings") ? "active-link" : ""
              }`}
            >
              <div className="sidebar-link-content">
                <Sliders size={18} className="sidebar-link-icon" />
                <span>Master Defaults</span>
              </div>
              {(isActiveRoute("/master-settings") || isActiveRoute("/jobflow/master-settings")) && (
                <ChevronRight size={15} className="sidebar-active-arrow" />
              )}
            </NavLink>
          </li>
        </ul>

        {/* Bottom Section: PrintZ Sidebar Illustration, Divider, Auto-Hide Toggle & Logout */}
        <div className="sidebar-bottom-section">
          <div className="sidebar-illustration-container">
            <PrintZSidebarIllustration width="100%" height={190} />
          </div>

          <div className="sidebar-divider" />

          {/* Auto-Hide Sidebar Feature Toggle */}
          <div className="sidebar-autohide-toggle-card">
            <div className="sidebar-autohide-info">
              <Sliders size={14} className="sidebar-autohide-icon" />
              <div className="sidebar-autohide-texts">
                <span className="sidebar-autohide-title">Auto-Hide Sidebar</span>
                <span className="sidebar-autohide-sub">Page hover close • 1s open</span>
              </div>
            </div>
            <button
              type="button"
              className={`sidebar-switch-toggle ${isAutoCollapseEnabled ? "active" : ""}`}
              onClick={() => handleToggleAutoCollapse(!isAutoCollapseEnabled)}
              title={isAutoCollapseEnabled ? "Turn OFF Auto-Hide" : "Turn ON Auto-Hide"}
              aria-label="Toggle auto-hide sidebar mode"
            >
              <span className="sidebar-switch-thumb" />
            </button>
          </div>

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

      {/* Tap-outside backdrop; hidden by CSS above 1024px */}
      {!isSidebarCollapsed && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsSidebarCollapsed(true)}
          aria-hidden="true"
        />
      )}

      {/* 2-Second Left Edge Hover Indicator */}
      {isAutoCollapseEnabled && isSidebarCollapsed && (
        <div
          className={`sidebar-left-hover-indicator ${isHoveringLeftZone ? "active" : ""}`}
        />
      )}

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
              <MotionDropdown
                isOpen={isProfileDropdownOpen}
                className="topbar-dropdown-menu"
              >
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
              </MotionDropdown>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="content-body">
          <PageTransition routeKey={`${location.pathname}${location.search}`}>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
