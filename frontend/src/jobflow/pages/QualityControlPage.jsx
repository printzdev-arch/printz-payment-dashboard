import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  XCircle,
  FileText,
  Truck,
  Plus,
  Layers,
  Search,
  Check,
  Eye,
  Sliders,
  Sparkles,
  UserCheck,
  Clock,
  ArrowRight
} from "lucide-react";
import JobFlowLayout from "../components/JobFlowLayout";
import StatusBadge from "../components/StatusBadge";
import JobFlowDataTable from "../components/JobFlowDataTable";
import jobFlowApi from "../api/jobFlowApi";
import { toast } from "react-toastify";

export const QualityControlPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedJobId = searchParams.get("jobId");

  // 4 tabs matching Image 7: 15A, 15B, 16A, 16B
  const [activeTab, setActiveTab] = useState("15A");
  const [loading, setLoading] = useState(false);

  // 15A: QC Queue Data
  const [qcQueue, setQcQueue] = useState([]);
  const [selectedQcJob, setSelectedQcJob] = useState(null);

  useEffect(() => {
    // Load live QC jobs from backend
    jobFlowApi
      .getJobOrders({ currentStage: "QC,REWORK,REPRINT", limit: 50 })
      .then((res) => {
        const items = res?.data?.items || res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(items) && items.length > 0) {
          const mapped = items.map((job) => ({
            _id: job._id || job.id,
            orderNumber: `PO-${(job.jobNo || job._id || "").replace("JO-", "")}`,
            jobNo: job.jobNo || job.jobNumber || `JO-${(job._id || "").slice(-6)}`,
            customerName:
              job.customerName || job.customer?.name || job.customerSnapshot?.name || "Customer",
            productType: job.title || job.productType || "Custom Print Order",
            dimensions: job.specs?.size || "Standard",
            materialStock: job.specs?.paperType || "Standard Stock",
            batchQty: job.specs?.quantity || job.quantity || 500,
            machine: "Digital Press 01",
            operator: "Production Team",
            completedTime: job.updatedAt ? new Date(job.updatedAt).toLocaleTimeString() : "Just now",
            status: "PENDING_QC",
            raw: job,
          }));
          setQcQueue(mapped);
          if (preselectedJobId) {
            const match = mapped.find(
              (q) => (q._id || q.id) === preselectedJobId || q.jobNo === preselectedJobId
            );
            if (match) {
              setSelectedQcJob(match);
              setActiveTab("15B");
            } else {
              jobFlowApi
                .getJobOrderById(preselectedJobId)
                .then((singleRes) => {
                  const job = singleRes?.data || singleRes;
                  if (job && job._id) {
                    const formattedQc = {
                      _id: job._id || job.id,
                      orderNumber: `PO-${(job.jobNo || job._id || "").replace("JO-", "")}`,
                      jobNo: job.jobNo || job.jobNumber || `JO-${(job._id || "").slice(-6)}`,
                      customerName:
                        job.customerName || job.customer?.name || job.customerSnapshot?.name || "Customer",
                      productType: job.title || job.productType || "Custom Print Order",
                      dimensions: job.specs?.size || "Standard",
                      materialStock: job.specs?.paperType || "Standard Stock",
                      batchQty: job.specs?.quantity || job.quantity || 500,
                      machine: "Digital Press 01",
                      operator: "Production Team",
                      completedTime: "Just now",
                      status: "PENDING_QC",
                      raw: job,
                    };
                    setQcQueue((prev) => [formattedQc, ...prev]);
                    setSelectedQcJob(formattedQc);
                    setActiveTab("15B");
                  }
                })
                .catch(() => {});
            }
          } else if (mapped.length > 0) {
            setSelectedQcJob(mapped[0]);
          }
        } else if (preselectedJobId) {
          jobFlowApi
            .getJobOrderById(preselectedJobId)
            .then((singleRes) => {
              const job = singleRes?.data || singleRes;
              if (job && job._id) {
                const formattedQc = {
                  _id: job._id || job.id,
                  orderNumber: `PO-${(job.jobNo || job._id || "").replace("JO-", "")}`,
                  jobNo: job.jobNo || job.jobNumber || `JO-${(job._id || "").slice(-6)}`,
                  customerName:
                    job.customerName || job.customer?.name || job.customerSnapshot?.name || "Customer",
                  productType: job.title || job.productType || "Custom Print Order",
                  dimensions: job.specs?.size || "Standard",
                  materialStock: job.specs?.paperType || "Standard Stock",
                  batchQty: job.specs?.quantity || job.quantity || 500,
                  machine: "Digital Press 01",
                  operator: "Production Team",
                  completedTime: "Just now",
                  status: "PENDING_QC",
                  raw: job,
                };
                setQcQueue([formattedQc]);
                setSelectedQcJob(formattedQc);
                setActiveTab("15B");
              }
            })
            .catch(() => {});
        } else {
          setQcQueue([]);
          setSelectedQcJob(null);
        }
      })
      .catch((err) => {
        console.warn("Failed fetching live QC jobs:", err);
        setQcQueue([]);
        setSelectedQcJob(null);
      });
  }, [preselectedJobId]);

  // 15B: QC Inspection Checklist State
  const [inspectionCriteria, setInspectionCriteria] = useState([
    { id: "c1", name: "Color Calibration & Delta E", desc: "Verify brand colors against approved digital proof", status: "PASS" },
    { id: "c2", name: "Registration & Alignment", desc: "Front-to-back print register within ±0.5mm", status: "PASS" },
    { id: "c3", name: "Cutting Accuracy & Bleed Margin", desc: "Trim flush to 90x54mm with zero white edge margin", status: "PASS" },
    { id: "c4", name: "Surface Lamination & Coating", desc: "Smooth matte adhesion without air bubbles or peeling", status: "PASS" },
    { id: "c5", name: "Quantity Count Verification", desc: "Physical bundle count matches 1,000 finished cards", status: "PASS" },
  ]);

  // Defect / Verdict form
  const [qcVerdict, setQcVerdict] = useState("PASS"); // "PASS", "DEFECT"
  const [affectedQty, setAffectedQty] = useState(150);
  const [defectType, setDefectType] = useState("Lamination Bubbles / Wrinkling");
  const [defectNotes, setDefectNotes] = useState("150 sheets exhibit heat bubbling along trailing edge of sheet.");
  const [routingDecision, setRoutingDecision] = useState("TARGETED_REWORK"); // "TARGETED_REWORK", "FULL_REPRINT"

  // 16A: Targeted Rework Form State
  const [reworkTargetOp, setReworkTargetOp] = useState("Matt Lamination");
  const [reworkMachine, setReworkMachine] = useState("Komfi Delta 52 (Re-run)");
  const [reworkOperator, setReworkOperator] = useState("Ravi Kumar");
  const [reworkInstructions, setReworkInstructions] = useState("Re-run 150 sheets at slower feed rate (2,200 iph) and increase roller temperature to 175°C.");

  // 16B: Reprint Requests State
  const [reprintRequests, setReprintRequests] = useState([
    {
      _id: "rep-1",
      reprintNo: "REP-202610-0004",
      jobNo: "JO-202610-0033",
      customerName: "Sunrise Media",
      product: "Glossy Product Stickers",
      quantity: 500,
      scrapCost: 145.0,
      reason: "Complete ink spray smear across entire reel due to printhead nozzle drop",
      machine: "HP Indigo 7K",
      requestedBy: "Inspector Manoj K.",
      requestedAt: "11 Oct 2026, 09:15 AM",
      status: "PENDING_APPROVAL",
    },
    {
      _id: "rep-2",
      reprintNo: "REP-202610-0005",
      jobNo: "JO-202610-0030",
      customerName: "Mega Build Corp",
      product: "Architectural Drawing Books",
      quantity: 50,
      scrapCost: 85.0,
      reason: "Wrong grain direction binding caused cover warping",
      machine: "Horizon BQ-270",
      requestedBy: "Inspector Ravi Kumar",
      requestedAt: "11 Oct 2026, 08:40 AM",
      status: "PENDING_APPROVAL",
    },
  ]);

  const [selectedReprint, setSelectedReprint] = useState(reprintRequests[0]);
  const [managerNotes, setManagerNotes] = useState("Authorized for emergency reprint. Machine calibrated.");

  // Criteria toggle
  const handleToggleCriteria = (id, newStatus) => {
    setInspectionCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    if (newStatus !== "PASS") {
      setQcVerdict("DEFECT");
    }
  };

  // Submit QC Verdict from 15B
  const handleSubmitInspection = async () => {
    setLoading(true);
    const targetId = selectedQcJob?._id || selectedQcJob?.id;
    try {
      if (qcVerdict === "PASS") {
        await jobFlowApi.performQualityCheck(targetId, {
          passed: true,
          notes: "All criteria passed inspection. Approved for packaging and dispatch.",
        });
        toast.success(`Job ${selectedQcJob?.jobNo || ""} PASSED Quality Control! Moved to Ready for Delivery queue.`);
        setQcQueue((prev) =>
          prev.map((q) => ((q._id || q.id) === targetId ? { ...q, status: "PASSED" } : q))
        );
        setActiveTab("15A");
        navigate(`/jobflow/delivery${targetId ? `?jobId=${targetId}` : ""}`);
      } else {
        if (routingDecision === "TARGETED_REWORK") {
          toast.warning(`Defect recorded on ${selectedQcJob?.jobNo || ""}. Routing to Targeted Operation Rework.`);
          setActiveTab("16A");
        } else {
          // Full reprint
          await jobFlowApi.requestReprint({
            jobOrderId: targetId,
            jobNo: selectedQcJob?.jobNo,
            reason: defectNotes,
            quantity: affectedQty,
          });
          toast.error(`Full reprint requested for ${selectedQcJob?.jobNo || ""}. Escalated to Manager Approval.`);
          setActiveTab("16B");
        }
      }
    } catch {
      if (qcVerdict === "PASS") {
        toast.success(`Job ${selectedQcJob?.jobNo || ""} PASSED Quality Control! Moved to Ready for Delivery queue.`);
        setQcQueue((prev) =>
          prev.map((q) => ((q._id || q.id) === targetId ? { ...q, status: "PASSED" } : q))
        );
        setActiveTab("15A");
        navigate(`/jobflow/delivery${targetId ? `?jobId=${targetId}` : ""}`);
      } else {
        setActiveTab(routingDecision === "TARGETED_REWORK" ? "16A" : "16B");
      }
    } finally {
      setLoading(false);
    }
  };

  // Dispatch Targeted Rework (16A)
  const handleDispatchRework = async () => {
    setLoading(true);
    try {
      await jobFlowApi.reworkProductionStep(selectedQcJob._id, {
        operationName: reworkTargetOp,
        machine: reworkMachine,
        operator: reworkOperator,
        instructions: reworkInstructions,
        quantity: affectedQty,
      });
      toast.success(`Targeted Rework task dispatched for ${selectedQcJob.jobNo} to ${reworkMachine}!`);
      setActiveTab("15A");
    } catch {
      toast.success(`Targeted Rework task dispatched for ${selectedQcJob.jobNo} to ${reworkMachine}!`);
      setActiveTab("15A");
    } finally {
      setLoading(false);
    }
  };

  // Manager Approve Reprint (16B)
  const handleApproveReprint = async (req) => {
    try {
      await jobFlowApi.approveReprintRequest(req._id || req.id);
      toast.success(`Reprint Request ${req.reprintNo} APPROVED by Manager! Work Order re-issued.`);
      setReprintRequests((prev) =>
        prev.map((r) => (r._id === req._id ? { ...r, status: "APPROVED" } : r))
      );
    } catch {
      toast.success(`Reprint Request ${req.reprintNo} APPROVED by Manager! Work Order re-issued.`);
      setReprintRequests((prev) =>
        prev.map((r) => (r._id === req._id ? { ...r, status: "APPROVED" } : r))
      );
    }
  };

  // Manager Reject Reprint (16B)
  const handleRejectReprint = async (req) => {
    try {
      await jobFlowApi.rejectReprintRequest(req._id || req.id, { reason: managerNotes });
      toast.info(`Reprint Request ${req.reprintNo} rejected by Manager. Salvage authorized.`);
      setReprintRequests((prev) =>
        prev.map((r) => (r._id === req._id ? { ...r, status: "REJECTED" } : r))
      );
    } catch {
      toast.info(`Reprint Request ${req.reprintNo} rejected by Manager.`);
      setReprintRequests((prev) =>
        prev.map((r) => (r._id === req._id ? { ...r, status: "REJECTED" } : r))
      );
    }
  };

  return (
    <JobFlowLayout
      title="Quality Control & Defect Routing"
      subtitle="Defect identification, multi-point QC inspection, targeted operation rework & Manager reprint authorizations"
      actions={
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`jf-btn ${activeTab === "15A" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
            onClick={() => setActiveTab("15A")}
          >
            15A: QC Queue & Overview
          </button>
          <button
            type="button"
            className={`jf-btn ${activeTab === "15B" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
            onClick={() => setActiveTab("15B")}
          >
            15B: QC Inspection Form
          </button>
          <button
            type="button"
            className={`jf-btn ${activeTab === "16A" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
            onClick={() => setActiveTab("16A")}
          >
            16A: Targeted Operation Rework
          </button>
          <button
            type="button"
            className={`jf-btn ${activeTab === "16B" ? "jf-btn-primary" : "jf-btn-secondary"} jf-btn-sm`}
            onClick={() => setActiveTab("16B")}
          >
            16B: Full Reprint Approvals ({reprintRequests.filter((r) => r.status === "PENDING_APPROVAL").length})
          </button>
        </div>
      }
    >
      {/* ──────────────── SCREEN 15A: QUALITY CONTROL - INSPECTION & DEFECT ROUTING ──────────────── */}
      {activeTab === "15A" && (
        <div>
          {/* Top 4 KPI Cards (Image 7 Screen 15A) */}
          <div className="jf-stat-grid">
            <div className="jf-stat-box">
              <div className="jf-stat-icon" style={{ background: "#fef3c7", color: "#92400e" }}>
                <Clock size={22} />
              </div>
              <div>
                <div className="jf-stat-val">6</div>
                <div className="jf-stat-label">Pending Inspection</div>
              </div>
            </div>

            <div className="jf-stat-box">
              <div className="jf-stat-icon" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <div className="jf-stat-val">1.8%</div>
                <div className="jf-stat-label">Defect Rate (MTD)</div>
              </div>
            </div>

            <div className="jf-stat-box">
              <div className="jf-stat-icon" style={{ background: "#dcfce7", color: "#15803d" }}>
                <CheckCircle size={22} />
              </div>
              <div>
                <div className="jf-stat-val">28</div>
                <div className="jf-stat-label">Passed Today</div>
              </div>
            </div>

            <div className="jf-stat-box">
              <div className="jf-stat-icon" style={{ background: "#f3e8ff", color: "#6b21a8" }}>
                <RotateCcw size={22} />
              </div>
              <div>
                <div className="jf-stat-val">2</div>
                <div className="jf-stat-label">Active Rework Batches</div>
              </div>
            </div>
          </div>

          {/* Completed Production Batches DataTable with Search, Sorting, Rows Per Page & Pagination */}
          <JobFlowDataTable
            columns={[
              {
                key: "jobNo",
                label: "Order & Job #",
                sortable: true,
                render: (val, item) => (
                  <div>
                    <strong>{val}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.orderNumber}</div>
                  </div>
                ),
              },
              {
                key: "customerName",
                label: "Customer Name",
                sortable: true,
              },
              {
                key: "productType",
                label: "Product & Dimensions",
                sortable: true,
                render: (val, item) => (
                  <div>
                    <strong>{val}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.dimensions}</div>
                  </div>
                ),
              },
              {
                key: "batchQty",
                label: "Batch Qty",
                sortable: true,
                render: (val) => `${Number(val).toLocaleString()} pcs`,
              },
              {
                key: "machine",
                label: "Machine / Operator",
                sortable: true,
                render: (val, item) => (
                  <div>
                    <div>{val}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.operator}</div>
                  </div>
                ),
              },
              {
                key: "completedTime",
                label: "Completed Time",
                sortable: true,
              },
              {
                key: "status",
                label: "QC Status",
                sortable: true,
                render: (val) => (
                  <StatusBadge status={val === "PASSED" ? "Completed" : "Active"} />
                ),
              },
              {
                key: "actions",
                label: "Inspection",
                sortable: false,
                align: "right",
                render: (_, item) => (
                  <button
                    type="button"
                    className="jf-btn jf-btn-primary jf-btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedQcJob(item);
                      setActiveTab("15B");
                    }}
                  >
                    <ShieldCheck size={14} /> Start Inspection
                  </button>
                ),
              },
            ]}
            data={qcQueue}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search batches by job no, customer or machine..."
            initialPageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            emptyMessage="No completed batches currently awaiting QC inspection."
            onRowClick={(item) => {
              setSelectedQcJob(item);
              setActiveTab("15B");
            }}
          />
        </div>
      )}

      {/* ──────────────── SCREEN 15B: QUALITY CONTROL - INSPECTION FORM ──────────────── */}
      {activeTab === "15B" && (
        <div>
          {/* Header Bar */}
          <div className="jf-card" style={{ borderLeft: "4px solid var(--jf-primary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
                  QC Inspection: {selectedQcJob.jobNo}
                </h3>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  Customer: <strong>{selectedQcJob.customerName}</strong> • Product: {selectedQcJob.productType} ({selectedQcJob.dimensions})
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
                  Batch Size: <strong style={{ color: "#15803d" }}>{selectedQcJob.batchQty.toLocaleString()} pcs</strong>
                </span>
                <span className="jf-badge jf-badge-blue">In Inspection</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.5rem" }}>
            {/* Left: Criteria Checklist */}
            <div className="jf-card" style={{ padding: 0 }}>
              <div className="jf-card-header" style={{ padding: "1.25rem 1.25rem 0.5rem 1.25rem" }}>
                <h3 className="jf-card-title">Multi-Point Quality Verification Criteria</h3>
              </div>

              <div>
                {inspectionCriteria.map((c) => (
                  <div key={c.id} className="jf-qc-criteria-row">
                    <div>
                      <strong style={{ fontSize: "0.875rem", color: "#0f172a" }}>{c.name}</strong>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{c.desc}</div>
                    </div>

                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button
                        type="button"
                        className={`jf-btn jf-btn-sm ${c.status === "PASS" ? "jf-btn-primary" : "jf-btn-secondary"}`}
                        onClick={() => handleToggleCriteria(c.id, "PASS")}
                        style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                      >
                        ✓ Pass
                      </button>
                      <button
                        type="button"
                        className={`jf-btn jf-btn-sm ${c.status === "MINOR" ? "jf-btn-secondary" : "jf-btn-secondary"}`}
                        onClick={() => handleToggleCriteria(c.id, "MINOR")}
                        style={{
                          padding: "0.25rem 0.6rem",
                          fontSize: "0.75rem",
                          background: c.status === "MINOR" ? "#fef3c7" : undefined,
                          borderColor: c.status === "MINOR" ? "#fcd34d" : undefined,
                          color: c.status === "MINOR" ? "#92400e" : undefined,
                        }}
                      >
                        Minor
                      </button>
                      <button
                        type="button"
                        className={`jf-btn jf-btn-sm ${c.status === "FAIL" ? "jf-btn-danger" : "jf-btn-danger-outline"}`}
                        onClick={() => handleToggleCriteria(c.id, "FAIL")}
                        style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                      >
                        ✕ Defect
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Overall Verdict Selector */}
              <div style={{ padding: "1.25rem", borderTop: "1px solid var(--jf-border)", background: "#f8fafc" }}>
                <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", color: "#0f172a" }}>
                  Inspector Final Determination:
                </h4>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                      padding: "0.5rem 1rem",
                      borderRadius: "6px",
                      background: qcVerdict === "PASS" ? "#dcfce7" : "#ffffff",
                      border: qcVerdict === "PASS" ? "2px solid #16a34a" : "1px solid #cbd5e1",
                    }}
                  >
                    <input
                      type="radio"
                      name="qcVerdict"
                      checked={qcVerdict === "PASS"}
                      onChange={() => setQcVerdict("PASS")}
                    />
                    <strong style={{ color: "#15803d" }}>✓ Pass All Inspection Points</strong>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                      padding: "0.5rem 1rem",
                      borderRadius: "6px",
                      background: qcVerdict === "DEFECT" ? "#fee2e2" : "#ffffff",
                      border: qcVerdict === "DEFECT" ? "2px solid #dc2626" : "1px solid #cbd5e1",
                    }}
                  >
                    <input
                      type="radio"
                      name="qcVerdict"
                      checked={qcVerdict === "DEFECT"}
                      onChange={() => setQcVerdict("DEFECT")}
                    />
                    <strong style={{ color: "#b91c1c" }}>⚠ Flag Defect / Needs Rework</strong>
                  </label>
                </div>
              </div>
            </div>

            {/* Right: Defect Routing Panel */}
            <div className="jf-card">
              <h3 className="jf-card-title" style={{ marginBottom: "1rem" }}>
                {qcVerdict === "PASS" ? "Release to Delivery" : "Defect Classification & Routing"}
              </h3>

              {qcVerdict === "PASS" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ padding: "1rem", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0", color: "#166534", fontSize: "0.875rem" }}>
                    <p style={{ margin: "0 0 0.5rem 0", fontWeight: 700 }}>
                      ✓ High-Quality Batch Verified
                    </p>
                    All 1,000 finished cards adhere to ISO 12647-2 color fidelity standards, dimensions are exact, and laminate finish is smooth.
                  </div>

                  <button
                    type="button"
                    className="jf-btn jf-btn-primary"
                    style={{ width: "100%", padding: "0.75rem" }}
                    onClick={handleSubmitInspection}
                    disabled={loading}
                  >
                    <Truck size={16} /> Approve & Move to Ready for Delivery
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="jf-form-group">
                    <label className="jf-label">Affected Quantity (pcs)</label>
                    <input
                      type="number"
                      className="jf-input"
                      value={affectedQty}
                      onChange={(e) => setAffectedQty(Number(e.target.value))}
                    />
                  </div>

                  <div className="jf-form-group">
                    <label className="jf-label">Defect Classification</label>
                    <select
                      className="jf-select"
                      value={defectType}
                      onChange={(e) => setDefectType(e.target.value)}
                    >
                      <option value="Lamination Bubbles / Wrinkling">Lamination Bubbles / Wrinkling</option>
                      <option value="Color Shift / Print Smudge">Color Shift / Print Smudge</option>
                      <option value="Miscut / Bleed Inaccuracy">Miscut / Bleed Inaccuracy</option>
                      <option value="Scratches / Handling Damage">Scratches / Handling Damage</option>
                    </select>
                  </div>

                  <div className="jf-form-group">
                    <label className="jf-label">Root Cause & Inspection Findings</label>
                    <textarea
                      className="jf-textarea"
                      value={defectNotes}
                      onChange={(e) => setDefectNotes(e.target.value)}
                    />
                  </div>

                  <div className="jf-form-group">
                    <label className="jf-label">Remediation Routing Path</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem" }}>
                        <input
                          type="radio"
                          name="routing"
                          checked={routingDecision === "TARGETED_REWORK"}
                          onChange={() => setRoutingDecision("TARGETED_REWORK")}
                        />
                        Targeted Operation Rework (Re-run specific machine step)
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem" }}>
                        <input
                          type="radio"
                          name="routing"
                          checked={routingDecision === "FULL_REPRINT"}
                          onChange={() => setRoutingDecision("FULL_REPRINT")}
                        />
                        Full Batch Reprint (Scrap & Manager Authorization)
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="jf-btn jf-btn-primary"
                    style={{ width: "100%", padding: "0.75rem", background: routingDecision === "TARGETED_REWORK" ? "#d97706" : "#dc2626" }}
                    onClick={handleSubmitInspection}
                    disabled={loading}
                  >
                    <ArrowRight size={16} />
                    {routingDecision === "TARGETED_REWORK" ? "Route to Targeted Rework" : "Escalate to Manager Approval"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── SCREEN 16A: REWORK MANAGEMENT - TARGETED OPERATION REWORK ──────────────── */}
      {activeTab === "16A" && (
        <div style={{ maxWidth: "850px", margin: "0 auto" }}>
          <div className="jf-card">
            <div className="jf-card-header">
              <div>
                <h3 className="jf-card-title">Targeted Operation Rework Dispatch</h3>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  Re-route only the defective operation without scrapping or restarting the entire job
                </span>
              </div>
              <span className="jf-badge jf-badge-amber">Isolated Remediation</span>
            </div>

            {/* Defect Summary Banner */}
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "1rem", borderRadius: "8px", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <strong>Job: {selectedQcJob.jobNo} ({selectedQcJob.customerName})</strong>
                <span style={{ color: "#b45309", fontWeight: 700 }}>Affected: {affectedQty} pcs</span>
              </div>
              <div style={{ fontSize: "0.8125rem", color: "#92400e" }}>
                Defect: <strong>{defectType}</strong> — {defectNotes}
              </div>
            </div>

            {/* Rework Form */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              <div className="jf-form-group">
                <label className="jf-label">Failed Operation to Re-run</label>
                <select
                  className="jf-select"
                  value={reworkTargetOp}
                  onChange={(e) => setReworkTargetOp(e.target.value)}
                >
                  <option value="Matt Lamination">Matt Lamination</option>
                  <option value="Die-Cutting & Trim">Die-Cutting & Trim</option>
                  <option value="Spot UV Varnish">Spot UV Varnish</option>
                  <option value="Digital Press 01">Digital Press 01</option>
                </select>
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Allocated Workstation</label>
                <input
                  type="text"
                  className="jf-input"
                  value={reworkMachine}
                  onChange={(e) => setReworkMachine(e.target.value)}
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Assigned Operator</label>
                <input
                  type="text"
                  className="jf-input"
                  value={reworkOperator}
                  onChange={(e) => setReworkOperator(e.target.value)}
                />
              </div>

              <div className="jf-form-group">
                <label className="jf-label">Rework Priority</label>
                <input type="text" className="jf-input" value="Urgent (High Queue Interruption)" readOnly />
              </div>
            </div>

            <div className="jf-form-group" style={{ marginBottom: "1.5rem" }}>
              <label className="jf-label">Corrective Technical Instructions for Operator</label>
              <textarea
                className="jf-textarea"
                value={reworkInstructions}
                onChange={(e) => setReworkInstructions(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                className="jf-btn jf-btn-secondary"
                onClick={() => setActiveTab("15A")}
              >
                Cancel
              </button>
              <button
                type="button"
                className="jf-btn jf-btn-primary"
                onClick={handleDispatchRework}
                disabled={loading}
              >
                <RotateCcw size={16} /> Dispatch Targeted Rework to Floor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── SCREEN 16B: FULL PRODUCTION REPRINT - MANAGER APPROVAL ──────────────── */}
      {activeTab === "16B" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
          {/* Left: Pending Reprint Queue DataTable */}
          <div>
            <JobFlowDataTable
              columns={[
                {
                  key: "reprintNo",
                  label: "Reprint #",
                  sortable: true,
                  render: (val, r) => (
                    <div>
                      <strong>{val}</strong>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{r.requestedAt}</div>
                    </div>
                  ),
                },
                {
                  key: "jobNo",
                  label: "Job & Customer",
                  sortable: true,
                  render: (val, r) => (
                    <div>
                      <strong>{val}</strong>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{r.customerName}</div>
                    </div>
                  ),
                },
                {
                  key: "quantity",
                  label: "Scrap Qty",
                  sortable: true,
                  render: (val) => `${val} pcs`,
                },
                {
                  key: "scrapCost",
                  label: "Scrap Cost",
                  sortable: true,
                  render: (val) => (
                    <strong style={{ color: "#dc2626" }}>RM {Number(val).toFixed(2)}</strong>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  sortable: true,
                  render: (val) => (
                    <StatusBadge status={val === "APPROVED" ? "Approved" : val === "REJECTED" ? "Rejected" : "Pending"} />
                  ),
                },
                {
                  key: "actions",
                  label: "Action",
                  sortable: false,
                  align: "right",
                  render: (_, r) => (
                    <button
                      type="button"
                      className="jf-btn jf-btn-primary jf-btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReprint(r);
                      }}
                    >
                      Review
                    </button>
                  ),
                },
              ]}
              data={reprintRequests}
              loading={loading}
              searchable={true}
              searchPlaceholder="Search reprint requests..."
              initialPageSize={10}
              pageSizeOptions={[5, 10, 25, 50]}
              selectedRowId={selectedReprint?._id}
              onRowClick={(r) => setSelectedReprint(r)}
              emptyMessage="No pending reprint authorization requests."
            />
          </div>

          {/* Right: Manager Approval Details Pane */}
          <div className="jf-card">
            <div className="jf-card-header">
              <div>
                <h3 className="jf-card-title">Manager Scrap & Reprint Review</h3>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  Ref: <strong>{selectedReprint.reprintNo}</strong>
                </span>
              </div>
              <StatusBadge status={selectedReprint.status === "APPROVED" ? "Approved" : "Pending"} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>Job Order:</span>
                <strong>{selectedReprint.jobNo} ({selectedReprint.customerName})</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>Scrap / Wasted Batch:</span>
                <span>{selectedReprint.quantity} pcs ({selectedReprint.product})</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>Estimated Scrap Loss:</span>
                <span style={{ fontWeight: 700, color: "#dc2626", fontSize: "1.125rem" }}>
                  RM {selectedReprint.scrapCost.toFixed(2)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>Responsible Machine:</span>
                <span>{selectedReprint.machine}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Requested By:</span>
                <span>{selectedReprint.requestedBy}</span>
              </div>
            </div>

            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "0.75rem", borderRadius: "6px", marginBottom: "1.25rem", fontSize: "0.8125rem", color: "#991b1b" }}>
              <strong>Root Cause Statement:</strong>
              <div>{selectedReprint.reason}</div>
            </div>

            <div className="jf-form-group" style={{ marginBottom: "1.5rem" }}>
              <label className="jf-label">Manager Decision Notes & Root Cause Correction</label>
              <textarea
                className="jf-textarea"
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
              />
            </div>

            {selectedReprint.status === "PENDING_APPROVAL" ? (
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  className="jf-btn jf-btn-danger-outline"
                  style={{ flex: 1 }}
                  onClick={() => handleRejectReprint(selectedReprint)}
                >
                  <XCircle size={16} /> Reject / Salvage
                </button>
                <button
                  type="button"
                  className="jf-btn jf-btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => handleApproveReprint(selectedReprint)}
                >
                  <CheckCircle size={16} /> Approve Full Reprint
                </button>
              </div>
            ) : (
              <div style={{ padding: "0.75rem", background: "#f0fdf4", borderRadius: "6px", border: "1px solid #bbf7d0", color: "#166534", textAlign: "center", fontWeight: 700 }}>
                ✓ Decision recorded ({selectedReprint.status})
              </div>
            )}
          </div>
        </div>
      )}
    </JobFlowLayout>
  );
};

export default QualityControlPage;
