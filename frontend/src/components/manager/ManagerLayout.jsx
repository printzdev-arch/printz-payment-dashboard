import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import "../../styles/sidebar.css";
import "../../styles/printzTheme.css";
import { useAuth } from "../../context/AuthContext.jsx";
import { PageTransition, MotionDropdown, MotionAccordion } from "../../shared/motion";
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
  ChevronLeft,
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
  Receipt,
  CreditCard,
  Activity,
  Sliders,
  Edit2,
  UserCheck,
  MessageCircle,
  FileCheck,
  RotateCcw,
  Send,
  PackageCheck,
  CheckCircle,
  Lock,
  QrCode,
  ShoppingCart,
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

const getManagerPageTitle = (pathname, search = "") => {
  if (pathname.includes("/stock-transfers")) return "Warehouse Stock Transfers";
  if (pathname.includes("/sla-dashboard") || pathname.includes("/sla")) return "SLA Monitoring & Designer Scorecard";
  if (pathname.includes("/delivery") || pathname.includes("/jobflow/delivery")) {
    const params = new URLSearchParams(search);
    const tab = (params.get("tab") || "").toUpperCase();
    if (tab === "REVIEW") return "Delivery - Ready for Review";
    if (tab === "ASSIGNED") return "Delivery - Assigned Staff";
    if (tab === "PACKED") return "Delivery - Packed & Verified";
    if (tab === "OUT_FOR_DELIVERY") return "Delivery - Out for Delivery";
    if (tab === "DELIVERED") return "Delivery - Delivered";
    return "Delivery Management";
  }
  if (pathname.includes("/invoice") || pathname.includes("/invoices") || pathname.includes("/jobflow/invoice")) {
    const params = new URLSearchParams(search);
    const tab = (params.get("tab") || "").toUpperCase();
    if (tab === "PENDING_QUEUE" || tab === "PENDING") return "Invoice - Pending Queue";
    if (tab === "INVOICES_LEDGER" || tab === "LEDGER") return "Invoice - Commercial Invoices Ledger";
    return "Commercial Tax Invoicing";
  }
  if (pathname.includes("/settlement") || pathname.includes("/jobflow/settlement")) {
    const params = new URLSearchParams(search);
    const tab = (params.get("tab") || "").toUpperCase();
    if (tab === "OUTSTANDING_BOARD" || tab === "OUTSTANDING" || tab === "CASHIER") return "Settlement - Outstanding & Cashier";
    if (tab === "CLOSURE_QUEUE" || tab === "CLOSURE" || tab === "FEEDBACK") return "Settlement - Job Closure & Feedback";
    return "Payment Settlement & Job Closure";
  }
  if (pathname.includes("/qc") || pathname.includes("/quality-control") || pathname.includes("/jobflow/qc")) {
    const params = new URLSearchParams(search);
    const tab = params.get("tab");
    if (tab === "15A" || tab === "queue" || tab === "overview") return "QC Queue & Overview";
    if (tab === "15B" || tab === "inspection" || tab === "form") return "QC Inspection Form";
    if (tab === "16A" || tab === "rework") return "Operation Rework";
    if (tab === "16B" || tab === "reprints" || tab === "reprint") return "Reprint Approvals";
    return "Quality Control & Rework";
  }
  if (pathname.includes("/production") || pathname.includes("/jobflow/production")) {
    const params = new URLSearchParams(search);
    const tab = params.get("tab");
    if (tab === "overview") return "Production Dashboard";
    if (tab === "orders" || tab === "details" || tab === "planning") return "Production Orders";
    if (tab === "queue") return "Operation Queue";
    if (tab === "reprints") return "Reprint Management";
    return "Production Operations";
  }
  if (pathname.includes("/design") || pathname.includes("/jobflow/design")) {
    const params = new URLSearchParams(search);
    const view = params.get("view") || params.get("tab");
    if (view === "queue") return "Design Queue";
    if (view === "workbench" || pathname.includes("/workbench") || pathname.includes("/workspace")) return "Design Workbench";
    if (view === "my-jobs") return "Designer My Jobs";
    if (view === "customer-proof") return "Customer Proof Review";
    return "Design Workflow";
  }
  if (pathname.includes("/estimates")) return "Quotations & Cost Estimates";
  if (pathname.includes("/jobs")) return "Job Orders";
  if (pathname.includes("/qr-request") || pathname.includes("/customer-register")) return "Branch QR Form";
  if (pathname.includes("/customers") || pathname.includes("/jobflow/customers")) return "Customer Master";
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
    } catch (e) { }
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
      // 1. When sidebar is collapsed: detect if cursor is on far left edge (<= 25px) and wait 1 second
      if (isSidebarCollapsed) {
        if (e.clientX <= 25) {
          if (!leftZoneTimerRef.current) {
            setIsHoveringLeftZone(true);
            leftZoneTimerRef.current = setTimeout(() => {
              setIsSidebarCollapsed(false);
              setIsHoveringLeftZone(false);
              leftZoneTimerRef.current = null;
            }, 1000); // 1 second hold to open automatically
          }
        } else {
          if (leftZoneTimerRef.current) {
            clearTimeout(leftZoneTimerRef.current);
            leftZoneTimerRef.current = null;
            setIsHoveringLeftZone(false);
          }
        }
      } else {
        // 2. When sidebar is open: detect if cursor moves out into page area (> 270px)
        if (e.clientX > 270) {
          if (!autoCloseTimerRef.current) {
            autoCloseTimerRef.current = setTimeout(() => {
              setIsSidebarCollapsed(true);
              autoCloseTimerRef.current = null;
            }, 100); // Smooth auto-close when entering page
          }
        } else {
          // Inside sidebar: cancel any pending auto-close
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
  const { logout, currentUser, role } = useAuth();

  const storedUser = (() => {
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("printz_user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  })();
  const storedRole = (localStorage.getItem("userRole") || storedUser?.role || "").toLowerCase();
  const effectiveRole = (role || currentUser?.role || storedRole || "").toLowerCase();
  const effectiveName = (userName || currentUser?.name || storedUser?.name || localStorage.getItem("userName") || "").toLowerCase();
  const effectiveEmail = (currentUser?.email || storedUser?.email || localStorage.getItem("userEmail") || "").toLowerCase();

  const isDesigner =
    effectiveRole === "designer" ||
    location.pathname.startsWith("/design") ||
    location.pathname.startsWith("/designer") ||
    ["ali hassan", "siti rahman", "kumar anil", "john lee", "nur aisyah"].some((name) =>
      effectiveName.includes(name)
    ) ||
    ["ali.hassan", "siti.rahman", "kumar.anil", "john.lee", "nur.aisyah"].some((prefix) =>
      effectiveEmail.includes(prefix)
    );

  // Route lock: If designer, prevent shifting to other pages or manager queue
  useEffect(() => {
    if (isDesigner) {
      const isDesignPath =
        location.pathname.startsWith("/design") ||
        location.pathname.startsWith("/jobflow/design") ||
        location.pathname.startsWith("/v3/design");
      if (!isDesignPath) {
        navigate("/jobflow/design?view=my-jobs", { replace: true });
        return;
      }
      const params = new URLSearchParams(location.search);
      const view = params.get("view");
      if (view === "queue") {
        navigate("/jobflow/design?view=my-jobs", { replace: true });
      }
    }
  }, [isDesigner, location.pathname, location.search, navigate]);


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

  // Design Route & State
  const isDesignRoute =
    location.pathname.startsWith("/design") ||
    location.pathname.startsWith("/jobflow/design") ||
    location.pathname.startsWith("/v3/design");

  const [isDesignToggled, setIsDesignToggled] = useState(null);
  const isDesignOpen = isDesigner ? (isDesignToggled !== null ? isDesignToggled : true) : (isDesignToggled !== null ? isDesignToggled : isDesignRoute);

  const currentDesignTab = (() => {
    if (!isDesignRoute) return "";
    const params = new URLSearchParams(location.search);
    const view = params.get("view") || params.get("tab");
    if (view) {
      if (isDesigner && view === "queue") return "my-jobs";
      return view;
    }
    if (
      location.pathname.includes("/workbench") ||
      location.pathname.includes("/workspace")
    ) {
      return "workbench";
    }
    return isDesigner ? "my-jobs" : "queue";
  })();

  const handleDesignClick = () => {
    if (isDesigner) {
      navigate("/jobflow/design?view=my-jobs");
      setIsDesignToggled(true);
    } else if (!isDesignRoute) {
      navigate("/jobflow/design?view=queue");
      setIsDesignToggled(true);
    } else {
      setIsDesignToggled(!isDesignOpen);
    }
  };


  const handleDesignToggleClick = (e) => {
    e.stopPropagation();
    setIsDesignToggled(!isDesignOpen);
  };

  // Production Route & State
  const isProductionRoute =
    location.pathname.startsWith("/production") ||
    location.pathname.startsWith("/jobflow/production") ||
    location.pathname.startsWith("/jobflow/production-planning") ||
    location.pathname.startsWith("/jobflow/production/planning") ||
    location.pathname.startsWith("/v3/production");

  const [isProductionToggled, setIsProductionToggled] = useState(null);

  const isProductionOpen =
    isProductionToggled !== null ? isProductionToggled : isProductionRoute;

  const currentProductionTab = (() => {
    if (!isProductionRoute) return "";
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "details") return "orders";
    if (tab) return tab;
    if (
      location.pathname.includes("/production/planning") ||
      location.pathname.includes("production-planning") ||
      location.pathname.includes("/production/orders")
    ) {
      return "orders";
    }
    if (location.pathname.includes("/production/queue")) {
      return "queue";
    }
    if (location.pathname.includes("/production/reprints")) {
      return "reprints";
    }
    return "overview";
  })();

  const handleProductionClick = (e) => {
    if (!isProductionRoute) {
      navigate("/jobflow/production?tab=overview");
      setIsProductionToggled(true);
    } else {
      setIsProductionToggled(!isProductionOpen);
    }
  };

  const handleProductionToggleClick = (e) => {
    e.stopPropagation();
    setIsProductionToggled(!isProductionOpen);
  };

  // QC Route & State
  const isQcRoute =
    location.pathname.startsWith("/quality-control") ||
    location.pathname.startsWith("/jobflow/qc") ||
    location.pathname.startsWith("/v3/quality-control");

  const [isQcToggled, setIsQcToggled] = useState(null);
  const isQcOpen = isQcToggled !== null ? isQcToggled : isQcRoute;

  const currentQcTab = (() => {
    if (!isQcRoute) return "";
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "15A" || tab === "queue" || tab === "overview") return "15A";
    if (tab === "15B" || tab === "inspection" || tab === "form") return "15B";
    if (tab === "16A" || tab === "rework") return "16A";
    if (tab === "16B" || tab === "reprints" || tab === "reprint") return "16B";
    return "15A";
  })();

  const handleQcClick = () => {
    if (!isQcRoute) {
      navigate("/jobflow/qc?tab=15A");
      setIsQcToggled(true);
    } else {
      setIsQcToggled(!isQcOpen);
    }
  };

  const handleQcToggleClick = (e) => {
    e.stopPropagation();
    setIsQcToggled(!isQcOpen);
  };

  // Delivery Route & State
  const isDeliveryRoute =
    location.pathname.startsWith("/delivery") ||
    location.pathname.startsWith("/jobflow/delivery") ||
    location.pathname.startsWith("/v3/delivery");

  const [isDeliveryToggled, setIsDeliveryToggled] = useState(null);
  const isDeliveryOpen =
    isDeliveryToggled !== null ? isDeliveryToggled : isDeliveryRoute;

  const currentDeliveryTab = (() => {
    if (!isDeliveryRoute) return "";
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab) return tab.toUpperCase();
    return "REVIEW";
  })();

  const handleDeliveryClick = () => {
    if (!isDeliveryRoute) {
      navigate("/jobflow/delivery?tab=REVIEW");
      setIsDeliveryToggled(true);
    } else {
      setIsDeliveryToggled(!isDeliveryOpen);
    }
  };

  const handleDeliveryToggleClick = (e) => {
    e.stopPropagation();
    setIsDeliveryToggled(!isDeliveryOpen);
  };

  // Invoice Route & State
  const isInvoiceRoute =
    location.pathname.startsWith("/invoice") ||
    location.pathname.startsWith("/invoices") ||
    location.pathname.startsWith("/jobflow/invoice") ||
    location.pathname.startsWith("/v3/invoice");

  const [isInvoiceToggled, setIsInvoiceToggled] = useState(null);
  const isInvoiceOpen =
    isInvoiceToggled !== null ? isInvoiceToggled : isInvoiceRoute;

  const currentInvoiceTab = (() => {
    if (!isInvoiceRoute) return "";
    const params = new URLSearchParams(location.search);
    const tab = (params.get("tab") || "").toUpperCase();
    if (tab === "INVOICES_LEDGER" || tab === "LEDGER") return "INVOICES_LEDGER";
    return "PENDING_QUEUE";
  })();

  const handleInvoiceClick = () => {
    if (!isInvoiceRoute) {
      navigate("/jobflow/invoice?tab=PENDING_QUEUE");
      setIsInvoiceToggled(true);
    } else {
      setIsInvoiceToggled(!isInvoiceOpen);
    }
  };

  const handleInvoiceToggleClick = (e) => {
    e.stopPropagation();
    setIsInvoiceToggled(!isInvoiceOpen);
  };

  // Settlement Route & State
  const isSettlementRoute =
    location.pathname.startsWith("/settlement") ||
    location.pathname.startsWith("/jobflow/settlement") ||
    location.pathname.startsWith("/v3/settlement");

  const [isSettlementToggled, setIsSettlementToggled] = useState(null);
  const isSettlementOpen =
    isSettlementToggled !== null ? isSettlementToggled : isSettlementRoute;

  const currentSettlementTab = (() => {
    if (!isSettlementRoute) return "";
    const params = new URLSearchParams(location.search);
    const tab = (params.get("tab") || "").toUpperCase();
    if (tab === "CLOSURE_QUEUE" || tab === "CLOSURE" || tab === "FEEDBACK") return "CLOSURE_QUEUE";
    return "OUTSTANDING_BOARD";
  })();

  const handleSettlementClick = () => {
    if (!isSettlementRoute) {
      navigate("/jobflow/settlement?tab=OUTSTANDING_BOARD");
      setIsSettlementToggled(true);
    } else {
      setIsSettlementToggled(!isSettlementOpen);
    }
  };

  const handleSettlementToggleClick = (e) => {
    e.stopPropagation();
    setIsSettlementToggled(!isSettlementOpen);
  };

  // POS Route & State
  const isPosRoute =
    location.pathname.startsWith("/pos") ||
    location.pathname.startsWith("/jobflow/pos") ||
    location.pathname.startsWith("/sales-receipts") ||
    location.pathname.startsWith("/pos-receipts");

  const [isPosToggled, setIsPosToggled] = useState(null);
  const isPosOpen = isPosToggled !== null ? isPosToggled : isPosRoute;

  const currentPosTab = (() => {
    if (!isPosRoute) return "";
    const params = new URLSearchParams(location.search);
    const tab = (params.get("tab") || "").toLowerCase();
    if (tab === "history" || tab === "ledger") return "history";
    return "terminal";
  })();

  const handlePosClick = () => {
    navigate("/jobflow/pos?tab=terminal");
    setIsPosToggled(true);
  };

  const handlePosToggleClick = (e) => {
    e.stopPropagation();
    setIsPosToggled(!isPosOpen);
  };

  // Customers Route & State
  const isCustomersRoute =
    location.pathname.startsWith("/customers") ||
    location.pathname.startsWith("/jobflow/customers") ||
    location.pathname.startsWith("/v3/customers") ||
    location.pathname.startsWith("/jobflow/qr-request") ||
    location.pathname.startsWith("/customer-register");

  const [isCustomersToggled, setIsCustomersToggled] = useState(null);
  const isCustomersOpen =
    isCustomersToggled !== null ? isCustomersToggled : isCustomersRoute;

  const currentCustomersTab = (() => {
    if (!isCustomersRoute) return "";
    if (
      location.pathname.includes("/qr-request") ||
      location.pathname.includes("/customer-register")
    ) {
      return "qr-request";
    }
    return "directory";
  })();

  const handleCustomersClick = () => {
    if (!isCustomersRoute) {
      navigate("/customers");
      setIsCustomersToggled(true);
    } else {
      setIsCustomersToggled(!isCustomersOpen);
    }
  };

  const handleCustomersToggleClick = (e) => {
    e.stopPropagation();
    setIsCustomersToggled(!isCustomersOpen);
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("userBranchName");
      await logout();
      navigate(isDesigner ? "/designer/login" : "/login");
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
        {/* Brand Logo Header with Close Arrow Button */}
        <div className="sidebar-logo-header-row">
          <div
            className="sidebar-logo-header"
            onClick={() => navigate(isDesigner ? "/jobflow/design?view=my-jobs" : "/manager-dashboard")}
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
          {!isDesigner && (
            <>
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

              <li className="sidebar-nav-item">
                <NavLink
                  to="/jobflow"
                  className={`sidebar-link ${isActiveRoute("/jobflow") ? "active-link" : ""
                    }`}
                >
                  <div className="sidebar-link-content">
                    <Users size={18} className="sidebar-link-icon" />
                    <span>Overview</span>
                  </div>

                  {isActiveRoute("/jobflow") && (
                    <ChevronRight size={15} className="sidebar-active-arrow" />
                  )}
                </NavLink>
              </li>

              {/* POS Counter Billing with Submenu */}
              <li className="sidebar-nav-item">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handlePosClick}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handlePosClick();
                    }
                  }}
                  className={`sidebar-link ${isPosRoute ? "active-link" : ""}`}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    ...(isPosRoute
                      ? {
                        backgroundColor: "rgba(22, 163, 74, 0.15)",
                        borderLeft: "3px solid #16a34a",
                        color: "#ffffff",
                      }
                      : {}),
                  }}
                >
                  <div className="sidebar-link-content">
                    <ShoppingCart
                      size={18}
                      className="sidebar-link-icon"
                      style={isPosRoute ? { color: "#16a34a" } : {}}
                    />
                    <span>POS Billing</span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePosToggleClick}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "4px",
                      cursor: "pointer",
                      color: isPosRoute ? "#16a34a" : "rgba(255, 255, 255, 0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform 0.2s ease",
                      transform: isPosOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                    aria-label="Toggle POS submenu"
                  >
                    <ChevronDown size={15} className="sidebar-link-icon" />
                  </button>
                </div>

                <MotionAccordion isOpen={isPosOpen}>
                  <ul className="sidebar-dropdown-list">
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/pos?tab=terminal"
                        className={`sidebar-dropdown-link ${currentPosTab === "terminal" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <ShoppingCart size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text"> Counter Billing</span>
                        </div>
                        {currentPosTab === "terminal" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/pos?tab=history"
                        className={`sidebar-dropdown-link ${currentPosTab === "history" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <Receipt size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text"> Sales Receipts</span>
                        </div>
                        {currentPosTab === "history" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                  </ul>
                </MotionAccordion>
              </li>

              {/* JobFlow - Customer Master with Submenu */}
              <li className="sidebar-nav-item">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleCustomersClick}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleCustomersClick();
                    }
                  }}
                  className={`sidebar-link ${isCustomersRoute ? "active-link" : ""}`}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    ...(isCustomersRoute
                      ? {
                        backgroundColor: "rgba(22, 163, 74, 0.15)",
                        borderLeft: "3px solid #16a34a",
                        color: "#ffffff",
                      }
                      : {}),
                  }}
                >
                  <div className="sidebar-link-content">
                    <Users
                      size={18}
                      className="sidebar-link-icon"
                      style={isCustomersRoute ? { color: "#16a34a" } : {}}
                    />
                    <span>Customers</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCustomersToggleClick}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "4px",
                      cursor: "pointer",
                      color: isCustomersRoute ? "#16a34a" : "rgba(255, 255, 255, 0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform 0.2s ease",
                      transform: isCustomersOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                    aria-label="Toggle Customers submenu"
                  >
                    <ChevronDown size={15} className="sidebar-link-icon" />
                  </button>
                </div>

                <MotionAccordion isOpen={isCustomersOpen}>
                  <ul className="sidebar-dropdown-list">
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/customers"
                        className={`sidebar-dropdown-link ${currentCustomersTab === "directory" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <Users size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Customer Directory</span>
                        </div>
                        {currentCustomersTab === "directory" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/qr-request"
                        className={`sidebar-dropdown-link ${currentCustomersTab === "qr-request" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <QrCode size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Branch QR Form</span>
                        </div>
                        {currentCustomersTab === "qr-request" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                  </ul>
                </MotionAccordion>
              </li>

              {/* JobFlow - Job Orders */}
              <li className="sidebar-nav-item">
                <NavLink
                  to="/jobs"
                  className={`sidebar-link ${isActiveRoute("/jobs") || isActiveRoute("/jobflow/jobs") || isActiveRoute("/v3/jobs") ? "active-link" : ""
                    }`}
                >
                  <div className="sidebar-link-content">
                    <Briefcase size={18} className="sidebar-link-icon" />
                    <span>Job Orders</span>
                  </div>
                  {(isActiveRoute("/jobs") || isActiveRoute("/jobflow/jobs") || isActiveRoute("/v3/jobs")) && (
                    <ChevronRight size={15} className="sidebar-active-arrow" />
                  )}
                </NavLink>
              </li>

              {/* JobFlow - Estimates & Quotations */}
              <li className="sidebar-nav-item">
                <NavLink
                  to="/estimates"
                  className={`sidebar-link ${isActiveRoute("/estimates") || isActiveRoute("/jobflow/estimates") || isActiveRoute("/v3/estimates") ? "active-link" : ""
                    }`}
                >
                  <div className="sidebar-link-content">
                    <Calculator size={18} className="sidebar-link-icon" />
                    <span>Estimates & Quotes</span>
                  </div>
                  {(isActiveRoute("/estimates") || isActiveRoute("/jobflow/estimates") || isActiveRoute("/v3/estimates")) && (
                    <ChevronRight size={15} className="sidebar-active-arrow" />
                  )}
                </NavLink>
              </li>
            </>
          )}

          {/* JobFlow - Design Workflow with Submenu */}
          <li className="sidebar-nav-item">
            <div
              role="button"
              tabIndex={0}
              onClick={handleDesignClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleDesignClick();
                }
              }}
              className={`sidebar-link ${isDesignRoute ? "active-link" : ""}`}
              style={{
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                ...(isDesignRoute
                  ? {
                    backgroundColor: "rgba(22, 163, 74, 0.15)",
                    borderLeft: "3px solid #16a34a",
                    color: "#ffffff",
                  }
                  : {}),
              }}
            >
              <div className="sidebar-link-content">
                <Palette
                  size={18}
                  className="sidebar-link-icon"
                  style={isDesignRoute ? { color: "#16a34a" } : {}}
                />
                <span>Design</span>
              </div>
              <button
                type="button"
                onClick={handleDesignToggleClick}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "4px",
                  cursor: "pointer",
                  color: isDesignRoute ? "#16a34a" : "rgba(255, 255, 255, 0.7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "transform 0.2s ease",
                  transform: isDesignOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
                aria-label="Toggle Design submenu"
              >
                <ChevronDown size={15} className="sidebar-link-icon" />
              </button>
            </div>

            <MotionAccordion isOpen={isDesignOpen}>
              <ul className="sidebar-dropdown-list">
                {/* 1. Design Queue — ONLY for Managers */}
                {!isDesigner && (
                  <li className="sidebar-dropdown-item">
                    <Link
                      to="/jobflow/design?view=queue"
                      className={`sidebar-dropdown-link ${currentDesignTab === "queue" ? "active" : ""
                        }`}
                    >
                      <div className="sidebar-dropdown-link-left">
                        <Palette size={13} className="sidebar-dropdown-icon" />
                        <span className="sidebar-dropdown-text">Design Queue</span>
                      </div>
                      {currentDesignTab === "queue" && (
                        <span className="sidebar-dropdown-active-dot" />
                      )}
                    </Link>
                  </li>
                )}

                {/* For Designers, show My Jobs first as item 1 */}
                {isDesigner ? (
                  <>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/design?view=my-jobs"
                        className={`sidebar-dropdown-link ${currentDesignTab === "my-jobs" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <UserCheck size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Designer My Jobs</span>
                        </div>
                        {currentDesignTab === "my-jobs" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/design?view=workbench"
                        className={`sidebar-dropdown-link ${currentDesignTab === "workbench" || currentDesignTab === "workspace" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <Edit2 size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Design Workbench</span>
                        </div>
                        {(currentDesignTab === "workbench" || currentDesignTab === "workspace") && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/design?view=customer-proof"
                        className={`sidebar-dropdown-link ${currentDesignTab === "customer-proof" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <MessageCircle size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Customer Review</span>
                        </div>
                        {currentDesignTab === "customer-proof" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/design?view=workbench"
                        className={`sidebar-dropdown-link ${currentDesignTab === "workbench" || currentDesignTab === "workspace" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <Edit2 size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Design Workbench</span>
                        </div>
                        {(currentDesignTab === "workbench" || currentDesignTab === "workspace") && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/design?view=my-jobs"
                        className={`sidebar-dropdown-link ${currentDesignTab === "my-jobs" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <UserCheck size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Designer My Jobs</span>
                        </div>
                        {currentDesignTab === "my-jobs" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/design?view=customer-proof"
                        className={`sidebar-dropdown-link ${currentDesignTab === "customer-proof" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <MessageCircle size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Customer Proof Review</span>
                        </div>
                        {currentDesignTab === "customer-proof" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </MotionAccordion>
          </li>

          {!isDesigner && (
            <>
              {/* JobFlow - Production Operations with Submenu */}
              <li className="sidebar-nav-item">

                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleProductionClick}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleProductionClick(e);
                    }
                  }}
                  className={`sidebar-link ${isProductionRoute ? "active-link" : ""}`}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    ...(isProductionRoute
                      ? {
                        backgroundColor: "rgba(22, 163, 74, 0.15)",
                        borderLeft: "3px solid #16a34a",
                        color: "#ffffff",
                      }
                      : {}),
                  }}
                >
                  <div className="sidebar-link-content">
                    <Layers
                      size={18}
                      className="sidebar-link-icon"
                      style={isProductionRoute ? { color: "#16a34a" } : {}}
                    />
                    <span>Production</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleProductionToggleClick}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "4px",
                      cursor: "pointer",
                      color: isProductionRoute ? "#16a34a" : "rgba(255, 255, 255, 0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform 0.2s ease",
                      transform: isProductionOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                    aria-label="Toggle Production submenu"
                  >
                    <ChevronDown size={15} className="sidebar-link-icon" />
                  </button>
                </div>

                <MotionAccordion isOpen={isProductionOpen}>
                  <ul className="sidebar-dropdown-list">
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/production?tab=overview"
                        className={`sidebar-dropdown-link ${currentProductionTab === "overview" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <Activity size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Production Dashboard</span>
                        </div>
                        {currentProductionTab === "overview" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/production?tab=orders"
                        className={`sidebar-dropdown-link ${currentProductionTab === "orders" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <Layers size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Production Orders</span>
                        </div>
                        {currentProductionTab === "orders" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/production?tab=queue"
                        className={`sidebar-dropdown-link ${currentProductionTab === "queue" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <Sliders size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Operation Queue</span>
                        </div>
                        {currentProductionTab === "queue" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/production?tab=reprints"
                        className={`sidebar-dropdown-link ${currentProductionTab === "reprints" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <Printer size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Reprint Management</span>
                        </div>
                        {currentProductionTab === "reprints" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                  </ul>
                </MotionAccordion>
              </li>

              {/* JobFlow - Quality Control with Submenu */}
              <li className="sidebar-nav-item">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleQcClick}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleQcClick();
                    }
                  }}
                  className={`sidebar-link ${isQcRoute ? "active-link" : ""}`}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    ...(isQcRoute
                      ? {
                        backgroundColor: "rgba(22, 163, 74, 0.15)",
                        borderLeft: "3px solid #16a34a",
                        color: "#ffffff",
                      }
                      : {}),
                  }}
                >
                  <div className="sidebar-link-content">
                    <ShieldCheck
                      size={18}
                      className="sidebar-link-icon"
                      style={isQcRoute ? { color: "#16a34a" } : {}}
                    />
                    <span>Quality Control</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleQcToggleClick}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "4px",
                      cursor: "pointer",
                      color: isQcRoute ? "#16a34a" : "rgba(255, 255, 255, 0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform 0.2s ease",
                      transform: isQcOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                    aria-label="Toggle QC submenu"
                  >
                    <ChevronDown size={15} className="sidebar-link-icon" />
                  </button>
                </div>

                <MotionAccordion isOpen={isQcOpen}>
                  <ul className="sidebar-dropdown-list">
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/qc?tab=15A"
                        className={`sidebar-dropdown-link ${currentQcTab === "15A" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <ShieldCheck size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">QC Queue</span>
                        </div>
                        {currentQcTab === "15A" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/qc?tab=15B"
                        className={`sidebar-dropdown-link ${currentQcTab === "15B" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <FileCheck size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">QC Inspection</span>
                        </div>
                        {currentQcTab === "15B" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/qc?tab=16A"
                        className={`sidebar-dropdown-link ${currentQcTab === "16A" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <RotateCcw size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Operation Rework</span>
                        </div>
                        {currentQcTab === "16A" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/qc?tab=16B"
                        className={`sidebar-dropdown-link ${currentQcTab === "16B" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <Printer size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Reprint Approvals</span>
                        </div>
                        {currentQcTab === "16B" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                  </ul>
                </MotionAccordion>
              </li>

              {/* JobFlow - Delivery Management with Submenu */}
              <li className="sidebar-nav-item">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleDeliveryClick}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleDeliveryClick();
                    }
                  }}
                  className={`sidebar-link ${isDeliveryRoute ? "active-link" : ""}`}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    ...(isDeliveryRoute
                      ? {
                        backgroundColor: "rgba(22, 163, 74, 0.15)",
                        borderLeft: "3px solid #16a34a",
                        color: "#ffffff",
                      }
                      : {}),
                  }}
                >
                  <div className="sidebar-link-content">
                    <Truck
                      size={18}
                      className="sidebar-link-icon"
                      style={isDeliveryRoute ? { color: "#16a34a" } : {}}
                    />
                    <span>Delivery</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeliveryToggleClick}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "4px",
                      cursor: "pointer",
                      color: isDeliveryRoute ? "#16a34a" : "rgba(255, 255, 255, 0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform 0.2s ease",
                      transform: isDeliveryOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                    aria-label="Toggle Delivery submenu"
                  >
                    <ChevronDown size={15} className="sidebar-link-icon" />
                  </button>
                </div>

                <MotionAccordion isOpen={isDeliveryOpen}>
                  <ul className="sidebar-dropdown-list">
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/delivery?tab=REVIEW"
                        className={`sidebar-dropdown-link ${currentDeliveryTab === "REVIEW" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <ShieldCheck size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Ready for Review</span>
                        </div>
                        {currentDeliveryTab === "REVIEW" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/delivery?tab=ASSIGNED"
                        className={`sidebar-dropdown-link ${currentDeliveryTab === "ASSIGNED" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <Send size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Assigned Staff</span>
                        </div>
                        {currentDeliveryTab === "ASSIGNED" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/delivery?tab=PACKED"
                        className={`sidebar-dropdown-link ${currentDeliveryTab === "PACKED" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <PackageCheck size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Packed & Verified</span>
                        </div>
                        {currentDeliveryTab === "PACKED" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/delivery?tab=OUT_FOR_DELIVERY"
                        className={`sidebar-dropdown-link ${currentDeliveryTab === "OUT_FOR_DELIVERY" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <Truck size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Out for Delivery</span>
                        </div>
                        {currentDeliveryTab === "OUT_FOR_DELIVERY" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/delivery?tab=DELIVERED"
                        className={`sidebar-dropdown-link ${currentDeliveryTab === "DELIVERED" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <CheckCircle size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Delivered</span>
                        </div>
                        {currentDeliveryTab === "DELIVERED" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                  </ul>
                </MotionAccordion>
              </li>

              {/* JobFlow - Invoice Generation with Submenu */}
              <li className="sidebar-nav-item">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleInvoiceClick}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleInvoiceClick();
                    }
                  }}
                  className={`sidebar-link ${isInvoiceRoute ? "active-link" : ""}`}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    ...(isInvoiceRoute
                      ? {
                        backgroundColor: "rgba(22, 163, 74, 0.15)",
                        borderLeft: "3px solid #16a34a",
                        color: "#ffffff",
                      }
                      : {}),
                  }}
                >
                  <div className="sidebar-link-content">
                    <Receipt
                      size={18}
                      className="sidebar-link-icon"
                      style={isInvoiceRoute ? { color: "#16a34a" } : {}}
                    />
                    <span>Invoice</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleInvoiceToggleClick}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "4px",
                      cursor: "pointer",
                      color: isInvoiceRoute ? "#16a34a" : "rgba(255, 255, 255, 0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform 0.2s ease",
                      transform: isInvoiceOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                    aria-label="Toggle Invoice submenu"
                  >
                    <ChevronDown size={15} className="sidebar-link-icon" />
                  </button>
                </div>

                <MotionAccordion isOpen={isInvoiceOpen}>
                  <ul className="sidebar-dropdown-list">
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/invoice?tab=PENDING_QUEUE"
                        className={`sidebar-dropdown-link ${currentInvoiceTab === "PENDING_QUEUE" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <Clock size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Pending Invoices</span>
                        </div>
                        {currentInvoiceTab === "PENDING_QUEUE" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/invoice?tab=INVOICES_LEDGER"
                        className={`sidebar-dropdown-link ${currentInvoiceTab === "INVOICES_LEDGER" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <Receipt size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Invoice Ledger</span>
                        </div>
                        {currentInvoiceTab === "INVOICES_LEDGER" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                  </ul>
                </MotionAccordion>
              </li>

              {/* JobFlow - Settlement with Submenu */}
              <li className="sidebar-nav-item">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleSettlementClick}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSettlementClick();
                    }
                  }}
                  className={`sidebar-link ${isSettlementRoute ? "active-link" : ""}`}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    ...(isSettlementRoute
                      ? {
                        backgroundColor: "rgba(22, 163, 74, 0.15)",
                        borderLeft: "3px solid #16a34a",
                        color: "#ffffff",
                      }
                      : {}),
                  }}
                >
                  <div className="sidebar-link-content">
                    <CreditCard
                      size={18}
                      className="sidebar-link-icon"
                      style={isSettlementRoute ? { color: "#16a34a" } : {}}
                    />
                    <span>Settlement</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSettlementToggleClick}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "4px",
                      cursor: "pointer",
                      color: isSettlementRoute ? "#16a34a" : "rgba(255, 255, 255, 0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform 0.2s ease",
                      transform: isSettlementOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                    aria-label="Toggle Settlement submenu"
                  >
                    <ChevronDown size={15} className="sidebar-link-icon" />
                  </button>
                </div>

                <MotionAccordion isOpen={isSettlementOpen}>
                  <ul className="sidebar-dropdown-list">
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/settlement?tab=OUTSTANDING_BOARD"
                        className={`sidebar-dropdown-link ${currentSettlementTab === "OUTSTANDING_BOARD" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <CreditCard size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Outstanding Invoices</span>
                        </div>
                        {currentSettlementTab === "OUTSTANDING_BOARD" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/settlement?tab=CLOSURE_QUEUE"
                        className={`sidebar-dropdown-link ${currentSettlementTab === "CLOSURE_QUEUE" ? "active" : ""
                          }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <Lock size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Job Closure</span>
                        </div>
                        {currentSettlementTab === "CLOSURE_QUEUE" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                  </ul>
                </MotionAccordion>
              </li>
            </>
          )}
        </ul>



        {/* Bottom Section: PrintZ Sidebar Illustration, Divider & Logout */}
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

      {/* 1-Second Left Edge Hover Indicator */}
      {isAutoCollapseEnabled && isSidebarCollapsed && (
        <div
          className={`sidebar-left-hover-indicator ${isHoveringLeftZone ? "active" : ""}`}
        />
      )}

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
              <span className="breadcrumb-root">{isDesigner ? "Designer" : "Manager"}</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">
                {getManagerPageTitle(location.pathname, location.search)}
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
                    {isDesigner ? "Creative Designer" : `Manager ${branchName ? `• ${branchName}` : ""}`}
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
              <MotionDropdown
                isOpen={isProfileDropdownOpen}
                className="topbar-dropdown-menu"
              >
                <div className="dropdown-user-header">
                  <p className="dropdown-user-name">{userName}</p>
                  <p className="dropdown-user-email">
                    {currentUser?.email || (isDesigner ? "Designer Studio Account" : "Manager Account")}
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

export default ManagerLayout;
