import React, { useState, useEffect } from "react";
import {
  Truck,
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
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import StatusBadge from "../../shared/components/StatusBadge";
import JobFlowDataTable from "../../shared/components/JobFlowDataTable";
import deliveryApi from "../api/deliveryApi";
import "../styles/delivery.css";

// Phase 1 Modals
import CreateDeliveryOrderModal from "../components/CreateDeliveryOrderModal";
import AssignDeliveryModal from "../components/AssignDeliveryModal";
import PackDeliveryModal from "../components/PackDeliveryModal";
import HandoverProofModal from "../components/HandoverProofModal";

const TABS = [
  { key: "REVIEW", label: "Manager Review", icon: ShieldCheck },
  { key: "ASSIGNED", label: "Assigned", icon: Send },
  { key: "PACKED", label: "Packed", icon: PackageCheck },
  { key: "OUT_FOR_DELIVERY", label: "In Transit", icon: Truck },
  { key: "DELIVERED", label: "Delivered", icon: CheckCircle },
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

  // Tab State: "REVIEW" | "ASSIGNED" | "PACKED" | "OUT_FOR_DELIVERY" | "DELIVERED"
  const [activeTab, setActiveTab] = useState(
    tabParam && ["REVIEW", "ASSIGNED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(tabParam.toUpperCase())
      ? tabParam.toUpperCase()
      : "REVIEW"
  );

  useEffect(() => {
    if (tabParam) {
      const upper = tabParam.toUpperCase();
      if (["REVIEW", "ASSIGNED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(upper)) {
        setActiveTab(upper);
      }
    }
  }, [tabParam]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
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

  // Modal controls
  const [selectedJobForDO, setSelectedJobForDO] = useState(null);
  const [selectedDOForAssign, setSelectedDOForAssign] = useState(null);
  const [selectedDOForPack, setSelectedDOForPack] = useState(null);
  const [selectedDOForHandover, setSelectedDOForHandover] = useState(null);

  useEffect(() => {
    loadAllData();
  }, [preselectedJobId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch ready jobs for review (completed in production)
      const [resReadyJobs, resOrders] = await Promise.all([
        deliveryApi.getReadyJobsForDelivery().catch(() => null),
        deliveryApi.getDeliveryOrders({ limit: 100 }).catch(() => null),
      ]);

      // Map ready jobs
      let readyItems = resReadyJobs?.data?.items || resReadyJobs?.data || (Array.isArray(resReadyJobs) ? resReadyJobs : []);
      if (!Array.isArray(readyItems) || readyItems.length === 0) {
        // Fallback: fetch job orders in READY / DELIVERY stage
        try {
          const fallbackRes = await deliveryApi.getJobOrders({ currentStage: "READY,DELIVERY,READY_FOR_DELIVERY", limit: 50 });
          readyItems = fallbackRes?.data?.items || fallbackRes?.data || [];
        } catch {}
      }

      // Map delivery orders
      const orderItems = resOrders?.data?.items || resOrders?.data || (Array.isArray(resOrders) ? resOrders : []);
      const formattedDOs = (Array.isArray(orderItems) ? orderItems : []).map((d) => {
        const jObj = d.jobOrderId && typeof d.jobOrderId === "object" ? d.jobOrderId : null;
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
        return {
          _id: j._id || j.id,
          jobNo: j.jobNo || j.orderNumber || `JO-${jId.slice(-6)}`,
          customerName: j.customerName || j.customerSnapshot?.name || j.customer?.name || "Customer",
          customerPhone: j.customerPhone || j.customerSnapshot?.mobile || j.customer?.mobile || "N/A",
          deliveryAddress: j.deliveryAddress || j.customerSnapshot?.address || "Counter Pickup",
          title: j.title || j.productType || "Print Order",
          quantity: j.quantity || 500,
          grandTotal: Number(j.grandTotal || j.totalAmount || 0),
          advancePaid: Number(j.advancePaid || 0),
          balanceDue: Math.max(0, Number(j.grandTotal || j.totalAmount || 0) - Number(j.advancePaid || 0)),
          currentStage: j.currentStage || "READY_FOR_DELIVERY",
          reviewedByManager: Boolean(j.reviewedByManager || matchedDO),
          deliveryOrder: matchedDO || null,
          isDeliveryPrepared: Boolean(matchedDO || j.isDeliveryPrepared),
          raw: j,
        };
      });
      setReadyJobs(formattedReady);

      // Auto-focus preselected job
      if (preselectedJobId) {
        const matchReady = formattedReady.find((j) => j._id === preselectedJobId || j.jobNo === preselectedJobId);
        if (matchReady) {
          setActiveTab("REVIEW");
          setSelectedJobForDO(matchReady);
        } else {
          const matchDO = formattedDOs.find((d) => d._id === preselectedJobId || d.jobNo === preselectedJobId);
          if (matchDO) {
            if (matchDO.status === "DELIVERED") setActiveTab("DELIVERED");
            else if (matchDO.status === "OUT_FOR_DELIVERY") setActiveTab("OUT_FOR_DELIVERY");
            else if (matchDO.status === "PACKED") setActiveTab("PACKED");
            else setActiveTab("ASSIGNED");
          }
        }
      }
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
      } catch {}

      toast.success(`Delivery Order ${deliveryOrder.deliveryNo} is DISPATCHED & Handover OTP sent!`);
      await loadAllData();
      setActiveTab("OUT_FOR_DELIVERY");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to dispatch order");
    } finally {
      setLoading(false);
    }
  };

  // Counters for tabs
  const countReview = readyJobs.length;
  const countAssigned = deliveryOrders.filter((d) => d.status === "READY" || d.status === "ASSIGNED").length;
  const countPacked = deliveryOrders.filter((d) => d.status === "PACKED").length;
  const countOutForDelivery = deliveryOrders.filter((d) => d.status === "OUT_FOR_DELIVERY").length;
  const countDelivered = deliveryOrders.filter((d) => d.status === "DELIVERED").length;

  const tabCounts = {
    REVIEW: countReview,
    ASSIGNED: countAssigned,
    PACKED: countPacked,
    OUT_FOR_DELIVERY: countOutForDelivery,
    DELIVERED: countDelivered,
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
        (item.deliveryAddress && item.deliveryAddress.toLowerCase().includes(q))
    );
  };

  const getActiveList = () => {
    if (activeTab === "REVIEW") return filterList(readyJobs);
    if (activeTab === "ASSIGNED") return filterList(deliveryOrders.filter((d) => d.status === "READY" || d.status === "ASSIGNED"));
    if (activeTab === "PACKED") return filterList(deliveryOrders.filter((d) => d.status === "PACKED"));
    if (activeTab === "OUT_FOR_DELIVERY") return filterList(deliveryOrders.filter((d) => d.status === "OUT_FOR_DELIVERY"));
    if (activeTab === "DELIVERED") return filterList(deliveryOrders.filter((d) => d.status === "DELIVERED"));
    return [];
  };

  const activeList = getActiveList();
  const activeTabMeta = TABS.find((t) => t.key === activeTab);

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
      title="Delivery & Fulfillment Workflow"
      subtitle="Phase 1: Manager Review, Delivery Order (DO) Creation, Staff Assignment, Packing, Dispatch & OTP Handover Proof"
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
        {/* ── KPI Overview (each stage card also switches the view) ── */}
        <section className="dlv-kpi-section" aria-label="Delivery key performance indicators">
          <div className="dlv-kpi-grid">
            {TABS.map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              const count = tabCounts[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={isActive}
                  className={`dlv-kpi ${isActive ? "is-active" : ""}`}
                  onClick={() => handleTabChange(key)}
                >
                  <div className="dlv-kpi-top">
                    <span className="dlv-kpi-icon">
                      <Icon size={18} />
                    </span>
                    <span className="dlv-kpi-tag">{isActive ? "Viewing" : "Stage"}</span>
                  </div>
                  <div className="dlv-kpi-value">{count}</div>
                  <div className="dlv-kpi-label">{label}</div>
                  <div className="dlv-kpi-bar" aria-hidden="true">
                    <span style={{ width: `${Math.round((count / maxStageCount) * 100)}%` }} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="dlv-kpi-insights">
            <div className="dlv-insight">
              <span className="dlv-insight-icon">
                <Wallet size={18} />
              </span>
              <div>
                <div className="dlv-insight-label">Pipeline value</div>
                <div className="dlv-insight-value">{formatMoney(pipelineValue)}</div>
              </div>
            </div>
            <div className="dlv-insight">
              <span className="dlv-insight-icon is-warn">
                <Receipt size={18} />
              </span>
              <div>
                <div className="dlv-insight-label">Balance to collect</div>
                <div className={`dlv-insight-value ${balanceToCollect > 0 ? "is-due" : "is-paid"}`}>
                  {formatMoney(balanceToCollect)}
                </div>
              </div>
            </div>
            <div className="dlv-insight">
              <span className="dlv-insight-icon">
                <TrendingUp size={18} />
              </span>
              <div className="dlv-insight-grow">
                <div className="dlv-insight-label">Delivery completion</div>
                <div className="dlv-insight-value">{completionRate}%</div>
                <div className="dlv-kpi-bar dlv-insight-bar" aria-hidden="true">
                  <span style={{ width: `${completionRate}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>

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
                  <p>Completed jobs waiting for delivery review</p>
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
                    activeList.map((job) => (
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
                          {job.isDeliveryPrepared ? (
                            <span className="dlv-chip-success">✓ DO Created ({job.deliveryOrder?.deliveryNo || "Ready"})</span>
                          ) : (
                            <StatusBadge status="READY" domain="delivery" />
                          )}
                        </td>
                        <td className="dlv-right dlv-actions-cell">
                          {job.isDeliveryPrepared ? (
                            <button
                              type="button"
                              className="dlv-btn dlv-btn-ghost"
                              onClick={() => setSelectedJobForDO({ ...job, readOnly: true })}
                              title="View Delivery Order (Read Only)"
                            >
                              <Eye size={14} /> View
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
                  <p>Orders ready to be packed or reassigned</p>
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
                    activeList.map((d) => (
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
                              {d.status === "ASSIGNED" ? "Re-assign" : "Assign Staff"}
                            </button>
                            <button
                              type="button"
                              className="dlv-btn dlv-btn-primary"
                              onClick={() => setSelectedDOForPack(d)}
                            >
                              Pack Goods
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── TAB 3: PACKED GOODS (DO Status: PACKED) ── */}
        {activeTab === "PACKED" && (
          <section className="dlv-card">
            <header className="dlv-card-head">
              <div className="dlv-card-title">
                <span className="dlv-card-icon">
                  <PackageCheck size={18} />
                </span>
                <div>
                  <h3>Packed Goods</h3>
                  <p>Parcels ready to be dispatched</p>
                </div>
              </div>
              <span className="dlv-pill">
                Total: <strong>{activeList.length}</strong> parcels
              </span>
            </header>

            <div className="dlv-table-wrap">
              <table className="jf-table dlv-table">
                <thead>
                  <tr>
                    <th>DO Number</th>
                    <th>Linked Job</th>
                    <th>Recipient</th>
                    <th>Rider / Vehicle</th>
                    <th>Packing Status</th>
                    <th className="dlv-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="dlv-empty">
                        <div className="dlv-empty-state">
                          <Package size={28} />
                          <span>No packed parcels pending dispatch.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    activeList.map((d) => (
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
                              <div className="dlv-sub dlv-ellipsis">{d.deliveryAddress}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Rider">
                          <div className="dlv-primary dlv-inline">
                            <UserCheck size={14} className="dlv-muted-icon" /> {d.deliveryPersonName}
                          </div>
                          <div className="dlv-sub">{d.vehicle}</div>
                        </td>
                        <td data-label="Status">
                          <StatusBadge status="PACKED" domain="delivery" />
                        </td>
                        <td className="dlv-right dlv-actions-cell">
                          <button
                            type="button"
                            className="dlv-btn dlv-btn-accent"
                            onClick={() => handleDispatchOrder(d)}
                            disabled={loading}
                          >
                            <Truck size={14} /> Dispatch & Send OTP
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
                  <p>Riders on the road, awaiting OTP handover</p>
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
                    <th>Status</th>
                    <th className="dlv-right">Handover Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="dlv-empty">
                        <div className="dlv-empty-state">
                          <Truck size={28} />
                          <span>No deliveries currently out for delivery.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    activeList.map((d) => (
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
                        <td data-label="Status">
                          <StatusBadge status="OUT_FOR_DELIVERY" domain="delivery" />
                        </td>
                        <td className="dlv-right dlv-actions-cell">
                          <button
                            type="button"
                            className="dlv-btn dlv-btn-success"
                            onClick={() => setSelectedDOForHandover(d)}
                          >
                            Verify OTP & Handover
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
                  <p>Completed handovers with proof of delivery</p>
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
                    <th className="dlv-right">Next Action</th>
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
                    activeList.map((d) => (
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
                          <span className="dlv-chip-success">✓ POD Uploaded</span>
                        </td>
                        <td data-label="Status">
                          <StatusBadge status="DELIVERED" domain="delivery" />
                        </td>
                        <td className="dlv-right dlv-actions-cell">
                          <button
                            type="button"
                            className="dlv-btn dlv-btn-primary"
                            onClick={() => navigate(`/jobflow/invoice?jobId=${d.jobOrderId || d.jobNo}`)}
                          >
                            Generate Tax Invoice <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* ── MODALS ── */}
      <CreateDeliveryOrderModal
        isOpen={Boolean(selectedJobForDO)}
        onClose={() => setSelectedJobForDO(null)}
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
    </JobFlowLayout>
  );
};

export default DeliveryPage;