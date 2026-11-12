import React from "react";
import {
  FileText,
  CheckCircle2,
  Users,
  Wallet,
  Clock,
  ArrowUp,
  ArrowDown,
  Package,
  AlertTriangle,
  XCircle,
  Layers,
  Boxes,
  TrendingUp,
  CreditCard,
  Coins,
  Palette,
  Star,
  UserCheck,
  Briefcase,
  RefreshCw,
  IndianRupee,
  Printer,
  Building2,
} from "lucide-react";
import "../styles/dashboard.css";

// Rupee currency formatter matching reference UI (e.g. ₹ 12,45,230)
const formatINR = (val) => {
  if (val === undefined || val === null) return "₹ 0";
  return (
    "₹ " +
    Number(val).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })
  );
};

const KpiCardsRow = ({ kpis = {}, dataType = "overview", isAdmin = false, selectedBranch = "ALL" }) => {
  const dt = String(dataType || "overview").toLowerCase().replace(/\s+/g, "");

  // Generate cards based on selected data type
  const getCards = () => {
    // 1. STOCKS
    if (dt === "stocks") {
      return [
        {
          id: "stock-val",
          title: "Total Stock Value",
          value: formatINR(kpis.totalStockValue?.value ?? 0),
          trend: kpis.totalStockValue?.trend || "",
          trendType: "up",
          colorClass: "green",
          icon: <IndianRupee size={20} strokeWidth={2.4} color="#ffffff" />,
        },
        {
          id: "stock-avail",
          title: "Available Items",
          value: (kpis.availableItems?.value ?? 0) + " units",
          trend: kpis.availableItems?.trend || "",
          trendType: "up",
          colorClass: "blue",
          icon: <Package size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "stock-low",
          title: "Low Stock Items",
          value: (kpis.lowStockItems?.value ?? 0) + " items",
          trend: kpis.lowStockItems?.trend || "",
          trendType: "down",
          colorClass: "orange",
          icon: <AlertTriangle size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "stock-out",
          title: "Out of Stock Items",
          value: (kpis.outOfStockItems?.value ?? 0) + " items",
          trend: kpis.outOfStockItems?.trend || "Action Required",
          trendType: "down",
          colorClass: "rose",
          icon: <XCircle size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "stock-reserved",
          title: "Reserved in Production",
          value: (kpis.reservedStock?.value ?? 0) + " units",
          trend: kpis.reservedStock?.trend || "Allocated",
          trendType: "neutral",
          colorClass: "purple",
          icon: <Layers size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "stock-turn",
          title: "Total Categories",
          value: (kpis.totalCategories?.value ?? 0) + " categories",
          trend: kpis.totalCategories?.trend || "Active Catalogs",
          trendType: "up",
          colorClass: "teal",
          icon: <Boxes size={20} strokeWidth={2.3} color="#ffffff" />,
        },
      ];
    }

    // 2. REVENUE
    if (dt === "revenue") {
      return [
        {
          id: "revenue",
          title: "Total Revenue",
          value: formatINR(kpis.totalRevenue?.value ?? 0),
          trend: kpis.totalRevenue?.trend || "",
          trendType: "up",
          colorClass: "green",
          icon: <IndianRupee size={20} strokeWidth={2.4} color="#ffffff" />,
        },
        {
          id: "collected",
          title: "Amount Collected",
          value: formatINR(kpis.amountCollected?.value ?? 0),
          trend: kpis.amountCollected?.trend || "",
          trendType: "up",
          colorClass: "blue",
          icon: <Wallet size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "pending",
          title: "Pending Amount",
          value: formatINR(kpis.pendingAmount?.value ?? 0),
          trend: kpis.pendingAmount?.trend || "",
          trendType: "down",
          colorClass: "orange",
          icon: <Clock size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "cash-sales",
          title: "Cash Collections",
          value: formatINR(kpis.cashCollections?.value ?? 0),
          trend: kpis.cashCollections?.trend || "",
          trendType: "up",
          colorClass: "purple",
          icon: <Coins size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "upi-sales",
          title: "UPI / Online Sales",
          value: formatINR(kpis.upiSales?.value ?? 0),
          trend: kpis.upiSales?.trend || "",
          trendType: "up",
          colorClass: "teal",
          icon: <CreditCard size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "aov",
          title: "Avg Order Value",
          value: formatINR(kpis.avgOrderValue?.value ?? 0),
          trend: kpis.avgOrderValue?.trend || "",
          trendType: "up",
          colorClass: "pink",
          icon: <TrendingUp size={20} strokeWidth={2.3} color="#ffffff" />,
        },
      ];
    }

    // 3. EMPLOYEES
    if (dt === "employees") {
      return [
        {
          id: "emp-total",
          title: "Total Employees",
          value: (kpis.totalEmployees?.value ?? 0) + " staff",
          trend: kpis.totalEmployees?.trend || "",
          trendType: "neutral",
          colorClass: "green",
          icon: <Users size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "emp-duty",
          title: "On Duty Today",
          value: (kpis.onDuty?.value ?? 0) + " active",
          trend: kpis.onDuty?.trend || "93% attendance",
          trendType: "up",
          colorClass: "blue",
          icon: <UserCheck size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "emp-leave",
          title: "On Leave Today",
          value: (kpis.onLeave?.value ?? 0) + " staff",
          trend: kpis.onLeave?.trend || "Approved leave",
          trendType: "neutral",
          colorClass: "orange",
          icon: <Clock size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "emp-prod",
          title: "Production Team",
          value: (kpis.productionTeam?.value ?? 0) + " operators",
          trend: kpis.productionTeam?.trend || "57% workforce",
          trendType: "neutral",
          colorClass: "purple",
          icon: <Briefcase size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "emp-des",
          title: "Design Team",
          value: (kpis.designTeam?.value ?? 0) + " designers",
          trend: kpis.designTeam?.trend || "21% workforce",
          trendType: "neutral",
          colorClass: "pink",
          icon: <Palette size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "emp-ops",
          title: "Operations & Sales",
          value: (kpis.opsTeam?.value ?? 0) + " members",
          trend: kpis.opsTeam?.trend || "22% workforce",
          trendType: "neutral",
          colorClass: "teal",
          icon: <UserCheck size={20} strokeWidth={2.3} color="#ffffff" />,
        },
      ];
    }

    // 4. DESIGNERS
    if (dt === "designers") {
      return [
        {
          id: "des-assigned",
          title: "Assigned Designs",
          value: (kpis.assignedDesigns?.value ?? 0) + " tasks",
          trend: kpis.assignedDesigns?.trend || "",
          trendType: "up",
          colorClass: "purple",
          icon: <Palette size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "des-approved",
          title: "Approved Designs",
          value: (kpis.approvedDesigns?.value ?? 0) + " ready",
          trend: kpis.approvedDesigns?.trend || "",
          trendType: "up",
          colorClass: "green",
          icon: <CheckCircle2 size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "des-rev",
          title: "Revisions Required",
          value: (kpis.revisions?.value ?? 0) + " active",
          trend: kpis.revisions?.trend || "Customer Feedback",
          trendType: "down",
          colorClass: "orange",
          icon: <AlertTriangle size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "des-rej",
          title: "Rejected Samples",
          value: (kpis.rejected?.value ?? 0) + " rejected",
          trend: kpis.rejected?.trend || "In Redesign",
          trendType: "down",
          colorClass: "rose",
          icon: <XCircle size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "des-sla",
          title: "Average SLA",
          value: "2.4 hours",
          trend: "100% on schedule",
          trendType: "up",
          colorClass: "blue",
          icon: <Clock size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "des-rating",
          title: "Designer Rating",
          value: "4.9 / 5",
          trend: "Top Performer",
          trendType: "up",
          colorClass: "teal",
          icon: <Star size={20} strokeWidth={2.3} color="#ffffff" fill="#ffffff" />,
        },
      ];
    }

    // 5. PRODUCTION
    if (dt === "production") {
      return [
        {
          id: "prod-active",
          title: "In Production",
          value: (kpis.inProduction?.value ?? 0) + " jobs",
          trend: kpis.inProduction?.trend || "Active Station",
          trendType: "up",
          colorClass: "green",
          icon: <Layers size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "prod-completed",
          title: "Completed Today",
          value: (kpis.completedToday?.value ?? 0) + " jobs",
          trend: kpis.completedToday?.trend || "",
          trendType: "up",
          colorClass: "blue",
          icon: <CheckCircle2 size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "prod-qc",
          title: "QC Inspection",
          value: (kpis.qcPending?.value ?? 0) + " pending",
          trend: kpis.qcPending?.trend || "Under Review",
          trendType: "neutral",
          colorClass: "orange",
          icon: <Clock size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "prod-rework",
          title: "Rework Queue",
          value: (kpis.rework?.value ?? 0) + " jobs",
          trend: kpis.rework?.trend || "Priority Rework",
          trendType: "down",
          colorClass: "rose",
          icon: <AlertTriangle size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "prod-delivery",
          title: "Ready for Delivery",
          value: (kpis.readyForDelivery?.value ?? 0) + " ready",
          trend: kpis.readyForDelivery?.trend || "Packaged",
          trendType: "up",
          colorClass: "teal",
          icon: <Package size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "prod-efficiency",
          title: "Station Efficiency",
          value: "92%",
          trend: "",
          trendType: "up",
          colorClass: "purple",
          icon: <TrendingUp size={20} strokeWidth={2.3} color="#ffffff" />,
        },
      ];
    }

    // 6. JOB ORDERS
    if (dt === "joborders" || dt === "job_orders") {
      return [
        {
          id: "jobs-total",
          title: "Total Job Orders",
          value: (kpis.totalJobOrders?.value ?? 0) + " orders",
          trend: kpis.totalJobOrders?.trend || "",
          trendType: "up",
          colorClass: "blue",
          icon: <FileText size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "jobs-new",
          title: "New Enquiries",
          value: (kpis.newEnquiries?.value ?? 0) + " new",
          trend: kpis.newEnquiries?.trend || "Awaiting quote",
          trendType: "up",
          colorClass: "purple",
          icon: <Clock size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "jobs-design",
          title: "In Design Stage",
          value: (kpis.inDesign?.value ?? 0) + " jobs",
          trend: kpis.inDesign?.trend || "Active Studio",
          trendType: "neutral",
          colorClass: "pink",
          icon: <Palette size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "jobs-prod",
          title: "In Production",
          value: (kpis.inProduction?.value ?? 0) + " jobs",
          trend: kpis.inProduction?.trend || "Printing / Cutting",
          trendType: "neutral",
          colorClass: "orange",
          icon: <Layers size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "jobs-pickup",
          title: "Ready for Pickup",
          value: (kpis.readyPickup?.value ?? 0) + " orders",
          trend: kpis.readyPickup?.trend || "Ready",
          trendType: "up",
          colorClass: "teal",
          icon: <Package size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "jobs-closed",
          title: "Completed & Closed",
          value: (kpis.completedJobs?.value ?? 0) + " orders",
          trend: kpis.completedJobs?.trend || "",
          trendType: "up",
          colorClass: "green",
          icon: <CheckCircle2 size={20} strokeWidth={2.3} color="#ffffff" />,
        },
      ];
    }

    // ADMIN OVERVIEW: 7 Cards matching annotated Admin Dashboard mockup
    if (isAdmin) {
      const isAll = !selectedBranch || String(selectedBranch).toUpperCase() === "ALL";

      if (isAll) {
        return [
          {
            id: "branches",
            title: "Total Branches",
            value: kpis.totalBranches?.value ?? 0,
            trend: kpis.totalBranches?.subtitle || "",
            trendType: "neutral",
            colorClass: "green",
            icon: <Building2 size={20} strokeWidth={2.4} color="#ffffff" />,
          },
          {
            id: "managers",
            title: "Branch Managers",
            value: kpis.totalManagers?.value ?? 0,
            trend: "Assigned",
            trendType: "neutral",
            colorClass: "blue",
            icon: <Users size={20} strokeWidth={2.3} color="#ffffff" />,
          },
          {
            id: "employees",
            title: "Total Employees",
            value: kpis.totalEmployees?.value ?? 0,
            trend: kpis.totalEmployees?.trend || "",
            trendType: "up",
            colorClass: "orange",
            icon: <Users size={20} strokeWidth={2.3} color="#ffffff" />,
          },
          {
            id: "designers",
            title: "Total Designers",
            value: kpis.totalDesigners?.value ?? 0,
            trend: kpis.totalDesigners?.trend || "",
            trendType: "up",
            colorClass: "purple",
            icon: <Palette size={20} strokeWidth={2.3} color="#ffffff" />,
          },
          {
            id: "revenue",
            title: "Total Revenue",
            value: formatINR(kpis.totalRevenue?.value ?? 0),
            trend: kpis.totalRevenue?.trend || "",
            trendType: "up",
            colorClass: "green",
            icon: <IndianRupee size={20} strokeWidth={2.4} color="#ffffff" />,
          },
          {
            id: "collected",
            title: "Amount Collected",
            value: formatINR(kpis.amountCollected?.value ?? 0),
            trend: kpis.amountCollected?.trend || "",
            trendType: "up",
            colorClass: "blue",
            icon: <Wallet size={20} strokeWidth={2.3} color="#ffffff" />,
          },
          {
            id: "pending",
            title: "Pending Amount",
            value: formatINR(kpis.pendingAmount?.value ?? 0),
            trend: kpis.pendingAmount?.trend || "",
            trendType: "down",
            colorClass: "rose",
            icon: <Clock size={20} strokeWidth={2.3} color="#ffffff" />,
          },
        ];
      }

      // Branch-Specific Admin Overview
      return [
        {
          id: "orders",
          title: "Total Job Orders",
          value: kpis.totalJobOrders?.value ?? 0,
          trend: kpis.totalJobOrders?.trend || "",
          trendType: "up",
          colorClass: "purple",
          icon: <FileText size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "completed",
          title: "Completed Jobs",
          value: kpis.completedJobs?.value ?? 0,
          trend: kpis.completedJobs?.trend || "",
          trendType: "up",
          colorClass: "green",
          icon: <CheckCircle2 size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "employees",
          title: "Branch Employees",
          value: kpis.totalEmployees?.value ?? 0,
          trend: "On Duty Staff",
          trendType: "neutral",
          colorClass: "orange",
          icon: <Users size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "designers",
          title: "Branch Designers",
          value: kpis.totalDesigners?.value ?? 0,
          trend: "Assigned",
          trendType: "neutral",
          colorClass: "pink",
          icon: <Palette size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "revenue",
          title: "Branch Revenue",
          value: formatINR(kpis.totalRevenue?.value ?? 0),
          trend: kpis.totalRevenue?.trend || "",
          trendType: "up",
          colorClass: "green",
          icon: <IndianRupee size={20} strokeWidth={2.4} color="#ffffff" />,
        },
        {
          id: "collected",
          title: "Amount Collected",
          value: formatINR(kpis.amountCollected?.value ?? 0),
          trend: kpis.amountCollected?.trend || "",
          trendType: "up",
          colorClass: "blue",
          icon: <Wallet size={20} strokeWidth={2.3} color="#ffffff" />,
        },
        {
          id: "pending",
          title: "Pending Amount",
          value: formatINR(kpis.pendingAmount?.value ?? 0),
          trend: kpis.pendingAmount?.trend || "",
          trendType: "down",
          colorClass: "rose",
          icon: <Clock size={20} strokeWidth={2.3} color="#ffffff" />,
        },
      ];
    }

    // DEFAULT: MANAGER OVERVIEW (Reference UI Layout - 6 Cards)
    return [
      {
        id: "revenue",
        title: "Total Revenue",
        value: formatINR(kpis.totalRevenue?.value ?? 0),
        trend: kpis.totalRevenue?.trend || "",
        trendType: "up",
        colorClass: "green",
        icon: <IndianRupee size={20} strokeWidth={2.4} color="#ffffff" />,
      },
      {
        id: "collected",
        title: "Amount Collected",
        value: formatINR(kpis.amountCollected?.value ?? 0),
        trend: kpis.amountCollected?.trend || "",
        trendType: "up",
        colorClass: "blue",
        icon: <Wallet size={20} strokeWidth={2.3} color="#ffffff" />,
      },
      {
        id: "pending",
        title: "Pending Amount",
        value: formatINR(kpis.pendingAmount?.value ?? 0),
        trend: kpis.pendingAmount?.trend || "",
        trendType: "down",
        colorClass: "orange",
        icon: <Clock size={20} strokeWidth={2.3} color="#ffffff" />,
      },
      {
        id: "jobs",
        title: "Total Job Orders",
        value: kpis.totalJobOrders?.value ?? 0,
        trend: kpis.totalJobOrders?.trend || "",
        trendType: "up",
        colorClass: "purple",
        icon: <FileText size={20} strokeWidth={2.3} color="#ffffff" />,
      },
      {
        id: "completed",
        title: "Completed Jobs",
        value: kpis.completedJobs?.value ?? 0,
        trend: kpis.completedJobs?.trend || "",
        trendType: "up",
        colorClass: "green",
        icon: <CheckCircle2 size={20} strokeWidth={2.3} color="#ffffff" />,
      },
      {
        id: "employees",
        title: "Total Employees",
        value: kpis.totalEmployees?.value ?? 0,
        trend: kpis.totalEmployees?.trend || "",
        trendType: "neutral",
        colorClass: "teal",
        icon: <Users size={20} strokeWidth={2.3} color="#ffffff" />,
      },
    ];
  };

  const cards = getCards();

  return (
    <div className={`printz-kpi-grid ${cards.length >= 7 ? "admin-overview" : ""}`}>
      {cards.map((card) => (
        <div key={card.id} className="printz-kpi-card">
          {/* Top row: Icon and Value */}
          <div className="printz-kpi-top">
            <div className={`printz-summary-icon ${card.colorClass}`}>
              {card.icon}
            </div>
            <div className="printz-kpi-values">
              <div className="printz-kpi-number">{card.value}</div>
              <div className="printz-kpi-label">{card.title}</div>
            </div>
          </div>

          {/* Bottom row: Trend indicator matching reference */}
          <div className="printz-kpi-bottom">
            {card.trend && card.trendType === "up" && (
              <span className="printz-kpi-trend-up">
                <ArrowUp size={12} strokeWidth={2.8} />
                {card.trend}
              </span>
            )}
            {card.trend && card.trendType === "down" && (
              <span className="printz-kpi-trend-down">
                <ArrowDown size={12} strokeWidth={2.8} />
                {card.trend}
              </span>
            )}
            {card.trend && card.trendType === "neutral" && (
              <span className="printz-kpi-trend-neutral">
                <span style={{ display: "inline-block", width: "4px", height: "4px", borderRadius: "50%", background: "#64748b", marginRight: "4px" }} />
                {card.trend}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KpiCardsRow;
