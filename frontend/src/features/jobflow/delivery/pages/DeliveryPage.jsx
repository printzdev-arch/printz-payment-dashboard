import React, { useState, useEffect } from "react";
import {
  Truck,
  CreditCard,
  PackageCheck,
  Send,
  CheckCircle,
  MapPin,
  Phone,
  ShieldCheck,
  Search,
  Eye,
  RefreshCw,
  ArrowRight,
  X,
  Package,
  UserCheck,
  Wallet,
  Receipt,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Lock,
  Star,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import StatusBadge from "../../shared/components/StatusBadge";
import JobFlowDataTable from "../../shared/components/JobFlowDataTable";
import deliveryApi from "../api/deliveryApi";
import settlementApi from "../../settlement/api/settlementApi";
import "../styles/delivery.css";

// Phase 1 Modals
import CreateDeliveryOrderModal from "../components/CreateDeliveryOrderModal";
import AssignDeliveryModal from "../components/AssignDeliveryModal";
import PackDeliveryModal from "../components/PackDeliveryModal";
import HandoverProofModal from "../components/HandoverProofModal";
import ViewDeliveryProofModal from "../components/ViewDeliveryProofModal";

// Phase 3 Settlement & Closure Modals
import CashierSettlementModal from "../../settlement/components/CashierSettlementModal";
import JobClosureModal from "../../settlement/components/JobClosureModal";
import CustomerFeedbackModal from "../../settlement/components/CustomerFeedbackModal";

const TABS = [
  { key: "REVIEW", label: "PENDING REVIEW", icon: ShieldCheck },
  { key: "ASSIGNED", label: "ASSIGNED", icon: Send },
  { key: "OUT_FOR_DELIVERY", label: "OUT FOR DELIVERY", icon: Truck },
  { key: "DELIVERED", label: "DELIVERED & PAID", icon: CheckCircle },
  { key: "CLOSURE", label: "JOB CLOSURE", icon: Lock },
];

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "?";

const Avatar = ({ name }) => (
  <span className="dlv-avatar" aria-hidden="true">
    {getInitials(name)}
  </span>
);

export const DeliveryPage = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");
  const tabParam = searchParams.get("tab");

  // Tab State: "REVIEW" | "ASSIGNED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CLOSURE"
  const [activeTab, setActiveTab] = useState(() => {
    if (tabParam) {
      const up = tabParam.toUpperCase();
      if (up === "PACKED") return "ASSIGNED";
      if (["REVIEW", "PENDING_REVIEW"].includes(up)) return "REVIEW";
      if (["CLOSURE", "JOB_CLOSURE", "CLOSURE_QUEUE"].includes(up)) return "CLOSURE";
      if (["ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(up)) return up;
    }
    const saved = sessionStorage.getItem("delivery_active_tab");
    if (saved && ["REVIEW", "ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED", "CLOSURE"].includes(saved)) {
      return saved;
    }
    return "REVIEW";
  });

  useEffect(() => {
    if (tabParam) {
      const upper = tabParam.toUpperCase();
      let targetTab = null;
      if (upper === "PACKED") targetTab = "ASSIGNED";
      else if (["REVIEW", "PENDING_REVIEW"].includes(upper)) targetTab = "REVIEW";
      else if (["CLOSURE", "JOB_CLOSURE", "CLOSURE_QUEUE"].includes(upper)) targetTab = "CLOSURE";
      else if (["ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(upper)) targetTab = upper;

      if (targetTab && targetTab !== activeTab) {
        setActiveTab(targetTab);
        try {
          sessionStorage.setItem("delivery_active_tab", targetTab);
        } catch {}
      }
    }
  }, [tabParam]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    try {
      sessionStorage.setItem("delivery_active_tab", newTab);
    } catch {}
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", newTab);
        return next;
      },
      { replace: true }
    );
  };

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Data collections
  const [readyJobs, setReadyJobs] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [allJobOrders, setAllJobOrders] = useState([]);

  // Modal controls
  const [selectedJobForDO, setSelectedJobForDO] = useState(null);
  const [selectedDOForAssign, setSelectedDOForAssign] = useState(null);
  const [selectedDOForPack, setSelectedDOForPack] = useState(null);
  const [selectedDOForHandover, setSelectedDOForHandover] = useState(null);
  const [selectedDOForProofView, setSelectedDOForProofView] = useState(null);

  // Settlement & Closure controls
  const [selectedInvoiceForCashier, setSelectedInvoiceForCashier] = useState(null);
  const [selectedJobForClosure, setSelectedJobForClosure] = useState(null);
  const [selectedJobForFeedback, setSelectedJobForFeedback] = useState(null);

  useEffect(() => {
    loadAllData();
    if (searchParams.get("jobId")) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("jobId");
          return next;
        },
        { replace: true }
      );
    }
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch ready jobs for review, delivery orders, and all recent job orders
      const [resReadyJobs, resOrders, resAllJobs] = await Promise.all([
        deliveryApi.getReadyJobsForDelivery().catch(() => null),
        deliveryApi.getDeliveryOrders({ limit: 100 }).catch(() => null),
        deliveryApi.getJobOrders({ limit: 100 }).catch(() => null),
      ]);

      // Collect ready jobs from endpoint
      let readyItems = resReadyJobs?.data?.items || resReadyJobs?.data || (Array.isArray(resReadyJobs) ? resReadyJobs : []);

      // Complement with recent job orders that are approved / QC passed / ready for delivery
      const rawAllJobs = resAllJobs?.data?.items || resAllJobs?.data || (Array.isArray(resAllJobs) ? resAllJobs : []);
      const readyJobIds = new Set(readyItems.map((j) => String(j._id || j.id || j.jobNo || "")));

      if (Array.isArray(rawAllJobs)) {
        rawAllJobs.forEach((job) => {
          const jId = String(job._id || job.id || "");
          const jNo = String(job.jobNo || job.orderNumber || "");
          if (readyJobIds.has(jId) || readyJobIds.has(jNo)) return;

          const stageUpper = String(job.currentStage || job.stage || "").toUpperCase();
          const statusUpper = String(job.status || "").toUpperCase();
          const isEligible =
            ["READY", "READY_FOR_DELIVERY", "DELIVERY", "QC_PASSED", "QC", "APPROVED"].includes(stageUpper) ||
            ["READY", "READY_FOR_DELIVERY", "QC_PASSED", "APPROVED"].includes(statusUpper) ||
            (preselectedJobId && (jId === preselectedJobId || jNo === preselectedJobId));

          if (isEligible && statusUpper !== "CANCELLED" && statusUpper !== "DELIVERED") {
            readyJobIds.add(jId);
            readyJobIds.add(jNo);
            readyItems.push(job);
          }
        });
      }

      // Map delivery orders
      const orderItems = resOrders?.data?.items || resOrders?.data || (Array.isArray(resOrders) ? resOrders : []);
      const formattedDOs = (Array.isArray(orderItems) ? orderItems : []).map((d) => {
        const jObj = d.jobOrderId && typeof d.jobOrderId === "object" ? d.jobOrderId : null;
        const total = Number(d.grandTotal || jObj?.grandTotal || jObj?.totalAmount || 0);
        const adv = Number(d.advancePaid || jObj?.advancePaid || 0);
        const isPaid = d.paymentStatus === "PAID" || jObj?.paymentStatus === "PAID" || (d.balanceDue !== undefined && Number(d.balanceDue) <= 0);
        const balance = isPaid ? 0 : (typeof d.balanceDue !== "undefined" ? Number(d.balanceDue) : Math.max(0, total - adv));

        return {
          _id: d._id || d.id,
          deliveryNo: d.deliveryNo || `DO-${String(d._id || "").slice(-6)}`,
          jobOrderId: jObj?._id || d.jobOrderId,
          jobNo: jObj?.jobNo || d.jobNo || "JO-CURRENT",
          customerName: d.customerName || jObj?.customerName || "Customer",
          customerPhone: d.customerPhone || jObj?.customerPhone || "N/A",
          deliveryAddress: d.deliveryAddress || jObj?.customerSnapshot?.address || "Counter Pickup",
          deliveryType: d.deliveryType || "DELIVERY",
          deliveryPersonName: d.deliveryPersonName || d.driverName || "Unassigned",
          deliveryPersonPhone: d.deliveryPersonPhone || d.driverPhone || "",
          vehicle: d.vehicle || d.vehicleNumber || "",
          expectedDeliveryDate: d.expectedDeliveryDate,
          status: d.status || "READY",
          grandTotal: total,
          advancePaid: adv,
          balanceDue: balance,
          paymentStatus: isPaid ? "PAID" : (d.paymentStatus || (balance === 0 ? "PAID" : "UNPAID")),
          otpVerified: Boolean(d.otpVerified),
          proofSubmitted: Boolean(d.proofSubmitted || d.signatureUrl),
          raw: d,
        };
      });
      setDeliveryOrders(formattedDOs);

      // Map ready jobs and link delivery order if already created in DB
      const formattedReady = (Array.isArray(readyItems) ? readyItems : []).map((j) => {
        const jId = String(j._id || j.id || "");
        const matchedDO = j.deliveryOrder || formattedDOs.find((d) => String(d.jobOrderId) === jId || (d.jobNo && d.jobNo === j.jobNo));
        const inv = j.invoice || j.existingInvoice || null;
        const jobTotal = Number(
          inv?.grandTotal ||
          j.grandTotal ||
          (j.discountTotal ? (Number(j.estimatedPrice || 0) - Number(j.discountTotal || 0)) : 0) ||
          j.totalAmount ||
          j.estimatedPrice ||
          0
        );
        const isJobPaid =
          j.paymentStatus === "PAID" ||
          j.status === "COMPLETED" ||
          inv?.status === "PAID" ||
          inv?.paymentStatus === "PAID" ||
          (j.balanceDue !== undefined && Number(j.balanceDue) <= 0);
        const resolvedBal = isJobPaid
          ? 0
          : (inv && inv.balanceDue !== undefined
              ? Number(inv.balanceDue)
              : (j.balanceDue != null
                  ? Number(j.balanceDue)
                  : Math.max(0, Math.round((jobTotal - Number(j.advancePaid || 0)) * 100) / 100)));
        const resolvedAdv = isJobPaid ? jobTotal : Number(inv?.advancePaid || inv?.advanceApplied || j.advancePaid || 0);

        return {
          _id: j._id || j.id,
          jobNo: j.jobNo || j.orderNumber || `JO-${jId.slice(-6)}`,
          customerName: j.customerName || j.customerSnapshot?.name || j.customer?.name || "Customer",
          customerPhone: j.customerPhone || j.customerSnapshot?.mobile || j.customer?.mobile || "N/A",
          deliveryAddress: j.deliveryAddress || j.customerSnapshot?.address || "Counter Pickup",
          title: j.title || j.productType || "Print Order",
          quantity: j.quantity || 500,
          grandTotal: jobTotal,
          advancePaid: resolvedAdv,
          balanceDue: resolvedBal,
          currentStage: j.currentStage || "READY_FOR_DELIVERY",
          reviewedByManager: Boolean(j.reviewedByManager || matchedDO),
          deliveryOrder: matchedDO || null,
          isDeliveryPrepared: Boolean(matchedDO || j.isDeliveryPrepared),
          raw: j,
        };
      });

      // Sort newest jobs first (today's jobs at top)
      formattedReady.sort((a, b) => {
        const timeA = new Date(a.raw?.createdAt || a.raw?.orderDate || a.raw?.updatedAt || 0).getTime();
        const timeB = new Date(b.raw?.createdAt || b.raw?.orderDate || b.raw?.updatedAt || 0).getTime();
        return timeB - timeA;
      });

      setReadyJobs(formattedReady);

      // Format all jobs for Closure queue
      const formattedClosure = (Array.isArray(rawAllJobs) ? rawAllJobs : []).map((j) => {
        const id = j._id || j.id;
        return {
          _id: id,
          jobNo: j.jobNo || j.orderNumber || `JO-${String(id || "").slice(-6)}`,
          customerName: j.customerName || j.customerSnapshot?.name || j.customer?.name || "Customer",
          customerPhone: j.customerPhone || j.customerSnapshot?.mobile || "N/A",
          title: j.title || j.productType || "Print Material",
          totalAmount: Number(j.grandTotal || j.totalAmount || j.estimatedPrice || 0),
          closureStatus: j.closureStatus || (j.status === "COMPLETED" ? "CLOSED" : "OPEN"),
          status: j.currentStage || j.stage || j.status || "DELIVERED",
          raw: j,
        };
      });
      formattedClosure.sort((a, b) => {
        const timeA = new Date(a.raw?.createdAt || a.raw?.orderDate || a.raw?.updatedAt || 0).getTime();
        const timeB = new Date(b.raw?.createdAt || b.raw?.orderDate || b.raw?.updatedAt || 0).getTime();
        return timeB - timeA;
      });
      setAllJobOrders(formattedClosure);
    } catch (err) {
      console.warn("Failed loading delivery data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Dispatch Action (Step 5)
  const handleDispatchOrder = async (deliveryOrder) => {
    try {
      setLoading(true);
      await deliveryApi.dispatchDeliveryOrder(deliveryOrder._id || deliveryOrder.id, {
        dispatchNotes: "Driver departed branch with verified parcel",
      });
      // Also generate handover OTP immediately
      try {
        await deliveryApi.generateOtp(deliveryOrder._id || deliveryOrder.id);
      } catch { }

      toast.success(`Delivery Order ${deliveryOrder.deliveryNo} is DISPATCHED & Handover OTP sent!`);
      await loadAllData();
      handleTabChange("OUT_FOR_DELIVERY");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to dispatch order");
    } finally {
      setLoading(false);
    }
  };

  // Open Settlement for a delivery order
  const handleOpenSettlement = async (d) => {
    const directInv = d.raw?.invoiceId || d.raw?.invoice?._id || d.raw?.invoice?.id;
    if (directInv) {
      setSelectedInvoiceForCashier(directInv);
      return;
    }
    // Query invoice by jobOrderId or jobNo
    try {
      const res = await settlementApi.getJobInvoice(d.jobOrderId || d._id);
      const invId = res?.data?._id || res?.data?.id;
      if (invId) {
        setSelectedInvoiceForCashier(invId);
        return;
      }
    } catch {}
    // Fallback to jobOrderId
    setSelectedInvoiceForCashier(d.jobOrderId || d._id);
  };

  // Helper: check if a DO has actually been assigned to a delivery staff member
  const isActuallyAssigned = (d) => {
    if (!d) return false;
    if (d.status === "READY" || d.status === "CANCELLED") return false;
    const staff = String(d.deliveryPersonName || "").trim();
    const hasStaff = Boolean(staff && staff !== "Unassigned" && staff !== "-" && staff !== "undefined");
    const hasEmpId = Boolean(d.assignedEmployeeId);
    return (d.status === "ASSIGNED" || d.status === "PACKED") && (hasStaff || hasEmpId);
  };

  // Counters for workflow stages
  const countReview = readyJobs.length;
  const countAssigned = deliveryOrders.filter(isActuallyAssigned).length;
  const countOutForDelivery = deliveryOrders.filter((d) => d.status === "OUT_FOR_DELIVERY").length;
  const countDelivered = deliveryOrders.filter((d) => d.status === "DELIVERED").length;
  const countClosure = allJobOrders.length;

  const tabCounts = {
    REVIEW: countReview,
    ASSIGNED: countAssigned,
    OUT_FOR_DELIVERY: countOutForDelivery,
    DELIVERED: countDelivered,
    CLOSURE: countClosure,
  };

  // Filtered lists
  const filterList = (list) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        (item.jobNo && item.jobNo.toLowerCase().includes(q)) ||
        (item.deliveryNo && item.deliveryNo.toLowerCase().includes(q)) ||
        (item.customerName && item.customerName.toLowerCase().includes(q)) ||
        (item.deliveryPersonName && item.deliveryPersonName.toLowerCase().includes(q)) ||
        (item.deliveryAddress && item.deliveryAddress.toLowerCase().includes(q)) ||
        (item.title && item.title.toLowerCase().includes(q))
    );
  };

  const getActiveList = () => {
    if (activeTab === "REVIEW") return filterList(readyJobs);
    if (activeTab === "ASSIGNED") return filterList(deliveryOrders.filter(isActuallyAssigned));
    if (activeTab === "OUT_FOR_DELIVERY") return filterList(deliveryOrders.filter((d) => d.status === "OUT_FOR_DELIVERY"));
    if (activeTab === "DELIVERED") return filterList(deliveryOrders.filter((d) => d.status === "DELIVERED" && d.balanceDue === 0));
    if (activeTab === "CLOSURE") return filterList(allJobOrders);
    return [];
  };

  const activeList = getActiveList();
  const activeTabMeta = TABS.find((t) => t.key === activeTab);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(activeList.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIdx = (safeCurrentPage - 1) * rowsPerPage;
  const pagedList = activeList.slice(startIdx, startIdx + rowsPerPage);

  const renderPagination = () => {
    if (activeList.length === 0) return null;
    return (
      <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", borderTop: "1px solid #f1f5f9" }}>
        <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
          Showing {startIdx + 1} to {Math.min(startIdx + rowsPerPage, activeList.length)} of {activeList.length} records
        </span>
        <nav style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm"
            style={{ padding: "0.25rem 0.5rem" }}
            disabled={safeCurrentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={15} />
          </button>
          <span style={{ fontSize: "0.8125rem", padding: "0 0.5rem", color: "#334155", fontWeight: 600 }}>
            Page {safeCurrentPage} of {totalPages}
          </span>
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm"
            style={{ padding: "0.25rem 0.5rem" }}
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight size={15} />
          </button>
        </nav>
      </footer>
    );
  };

  // KPI values derived from data already loaded above
  const maxStageCount = Math.max(1, ...Object.values(tabCounts));
  const pipelineValue = readyJobs.reduce((sum, j) => sum + j.grandTotal, 0);
  const balanceToCollect = readyJobs.reduce((sum, j) => sum + j.balanceDue, 0);
  const completionRate = deliveryOrders.length
    ? Math.round((countDelivered / deliveryOrders.length) * 100)
    : 0;
  const formatMoney = (n) =>
    `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <JobFlowLayout
      title={
        activeTab === "DELIVERED"
          ? "Delivered Orders & Settlement"
          : activeTab === "CLOSURE"
          ? "Job Closure & Final Verification"
          : "Delivery Dispatch Queue"
      }
      activeStep={5}
      actions={
        <button
          type="button"
          className="dlv-refresh-btn"
          onClick={loadAllData}
          disabled={loading}
          title="Refresh Delivery Queue"
        >
          <RefreshCw size={15} className={loading ? "dlv-spin" : ""} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="dlv-page delivery-feature-container">
        {/* ── Delivery Pipeline Stage Navigation ── */}
        <nav className="dlv-tabs" aria-label="Delivery workflow tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count = tabCounts[tab.key] || 0;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`dlv-tab ${isActive ? "is-active" : ""}`}
                onClick={() => handleTabChange(tab.key)}
              >
                <span className="dlv-tab-icon">
                  <Icon size={16} />
                </span>
                <span>{tab.label}</span>
                <span className="dlv-tab-count">{count}</span>
              </button>
            );
          })}
        </nav>

        {/* ── Toolbar ── */}
        <div className="dlv-toolbar">
          <div className="dlv-search">
            <Search size={16} className="dlv-search-icon" />
            <input
              type="text"
              className="dlv-search-input"
              placeholder={`Search ${activeTab.replace(/_/g, " ").toLowerCase()} by job, DO, customer or address...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="dlv-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="dlv-result-count">
            Showing <strong>{activeList.length}</strong> {activeTabMeta?.label.toLowerCase()}
          </div>
        </div>

        {/* ── TAB 1: READY FOR REVIEW ── */}
        {activeTab === "REVIEW" && (
          <section className="dlv-card">
            <header className="dlv-card-head">
              <div className="dlv-card-title">
                <span className="dlv-card-icon">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <h3>Manager Review & Delivery Order Creation</h3>

                </div>
              </div>
              <span className="dlv-pill">
                Total: <strong>{activeList.length}</strong> jobs
              </span>
            </header>

            <div className="dlv-table-wrap">
              <table className="jf-table dlv-table">
                <thead>
                  <tr>
                    <th>Job Order No</th>
                    <th>Customer Details</th>
                    <th>Print Material & Qty</th>
                    <th>Delivery Type</th>
                    <th>Total & Balance</th>
                    <th>Review Status</th>
                    <th className="dlv-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="dlv-empty">
                        <div className="dlv-empty-state">
                          <Package size={28} />
                          <span>No pending completed jobs waiting for delivery review.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedList.map((job) => (
                      <tr key={job._id}>
                        <td data-label="Job Order">
                          <div className="dlv-primary">{job.jobNo}</div>
                          <div className="dlv-sub">{job.title}</div>
                        </td>
                        <td data-label="Customer">
                          <div className="dlv-person">
                            <Avatar name={job.customerName} />
                            <div>
                              <div className="dlv-primary">{job.customerName}</div>
                              <div className="dlv-sub dlv-inline">
                                <Phone size={12} /> {job.customerPhone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Qty">
                          <span className="dlv-qty">
                            <strong>{job.quantity}</strong> pcs
                          </span>
                        </td>
                        <td data-label="Delivery">
                          <span className={`delivery-method-pill ${job.deliveryAddress === "Counter Pickup" ? "pickup" : "internal"}`}>
                            {job.deliveryAddress === "Counter Pickup" ? "Counter Pickup" : "Home Delivery"}
                          </span>
                        </td>
                        <td data-label="Total">
                          <div className="dlv-primary">₹{job.grandTotal.toFixed(2)}</div>
                          <div className={`dlv-sub ${job.balanceDue > 0 ? "dlv-due" : "dlv-paid"}`}>
                            Bal Due: ₹{job.balanceDue.toFixed(2)}
                          </div>
                        </td>
                        <td data-label="Status">
                          {job.deliveryOrder ? (
                            isActuallyAssigned(job.deliveryOrder) ? (
                              <span className="dlv-chip-success">✓ DO Created & Assigned ({job.deliveryOrder.deliveryNo})</span>
                            ) : (
                              <span style={{
                                background: "#fef3c7",
                                color: "#92400e",
                                padding: "0.25rem 0.6rem",
                                borderRadius: "9999px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem"
                              }}>
                                ⚠️ DO Created ({job.deliveryOrder.deliveryNo}) - Staff Pending
                              </span>
                            )
                          ) : (
                            <StatusBadge status="READY" domain="delivery" />
                          )}
                        </td>
                        <td className="dlv-right dlv-actions-cell">
                          {job.deliveryOrder && isActuallyAssigned(job.deliveryOrder) ? (
                            <button
                              type="button"
                              className="dlv-btn dlv-btn-ghost"
                              onClick={() => setSelectedJobForDO({ ...job, readOnly: true })}
                              title="View Delivery Order (Read Only)"
                            >
                              <Eye size={14} /> View
                            </button>
                          ) : job.deliveryOrder ? (
                            <button
                              type="button"
                              className="dlv-btn dlv-btn-primary"
                              onClick={() => setSelectedJobForDO({ ...job, readOnly: false })}
                              title="Assign Delivery Staff Member"
                            >
                              <Truck size={14} /> Assign Staff
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="dlv-btn dlv-btn-primary"
                              onClick={() => setSelectedJobForDO({ ...job, readOnly: false })}
                            >
                              Review & Create DO
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </section>
        )}

        {/* ── TAB 2: ASSIGNED STAFF (DO Status: READY / ASSIGNED) ── */}
        {activeTab === "ASSIGNED" && (
          <section className="dlv-card">
            <header className="dlv-card-head">
              <div className="dlv-card-title">
                <span className="dlv-card-icon">
                  <Send size={18} />
                </span>
                <div>
                  <h3>Assigned Delivery Orders</h3>

                </div>
              </div>
              <span className="dlv-pill">
                Total: <strong>{activeList.length}</strong> orders
              </span>
            </header>

            <div className="dlv-table-wrap">
              <table className="jf-table dlv-table">
                <thead>
                  <tr>
                    <th>DO Number</th>
                    <th>Linked Job</th>
                    <th>Recipient & Contact</th>
                    <th>Delivery Type & Address</th>
                    <th>Assigned Staff</th>
                    <th>Status</th>
                    <th className="dlv-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="dlv-empty">
                        <div className="dlv-empty-state">
                          <Package size={28} />
                          <span>No delivery orders currently in Ready / Assigned queue.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedList.map((d) => (
                      <tr key={d._id}>
                        <td data-label="DO No">
                          <div className="dlv-primary dlv-mono">{d.deliveryNo}</div>
                        </td>
                        <td data-label="Job">
                          <div className="dlv-primary">{d.jobNo}</div>
                        </td>
                        <td data-label="Recipient">
                          <div className="dlv-person">
                            <Avatar name={d.customerName} />
                            <div>
                              <div className="dlv-primary">{d.customerName}</div>
                              <div className="dlv-sub">{d.customerPhone}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Type & Address">
                          <span className={`delivery-method-pill ${d.deliveryType === "COUNTER_PICKUP" ? "pickup" : "internal"}`}>
                            {d.deliveryType}
                          </span>
                          <div className="dlv-sub dlv-ellipsis">{d.deliveryAddress}</div>
                        </td>
                        <td data-label="Staff">
                          <div className="dlv-primary dlv-inline">
                            <UserCheck size={14} className="dlv-muted-icon" /> {d.deliveryPersonName}
                          </div>
                          <div className="dlv-sub">{d.vehicle || d.deliveryPersonPhone}</div>
                        </td>
                        <td data-label="Status">
                          <StatusBadge status={d.status} domain="delivery" />
                        </td>
                        <td className="dlv-right dlv-actions-cell">
                          <div className="dlv-btn-group">
                            <button
                              type="button"
                              className="dlv-btn dlv-btn-ghost"
                              onClick={() => setSelectedDOForAssign(d)}
                            >
                              Re-assign
                            </button>
                            <button
                              type="button"
                              className="dlv-btn dlv-btn-primary"
                              onClick={() => handleDispatchOrder(d)}
                              disabled={loading}
                              title="Dispatch order and mark Out for Delivery"
                            >
                              <Truck size={14} /> Dispatch (Out for Delivery)
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </section>
        )}



        {/* ── TAB 4: OUT FOR DELIVERY (DO Status: OUT_FOR_DELIVERY) ── */}
        {activeTab === "OUT_FOR_DELIVERY" && (
          <section className="dlv-card">
            <header className="dlv-card-head">
              <div className="dlv-card-title">
                <span className="dlv-card-icon">
                  <Truck size={18} />
                </span>
                <div>
                  <h3>Active Deliveries in Transit</h3>

                </div>
              </div>
              <span className="dlv-pill">
                Total: <strong>{activeList.length}</strong> active deliveries
              </span>
            </header>

            <div className="dlv-table-wrap">
              <table className="jf-table dlv-table">
                <thead>
                  <tr>
                    <th>DO Number</th>
                    <th>Linked Job</th>
                    <th>Customer Name & Phone</th>
                    <th>Destination</th>
                    <th>Rider Info</th>
                    <th>Balance to Collect</th>
                    <th>Status</th>
                    <th className="dlv-right">Handover & Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {activeList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="dlv-empty">
                        <div className="dlv-empty-state">
                          <Truck size={28} />
                          <span>No deliveries currently out for delivery.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedList.map((d) => (
                      <tr key={d._id}>
                        <td data-label="DO No">
                          <div className="dlv-primary dlv-mono">{d.deliveryNo}</div>
                        </td>
                        <td data-label="Job">
                          <div className="dlv-primary">{d.jobNo}</div>
                        </td>
                        <td data-label="Customer">
                          <div className="dlv-person">
                            <Avatar name={d.customerName} />
                            <div>
                              <div className="dlv-primary">{d.customerName}</div>
                              <div className="dlv-sub dlv-inline">
                                <Phone size={12} /> {d.customerPhone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Destination">
                          <div className="dlv-inline dlv-ellipsis-wide">
                            <MapPin size={14} className="dlv-muted-icon" />
                            <span>{d.deliveryAddress}</span>
                          </div>
                        </td>
                        <td data-label="Rider">
                          <div className="dlv-primary">{d.deliveryPersonName}</div>
                          <div className="dlv-sub">{d.vehicle}</div>
                        </td>
                        <td data-label="Balance">
                          {d.balanceDue > 0 ? (
                            <span style={{ color: "#dc2626", fontWeight: 700 }}>₹{d.balanceDue.toFixed(2)} Due</span>
                          ) : (
                            <span style={{ color: "#059669", fontWeight: 700 }}>✓ Fully Paid</span>
                          )}
                        </td>
                        <td data-label="Status">
                          <StatusBadge status="OUT_FOR_DELIVERY" domain="delivery" />
                        </td>
                        <td className="dlv-right dlv-actions-cell">
                          <button
                            type="button"
                            className="dlv-btn dlv-btn-success"
                            onClick={() => setSelectedDOForHandover(d)}
                            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                          >
                            <CreditCard size={14} /> Collect Payment & Handover
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </section>
        )}

        {/* ── TAB 5: DELIVERED (DO Status: DELIVERED) ── */}
        {activeTab === "DELIVERED" && (
          <section className="dlv-card">
            <header className="dlv-card-head">
              <div className="dlv-card-title">
                <span className="dlv-card-icon">
                  <CheckCircle size={18} />
                </span>
                <div>
                  <h3>Delivered Orders</h3>
                  <p></p>
                </div>
              </div>
              <span className="dlv-pill">
                Total: <strong>{activeList.length}</strong> delivered orders
              </span>
            </header>

            <div className="dlv-table-wrap">
              <table className="jf-table dlv-table">
                <thead>
                  <tr>
                    <th>DO Number</th>
                    <th>Linked Job</th>
                    <th>Customer Name</th>
                    <th>Delivery Type</th>
                    <th>Proof Status</th>
                    <th>Delivery Status</th>
                    <th className="dlv-right">Settlement & Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="dlv-empty">
                        <div className="dlv-empty-state">
                          <CheckCircle size={28} />
                          <span>No delivered orders found.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedList.map((d) => (
                      <tr key={d._id}>
                        <td data-label="DO No">
                          <div className="dlv-primary dlv-mono">{d.deliveryNo}</div>
                        </td>
                        <td data-label="Job">
                          <div className="dlv-primary">{d.jobNo}</div>
                        </td>
                        <td data-label="Customer">
                          <div className="dlv-person">
                            <Avatar name={d.customerName} />
                            <div>
                              <div className="dlv-primary">{d.customerName}</div>
                              <div className="dlv-sub">{d.customerPhone}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Type">
                          <span className={`delivery-method-pill ${d.deliveryType === "COUNTER_PICKUP" ? "pickup" : "internal"}`}>
                            {d.deliveryType}
                          </span>
                        </td>
                        <td data-label="Proof">
                          <button
                            type="button"
                            className="dlv-btn dlv-btn-ghost"
                            style={{
                              padding: "0.25rem 0.65rem",
                              fontSize: "0.78rem",
                              color: "#059669",
                              borderColor: "#a7f3d0",
                              background: "#ecfdf5",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                            onClick={() => setSelectedDOForProofView(d)}
                            title="View Handover Proof (Signature & Photo)"
                          >
                            <Eye size={13} /> View Proof
                          </button>
                        </td>
                        <td data-label="Status">
                          <StatusBadge status="DELIVERED & PAID" domain="delivery" />
                        </td>
                        <td className="dlv-right dlv-actions-cell">
                          <div style={{ display: "inline-flex", gap: "0.4rem", justifyContent: "flex-end", alignItems: "center" }}>
                            {d.balanceDue > 0 ? (
                              <button
                                type="button"
                                className="dlv-btn dlv-btn-primary"
                                style={{
                                  background: "#059669",
                                  borderColor: "#059669",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                                onClick={() => handleOpenSettlement(d)}
                                title="Collect remaining balance & settle invoice"
                              >
                                <Wallet size={14} /> Settle Payment (₹{d.balanceDue.toFixed(2)})
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="dlv-btn dlv-btn-secondary"
                                style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                                onClick={() => handleOpenSettlement(d)}
                                title="View Settlement Ledger & Receipts"
                              >
                                <Receipt size={14} /> View Settlement
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </section>
        )}

        {/* ── TAB 5: JOB CLOSURE ── */}
        {activeTab === "CLOSURE" && (
          <section className="dlv-card">
            <header className="dlv-card-head">
              <div className="dlv-card-title">
                <span className="dlv-card-icon">
                  <Lock size={18} />
                </span>
                <div>
                  <h3>Job Closure & Verification</h3>
                  <p></p>
                </div>
              </div>
              <span className="dlv-pill">
                Total: <strong>{activeList.length}</strong> jobs
              </span>
            </header>

            <div className="dlv-table-wrap">
              <table className="jf-table dlv-table">
                <thead>
                  <tr>
                    <th>Job Order No</th>
                    <th>Customer Name</th>
                    <th>Order Value</th>
                    <th>Fulfillment Stage</th>
                    <th>Closure Status</th>
                    <th className="dlv-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="dlv-empty">
                        <div className="dlv-empty-state">
                          <Lock size={28} />
                          <span>No job orders found for closure.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedList.map((job) => (
                      <tr key={job._id}>
                        <td data-label="Job Order No">
                          <div className="dlv-primary dlv-mono">{job.jobNo}</div>
                          <div className="dlv-sub">{job.title}</div>
                        </td>
                        <td data-label="Customer Name">
                          <div className="dlv-person">
                            <Avatar name={job.customerName} />
                            <div>
                              <div className="dlv-primary">{job.customerName}</div>
                              <div className="dlv-sub">{job.customerPhone}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Order Value">
                          <span style={{ fontWeight: 600 }}>₹{job.totalAmount.toFixed(2)}</span>
                        </td>
                        <td data-label="Fulfillment Stage">
                          <StatusBadge status={job.status} domain="delivery" />
                        </td>
                        <td data-label="Closure Status">
                          <StatusBadge status={job.closureStatus} domain="closure" />
                        </td>
                        <td className="dlv-right dlv-actions-cell">
                          <div style={{ display: "inline-flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="dlv-btn dlv-btn-secondary"
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                              onClick={() => setSelectedJobForFeedback({ id: job._id, jobNo: job.jobNo })}
                              title="Collect Feedback & Designer Rating"
                            >
                              <Star size={13} style={{ color: "#eab308" }} /> Rating
                            </button>
                            <button
                              type="button"
                              className="dlv-btn dlv-btn-primary"
                              onClick={() => setSelectedJobForClosure(job._id)}
                              style={{
                                background: job.closureStatus === "CLOSED" ? "#334155" : "#0f172a",
                                borderColor: "#0f172a",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Lock size={13} /> {job.closureStatus === "CLOSED" ? "View Closure 🔒" : "Verify & Close"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </section>
        )}
      </div>

      {/* ── MODALS ── */}
      <CreateDeliveryOrderModal
        isOpen={Boolean(selectedJobForDO)}
        onClose={() => {
          setSelectedJobForDO(null);
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.delete("jobId");
              return next;
            },
            { replace: true }
          );
        }}
        job={selectedJobForDO}
        readOnly={Boolean(selectedJobForDO?.readOnly)}
        onCreated={() => {
          loadAllData();
        }}
      />

      <AssignDeliveryModal
        isOpen={Boolean(selectedDOForAssign)}
        onClose={() => setSelectedDOForAssign(null)}
        deliveryOrder={selectedDOForAssign}
        onAssigned={() => {
          loadAllData();
        }}
      />

      <PackDeliveryModal
        isOpen={Boolean(selectedDOForPack)}
        onClose={() => setSelectedDOForPack(null)}
        deliveryOrder={selectedDOForPack}
        onPacked={() => {
          loadAllData();
          handleTabChange("PACKED");
        }}
      />

      <HandoverProofModal
        isOpen={Boolean(selectedDOForHandover)}
        onClose={() => setSelectedDOForHandover(null)}
        deliveryOrder={selectedDOForHandover}
        onDelivered={() => {
          loadAllData();
          handleTabChange("DELIVERED");
        }}
      />

      <ViewDeliveryProofModal
        isOpen={Boolean(selectedDOForProofView)}
        onClose={() => setSelectedDOForProofView(null)}
        deliveryOrder={selectedDOForProofView}
      />

      <CashierSettlementModal
        isOpen={Boolean(selectedInvoiceForCashier)}
        onClose={() => setSelectedInvoiceForCashier(null)}
        invoiceId={selectedInvoiceForCashier}
        onPaymentComplete={() => {
          loadAllData();
        }}
      />

      <JobClosureModal
        isOpen={Boolean(selectedJobForClosure)}
        onClose={() => setSelectedJobForClosure(null)}
        jobId={selectedJobForClosure}
        onClosed={() => {
          loadAllData();
        }}
      />

      <CustomerFeedbackModal
        isOpen={Boolean(selectedJobForFeedback)}
        onClose={() => setSelectedJobForFeedback(null)}
        jobId={selectedJobForFeedback?.id}
        jobNo={selectedJobForFeedback?.jobNo}
        onFeedbackSaved={() => {
          loadAllData();
        }}
      />
    </JobFlowLayout>
  );
};

export default DeliveryPage;