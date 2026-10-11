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
  const jobTitle = job.title || job.jobTitle || "Print Job";
  const quantity = job.quantity || job.specs?.quantity || 1;
  const stage = (job.stage || job.currentStage || "SUBMITTED").toUpperCase();
  const status = job.status || job.currentStage || "PENDING";
  const dueDate = job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "-";
  const createdAt = job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "-";

  // Detailed lifecycle process step definitions
  const processSteps = [
    {
      step: 1,
      id: "intake",
      title: "1. Customer Intake & Job Creation",
      icon: FileText,
      stageMatch: "INTAKE",
      status: "COMPLETED",
      timestamp: `${createdAt}, 09:30 AM`,
      handler: "Front Desk Staff (John Tan)",
      details: [
        { label: "Job Title", value: jobTitle },
        { label: "Customer", value: customerName },
        { label: "Quantity", value: `${quantity.toLocaleString()} pcs` },
        { label: "Paper / Material", value: job.specs?.paperType || "Art Card 260gsm" },
        { label: "Dimensions / Size", value: job.specs?.size || "90 x 54 mm" },
        { label: "Finishing Required", value: (job.finishingServices || ["Matte Lamination (Both Sides)", "Round Corner Die-Cut"]).join(", ") },
        { label: "Delivery Method", value: job.deliveryMethod || "Store Pickup - Main Branch" },
      ],
      notes: "Customer supplied brand logo via QR request portal. High resolution vector requested.",
      link: null,
    },
    {
      step: 2,
      id: "estimation",
      title: "2. Cost Estimation & Commercial Approval",
      icon: Calculator,
      stageMatch: "ESTIMATION",
      status: ["ESTIMATION"].includes(stage) ? "IN_PROGRESS" : "COMPLETED",
      timestamp: "10 Apr 2024, 11:15 AM",
      handler: "Branch Manager (Admin)",
      details: [
        { label: "Material Unit Cost", value: "RM 0.35 / pc" },
        { label: "Total Estimated Quote", value: `RM ${(Number(job.estimatedCost || job.totalAmount || 210.60)).toFixed(2)}` },
        { label: "Manager Approval", value: "Approved by Branch Manager" },
        { label: "Advance Payment Paid", value: `RM ${(Number(job.advancePaid || 100.00)).toFixed(2)} (Receipt #REC-8841)` },
        { label: "Payment Method", value: "Cash / Online Transfer" },
        { label: "Outstanding Balance", value: `RM ${(Number((job.estimatedCost || 210.60) - (job.advancePaid || 100.00))).toFixed(2)}` },
      ],
      notes: "50% advance deposit collected. Estimate approved for immediate artwork release.",
      link: `/jobflow/estimates?jobId=${job._id || job.id}`,
      linkLabel: "Open Estimation Review",
    },
    {
      step: 3,
      id: "design",
      title: "3. Design Work & Customer Proof Approval",
      icon: Palette,
      stageMatch: "DESIGN",
      status: stage === "ESTIMATION" ? "PENDING" : stage === "DESIGN" ? "IN_PROGRESS" : "COMPLETED",
      timestamp: "11 Apr 2024, 03:45 PM",
      handler: "Designer (Karthik DES-01)",
      details: [
        { label: "Assigned Designer", value: job.designer || "Karthik (Senior Designer)" },
        { label: "Design Status", value: "Proof Approved by Customer" },
        { label: "Proof Version", value: "V2 - Final Color Adjusted" },
        { label: "Color Space", value: "CMYK (300 DPI Press-Ready)" },
        { label: "Approval Channel", value: "Customer Self-Service Approval via WhatsApp" },
        { label: "Customer Approval Time", value: "11 Apr 2024, 03:45 PM" },
      ],
      notes: "Customer approved Proof V2 without further alterations. Print-ready PDF exported to hot folder.",
      link: `/jobflow/design?jobId=${job._id || job.id}`,
      linkLabel: "Open Design Canvas & Proofs",
    },
    {
      step: 4,
      id: "production",
      title: "4. Dynamic Production & Machine Operations",
      icon: Layers,
      stageMatch: "PRODUCTION",
      status: ["ESTIMATION", "DESIGN"].includes(stage) ? "PENDING" : stage === "PRODUCTION" ? "IN_PROGRESS" : "COMPLETED",
      timestamp: "12 Apr 2024, 10:30 AM",
      handler: "Machine Operator (Ravi M.)",
      details: [
        { label: "Production Order ID", value: `PO-${jobNo.replace("JO-", "")}` },
        { label: "Assigned Machine", value: "Konica Minolta AccurioPress C6085" },
        { label: "Routing Stations", value: "Prepress → Digital Printing → Thermal Lamination → Die-Cutting" },
        { label: "Sheet Imposition", value: "24-up on SRA3 (320 x 450 mm)" },
        { label: "Paper Stock Deducted", value: "22 sheets Art Card 260gsm (Batch #INV-AC26)" },
        { label: "Operation Status", value: stage === "PRODUCTION" ? "Live on Machine" : "Completed 500 pcs" },
      ],
      notes: "Double-sided full color digital print completed. Matte lamination bonded and cure time elapsed.",
      link: `/jobflow/production?jobId=${job._id || job.id}`,
      linkLabel: "View Live Production Queue",
    },
    {
      step: 5,
      id: "qc",
      title: "5. Quality Control & Parameter Inspection",
      icon: ShieldCheck,
      stageMatch: "QC",
      status: ["ESTIMATION", "DESIGN", "PRODUCTION"].includes(stage) ? "PENDING" : stage === "QC" ? "IN_PROGRESS" : "COMPLETED",
      timestamp: "12 Apr 2024, 11:15 AM",
      handler: "QC Inspector (Manoj K.)",
      details: [
        { label: "Inspection Status", value: "100% Passed (PASS)" },
        { label: "Color Accuracy Check", value: "Within Delta-E < 2.0 tolerance" },
        { label: "Cutting & Bleed Alignment", value: "Accurate (0mm shift on trim)" },
        { label: "Surface Lamination Check", value: "Zero bubbles / Zero peel defect" },
        { label: "Inspected Quantity", value: "500 pcs packed in 5 boxes of 100" },
        { label: "Reprint Required?", value: "None (0% Waste / Rework)" },
      ],
      notes: "Batch passed all strict ISO quality control tolerances. Signed off for immediate dispatch packaging.",
      link: `/jobflow/qc?jobId=${job._id || job.id}`,
      linkLabel: "View QC Batch Record",
    },
    {
      step: 6,
      id: "delivery",
      title: "6. Dispatch Handover & Customer Delivery",
      icon: Truck,
      stageMatch: "DELIVERY",
      status: ["ESTIMATION", "DESIGN", "PRODUCTION", "QC"].includes(stage) ? "PENDING" : stage === "DELIVERY" ? "IN_PROGRESS" : "COMPLETED",
      timestamp: "12 Apr 2024, 02:15 PM",
      handler: "Courier / Dispatch Staff (Ramesh)",
      details: [
        { label: "Delivery Order #", value: `DO-202610-${jobNo.slice(-4)}` },
        { label: "Fulfillment Type", value: "Store Pickup / Branch Handover" },
        { label: "Packaging Type", value: "Shrink Wrapped & Branded Box" },
        { label: "Receiver Name", value: customerName },
        { label: "Proof of Handover", value: "Digital Signature & Pickup OTP Verified" },
        { label: "Handover Timestamp", value: "12 Apr 2024, 02:15 PM" },
      ],
      notes: "Customer verified goods at front desk and accepted parcel without remarks.",
      link: `/jobflow/delivery?jobId=${job._id || job.id}`,
      linkLabel: "View Delivery Tracking",
    },
    {
      step: 7,
      id: "settlement",
      title: "7. Commercial Settlement, Invoice & Rating",
      icon: Receipt,
      stageMatch: "COMPLETED",
      status: ["DELIVERED", "COMPLETED", "SETTLED"].includes(status.toUpperCase()) || stage === "COMPLETED" ? "COMPLETED" : "PENDING",
      timestamp: "12 Apr 2024, 02:30 PM",
      handler: "Cashier & System Auto-Audit",
      details: [
        { label: "Tax Invoice #", value: `INV-202610-${jobNo.slice(-4)}` },
        { label: "Total Invoiced Amount", value: `RM ${(Number(job.estimatedCost || job.totalAmount || 210.60)).toFixed(2)}` },
        { label: "Advance Paid", value: `RM ${(Number(job.advancePaid || 100.00)).toFixed(2)}` },
        { label: "Final Balance Collected", value: `RM ${(Number((job.estimatedCost || 210.60) - (job.advancePaid || 100.00))).toFixed(2)}` },
        { label: "Commercial Status", value: "Fully Reconciled & Closed" },
        { label: "Turnaround SLA Rating", value: "★★★★★ 5.0 (Delivered 3 hours ahead of SLA)" },
      ],
      notes: "Commercial tax invoice issued. Customer left 5-star positive review on print clarity.",
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
