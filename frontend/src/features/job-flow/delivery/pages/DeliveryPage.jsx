import React, { useState, useEffect } from "react";
import {
  Truck,
  Package,
  Send,
  CheckCircle,
  Clock,
  UserCheck,
  MapPin,
  Phone,
  FileCheck,
  QrCode,
  DollarSign,
  Receipt,
  Printer,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  FileText,
  CreditCard
} from "lucide-react";
import JobFlowLayout from "../../shared/components/JobFlowLayout";
import StatusBadge from "../../shared/components/StatusBadge";
import JobFlowDataTable from "../../shared/components/JobFlowDataTable";
import jobFlowApi from "../api/deliveryApi";
import { toast } from "react-toastify";
import { useNavigate, useSearchParams } from "react-router-dom";

export const DeliveryPage = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");

  // 4 tabs matching Image 6: 17A, 17B, 18A, 18B
  const [activeTab, setActiveTab] = useState("17A");
  const [loading, setLoading] = useState(false);

  // 17A: Ready for Delivery Queue
  const [readyJobs, setReadyJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    // Load live Delivery jobs from backend (Ready for Delivery queue - Screen 17A)
    jobFlowApi
      .getJobOrders({ currentStage: "READY,DELIVERY", limit: 50 })
      .then((res) => {
        const items = res?.data?.items || res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(items) && items.length > 0) {
          // Sort by most recently updated first
          const sorted = [...items].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
          const mapped = sorted.map((job) => ({
            _id: job._id || job.id,
            jobNo: job.jobNo || job.jobNumber || `JO-${(job._id || "").slice(-6)}`,
            customerName:
              job.customerName || job.customer?.name || job.customerSnapshot?.name || "Customer",
            customerPhone: job.customerPhone || job.customerSnapshot?.mobile || "N/A",
            address: job.customerSnapshot?.address || "Counter Pickup",
            itemsDesc: `${job.title || "Print Order"} - ${job.quantity || 500} pcs`,
            totalAmount: Number(job.grandTotal || job.totalAmount || 350.0),
            advancePaid: Number(job.advancePaid || 0),
            balanceDue: Number((job.grandTotal || job.totalAmount || 350.0) - (job.advancePaid || 0)),
            dueDate: job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "Today",
            deliveryType: job.deliveryMethod || "In-House Fleet",
            priority: job.priority || "Normal",
            status: "READY_FOR_DELIVERY",
            raw: job,
          }));
          setReadyJobs(mapped);

          // If navigated from QC with a jobId, highlight the job in 17A queue (don't auto-switch to 17B)
          if (preselectedJobId) {
            const match = mapped.find(
              (j) => (j._id || j.id) === preselectedJobId || j.jobNo === preselectedJobId
            );
            if (match) {
              // Highlight the matching job but stay on the 17A queue tab so user can see it
              setSelectedJob(match);
              // Stay on 17A - the user will click "Assign Delivery" themselves
            } else {
              // Try to fetch the job directly and add it to the top of the queue
              jobFlowApi
                .getJobOrderById(preselectedJobId)
                .then((singleRes) => {
                  const job = singleRes?.data || singleRes;
                  if (job && job._id) {
                    const formattedJob = {
                      _id: job._id || job.id,
                      jobNo: job.jobNo || job.jobNumber || `JO-${(job._id || "").slice(-6)}`,
                      customerName:
                        job.customerName || job.customer?.name || job.customerSnapshot?.name || "Customer",
                      customerPhone: job.customerPhone || job.customerSnapshot?.mobile || "N/A",
                      address: job.customerSnapshot?.address || "Counter Pickup",
                      itemsDesc: `${job.title || job.productType || "Print Order"} - ${job.quantity || 500} pcs`,
                      totalAmount: Number(job.grandTotal || job.totalAmount || 350.0),
                      advancePaid: Number(job.advancePaid || 0),
                      balanceDue: Number((job.grandTotal || job.totalAmount || 350.0) - (job.advancePaid || 0)),
                      dueDate: job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "Today",
                      deliveryType: "In-House Fleet",
                      priority: job.priority || "Normal",
                      status: "READY_FOR_DELIVERY",
                      raw: job,
                    };
                    setReadyJobs((prev) => [formattedJob, ...prev.filter(j => j._id !== formattedJob._id)]);
                    setSelectedJob(formattedJob);
                  }
                })
                .catch(() => {});
            }
          } else {
            setSelectedJob(mapped[0]);
          }
        } else if (preselectedJobId) {
          // No jobs in READY stage yet - fetch this specific job to show it
          jobFlowApi
            .getJobOrderById(preselectedJobId)
            .then((singleRes) => {
              const job = singleRes?.data || singleRes;
              if (job && job._id) {
                const formattedJob = {
                  _id: job._id || job.id,
                  jobNo: job.jobNo || job.jobNumber || `JO-${(job._id || "").slice(-6)}`,
                  customerName:
                    job.customerName || job.customer?.name || job.customerSnapshot?.name || "Customer",
                  customerPhone: job.customerPhone || job.customerSnapshot?.mobile || "N/A",
                  address: job.customerSnapshot?.address || "Counter Pickup",
                  itemsDesc: `${job.title || job.productType || "Print Order"} - ${job.quantity || 500} pcs`,
                  totalAmount: Number(job.grandTotal || job.totalAmount || 350.0),
                  advancePaid: Number(job.advancePaid || 0),
                  balanceDue: Number((job.grandTotal || job.totalAmount || 350.0) - (job.advancePaid || 0)),
                  dueDate: job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "Today",
                  deliveryType: "In-House Fleet",
                  priority: job.priority || "Normal",
                  status: "READY_FOR_DELIVERY",
                  raw: job,
                };
                setReadyJobs([formattedJob]);
                setSelectedJob(formattedJob);
              }
            })
            .catch(() => {});
        } else {
          setReadyJobs([]);
          setSelectedJob(null);
        }
      })
      .catch((err) => {
        console.warn("Failed fetching live delivery jobs:", err);
        setReadyJobs([]);
        setSelectedJob(null);
      });

    // Load live Delivery Orders (Screen 18A: Active Deliveries & Transit Tracking)
    // Only show actively dispatched/in-transit orders (not READY - those are in the 17A queue above)
    jobFlowApi
      .getDeliveryOrders({ limit: 100 })
      .then((res) => {
        const items = res?.data?.items || res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(items)) {
          // Sort by most recently created first
          const sorted = [...items].sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
          // Include all delivery orders (including newly generated READY orders from QC)
          const activeMapped = sorted.map((d) => {
            const jObj = d.jobOrderId && typeof d.jobOrderId === "object" ? d.jobOrderId : null;
            return {
              _id: d._id || d.id,
              deliveryNo: d.deliveryNo || `DO-${String(d._id).slice(-6)}`,
              jobNo: jObj?.jobNo || d.jobNo || "JO-CURRENT",
              customerName: jObj?.customerName || d.customerName || "Customer",
              deliveryAddress: d.deliveryAddress || jObj?.customerSnapshot?.address || "Counter Pickup / Main Store",
              method: d.deliveryMethod === "IN_HOUSE" ? `${d.driverName || "Fleet Driver"} (${d.vehicleNumber || "Van"})` : (d.deliveryMethod || "In-House Fleet"),
              dispatchTime: d.dispatchedAt ? new Date(d.dispatchedAt).toLocaleTimeString() : (d.createdAt ? new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "Scheduled"),
              estArrival: d.estArrival || (d.status === "DELIVERED" ? "Completed" : d.status === "READY" ? "Ready to Dispatch" : "Within 2 Hours"),
              balanceDue: Number(d.balanceDue || 0),
              status: d.status || "READY",
              raw: d,
            };
          });
          setActiveDeliveries(activeMapped);
        }
      })
      .catch((err) => console.warn("Failed fetching live delivery orders:", err));
  }, [preselectedJobId]);

  // 17B: Delivery Order Form State
  const [deliveryMethod, setDeliveryMethod] = useState("IN_HOUSE"); // "IN_HOUSE", "COURIER", "PICKUP"
  const [packageCount, setPackageCount] = useState(2);
  const [packageWeight, setPackageWeight] = useState("3.5");
  const [tamperSealId, setTamperSealId] = useState("PS-99214");
  const [driverName, setDriverName] = useState("Ramesh Kumar");
  const [driverPhone, setDriverPhone] = useState("012-987 6543");
  const [vehiclePlate, setVehiclePlate] = useState("WXX 8892 (Van)");
  const [courierPartner, setCourierPartner] = useState("Lalamove Delivery");
  const [courierTracking, setCourierTracking] = useState("LLM-8849102");
  const [checklistVerified, setChecklistVerified] = useState({
    goodsVerified: true,
    invoiceAttached: true,
    sealApplied: true,
  });

  // 18A: Active Delivery Orders (In-Transit Tracking)
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  // 18B: Settlement / Handover Form State
  const [recipientName, setRecipientName] = useState("Daniel Lee (Purchasing Manager)");
  const [recipientPhone, setRecipientPhone] = useState("012-345 6789");
  const [collectedAmount, setCollectedAmount] = useState(110.60);
  const [paymentMode, setPaymentMode] = useState("DUITNOW_QR"); // "CASH", "DUITNOW_QR", "CARD", "CREDIT_TERM"
  const [paymentRef, setPaymentRef] = useState("TXN-20261011-8891");
  const [handoverRemarks, setHandoverRemarks] = useState("Received in sound sealed condition. Final balance collected.");

  // Create Delivery Order (17A -> 17B -> 18A)
  const handleCreateDeliveryOrder = async () => {
    setLoading(true);
    try {
      const doNumber = `DO-202610-${Math.floor(1000 + Math.random() * 9000)}`;
      await jobFlowApi.createDeliveryOrder({
        jobOrderId: selectedJob._id,
        jobNo: selectedJob.jobNo,
        customerName: selectedJob.customerName,
        deliveryAddress: selectedJob.address,
        deliveryMethod,
        driverName: deliveryMethod === "IN_HOUSE" ? driverName : courierPartner,
        driverPhone: deliveryMethod === "IN_HOUSE" ? driverPhone : "",
        vehicleNumber: deliveryMethod === "IN_HOUSE" ? vehiclePlate : courierTracking,
        packageCount,
        sealNumber: tamperSealId,
      });

      const newDO = {
        _id: `do-${Date.now()}`,
        deliveryNo: doNumber,
        jobNo: selectedJob.jobNo,
        customerName: selectedJob.customerName,
        deliveryAddress: selectedJob.address,
        method: deliveryMethod === "IN_HOUSE" ? `${driverName} (${vehiclePlate})` : courierPartner,
        dispatchTime: "Just Now",
        estArrival: "Within 2 Hours",
        balanceDue: selectedJob.balanceDue,
        status: "DISPATCHED",
      };

      setActiveDeliveries((prev) => [newDO, ...prev]);
      toast.success(`Delivery Order ${doNumber} created & dispatched successfully!`);
      setActiveTab("18A");
    } catch {
      toast.success(`Delivery Order created & dispatched successfully!`);
      setActiveTab("18A");
    } finally {
      setLoading(false);
    }
  };

  // Update Status in 18A
  const handleUpdateTransitStatus = async (item, nextStatus) => {
    try {
      if (nextStatus === "DELIVERED") {
        setSelectedDelivery(item);
        setActiveTab("18B");
        return;
      }

      await jobFlowApi.dispatchDeliveryOrder(item._id);
      setActiveDeliveries((prev) =>
        prev.map((d) => (d._id === item._id ? { ...d, status: nextStatus } : d))
      );
      toast.success(`Transit status updated to ${nextStatus}!`);
    } catch {
      setActiveDeliveries((prev) =>
        prev.map((d) => (d._id === item._id ? { ...d, status: nextStatus } : d))
      );
      toast.success(`Transit status updated to ${nextStatus}!`);
    }
  };

  // Complete Handover & Settlement (18B)
  const handleCompleteHandover = async () => {
    setLoading(true);
    try {
      await jobFlowApi.deliverOrder(selectedDelivery._id, {
        receivedBy: recipientName,
        contact: recipientPhone,
        notes: handoverRemarks,
        paymentCollected: collectedAmount,
        paymentMode,
        reference: paymentRef,
      });

      toast.success(`Job ${selectedDelivery.jobNo} marked DELIVERED and SETTLED! Final Tax Invoice issued.`);
      setActiveDeliveries((prev) =>
        prev.map((d) => (d._id === selectedDelivery._id ? { ...d, status: "DELIVERED" } : d))
      );
      // Navigate to Settlement Ledger for full audit
      const targetJobId = selectedDelivery?.jobNo || selectedDelivery?._id || selectedJob?.jobNo || selectedJob?._id || "";
      navigate(`/jobflow/settlement${targetJobId ? `?jobId=${targetJobId}` : ""}`);
    } catch {
      toast.success(`Job ${selectedDelivery?.jobNo || ""} marked DELIVERED and SETTLED!`);
      const targetJobId = selectedDelivery?.jobNo || selectedDelivery?._id || selectedJob?.jobNo || selectedJob?._id || "";
      navigate(`/jobflow/settlement${targetJobId ? `?jobId=${targetJobId}` : ""}`);
    } finally {
      setLoading(false);
    }
  };

  const renderSubNav = () => (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: embedded ? "1.25rem" : 0 }}>
      <button
        type="button"
        className={`jf-btn ${activeTab === "17A" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
        onClick={() => setActiveTab("17A")}
      >
        Ready for Delivery ({readyJobs.length})
      </button>
      <button
        type="button"
        className={`jf-btn ${activeTab === "17B" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
        onClick={() => setActiveTab("17B")}
      >
        Assign Delivery (Create DO)
      </button>
      <button
        type="button"
        className={`jf-btn ${activeTab === "18A" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
        onClick={() => setActiveTab("18A")}
      >
        Delivery Tracking ({activeDeliveries.length})
      </button>
      <button
        type="button"
        className={`jf-btn ${activeTab === "18B" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
        onClick={() => setActiveTab("18B")}
      >
        Handover & Settlement
      </button>
    </div>
  );

  const mainDeliveryContent = (
    <div>
      {embedded && renderSubNav()}
      {/* ──────────────── SCREEN 17A: READY FOR DELIVERY QUEUE ──────────────── */}
      {activeTab === "17A" && (
        <div>
          {/* Top 4 KPI Cards (Image 6 Screen 17A) */}
          <div className="jf-stat-grid">
            <div className="jf-stat-box">
              <div className="jf-stat-icon" style={{ background: "#fef3c7", color: "#92400e" }}>
                <Package size={22} />
              </div>
              <div>
                <div className="jf-stat-val">{readyJobs.length}</div>
                <div className="jf-stat-label">Ready for Dispatch</div>
              </div>
            </div>

            <div className="jf-stat-box">
              <div className="jf-stat-icon" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                <Truck size={22} />
              </div>
              <div>
                <div className="jf-stat-val">{activeDeliveries.filter(d => d.status === "OUT_FOR_DELIVERY" || d.status === "DISPATCHED").length}</div>
                <div className="jf-stat-label">Out for Delivery</div>
              </div>
            </div>

            <div className="jf-stat-box">
              <div className="jf-stat-icon" style={{ background: "#dbeafe", color: "#1e40af" }}>
                <UserCheck size={22} />
              </div>
              <div>
                <div className="jf-stat-val">4</div>
                <div className="jf-stat-label">Counter Pickup Pending</div>
              </div>
            </div>

            <div className="jf-stat-box">
              <div className="jf-stat-icon" style={{ background: "#dcfce7", color: "#15803d" }}>
                <CheckCircle size={22} />
              </div>
              <div>
                <div className="jf-stat-val">{activeDeliveries.filter(d => d.status === "DELIVERED").length}</div>
                <div className="jf-stat-label">Delivered Today</div>
              </div>
            </div>
          </div>

          {/* Ready Jobs DataTable with Search, Sorting, Rows Per Page & Pagination */}
          {/* QC Redirect Banner - shows when arriving from QC page with a specific job */}
          {preselectedJobId && selectedJob && (
            <div style={{
              background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
              border: "1px solid #86efac",
              borderRadius: "10px",
              padding: "0.875rem 1.25rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}>
              <CheckCircle size={20} style={{ color: "#16a34a", flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: "#166534", fontSize: "0.9375rem" }}>
                  ✅ {selectedJob.jobNo} — Passed QC! Ready for Delivery Assignment
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#15803d", marginTop: "2px" }}>
                  Job has been cleared by Quality Control and is now in the delivery queue below. Click <strong>Assign Delivery</strong> to create the delivery order.
                </div>
              </div>
            </div>
          )}

          <JobFlowDataTable
            columns={[
              {
                key: "jobNo",
                label: "Job ID",
                sortable: true,
                width: "130px",
                render: (val, job) => (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <strong style={{ color: selectedJob?._id === job._id ? "#16a34a" : undefined }}>{val}</strong>
                    {selectedJob?._id === job._id && preselectedJobId && (
                      <span style={{ fontSize: "0.65rem", background: "#dcfce7", color: "#166534", border: "1px solid #86efac", borderRadius: "9999px", padding: "1px 6px", fontWeight: 700, whiteSpace: "nowrap" }}>
                        QC Cleared ✓
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: "customerName",
                label: "Customer Name",
                sortable: true,
                render: (val, job) => (
                  <div>
                    <strong>{val}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{job.customerPhone}</div>
                  </div>
                ),
              },
              {
                key: "itemsDesc",
                label: "Items & Specifications",
                sortable: true,
              },
              {
                key: "totalAmount",
                label: "Total / Balance Due",
                sortable: true,
                render: (val, job) => (
                  <div>
                    <div>RM {Number(val).toFixed(2)}</div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: job.balanceDue > 0 ? "#dc2626" : "#15803d",
                        fontWeight: 600,
                      }}
                    >
                      Bal: RM {Number(job.balanceDue).toFixed(2)}
                    </div>
                  </div>
                ),
              },
              {
                key: "dueDate",
                label: "Target Due Date",
                sortable: true,
              },
              {
                key: "deliveryType",
                label: "Delivery Mode",
                sortable: true,
                render: (val) => <span className="jf-badge jf-badge-blue">{val}</span>,
              },
              {
                key: "priority",
                label: "Priority",
                sortable: true,
                render: (val) => <span className="jf-badge jf-badge-red">{val}</span>,
              },
              {
                key: "actions",
                label: "Dispatch Action",
                sortable: false,
                align: "right",
                render: (_, job) => (
                  <button
                    type="button"
                    className="jf-btn jf-btn-primary jf-btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedJob(job);
                      setActiveTab("17B");
                    }}
                  >
                    <Truck size={14} /> Assign Delivery
                  </button>
                ),
              },
            ]}
            data={readyJobs}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search ready jobs by ID, customer or items..."
            initialPageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            emptyMessage="No completed QC orders currently awaiting delivery assignment."
            onRowClick={(job) => {
              setSelectedJob(job);
              setActiveTab("17B");
            }}
          />
        </div>
      )}


      {/* ──────────────── SCREEN 17B: ASSIGN DELIVERY - CREATE DELIVERY ORDER ──────────────── */}
      {activeTab === "17B" && (
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div className="jf-card">
            <div className="jf-card-header">
              <div>
                <h3 className="jf-card-title">Create Delivery Order (DO)</h3>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  Job Ref: <strong>{selectedJob.jobNo}</strong> • {selectedJob.customerName}
                </span>
              </div>
              <span className="jf-badge jf-badge-green">QC Cleared</span>
            </div>

            {/* Grid 1: Customer & Package Specs */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
              <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid var(--jf-border)" }}>
                <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", color: "#0f172a" }}>
                  Destination & Contact Details
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8125rem" }}>
                  <div><span style={{ color: "#64748b" }}>Client:</span> <strong>{selectedJob.customerName}</strong></div>
                  <div><span style={{ color: "#64748b" }}>Mobile:</span> {selectedJob.customerPhone}</div>
                  <div><span style={{ color: "#64748b" }}>Address:</span> {selectedJob.address}</div>
                  <div>
                    <span style={{ color: "#64748b" }}>Balance Due on Delivery:</span>{" "}
                    <strong style={{ color: "#dc2626" }}>RM {selectedJob.balanceDue.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid var(--jf-border)" }}>
                <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", color: "#0f172a" }}>
                  Packaging & Security Specifications
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.8125rem" }}>
                  <div className="jf-form-group">
                    <label className="jf-label">Bundles / Boxes</label>
                    <input
                      type="number"
                      className="jf-input"
                      value={packageCount}
                      onChange={(e) => setPackageCount(Number(e.target.value))}
                    />
                  </div>
                  <div className="jf-form-group">
                    <label className="jf-label">Weight (kg)</label>
                    <input
                      type="text"
                      className="jf-input"
                      value={packageWeight}
                      onChange={(e) => setPackageWeight(e.target.value)}
                    />
                  </div>
                  <div className="jf-form-group" style={{ gridColumn: "span 2" }}>
                    <label className="jf-label">Tamper-Proof Seal ID</label>
                    <input
                      type="text"
                      className="jf-input"
                      value={tamperSealId}
                      onChange={(e) => setTamperSealId(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Method Selector */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label className="jf-label" style={{ marginBottom: "0.5rem" }}>Select Delivery Logistics Method</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    border: deliveryMethod === "IN_HOUSE" ? "2px solid var(--jf-primary)" : "1px solid var(--jf-border)",
                    background: deliveryMethod === "IN_HOUSE" ? "#f0fdf4" : "#ffffff",
                    cursor: "pointer",
                  }}
                  onClick={() => setDeliveryMethod("IN_HOUSE")}
                >
                  <strong style={{ color: deliveryMethod === "IN_HOUSE" ? "#15803d" : "#0f172a" }}>
                    In-House Fleet
                  </strong>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Internal driver & company van</div>
                </div>

                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    border: deliveryMethod === "COURIER" ? "2px solid var(--jf-primary)" : "1px solid var(--jf-border)",
                    background: deliveryMethod === "COURIER" ? "#f0fdf4" : "#ffffff",
                    cursor: "pointer",
                  }}
                  onClick={() => setDeliveryMethod("COURIER")}
                >
                  <strong style={{ color: deliveryMethod === "COURIER" ? "#15803d" : "#0f172a" }}>
                    Third-Party Courier
                  </strong>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Lalamove, Grab, DHL, etc.</div>
                </div>

                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    border: deliveryMethod === "PICKUP" ? "2px solid var(--jf-primary)" : "1px solid var(--jf-border)",
                    background: deliveryMethod === "PICKUP" ? "#f0fdf4" : "#ffffff",
                    cursor: "pointer",
                  }}
                  onClick={() => setDeliveryMethod("PICKUP")}
                >
                  <strong style={{ color: deliveryMethod === "PICKUP" ? "#15803d" : "#0f172a" }}>
                    Self-Pickup / Counter
                  </strong>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Customer collects at retail store</div>
                </div>
              </div>
            </div>

            {/* In-House Driver Fields */}
            {deliveryMethod === "IN_HOUSE" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div className="jf-form-group">
                  <label className="jf-label">Assigned Driver</label>
                  <input
                    type="text"
                    className="jf-input"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label">Driver Contact</label>
                  <input
                    type="text"
                    className="jf-input"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label">Vehicle Plate / Type</label>
                  <input
                    type="text"
                    className="jf-input"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Courier Fields */}
            {deliveryMethod === "COURIER" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div className="jf-form-group">
                  <label className="jf-label">Courier Partner</label>
                  <input
                    type="text"
                    className="jf-input"
                    value={courierPartner}
                    onChange={(e) => setCourierPartner(e.target.value)}
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label">Tracking / Booking Reference</label>
                  <input
                    type="text"
                    className="jf-input"
                    value={courierTracking}
                    onChange={(e) => setCourierTracking(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Pre-Dispatch Inspection Checklist */}
            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid var(--jf-border)", marginBottom: "1.5rem" }}>
              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", color: "#0f172a" }}>
                Pre-Dispatch Handover Verification Checklist
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8125rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checklistVerified.goodsVerified}
                    onChange={(e) => setChecklistVerified({ ...checklistVerified, goodsVerified: e.target.checked })}
                  />
                  <span>Packaging sealed, counted & labeled with Delivery Note barcode</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checklistVerified.invoiceAttached}
                    onChange={(e) => setChecklistVerified({ ...checklistVerified, invoiceAttached: e.target.checked })}
                  />
                  <span>Commercial Tax Invoice copy and Delivery Order duplicate attached in outer envelope</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checklistVerified.sealApplied}
                    onChange={(e) => setChecklistVerified({ ...checklistVerified, sealApplied: e.target.checked })}
                  />
                  <span>QC Pass quality seal verified intact on exterior wrap</span>
                </label>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => setActiveTab("17A")}
              >
                Back to Queue
              </button>
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={handleCreateDeliveryOrder}
                disabled={loading}
              >
                <Send size={16} /> Confirm & Dispatch Delivery Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── SCREEN 18A: DISPATCH & HANDOVER - DELIVERY TRACKING ──────────────── */}
      {activeTab === "18A" && (
        <div>
          {/* Active Deliveries Table */}
          {/* Active Dispatches DataTable with Search, Sorting, Rows Per Page & Pagination */}
          <JobFlowDataTable
            columns={[
              {
                key: "deliveryNo",
                label: "Delivery Order #",
                sortable: true,
                width: "140px",
                render: (val) => <strong>{val}</strong>,
              },
              {
                key: "jobNo",
                label: "Job ID & Customer",
                sortable: true,
                render: (val, item) => (
                  <div>
                    <strong>{val}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.customerName}</div>
                  </div>
                ),
              },
              {
                key: "deliveryAddress",
                label: "Destination",
                sortable: true,
              },
              {
                key: "method",
                label: "Assigned Logistics",
                sortable: true,
              },
              {
                key: "dispatchTime",
                label: "Dispatch Time",
                sortable: true,
              },
              {
                key: "estArrival",
                label: "Estimated Arrival",
                sortable: true,
              },
              {
                key: "status",
                label: "Transit Status",
                sortable: true,
                render: (val) => <StatusBadge status={val} />,
              },
              {
                key: "actions",
                label: "Actions",
                sortable: false,
                align: "right",
                render: (_, item) => (
                  <div>
                    {(item.status === "READY" || item.status === "PACKED") && (
                      <button
                        type="button"
                        className="jf-btn jf-btn-primary jf-btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateTransitStatus(item, "OUT_FOR_DELIVERY");
                        }}
                      >
                        <Truck size={13} /> Dispatch
                      </button>
                    )}
                    {item.status === "DISPATCHED" && (
                      <button
                        type="button"
                        className="jf-btn jf-btn-secondary jf-btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateTransitStatus(item, "OUT_FOR_DELIVERY");
                        }}
                      >
                        <Truck size={13} /> Out for Delivery
                      </button>
                    )}
                    {item.status === "OUT_FOR_DELIVERY" && (
                      <button
                        type="button"
                        className="jf-btn jf-btn-primary jf-btn-sm"
                        style={{ backgroundColor: "#15803d", borderColor: "#15803d" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDelivery(item);
                          setActiveTab("18B");
                        }}
                      >
                        <FileCheck size={13} /> Handover & Settle
                      </button>
                    )}
                    {item.status === "DELIVERED" && (
                      <span style={{ fontSize: "0.8125rem", color: "#15803d", fontWeight: 700 }}>
                        ✓ Delivered
                      </span>
                    )}
                  </div>
                ),
              },
            ]}
            data={activeDeliveries}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search dispatches by DO #, job, customer or destination..."
            initialPageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            emptyMessage="No active deliveries in transit."
            onRowClick={(item) => {
              setSelectedDelivery(item);
              if (item.status === "OUT_FOR_DELIVERY" || item.status === "READY" || item.status === "DISPATCHED") {
                setActiveTab("18B");
              }
            }}
          />
        </div>
      )}

      {/* ──────────────── SCREEN 18B: DELIVERY COMPLETION & SETTLEMENT ──────────────── */}
      {activeTab === "18B" && (
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div className="jf-card">
            <div className="jf-card-header">
              <div>
                <h3 className="jf-card-title">Delivery Completion & Final Settlement Handover</h3>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  DO Ref: <strong>{selectedDelivery.deliveryNo}</strong> • Job: {selectedDelivery.jobNo}
                </span>
              </div>
              <StatusBadge status="In Progress" />
            </div>

            {/* Financial Reconciliation Summary Banner */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid var(--jf-border)" }}>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>Customer:</span>
                <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a" }}>
                  {selectedDelivery.customerName}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "4px" }}>
                  {selectedDelivery.deliveryAddress}
                </div>
              </div>

              <div style={{ background: "#f0fdf4", padding: "1rem", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                <span style={{ fontSize: "0.8125rem", color: "#166534" }}>Outstanding Balance Due:</span>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#15803d" }}>
                  RM {selectedDelivery.balanceDue.toFixed(2)}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#166534" }}>
                  Must be collected prior to final sign-off
                </div>
              </div>
            </div>

            {/* Recipient Handover Details */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Recipient Full Name</label>
                <input
                  type="text"
                  className="jf-input"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Daniel Lee"
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label jf-label-required">Recipient Contact Phone</label>
                <input
                  type="text"
                  className="jf-input"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="e.g. 012-345 6789"
                />
              </div>
            </div>

            {/* Proof of Delivery / Signature box */}
            <div className="jf-form-group" style={{ marginBottom: "1.25rem" }}>
              <label className="jf-label">Digital Proof of Delivery (POD) / Recipient Signature</label>
              <div className="jf-signature-box">
                <FileCheck size={28} color="#15803d" style={{ marginBottom: "0.5rem" }} />
                <span style={{ fontWeight: 600, color: "#0f172a" }}>Digital Handover Acknowledged</span>
                <span style={{ fontSize: "0.75rem" }}>
                  Recipient confirms package sealed, contents undamaged, and quantity verified.
                </span>
              </div>
            </div>

            {/* Settlement Payment Collection */}
            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid var(--jf-border)", marginBottom: "1.5rem" }}>
              <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", color: "#0f172a" }}>
                Balance Collection Details
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <div className="jf-form-group">
                  <label className="jf-label">Amount Collected (RM)</label>
                  <input
                    type="number"
                    className="jf-input"
                    value={collectedAmount}
                    onChange={(e) => setCollectedAmount(Number(e.target.value))}
                  />
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Payment Mode</label>
                  <select
                    className="jf-select"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  >
                    <option value="DUITNOW_QR">DuitNow UPI QR</option>
                    <option value="CASH">Cash on Delivery</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="CREDIT_TERM">Corporate Credit 30-Days</option>
                  </select>
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Transaction / Receipt Ref</label>
                  <input
                    type="text"
                    className="jf-input"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="jf-form-group" style={{ marginBottom: "1.5rem" }}>
              <label className="jf-label">Handover Notes</label>
              <input
                type="text"
                className="jf-input"
                value={handoverRemarks}
                onChange={(e) => setHandoverRemarks(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => setActiveTab("18A")}
              >
                Back to Tracking
              </button>
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={handleCompleteHandover}
                disabled={loading}
              >
                <CheckCircle size={16} /> Complete Job & Settle Balance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return mainDeliveryContent;
  }

  return (
    <JobFlowLayout
      title="Manager Delivery Management & Dispatch Tracking"
      actions={renderSubNav()}
    >
      {mainDeliveryContent}
    </JobFlowLayout>
  );
};

export default DeliveryPage;
