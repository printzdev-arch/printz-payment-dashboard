import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calculator,
  Palette,
  Layers,
  ShieldCheck,
  Truck,
  Receipt,
  User,
  Calendar,
  Building,
  Check,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Phone,
  Mail,
  Printer,
  Sparkles,
} from "lucide-react";
import StatusBadge from "./StatusBadge";

/**
 * JobOrderProcessDetailModal
 * Displays the complete end-to-end lifecycle process of a Job Order from intake till completion:
 * 1. Intake / Creation -> 2. Estimation & Approval -> 3. Design & Customer Proof ->
 * 4. Dynamic Production -> 5. Quality Control -> 6. Delivery / Dispatch -> 7. Settlement & Rating
 */
export const JobOrderProcessDetailModal = ({ isOpen, onClose, job }) => {
  const [activeStepTab, setActiveStepTab] = useState("all"); // "all" or 1..7

  if (!isOpen || !job) return null;

  const jobNo = job.jobNo || job.orderNumber || "N/A";
  const customerName = job.customerName || job.customerId?.name || job.customerSnapshot?.name || "Customer";
  const customerPhone = job.customerPhone || job.customerSnapshot?.mobile || job.customerId?.mobile || "-";
  const jobTitle = job.title || job.jobTitle || "Print Job";
  const quantity = job.quantity || job.specs?.quantity || 1;
  const stage = (job.stage || job.currentStage || "SUBMITTED").toUpperCase();
  const status = (job.status || job.currentStage || "PENDING").toUpperCase();
  const dueDate = job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "-";
  const createdAtFormatted = job.createdAt ? new Date(job.createdAt).toLocaleString() : "-";

  // Calculate actual numeric progression rank (1..7) strictly based on current stage and status
  const getStageRank = (stg, sts) => {
    const s = String(stg || "").toUpperCase().trim();
    const st = String(sts || "").toUpperCase().trim();

    if (["COMPLETED", "SETTLED", "CLOSED"].includes(s) || ["COMPLETED", "SETTLED", "CLOSED"].includes(st)) {
      return 7;
    }
    if (["DELIVERED", "DELIVERY", "DISPATCH", "DISPATCHED", "READY", "OUT_FOR_DELIVERY"].includes(s) || ["DELIVERED", "READY"].includes(st)) {
      return 6;
    }
    if (["QC", "QUALITY_CHECK", "REWORK", "REPRINT"].includes(s) || st === "QC") {
      return 5;
    }
    if (["PRODUCTION_PLANNING", "PRINTING", "FINISHING", "PACKING", "PRODUCTION", "IN_PRODUCTION"].includes(s) || ["PRODUCTION", "PACKING"].includes(st)) {
      return 4;
    }
    if (["DESIGN_QUEUE", "DESIGN_ASSIGNED", "DESIGN_IN_PROGRESS", "SAMPLE_APPROVAL", "REVISION", "DESIGN", "PROOF_PENDING", "PROOF_APPROVED"].includes(s) || ["DESIGN", "APPROVAL"].includes(st)) {
      return 3;
    }
    if (["ESTIMATION", "ESTIMATE_APPROVAL", "PENDING_ESTIMATE", "ESTIMATE_APPROVED", "PENDING_APPROVAL"].includes(s) || st === "ESTIMATION") {
      return 2;
    }
    return 1;
  };

  const currentRank = getStageRank(stage, status);

  const getStepStatus = (stepRank) => {
    if (stepRank < currentRank) return "COMPLETED";
    if (stepRank === currentRank) {
      if (currentRank === 7 && (stage === "COMPLETED" || status === "COMPLETED" || status === "SETTLED")) {
        return "COMPLETED";
      }
      return "IN_PROGRESS";
    }
    return "PENDING";
  };

  const totalAmount = Number(job.totalAmount || job.grandTotal || job.estimatedPrice || job.estimatedCost || 0);
  const advancePaid = Number(job.advancePaid || 0);
  const balanceRemaining = Math.max(0, totalAmount - advancePaid);
  const designerName = job.designerName || job.designerId?.name || job.currentAssignment?.employeeId?.name || job.designer || "Design Team";

  // Detailed lifecycle process step definitions
  const processSteps = [
    {
      step: 1,
      id: "intake",
      title: "1. Customer Intake & Job Creation",
      icon: FileText,
      stageMatch: "INTAKE",
      status: "COMPLETED",
      timestamp: createdAtFormatted,
      handler: job.createdBy?.name || "Front Desk / Sales Rep",
      details: [
        { label: "Job Title", value: jobTitle },
        { label: "Customer", value: customerName },
        { label: "Phone", value: customerPhone },
        { label: "Quantity", value: `${quantity.toLocaleString()} pcs` },
        { label: "Paper / Material", value: job.specs?.paperType || job.items?.[0]?.paperType || "Standard Stock" },
        { label: "Dimensions / Size", value: job.specs?.size || "Standard" },
        { label: "Finishing Required", value: (job.finishingServices || ["Standard Trimming"]).join(", ") },
        { label: "Delivery Method", value: job.deliveryMethod || "Store Pickup" },
      ],
      notes: job.customerRequirements || job.remarks || "Job order created and registered in system.",
      link: null,
    },
    {
      step: 2,
      id: "estimation",
      title: "2. Cost Estimation & Commercial Approval",
      icon: Calculator,
      stageMatch: "ESTIMATION",
      status: getStepStatus(2),
      timestamp: currentRank >= 2 ? (job.assignedAt ? new Date(job.assignedAt).toLocaleString() : createdAtFormatted) : "Pending Estimation",
      handler: currentRank >= 2 ? (job.estimatedBy?.name || "Branch Manager / Estimator") : "Pending Estimator",
      details: [
        { label: "Material Unit Cost", value: job.items?.[0]?.unitRate ? `RM ${Number(job.items[0].unitRate).toFixed(2)} / pc` : "-" },
        { label: "Total Estimated Quote", value: totalAmount > 0 ? `RM ${totalAmount.toFixed(2)}` : "Pending Quote" },
        { label: "Manager Approval", value: (job.estimationStatus === "APPROVED" || currentRank > 2) ? "Approved" : (currentRank === 2 ? "Pending Approval" : "Pending Estimation") },
        { label: "Advance Payment Paid", value: `RM ${advancePaid.toFixed(2)}` },
        { label: "Payment Method", value: job.paymentMethod || "Cash / Online Transfer" },
        { label: "Outstanding Balance", value: `RM ${balanceRemaining.toFixed(2)}` },
      ],
      notes: currentRank > 2 ? "Cost estimate verified and approved for artwork release." : (currentRank === 2 ? "Estimation review currently in progress." : "Awaiting commercial quote calculation."),
      link: `/jobflow/estimates?jobId=${job._id || job.id}`,
      linkLabel: "Open Estimation Review",
    },
    {
      step: 3,
      id: "design",
      title: "3. Design Work & Customer Proof Approval",
      icon: Palette,
      stageMatch: "DESIGN",
      status: getStepStatus(3),
      timestamp: currentRank >= 3 ? (job.assignedAt ? new Date(job.assignedAt).toLocaleString() : createdAtFormatted) : "Pending Assignment",
      handler: currentRank >= 3 ? designerName : "Design Team (Unassigned)",
      details: [
        { label: "Assigned Designer", value: currentRank >= 3 ? designerName : "Queued for Assignment" },
        {
          label: "Design Status",
          value: currentRank > 3
            ? "Proof Approved by Customer"
            : (stage === "DESIGN_ASSIGNED"
              ? "Assigned - Waiting Designer Acceptance"
              : stage === "DESIGN_IN_PROGRESS"
              ? "In Progress by Designer"
              : stage === "SAMPLE_APPROVAL"
              ? "Customer Proof Pending"
              : "Design Queue"),
        },
        { label: "Proof Version", value: job.latestSample?.versionNo ? `V${job.latestSample.versionNo}` : (currentRank > 3 ? "V1 (Approved)" : "Pending Proof") },
        { label: "Color Space", value: "CMYK (300 DPI Press-Ready)" },
        { label: "Due Date", value: dueDate },
      ],
      notes: currentRank > 3
        ? "Customer approved design proof without alterations."
        : (stage === "DESIGN_ASSIGNED"
          ? "Job order assigned to designer. Awaiting designer acceptance."
          : (currentRank === 3
            ? "Designer preparing artwork proof for client review."
            : "Artwork workflow pending estimation clearance.")),
      link: `/jobflow/design?jobId=${job._id || job.id}`,
      linkLabel: "Open Design Canvas & Proofs",
    },
    {
      step: 4,
      id: "production",
      title: "4. Dynamic Production & Machine Operations",
      icon: Layers,
      stageMatch: "PRODUCTION",
      status: getStepStatus(4),
      timestamp: currentRank >= 4 ? (job.productionStartedAt ? new Date(job.productionStartedAt).toLocaleString() : "In Production") : "Pending Production",
      handler: currentRank >= 4 ? (job.operatorName || "Production Floor Operator") : "Machine Operator (Unassigned)",
      details: [
        { label: "Production Order ID", value: `PO-${jobNo.replace("JO-", "")}` },
        { label: "Assigned Machine", value: currentRank >= 4 ? (job.assignedMachine || "Digital Press Line") : "Pending Machine Allocation" },
        { label: "Routing Stations", value: "Prepress → Printing → Post-Press Finishing" },
        { label: "Operation Status", value: currentRank > 4 ? `Completed (${quantity.toLocaleString()} pcs)` : (currentRank === 4 ? "Live on Machine Floor" : "Queued (Waiting for Design Approval)") },
      ],
      notes: currentRank > 4 ? "Manufacturing and finishing operations completed." : (currentRank === 4 ? "Print job currently running on floor." : "Production operations will begin once design proof is approved."),
      link: `/jobflow/production?jobId=${job._id || job.id}`,
      linkLabel: "View Live Production Queue",
    },
    {
      step: 5,
      id: "qc",
      title: "5. Quality Control & Parameter Inspection",
      icon: ShieldCheck,
      stageMatch: "QC",
      status: getStepStatus(5),
      timestamp: currentRank >= 5 ? (job.qcPassedAt ? new Date(job.qcPassedAt).toLocaleString() : "Under Inspection") : "Pending QC",
      handler: currentRank >= 5 ? (job.qcInspector || "QC Inspector") : "Quality Inspection Desk",
      details: [
        { label: "Inspection Status", value: currentRank > 5 ? "100% Passed (PASS)" : (currentRank === 5 ? "Inspection In Progress" : "Awaiting Production Release") },
        { label: "Color Accuracy Check", value: currentRank > 5 ? "Verified within standard tolerance" : "Pending Check" },
        { label: "Cutting & Bleed Alignment", value: currentRank > 5 ? "Aligned to trim specifications" : "Pending Check" },
        { label: "Inspected Quantity", value: currentRank >= 5 ? `${quantity.toLocaleString()} pcs` : "0 pcs" },
      ],
      notes: currentRank > 5 ? "All quality parameters verified and batch passed inspection." : (currentRank === 5 ? "Quality inspection underway." : "Batch will undergo quality checks after production finishes."),
      link: `/jobflow/qc?jobId=${job._id || job.id}`,
      linkLabel: "View QC Batch Record",
    },
    {
      step: 6,
      id: "delivery",
      title: "6. Dispatch Handover & Customer Delivery",
      icon: Truck,
      stageMatch: "DELIVERY",
      status: getStepStatus(6),
      timestamp: currentRank >= 6 ? (job.dispatchedAt || job.deliveredAt ? new Date(job.dispatchedAt || job.deliveredAt).toLocaleString() : "In Dispatch") : "Pending Dispatch",
      handler: currentRank >= 6 ? (job.courierName || "Courier / Dispatch Staff") : "Dispatch Desk (Unassigned)",
      details: [
        { label: "Delivery Order #", value: `DO-${jobNo.slice(-4)}` },
        { label: "Fulfillment Type", value: job.deliveryMethod || "Store Pickup / Branch Handover" },
        { label: "Packaging Type", value: "Shrink Wrapped / Standard Box" },
        { label: "Receiver Name", value: customerName },
        { label: "Handover Status", value: currentRank > 6 ? "Delivered to Customer" : (currentRank === 6 ? "Ready for Handover / In Transit" : "Pending Packaging & Release") },
      ],
      notes: currentRank > 6 ? "Order successfully dispatched and received." : (currentRank === 6 ? "Goods staged for customer collection / courier." : "Dispatch staged after successful QC approval."),
      link: `/jobflow/delivery?jobId=${job._id || job.id}`,
      linkLabel: "View Delivery Tracking",
    },
    {
      step: 7,
      id: "settlement",
      title: "7. Commercial Settlement, Invoice & Rating",
      icon: Receipt,
      stageMatch: "COMPLETED",
      status: getStepStatus(7),
      timestamp: currentRank >= 7 ? (job.settledAt ? new Date(job.settledAt).toLocaleString() : "Settled") : "Pending Settlement",
      handler: "Cashier & System Auto-Audit",
      details: [
        { label: "Tax Invoice #", value: `INV-${jobNo.slice(-4)}` },
        { label: "Total Invoiced Amount", value: `RM ${totalAmount.toFixed(2)}` },
        { label: "Advance Paid", value: `RM ${advancePaid.toFixed(2)}` },
        { label: "Final Balance Collected", value: `RM ${balanceRemaining.toFixed(2)}` },
        { label: "Commercial Status", value: currentRank >= 7 ? "Fully Reconciled & Closed" : (job.paymentStatus === "PAID" ? "Paid in Full" : "Pending Final Balance") },
      ],
      notes: currentRank >= 7 ? "Order completed, invoiced and settled." : "Commercial account reconciliation will finalize after delivery.",
      link: `/jobflow/settlement?jobId=${job._id || job.id}`,
      linkLabel: "View Settlement Ledger",
    },
  ];

  // Helper to determine badge color for step status
  const getStepStatusBadge = (st) => {
    switch (st) {
      case "COMPLETED":
        return <span className="jf-badge jf-badge-green"><Check size={12} /> Completed</span>;
      case "IN_PROGRESS":
        return <span className="jf-badge jf-badge-amber"><Clock size={12} /> Active In Progress</span>;
      default:
        return <span className="jf-badge" style={{ background: "#f1f5f9", color: "#64748b" }}>Pending</span>;
    }
  };

  const filteredSteps = activeStepTab === "all"
    ? processSteps
    : processSteps.filter((s) => s.step === Number(activeStepTab));

  return (
    <div className="jf-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="jf-modal jf-modal-lg" style={{ maxWidth: "860px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Modal Header */}
        <div className="jf-modal-header" style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--jf-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                backgroundColor: "var(--jf-primary)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 className="jf-modal-title" style={{ fontSize: "1.25rem", margin: 0 }}>
                  {jobNo}
                </h2>
                <span className="jf-badge jf-badge-blue">{stage}</span>
                <StatusBadge status={status} />
              </div>
              <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8125rem", color: "#64748b" }}>
                Client: <strong>{customerName}</strong> • {jobTitle} • Due: {dueDate}
              </p>
            </div>
          </div>

          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div style={{ background: "#f8fafc", padding: "1rem 1.5rem", borderBottom: "1px solid var(--jf-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
            {processSteps.map((st) => {
              const Icon = st.icon;
              const isCompleted = st.status === "COMPLETED";
              const isCurrent = st.status === "IN_PROGRESS";
              const isSelected = activeStepTab === String(st.step);

              let bgColor = "#cbd5e1";
              let textColor = "#64748b";
              if (isCompleted) {
                bgColor = "var(--jf-primary)";
                textColor = "#ffffff";
              } else if (isCurrent) {
                bgColor = "#d97706";
                textColor = "#ffffff";
              }

              return (
                <div
                  key={st.step}
                  onClick={() => setActiveStepTab(activeStepTab === String(st.step) ? "all" : String(st.step))}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                    zIndex: 2,
                    flex: 1,
                    textAlign: "center",
                    opacity: activeStepTab !== "all" && !isSelected ? 0.6 : 1,
                    transition: "all 0.2s ease",
                  }}
                  title={st.title}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor: bgColor,
                      color: textColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "0.35rem",
                      boxShadow: isCurrent ? "0 0 0 4px rgba(217, 119, 6, 0.2)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {isCompleted ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
                  </div>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: isCurrent || isSelected ? 700 : 600,
                      color: isCurrent ? "#b45309" : isCompleted ? "var(--jf-primary)" : "#64748b",
                      maxWidth: "85px",
                      lineHeight: "1.1",
                    }}
                  >
                    {st.title.split(". ")[1]?.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Click any stage above to filter, or view the complete chronological history below.
            </span>
            {activeStepTab !== "all" && (
              <button
                type="button"
                className="jf-btn jf-btn-secondary jf-btn-sm"
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                onClick={() => setActiveStepTab("all")}
              >
                Show All Stages
              </button>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="jf-modal-body" style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {filteredSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="jf-card"
                  style={{
                    marginBottom: 0,
                    borderLeft: `4px solid ${
                      step.status === "COMPLETED"
                        ? "var(--jf-primary)"
                        : step.status === "IN_PROGRESS"
                        ? "#f59e0b"
                        : "#cbd5e1"
                    }`,
                    backgroundColor: step.status === "IN_PROGRESS" ? "#fffbeb" : "#ffffff",
                  }}
                >
                  {/* Step Card Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      borderBottom: "1px solid var(--jf-border)",
                      paddingBottom: "0.75rem",
                      marginBottom: "0.875rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "6px",
                          backgroundColor:
                            step.status === "COMPLETED"
                              ? "#dcfce7"
                              : step.status === "IN_PROGRESS"
                              ? "#fef3c7"
                              : "#f1f5f9",
                          color:
                            step.status === "COMPLETED"
                              ? "#15803d"
                              : step.status === "IN_PROGRESS"
                              ? "#b45309"
                              : "#64748b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--jf-text)" }}>
                          {step.title}
                        </h4>
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          Handler: <strong>{step.handler}</strong> • {step.timestamp}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {getStepStatusBadge(step.status)}
                      {step.link && (
                        <Link
                          to={step.link}
                          className="jf-btn jf-btn-secondary jf-btn-sm"
                          style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                          onClick={onClose}
                        >
                          {step.linkLabel} <ArrowRight size={12} />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Step Attributes Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "0.75rem",
                      fontSize: "0.8125rem",
                    }}
                  >
                    {step.details.map((d, dIdx) => (
                      <div
                        key={dIdx}
                        style={{
                          background: step.status === "IN_PROGRESS" ? "#ffffff" : "#f8fafc",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "6px",
                          border: "1px solid var(--jf-border)",
                        }}
                      >
                        <span style={{ color: "#64748b", fontSize: "0.75rem", display: "block", marginBottom: "2px" }}>
                          {d.label}:
                        </span>
                        <strong style={{ color: "#0f172a" }}>{d.value}</strong>
                      </div>
                    ))}
                  </div>

                  {/* Step Operational Notes */}
                  {step.notes && (
                    <div
                      style={{
                        marginTop: "0.75rem",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "6px",
                        background: "rgba(226, 232, 240, 0.4)",
                        fontSize: "0.78125rem",
                        color: "#475569",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      <Sparkles size={14} style={{ color: "var(--jf-primary)", flexShrink: 0 }} />
                      <span>{step.notes}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="jf-modal-footer"
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--jf-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
            Lifecycle Status: <strong>{stage}</strong> ({status})
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobOrderProcessDetailModal;
