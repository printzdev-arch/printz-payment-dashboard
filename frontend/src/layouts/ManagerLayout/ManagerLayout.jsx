import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import NavLink from "../../shared/access/GuardedNavLink.jsx";
import RestrictedNav from "../../shared/access/RestrictedNav.jsx";
import "../styles/sidebar.css";
import "../../shared/styles/printzTheme.css";
import { useAuth } from "../../app/providers/AuthContext.jsx";
import { PageTransition, MotionDropdown, MotionAccordion } from "../../shared/ui/motion";
import EndDayButton from "../../modules/day-end/components/EndDayButton.jsx";
import logo from "../../shared/assets/logo.png";

import {
  PlusCircle,
  FolderOpen,
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
  Banknote,
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
  FileSearch,
  Truck,
  Receipt,
  CreditCard,
  Activity,
  Sliders,
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
  ClipboardList,
  ArrowDownLeft,
  PlayCircle,
  BarChart2,
  AlertTriangle,
  Monitor,
  CheckCircle2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import PrintZSidebarIllustration from "../../shared/assets/illustrations/PrintZSidebarIllustration";
import FitTablePage from "../../shared/ui/FitTablePage/FitTablePage";


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
  if (pathname.includes("/delete-requests")) return "Delete Requests";
  if (pathname.includes("/master-settings") || pathname.includes("/jobflow/master-settings")) return "Master Defaults & Specifications";
  if (pathname.includes("/stock-transfers")) return "Warehouse Stock Transfers";
  if (pathname.includes("/attendance/setup")) return "Attendance Setup";
  if (pathname.includes("/attendance/daily")) return "Daily Attendance";
  if (pathname.includes("/attendance/permissions")) return "Attendance Permissions";
  if (pathname.includes("/attendance/reports")) return "Attendance Reports";
  if (pathname.includes("/attendance")) return "Daily Attendance";
  if (pathname.includes("/salary/setup")) return "Salary Setup";
  if (pathname.includes("/salary/loans-adjustments")) return "Loans & Adjustments";
  if (pathname.includes("/salary/processing")) return "Payroll Processing";
  if (pathname.includes("/salary/records")) return "Salary Records";
  if (pathname.includes("/salary")) return "Salary & Payroll";
  if (pathname.includes("/delivery") || pathname.includes("/jobflow/delivery")) {
    const params = new URLSearchParams(search);
    const tab = (params.get("tab") || "").toUpperCase();
    if (tab === "PICKUP") return "Delivery - Self Pickup";
    if (tab === "DISPATCH") return "Delivery - Dispatch Delivery";
    return "Delivery";
  }
  if (pathname.includes("/invoice") || pathname.includes("/invoices") || pathname.includes("/jobflow/invoice")) {
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
    if (tab === "history" || tab === "reports") return "QC History & Reports";
    return "QC Inspection Queue";
  }
  if (pathname.includes("/production") || pathname.includes("/jobflow/production")) {
    const params = new URLSearchParams(search);
    const tab = params.get("tab");
    if (tab === "orders" || tab === "details" || pathname.includes("/production/orders")) return "Production Orders";
    if (tab === "queue" || pathname.includes("/production/queue")) return "Operation Queue";
    if (tab === "rework" || pathname.includes("/production/rework")) return "Rework & Reprint";
    if (tab === "reprints" || pathname.includes("/production/reprints")) return "Rework & Reprint";
    if (tab === "reports" || pathname.includes("/production/reports")) return "Production Reports";
    return "Production Orders";
  }
  if (pathname.includes("/designer-jobs/new") || pathname.includes("/jobflow/designer-jobs/new")) {
    return "Designer Job Create";
  }
  if (pathname.includes("/designer-jobs") || pathname.includes("/jobflow/designer-jobs")) {
    return "Designer Job Orders";
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
  if (pathname.includes("/sale-orders/new")) return "New Sale Order";
  if (pathname.includes("/sale-orders")) return "Sale Orders";
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

  // Close the drawer after navigating on small screens.
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 1024) {
      setIsSidebarCollapsed(true);
    }
  }, [location.pathname]);
  const { logout, currentUser, role } = useAuth();
  // Someone with a page list sees exactly those pages in the sidebar
  const restrictedLinks = Array.isArray(currentUser?.pageLinks) ? currentUser.pageLinks : null;

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

  const isStudioDesigner =
    effectiveRole === "designer" ||
    location.pathname.startsWith("/design") ||
    location.pathname.startsWith("/designer") ||
    ["ali hassan", "siti rahman", "kumar anil", "john lee", "nur aisyah", "guna"].some((name) =>
      effectiveName.includes(name)
    ) ||
    ["ali.hassan", "siti.rahman", "kumar.anil", "john.lee", "nur.aisyah", "guna@"].some((prefix) =>
      effectiveEmail.includes(prefix)
    );

  const isDesigner = isStudioDesigner;

  // Route lock: If designer, allow design routes
  useEffect(() => {
    if (isDesigner && !restrictedLinks) {
      const isAllowedDesignRoute =
        location.pathname.startsWith("/design") ||
        location.pathname.startsWith("/jobflow/design") ||
        location.pathname.startsWith("/v3/design") ||
        location.pathname.startsWith("/jobflow/designer-jobs") ||
        location.pathname.startsWith("/designer-jobs") ||
        location.pathname.startsWith("/jobflow/jobs/new") ||
        location.pathname.startsWith("/jobs/new") ||
        location.pathname.startsWith("/production") ||
        location.pathname.startsWith("/quality-control") ||
        location.pathname.startsWith("/delivery");
      if (!isAllowedDesignRoute) {
        navigate("/jobflow/design?view=my-jobs", { replace: true });
        return;
      }
      const params = new URLSearchParams(location.search);
      const view = params.get("view");
      if (view === "queue") {
        navigate("/jobflow/design?view=my-jobs", { replace: true });
      }
    }
  }, [isDesigner, restrictedLinks, location.pathname, location.search, navigate]);


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
    location.pathname.startsWith("/v3/design") ||
    location.pathname.startsWith("/jobflow/designer-jobs") ||
    location.pathname.startsWith("/designer-jobs");

  const [isDesignToggled, setIsDesignToggled] = useState(null);
  const isDesignOpen = isDesigner ? (isDesignToggled !== null ? isDesignToggled : true) : (isDesignToggled !== null ? isDesignToggled : isDesignRoute);

  const currentDesignTab = (() => {
    if (!isDesignRoute) return "";
    if (
      location.pathname.startsWith("/jobflow/designer-jobs/new") ||
      location.pathname.startsWith("/designer-jobs/new")
    ) {
      return "designer-jobs-new";
    }
    if (
      location.pathname.startsWith("/jobflow/designer-jobs") ||
      location.pathname.startsWith("/designer-jobs")
    ) {
      return "designer-jobs";
    }
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
    if (location.pathname.includes("/production/orders")) return "orders";
    if (location.pathname.includes("/production/queue")) return "queue";
    if (location.pathname.includes("/production/rework")) return "rework";
    if (location.pathname.includes("/production/reprints")) return "reprints";
    if (location.pathname.includes("/production/reports")) return "reports";
    return "orders";
  })();

  const handleProductionClick = (e) => {
    if (!isProductionRoute) {
      navigate("/production/orders");
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
    if (tab === "history" || tab === "reports" || location.pathname.includes("/qc/history") || location.pathname.includes("/qc/reports")) {
      return "history";
    }
    return "overview";
  })();

  const handleQcClick = () => {
    if (!isQcRoute) {
      navigate("/jobflow/qc?tab=overview");
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
    if (tab) return tab.toUpperCase() === "PICKUP" ? "PICKUP" : "DISPATCH";
    return sessionStorage.getItem("delivery_active_tab") === "PICKUP" ? "PICKUP" : "DISPATCH";
  })();

  const handleDeliveryClick = () => {
    if (!isDeliveryRoute) {
      const savedTab = sessionStorage.getItem("delivery_active_tab") === "PICKUP" ? "PICKUP" : "DISPATCH";
      navigate(`/jobflow/delivery?tab=${savedTab}`);
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

  // Attendance Route & State
  const isAttendanceRoute = location.pathname.startsWith("/attendance");
  const [isAttendanceToggled, setIsAttendanceToggled] = useState(null);
  const isAttendanceOpen =
    isAttendanceToggled !== null ? isAttendanceToggled : isAttendanceRoute;

  const handleAttendanceClick = () => {
    if (!isAttendanceRoute) {
      navigate("/attendance/daily");
      setIsAttendanceToggled(true);
    } else {
      setIsAttendanceToggled(!isAttendanceOpen);
    }
  };

  const handleAttendanceToggleClick = (e) => {
    e.stopPropagation();
    setIsAttendanceToggled(!isAttendanceOpen);
  };

  // Salary Route & State
  const isSalaryRoute = location.pathname.startsWith("/salary");
  const [isSalaryToggled, setIsSalaryToggled] = useState(null);
  const isSalaryOpen =
    isSalaryToggled !== null ? isSalaryToggled : isSalaryRoute;

  const handleSalaryClick = () => {
    if (!isSalaryRoute) {
      navigate("/salary/processing");
      setIsSalaryToggled(true);
    } else {
      setIsSalaryToggled(!isSalaryOpen);
    }
  };

  const handleSalaryToggleClick = (e) => {
    e.stopPropagation();
    setIsSalaryToggled(!isSalaryOpen);
  };

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
        {/* Brand Logo Header with Close Arrow Button */}
        <div className="sidebar-logo-header-row">
          <div
            className="sidebar-logo-header"
            onClick={() => navigate(isStudioDesigner ? "/jobflow/design?view=my-jobs" : "/manager-dashboard")}
            style={{ cursor: "pointer" }}
          >
            <img
              src={logo}
              alt="PrintZ Shop"
              className="sidebar-brand-logo-img"
            />
          </div>
          {/* <button
            type="button"
            className="sidebar-collapse-arrow-btn"
            onClick={() => setIsSidebarCollapsed(true)}
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <ChevronLeft size={18} />
          </button> */}
        </div>



        {/* Navigation Items */}
        {restrictedLinks ? (
          <RestrictedNav links={restrictedLinks} isDesigner={isDesigner} />
        ) : (
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

              {/* Sale Orders */}
              <li className="sidebar-nav-item">
                <NavLink
                  to="/sale-orders"
                  className={`sidebar-link ${
                    location.pathname.startsWith("/sale-orders") ? "active-link" : ""
                  }`}
                >
                  <div className="sidebar-link-content">
                    <PackageCheck size={18} className="sidebar-link-icon" />
                    <span>Sale Orders</span>
                  </div>
                  {location.pathname.startsWith("/sale-orders") && (
                    <ChevronRight size={15} className="sidebar-active-arrow" />
                  )}
                </NavLink>
              </li>

              {/* Attendance with Submenu */}
              <li className="sidebar-nav-item">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleAttendanceClick}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleAttendanceClick();
                    }
                  }}
                  className={`sidebar-link ${isAttendanceRoute ? "active-link" : ""}`}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    ...(isAttendanceRoute
                      ? {
                        backgroundColor: "rgba(22, 163, 74, 0.15)",
                        borderLeft: "3px solid #16a34a",
                        color: "#ffffff",
                      }
                      : {}),
                  }}
                >
                  <div className="sidebar-link-content">
                    <Clock
                      size={18}
                      className="sidebar-link-icon"
                      style={isAttendanceRoute ? { color: "#16a34a" } : {}}
                    />
                    <span>Attendance</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAttendanceToggleClick}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "4px",
                      cursor: "pointer",
                      color: isAttendanceRoute ? "#16a34a" : "rgba(255, 255, 255, 0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform 0.2s ease",
                      transform: isAttendanceOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                    aria-label="Toggle Attendance submenu"
                  >
                    <ChevronDown size={15} className="sidebar-link-icon" />
                  </button>
                </div>

                <MotionAccordion isOpen={isAttendanceOpen}>
                  <ul className="sidebar-dropdown-list">
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/attendance/daily"
                        className={`sidebar-dropdown-link ${location.pathname === "/attendance/daily" || location.pathname === "/attendance" ? "active" : ""}`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <Clock size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Daily Attendance</span>
                        </div>
                        {(location.pathname === "/attendance/daily" || location.pathname === "/attendance") && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/attendance/permissions"
                        className={`sidebar-dropdown-link ${location.pathname === "/attendance/permissions" ? "active" : ""}`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <CheckCircle2 size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Permissions</span>
                        </div>
                        {location.pathname === "/attendance/permissions" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/attendance/reports"
                        className={`sidebar-dropdown-link ${location.pathname === "/attendance/reports" ? "active" : ""}`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <BarChart2 size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Reports</span>
                        </div>
                        {location.pathname === "/attendance/reports" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                  </ul>
                </MotionAccordion>
              </li>

              {/* Salary & Payroll with Submenu */}
              <li className="sidebar-nav-item">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleSalaryClick}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSalaryClick();
                    }
                  }}
                  className={`sidebar-link ${isSalaryRoute ? "active-link" : ""}`}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    ...(isSalaryRoute
                      ? {
                        backgroundColor: "rgba(22, 163, 74, 0.15)",
                        borderLeft: "3px solid #16a34a",
                        color: "#ffffff",
                      }
                      : {}),
                  }}
                >
                  <div className="sidebar-link-content">
                    <Banknote
                      size={18}
                      className="sidebar-link-icon"
                      style={isSalaryRoute ? { color: "#16a34a" } : {}}
                    />
                    <span>Salary & Payroll</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSalaryToggleClick}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "4px",
                      cursor: "pointer",
                      color: isSalaryRoute ? "#16a34a" : "rgba(255, 255, 255, 0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "transform 0.2s ease",
                      transform: isSalaryOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                    aria-label="Toggle Salary submenu"
                  >
                    <ChevronDown size={15} className="sidebar-link-icon" />
                  </button>
                </div>

                <MotionAccordion isOpen={isSalaryOpen}>
                  <ul className="sidebar-dropdown-list">
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/salary/loans-adjustments"
                        className={`sidebar-dropdown-link ${
                          location.pathname === "/salary/loans-adjustments" ? "active" : ""
                        }`}
                      >
                        <div className="sidebar-dropdown-link-content">
                          <span className="sidebar-dropdown-text">Loans & Adjustments</span>
                        </div>
                        {location.pathname === "/salary/loans-adjustments" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/salary/processing"
                        className={`sidebar-dropdown-link ${
                          location.pathname === "/salary/processing" || location.pathname === "/salary" ? "active" : ""
                        }`}
                      >
                        <div className="sidebar-dropdown-link-content">
                          <span className="sidebar-dropdown-text">Payroll Processing</span>
                        </div>
                        {(location.pathname === "/salary/processing" || location.pathname === "/salary") && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/salary/records"
                        className={`sidebar-dropdown-link ${
                          location.pathname === "/salary/records" ? "active" : ""
                        }`}
                      >
                        <div className="sidebar-dropdown-link-content">
                          <span className="sidebar-dropdown-text">Salary Records</span>
                        </div>
                        {location.pathname === "/salary/records" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                  </ul>
                </MotionAccordion>
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

              {/* JobFlow - Invoice Generation (Direct navigation without ledger submenu) */}
              <li className="sidebar-nav-item">
                <NavLink
                  to="/jobflow/invoice"
                  className={({ isActive }) =>
                    `sidebar-link ${
                      isActive || isInvoiceRoute
                        ? "active-link"
                        : ""
                    }`
                  }
                  style={
                    isInvoiceRoute
                      ? {
                        backgroundColor: "rgba(22, 163, 74, 0.15)",
                        borderLeft: "3px solid #16a34a",
                        color: "#ffffff",
                      }
                      : {}
                  }
                >
                  <div className="sidebar-link-content">
                    <Receipt
                      size={18}
                      className="sidebar-link-icon"
                      style={isInvoiceRoute ? { color: "#16a34a" } : {}}
                    />
                    <span>Invoice</span>
                  </div>
                  {isInvoiceRoute && (
                    <ChevronRight size={15} className="sidebar-active-arrow" />
                  )}
                </NavLink>
              </li>
            </>
          )}

          {/* JobFlow - Design Workflow with Submenu (Shown ONLY for Managers) */}
          {!isDesigner && (
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
                  <li className="sidebar-dropdown-item">
                    <Link
                      to="/jobflow/design?view=queue"
                      className={`sidebar-dropdown-link ${currentDesignTab === "queue" ? "active" : ""}`}
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
                  <li className="sidebar-dropdown-item">
                    <Link
                      to="/jobflow/designer-jobs"
                      className={`sidebar-dropdown-link ${currentDesignTab === "designer-jobs" ? "active" : ""}`}
                    >
                      <div className="sidebar-dropdown-link-left">
                        <FolderOpen size={13} className="sidebar-dropdown-icon" />
                        <span className="sidebar-dropdown-text">Designer Job Orders</span>
                      </div>
                      {currentDesignTab === "designer-jobs" && (
                        <span className="sidebar-dropdown-active-dot" />
                      )}
                    </Link>
                  </li>
                </ul>
              </MotionAccordion>
            </li>
          )}

          {/* Flat Designer Sidebar Navigation (No parent-child nesting) */}
          {isDesigner && (
            <>
              {/* 1. Designer My Jobs */}
              <li className="sidebar-nav-item">
                <NavLink
                  to="/jobflow/design?view=my-jobs"
                  className={`sidebar-link ${
                    isDesignRoute && (currentDesignTab === "my-jobs" || !currentDesignTab)
                      ? "active-link"
                      : ""
                  }`}
                >
                  <div className="sidebar-link-content">
                    <UserCheck size={18} className="sidebar-link-icon" />
                    <span>Designer My Jobs</span>
                  </div>
                  {isDesignRoute && (currentDesignTab === "my-jobs" || !currentDesignTab) && (
                    <ChevronRight size={15} className="sidebar-active-arrow" />
                  )}
                </NavLink>
              </li>

              {/* 4. Designer Job Orders */}
              <li className="sidebar-nav-item">
                <NavLink
                  to="/jobflow/designer-jobs"
                  className={`sidebar-link ${
                    isActiveRoute("/jobflow/designer-jobs") || isActiveRoute("/designer-jobs")
                      ? "active-link"
                      : ""
                  }`}
                >
                  <div className="sidebar-link-content">
                    <FolderOpen size={18} className="sidebar-link-icon" />
                    <span>Designer Job Orders</span>
                  </div>
                  {(isActiveRoute("/jobflow/designer-jobs") || isActiveRoute("/designer-jobs")) && (
                    <ChevronRight size={15} className="sidebar-active-arrow" />
                  )}
                </NavLink>
              </li>
            </>
          )}

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
                    {/* 1. Production Orders */}
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/production/orders"
                        className={`sidebar-dropdown-link ${currentProductionTab === "orders" ? "active" : ""}`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <ClipboardList size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Production Orders</span>
                        </div>
                        {currentProductionTab === "orders" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>

                    {/* 2. Operation Queue */}
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/production/queue"
                        className={`sidebar-dropdown-link ${currentProductionTab === "queue" ? "active" : ""}`}
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

                    {/* 3. Rework & Reprint */}
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/production/rework"
                        className={`sidebar-dropdown-link ${
                          currentProductionTab === "rework" || currentProductionTab === "reprints" ? "active" : ""
                        }`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <RotateCcw size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Rework & Reprint</span>
                        </div>
                        {(currentProductionTab === "rework" || currentProductionTab === "reprints") && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>

                    {/* 4. Production Reports */}
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/production/reports"
                        className={`sidebar-dropdown-link ${currentProductionTab === "reports" ? "active" : ""}`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <BarChart2 size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">Production Reports</span>
                        </div>
                        {currentProductionTab === "reports" && (
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
                    {/* 1. QC Inspection Queue */}
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/qc?tab=overview"
                        className={`sidebar-dropdown-link ${currentQcTab !== "history" ? "active" : ""}`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <FileCheck size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">QC Inspection Queue</span>
                        </div>
                        {currentQcTab !== "history" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>

                    {/* 2. QC History & Reports */}
                    <li className="sidebar-dropdown-item">
                      <Link
                        to="/jobflow/qc?tab=history"
                        className={`sidebar-dropdown-link ${currentQcTab === "history" ? "active" : ""}`}
                      >
                        <div className="sidebar-dropdown-link-left">
                          <Clock size={13} className="sidebar-dropdown-icon" />
                          <span className="sidebar-dropdown-text">QC History & Reports</span>
                        </div>
                        {currentQcTab === "history" && (
                          <span className="sidebar-dropdown-active-dot" />
                        )}
                      </Link>
                    </li>
                  </ul>
                </MotionAccordion>
              </li>

              {/* JobFlow - Delivery (one page, with Self Pickup and Dispatch tabs) */}
              <li className="sidebar-nav-item">
                <NavLink to="/jobflow/delivery" className={`sidebar-link ${isDeliveryRoute ? "active-link" : ""}`}>
                  <div className="sidebar-link-content">
                    <Truck size={18} className="sidebar-link-icon" />
                    <span>Delivery</span>
                  </div>
                  {isDeliveryRoute && <ChevronRight size={16} className="sidebar-active-arrow" />}
                </NavLink>
              </li>

              {/* Delete Requests: managers ask, admins approve */}
              <li className="sidebar-nav-item">
                <NavLink to="/delete-requests" className={`sidebar-link ${isActiveRoute("/delete-requests") ? "active-link" : ""}`}>
                  <div className="sidebar-link-content">
                    <Trash2 size={18} className="sidebar-link-icon" />
                    <span>Delete Requests</span>
                  </div>
                  {isActiveRoute("/delete-requests") && <ChevronRight size={15} className="sidebar-active-arrow" />}
                </NavLink>
              </li>

            </>
          )}
        </ul>
        )}



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

          <EndDayButton />

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
          <FitTablePage routeKey={`${location.pathname}${location.search}`} />
          <PageTransition routeKey={`${location.pathname}${location.search}`}>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
};

export default ManagerLayout;
