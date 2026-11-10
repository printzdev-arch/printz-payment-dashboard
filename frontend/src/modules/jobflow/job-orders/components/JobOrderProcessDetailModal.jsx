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
} from "lucide-react";
import StatusBadge from "../../shared/components/StatusBadge";

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
  const rawJobType = String(job.jobType || job.specs?.jobType || "").toUpperCase();
  const isPrintOnly = rawJobType.includes("PRINT") && !rawJobType.includes("DESIGN");
  const isDesignOnly = rawJobType.includes("DESIGN") && !rawJobType.includes("PRINT");
  const stage = (job.stage || job.currentStage || "SUBMITTED").toUpperCase();
  const status = (job.status || job.currentStage || "PENDING").toUpperCase();
  const isCompletedStage =
    ["COMPLETED", "SETTLED", "CLOSED"].includes(stage) ||
    ["COMPLETED", "SETTLED", "CLOSED"].includes(status);
  const isDesignOnlyCompleted = isDesignOnly && isCompletedStage;

  const displayStage = stage;
  const displayStatus = status;
  const dueDate = job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "-";
  const createdAtFormatted = job.createdAt ? new Date(job.createdAt).toLocaleString() : "-";

  // Calculate actual numeric progression rank strictly based on current stage and status
  const getStageRank = (stg, sts) => {
    if (isDesignOnly) {
      if (isCompletedStage || (currentRank === 6 && balanceRemaining <= 0)) return 6;
      const s = String(stg || "").toUpperCase().trim();
      const st = String(sts || "").toUpperCase().trim();
      if (["COMPLETED", "SETTLED", "CLOSED"].includes(s) || ["COMPLETED", "SETTLED", "CLOSED"].includes(st)) {
        return 6;
      }
      if (job.designStatus === "COMPLETED" || ["READY", "SETTLEMENT", "BILLING"].includes(s) || ["READY", "SETTLEMENT"].includes(st)) {
        return 6;
      }
      if (["DESIGN_QUEUE", "DESIGN_ASSIGNED", "DESIGN_IN_PROGRESS", "SAMPLE_APPROVAL", "REVISION", "DESIGN", "PROOF_PENDING", "PROOF_APPROVED"].includes(s) || ["DESIGN", "APPROVAL"].includes(st)) {
        return 5;
      }
      if (["INVOICE", "ADVANCE_PAID", "DEPOSIT"].includes(s) || ["INVOICE"].includes(st) || job.invoiceId || job.invoiceNo || advancePaid > 0) {
        return 4;
      }
      if (["ESTIMATION", "ESTIMATE_APPROVAL", "PENDING_ESTIMATE", "ESTIMATE_APPROVED", "PENDING_APPROVAL"].includes(s) || st === "ESTIMATION" || job.estimationStatus === "APPROVED") {
        return 3;
      }
      return 2;
    }

    if (isCompletedStage) return 7;
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
    if (isDesignOnly) {
      if (stepRank === 1 || stepRank === 2) return "COMPLETED";
      if (stepRank === 3) {
        if (currentRank > 3 || job.estimationStatus === "APPROVED" || job.invoiceId || job.invoiceNo || advancePaid > 0 || isCompletedStage) {
          return "COMPLETED";
        }
        if (currentRank === 3 || stage === "ESTIMATION" || status === "ESTIMATION") {
          return "IN_PROGRESS";
        }
        return "PENDING";
      }
      if (stepRank === 4) {
        if (currentRank > 4 || advancePaid > 0 || job.advancePaid > 0 || isCompletedStage) {
          return "COMPLETED";
        }
        if (currentRank === 4 || job.invoiceId || job.invoiceNo || stage === "INVOICE" || status === "INVOICE") {
          return "IN_PROGRESS";
        }
        return "PENDING";
      }
      if (stepRank === 5) {
        if (currentRank > 5 || job.designStatus === "COMPLETED" || stage === "READY" || status === "READY" || isCompletedStage) {
          return "COMPLETED";
        }
        if (currentRank === 5 || ["DESIGN_QUEUE", "DESIGN_ASSIGNED", "DESIGN_IN_PROGRESS", "SAMPLE_APPROVAL", "REVISION", "DESIGN"].includes(stage)) {
          return "IN_PROGRESS";
        }
        return "PENDING";
      }
      if (stepRank === 6) {
        if (isCompletedStage || (balanceRemaining <= 0 && (stage === "COMPLETED" || status === "COMPLETED" || status === "SETTLED"))) {
          return "COMPLETED";
        }
        if (currentRank === 6 || job.designStatus === "COMPLETED" || stage === "READY" || status === "READY") {
          return "IN_PROGRESS";
        }
        return "PENDING";
      }
      return "PENDING";
    }

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

  const finishingDisplay = (() => {
    if (Array.isArray(job.finishingServices) && job.finishingServices.length > 0) {
      const names = job.finishingServices
        .map((s) => {
          if (!s) return null;
          if (typeof s === "string") return s;
          if (typeof s === "object") {
            const name = s.name || s.serviceName || s.title || "";
            const config = s.config || s.notes || "";
            if (name && config && config !== "Standard") {
              return `${name} (${config})`;
            }
            return name || config || "";
          }
          return String(s);
        })
        .filter(Boolean);
      return names.length > 0 ? names.join(", ") : "Standard Trimming";
    }
    if (typeof job.finishingServices === "string" && job.finishingServices.trim()) {
      return job.finishingServices;
    }
    return "Standard Trimming";
  })();

  const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  const jid = job._id || job.id;
  const deliveryMethod = job.deliveryMethod || "Store Pickup";
  const isPickupJob = /pick/i.test(deliveryMethod);
  // A delivered or closed job has always been paid in full (delivery requires the balance to be settled)
  const settled = isCompletedStage || currentRank >= 7 || stage === "DELIVERED" || status === "DELIVERED";
  const shownBalance = settled ? 0 : balanceRemaining;
  const paidInFull = settled || (totalAmount > 0 && balanceRemaining <= 0);

  const designState = () =>
    isDesignOnly
      ? job.designStatus === "COMPLETED" || currentRank > 5 || stage === "READY"
        ? "Approved by customer"
        : stage === "SAMPLE_APPROVAL"
        ? "Waiting for customer approval"
        : stage === "DESIGN_IN_PROGRESS"
        ? "In progress"
        : "In design queue"
      : currentRank > 3
      ? "Approved by customer"
      : stage === "SAMPLE_APPROVAL"
      ? "Waiting for customer approval"
      : stage === "DESIGN_IN_PROGRESS"
      ? "In progress"
      : stage === "DESIGN_ASSIGNED"
      ? "Assigned, not started"
      : "In design queue";

  const approvalText = (rank) => (job.estimationStatus === "APPROVED" || currentRank > rank ? "Approved" : "Pending");
  const proofText = job.latestSample?.versionNo ? `V${job.latestSample.versionNo}` : null;

  const settlementDetails = [
    { label: "Total", value: money(totalAmount) },
    { label: "Paid", value: money(totalAmount > 0 ? totalAmount - shownBalance : advancePaid) },
    { label: "Balance", value: money(shownBalance) },
  ];

  const processSteps = [
    {
      step: 1,
      id: "intake",
      title: "Job Details",
      shortTitle: "Job",
      icon: FileText,
      status: "COMPLETED",
      details: [
        { label: "Product", value: jobTitle },
        { label: "Customer", value: `${customerName}${customerPhone && customerPhone !== "-" ? ` · ${customerPhone}` : ""}` },
        { label: "Quantity", value: `${Number(quantity).toLocaleString()} pcs` },
        { label: "Delivery", value: deliveryMethod },
        { label: "Finishing", value: finishingDisplay },
      ],
      link: null,
    },
    {
      step: 2,
      id: "estimation",
      title: "Estimation",
      shortTitle: "Estimate",
      icon: Calculator,
      status: getStepStatus(2),
      details: [
        { label: "Quote", value: totalAmount > 0 ? money(totalAmount) : "Pending" },
        { label: "Approval", value: approvalText(2) },
        { label: "Advance paid", value: money(advancePaid) },
      ],
      link: `/jobflow/estimates?jobId=${jid}`,
      linkLabel: "Open",
    },
    {
      step: 3,
      id: "design",
      title: "Design",
      shortTitle: "Design",
      icon: Palette,
      status: getStepStatus(3),
      details: [
        { label: "Designer", value: currentRank >= 3 ? designerName : "Not assigned" },
        { label: "Status", value: designState() },
        ...(proofText ? [{ label: "Proof", value: proofText }] : []),
      ],
      link: `/jobflow/design?jobId=${jid}`,
      linkLabel: "Open",
    },
    {
      step: 4,
      id: "production",
      title: "Production",
      shortTitle: "Production",
      icon: Layers,
      status: getStepStatus(4),
      details: [
        { label: "Status", value: currentRank > 4 ? "Completed" : currentRank === 4 ? "In production" : "Not started" },
        ...(currentRank >= 4 && job.assignedMachine ? [{ label: "Machine", value: job.assignedMachine }] : []),
      ],
      link: `/jobflow/production?jobId=${jid}`,
      linkLabel: "Open",
    },
    {
      step: 5,
      id: "qc",
      title: "Quality Control",
      shortTitle: "QC",
      icon: ShieldCheck,
      status: getStepStatus(5),
      details: [{ label: "Status", value: currentRank > 5 ? "Passed" : currentRank === 5 ? "Under inspection" : "Not started" }],
      link: `/jobflow/qc?jobId=${jid}`,
      linkLabel: "Open",
    },
    {
      step: 6,
      id: "delivery",
      title: isPickupJob ? "Self Pickup" : "Delivery",
      shortTitle: isPickupJob ? "Pickup" : "Delivery",
      icon: Truck,
      status: getStepStatus(6),
      details: [
        { label: "Type", value: isPickupJob ? "Self pickup" : "Dispatch delivery" },
        {
          label: "Status",
          value: currentRank > 6 ? (isPickupJob ? "Handed over" : "Delivered") : currentRank === 6 ? (isPickupJob ? "Ready to collect" : "Ready to dispatch") : "Not started",
        },
      ],
      link: `/jobflow/delivery?jobId=${jid}`,
      linkLabel: "Open",
    },
    {
      step: 7,
      id: "settlement",
      title: "Settlement",
      shortTitle: "Settlement",
      icon: Receipt,
      status: getStepStatus(7),
      details: [...settlementDetails, { label: "Status", value: currentRank >= 7 ? "Closed" : paidInFull ? "Paid in full" : "Balance pending" }],
      link: `/jobflow/settlement?jobId=${jid}`,
      linkLabel: "Open",
    },
  ];

  // Design Only: Customer -> Job Order -> Estimation -> Invoice -> Design -> Settlement
  const designOnlySteps = [
    {
      step: 1,
      id: "customer",
      title: "Customer",
      shortTitle: "Customer",
      icon: User,
      status: "COMPLETED",
      details: [
        { label: "Name", value: customerName },
        { label: "Phone", value: customerPhone },
      ],
      link: null,
    },
    {
      step: 2,
      id: "job-order",
      title: "Job Order",
      shortTitle: "Job Order",
      icon: FileText,
      status: "COMPLETED",
      details: [
        { label: "Product", value: jobTitle },
        { label: "Due date", value: dueDate },
      ],
      link: null,
    },
    {
      step: 3,
      id: "estimation",
      title: "Estimation",
      shortTitle: "Estimation",
      icon: Calculator,
      status: getStepStatus(3),
      details: [
        { label: "Quote", value: totalAmount > 0 ? money(totalAmount) : "Pending" },
        { label: "Approval", value: approvalText(3) },
      ],
      link: `/jobflow/estimates?jobId=${jid}`,
      linkLabel: "Open",
    },
    {
      step: 4,
      id: "invoice",
      title: "Invoice",
      shortTitle: "Invoice",
      icon: Receipt,
      status: getStepStatus(4),
      details: [
        { label: "Invoice", value: job.invoiceNo || job.invoiceNumber || (job.invoiceId ? "Issued" : "Pending") },
        { label: "Advance paid", value: money(advancePaid) },
        { label: "Balance", value: money(balanceRemaining) },
      ],
      link: `/jobflow/invoice?jobId=${jid}`,
      linkLabel: "Open",
    },
    {
      step: 5,
      id: "design",
      title: "Design",
      shortTitle: "Design",
      icon: Palette,
      status: getStepStatus(5),
      details: [
        { label: "Designer", value: currentRank >= 5 ? designerName : "Not assigned" },
        { label: "Status", value: designState() },
        ...(proofText ? [{ label: "Proof", value: proofText }] : []),
      ],
      link: `/jobflow/design?jobId=${jid}`,
      linkLabel: "Open",
    },
    {
      step: 6,
      id: "settle-balance",
      title: "Settlement",
      shortTitle: "Settlement",
      icon: CheckCircle2,
      status: getStepStatus(6),
      details: [...settlementDetails, { label: "Status", value: isCompletedStage ? "Closed" : balanceRemaining <= 0 ? "Paid in full" : "Balance pending" }],
      link: `/jobflow/invoice?jobId=${jid}`,
      linkLabel: "Open",
    },
  ];

  // Print Only: no design step, and no QC when the job was set up without it
  const qcSkipped = job.qcRequired === false;
  const printOnlySteps = processSteps
    .filter((st) => st.id !== "design" && !(qcSkipped && st.id === "qc"))
    .map((st, idx) => ({ ...st, step: idx + 1 }));

  const effectiveSteps = isPrintOnly ? printOnlySteps : isDesignOnly ? designOnlySteps : processSteps;

  const statusPill = (st) => {
    const map = {
      COMPLETED: ["Done", "#dcfce7", "#15803d"],
      IN_PROGRESS: ["In progress", "#fef3c7", "#b45309"],
    };
    const [label, bg, color] = map[st] || ["Pending", "#f1f5f9", "#475569"];
    return (
      <span style={{ padding: "0.15rem 0.6rem", borderRadius: "9999px", fontSize: "0.72rem", fontWeight: 700, background: bg, color, whiteSpace: "nowrap" }}>
        {label}
      </span>
    );
  };

  const filteredSteps = activeStepTab === "all" ? effectiveSteps : effectiveSteps.filter((s) => s.step === Number(activeStepTab));

  return (
    <div className="jf-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="jf-modal jf-modal-lg" style={{ maxWidth: "760px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div className="jf-modal-header" style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--jf-border)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h2 className="jf-modal-title" style={{ fontSize: "1.15rem", margin: 0 }}>{jobNo}</h2>
              <StatusBadge status={displayStatus} />
            </div>
            <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8125rem", color: "#475569" }}>
              {customerName} • {jobTitle} • Due {dueDate}
            </p>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Progress */}
        <div style={{ background: "#f8fafc", padding: "0.75rem 1.5rem", borderBottom: "1px solid var(--jf-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            {effectiveSteps.map((st) => {
              const Icon = st.icon;
              const isCompleted = st.status === "COMPLETED";
              const isCurrent = st.status === "IN_PROGRESS";
              const isSelected = activeStepTab === String(st.step);
              const bg = isCompleted ? "var(--jf-primary)" : isCurrent ? "#d97706" : "#cbd5e1";
              const fg = isCompleted || isCurrent ? "#ffffff" : "#64748b";
              return (
                <div
                  key={st.step}
                  onClick={() => setActiveStepTab(isSelected ? "all" : String(st.step))}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", flex: 1, textAlign: "center", opacity: activeStepTab !== "all" && !isSelected ? 0.55 : 1 }}
                  title={st.title}
                >
                  <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.3rem" }}>
                    {isCompleted ? <Check size={16} strokeWidth={3} /> : <Icon size={15} />}
                  </div>
                  <span style={{ fontSize: "0.7rem", fontWeight: isCurrent || isSelected ? 700 : 600, color: isCurrent ? "#b45309" : isCompleted ? "var(--jf-primary)" : "#64748b" }}>
                    {st.shortTitle}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stages */}
        <div className="jf-modal-body" style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {filteredSteps.map((step) => (
              <div key={step.step} style={{ border: "1px solid var(--jf-border)", borderRadius: "8px", padding: "0.7rem 0.9rem", background: "#ffffff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>
                    {step.step}. {step.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {statusPill(step.status)}
                    {step.link && (
                      <Link to={step.link} className="jf-btn jf-btn-secondary jf-btn-sm" style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem" }} onClick={onClose}>
                        {step.linkLabel || "Open"} <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem 1.5rem", marginTop: "0.5rem", fontSize: "0.8125rem" }}>
                  {step.details.map((d, i) => (
                    <span key={i} style={{ color: "#64748b" }}>
                      {d.label}: <strong style={{ color: "#0f172a", fontWeight: 600 }}>{d.value}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="jf-modal-footer" style={{ padding: "0.75rem 1.5rem", borderTop: "1px solid var(--jf-border)", justifyContent: "flex-start" }}>
          <span style={{ fontSize: "0.8125rem", color: "#475569" }}>
            Status: <strong>{displayStatus}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

export default JobOrderProcessDetailModal;
