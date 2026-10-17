import React from "react";
import {
  X,
  FileText,
  User,
  Clock,
  Palette,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Eye,
  Download,
  ExternalLink,
  Layers,
  Sparkles,
  UserCheck,
} from "lucide-react";

export const ViewDesignJobModal = ({
  isOpen,
  onClose,
  job,
  onOpenWorkbench,
  onReassign,
  isDesignerUser = false,
  isViewingOnly = false,
  currentDesignerName = "",
}) => {
  if (!isOpen || !job) return null;

  const jobNo = job.jobNo || "JO-20261013-0308";
  const customer = job.customerName || "sivam";
  const jobItem = job.title || "Business Cards - New Design";
  const priority = job.priority || "Normal";
  const status = job.status || "In Progress";
  const designerName = job.designerName || "Designer Alice";
  const quantity = job.quantity || 1;
  const size = job.size || "Standard";
  const paperType = job.paperType || "Standard Paper";
  const color = job.color || "4C / 0C";
  const slaDue = job.slaDue || "15 Oct 2026";
  const requirements =
    job.specialInstructions ||
    job.raw?.remarks ||
    job.raw?.customerRequirements ||
    job.raw?.notes ||
    "Design brand identity with primary company colors. Follow typography and logo placement standards as per client brand guide.";

  const stage = job.stage || job.currentStage || job.raw?.currentStage || "";
  const isAssigned = status === "Assigned" || stage === "DESIGN_ASSIGNED";
  const isInProgress =
    status === "In Progress" ||
    stage === "DESIGN_IN_PROGRESS" ||
    status === "Proof Sent" ||
    status === "Pending Sample Approvals" ||
    stage === "SAMPLE_APPROVAL";
  const isApproved =
    !isAssigned &&
    status !== "Waiting" &&
    (["In Progress", "Proof Sent", "Pending Sample Approvals", "Revision", "Completed"].includes(status) ||
      ["DESIGN_IN_PROGRESS", "SAMPLE_APPROVAL", "REVISION", "COMPLETED", "PRODUCTION_PLANNING"].includes(stage) ||
      Boolean(job.acceptedAt || job.raw?.acceptedAt));

  const shouldHideReassign =
    isAssigned ||
    isInProgress ||
    ["Assigned", "In Progress", "Proof Sent", "Pending Sample Approvals", "Completed"].includes(status) ||
    ["DESIGN_ASSIGNED", "DESIGN_IN_PROGRESS", "SAMPLE_APPROVAL", "COMPLETED", "PRODUCTION_PLANNING"].includes(stage);

  // If viewing in designer login and job is rejected or assigned to someone else
  const isAllocatedToOtherDesigner =
    Boolean(isViewingOnly) ||
    Boolean(job.isRejected) ||
    Boolean(job.rejectedByMe) ||
    (isDesignerUser &&
      job.designerName &&
      job.designerName !== "- Unassigned" &&
      currentDesignerName &&
      !job.designerName.toLowerCase().includes(currentDesignerName.toLowerCase()) &&
      !currentDesignerName.toLowerCase().includes(job.designerName.toLowerCase()));

  const displayDesignerName =
    isAllocatedToOtherDesigner && isDesignerUser
      ? "Allocated to other designer"
      : designerName;

  return (
    <div className="alloc-modal-overlay" onClick={onClose}>
      <div
        className="alloc-modal-dialog"
        style={{ maxWidth: "680px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="alloc-modal-header" style={{ paddingBottom: "0.85rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <h2 className="alloc-modal-title">Job Order Details</h2>
              <span
                style={{
                  background:
                    status === "Completed"
                      ? "#dcfce7"
                      : status === "In Progress"
                      ? "#dbeafe"
                      : status === "Pending Sample Approvals" || status === "Proof Sent"
                      ? "#f5f3ff"
                      : status === "Revision"
                      ? "#fef3c7"
                      : status === "Assigned"
                      ? "#fef3c7"
                      : "#f1f5f9",
                  color:
                    status === "Completed"
                      ? "#15803d"
                      : status === "In Progress"
                      ? "#1d4ed8"
                      : status === "Pending Sample Approvals" || status === "Proof Sent"
                      ? "#6d28d9"
                      : status === "Revision"
                      ? "#b45309"
                      : status === "Assigned"
                      ? "#b45309"
                      : "#475569",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "0.2rem 0.65rem",
                  borderRadius: "9999px",
                }}
              >
                {status}
              </span>
            </div>
            <p className="alloc-modal-subtitle">
              Order No: <strong style={{ color: "#16a34a" }}>{jobNo}</strong> • Customer:{" "}
              <strong>{customer}</strong>
            </p>
          </div>
          <button
            type="button"
            className="alloc-btn-close"
            onClick={onClose}
            aria-label="Close details modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="alloc-modal-body" style={{ gap: "1rem" }}>
          {/* Section 1: Specifications & Parameters */}
          <div className="alloc-details-card">
            <div className="alloc-section-header">
              <div
                className="alloc-icon-badge-blue"
                style={{ background: "#dcfce7", color: "#16a34a" }}
              >
                <Layers size={16} />
              </div>
              <h3 className="alloc-section-title">Job Specifications</h3>
            </div>

            <div className="alloc-details-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                <div className="alloc-kv-row">
                  <span className="alloc-kv-label">Customer</span>
                  <span className="alloc-kv-val">{customer}</span>
                </div>
                <div className="alloc-kv-row">
                  <span className="alloc-kv-label">Job Item</span>
                  <span className="alloc-kv-val">{jobItem}</span>
                </div>
                <div className="alloc-kv-row">
                  <span className="alloc-kv-label">Quantity</span>
                  <span className="alloc-kv-val">{quantity}</span>
                </div>
                <div className="alloc-kv-row">
                  <span className="alloc-kv-label">Size / Specs</span>
                  <span className="alloc-kv-val">{size}</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                <div className="alloc-kv-row">
                  <span className="alloc-kv-label">Priority</span>
                  <span
                    className={
                      priority === "High"
                        ? "dq-badge-high"
                        : priority === "Low"
                        ? "dq-badge-low"
                        : "dq-badge-normal"
                    }
                    style={{ padding: "0.15rem 0.55rem", fontSize: "0.75rem" }}
                  >
                    {priority}
                  </span>
                </div>
                <div className="alloc-kv-row">
                  <span className="alloc-kv-label">Paper / Media</span>
                  <span className="alloc-kv-val">{paperType}</span>
                </div>
                <div className="alloc-kv-row">
                  <span className="alloc-kv-label">Color Mode</span>
                  <span className="alloc-kv-val">{color}</span>
                </div>
                <div className="alloc-kv-row">
                  <span className="alloc-kv-label">Target Date</span>
                  <span className="alloc-kv-val" style={{ color: "#dc2626" }}>
                    {slaDue}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Designer & Current Status */}
          <div className="alloc-details-card" style={{ background: "#f8fafc" }}>
            <div className="alloc-section-header">
              <div
                className="alloc-icon-badge-blue"
                style={{ background: "#eff6ff", color: "#2563eb" }}
              >
                <User size={16} />
              </div>
              <h3 className="alloc-section-title">Design Allocation & Status</h3>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase" }}>
                  Assigned Designer
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginTop: "0.25rem",
                  }}
                >
                  {isAllocatedToOtherDesigner && isDesignerUser ? (
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: "#16a34a",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <UserCheck size={16} />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: "#16a34a",
                        color: "#ffffff",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                      }}
                    >
                      {designerName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>
                    {displayDesignerName}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase" }}>
                  Current Status
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginTop: "0.35rem",
                  }}
                >
                  {isApproved ? (
                    <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
                  ) : isAssigned ? (
                    <Clock size={16} style={{ color: "#d97706" }} />
                  ) : (
                    <CheckCircle2 size={16} style={{ color: "#64748b" }} />
                  )}
                  <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>{status}</strong>
                </div>
              </div>
            </div>

            {/* Designer Acceptance / Approval Information */}
            {isAssigned && (
              <div
                style={{
                  marginTop: "0.85rem",
                  padding: "0.75rem 1rem",
                  background: "#fffbeb",
                  border: "1px solid #fef3c7",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.6rem",
                  fontSize: "0.8125rem",
                  color: "#92400e",
                }}
              >
                <Clock size={16} style={{ color: "#d97706", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <div style={{ fontWeight: 600 }}>Designer Approval: Pending Acceptance</div>
                  <div style={{ marginTop: "3px", color: "#b45309", fontSize: "0.78125rem", lineHeight: 1.45 }}>
                    {isAllocatedToOtherDesigner && isDesignerUser
                      ? "This job order is allocated to other designer and is pending acceptance."
                      : `${designerName} has been assigned this job order. The designer has not accepted/approved it yet. Workbench will unlock once the designer accepts the assignment.`}
                  </div>
                </div>
              </div>
            )}

            {isApproved && (
              <div
                style={{
                  marginTop: "0.85rem",
                  padding: "0.65rem 1rem",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  fontSize: "0.8125rem",
                  color: "#166534",
                }}
              >
                <CheckCircle2 size={16} style={{ color: "#16a34a", flexShrink: 0 }} />
                <span>
                  {isAllocatedToOtherDesigner && isDesignerUser ? (
                    <>
                      <strong>Designer Approved:</strong> Accepted by other designer and in progress.
                    </>
                  ) : (
                    <>
                      <strong>Designer Approved:</strong> {designerName} accepted this assignment and the workbench is unlocked.
                    </>
                  )}
                </span>
              </div>
            )}

            {/* Redesign Started / Not Started Status for Revision Jobs */}
            {(status === "Revision" || stage === "REVISION" || job.isRedesign || job.designStatus === "REVISION") && (
              <div
                style={{
                  marginTop: "0.85rem",
                  padding: "0.75rem 1rem",
                  background: (job.isRevisionStarted || job.raw?.isRevisionStarted || job.isRevisionWorkStarted) ? "#f0fdf4" : "#fffbeb",
                  border: `1px solid ${(job.isRevisionStarted || job.raw?.isRevisionStarted || job.isRevisionWorkStarted) ? "#bbf7d0" : "#fef3c7"}`,
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.6rem",
                  fontSize: "0.8125rem",
                  color: (job.isRevisionStarted || job.raw?.isRevisionStarted || job.isRevisionWorkStarted) ? "#166534" : "#92400e",
                }}
              >
                {(job.isRevisionStarted || job.raw?.isRevisionStarted || job.isRevisionWorkStarted) ? (
                  <CheckCircle2 size={16} style={{ color: "#16a34a", flexShrink: 0, marginTop: "2px" }} />
                ) : (
                  <Clock size={16} style={{ color: "#d97706", flexShrink: 0, marginTop: "2px" }} />
                )}
                <div>
                  <div style={{ fontWeight: 600 }}>
                    Designer Redesign Status:{" "}
                    {(job.isRevisionStarted || job.raw?.isRevisionStarted || job.isRevisionWorkStarted) ? "Started by Designer" : "Not Started"}
                  </div>
                  <div style={{ marginTop: "3px", fontSize: "0.78125rem", lineHeight: 1.45 }}>
                    {(job.isRevisionStarted || job.raw?.isRevisionStarted || job.isRevisionWorkStarted)
                      ? `${designerName} has officially started the redesign workflow in workbench.`
                      : `${designerName} has been assigned this revision but has not clicked Start yet.`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Requirements & Design Brief */}
          <div className="alloc-details-card">
            <div className="alloc-section-header">
              <div
                className="alloc-icon-badge-blue"
                style={{ background: "#fef3c7", color: "#d97706" }}
              >
                <FileText size={16} />
              </div>
              <h3 className="alloc-section-title">Requirements & Design Brief</h3>
            </div>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "0.85rem 1rem",
                fontSize: "0.8125rem",
                color: "#334155",
                lineHeight: 1.5,
              }}
            >
              {requirements}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="alloc-modal-footer" style={{ justifyContent: "space-between" }}>
          <div>
            {!shouldHideReassign && !isViewingOnly && !isDesignerUser && onReassign && (
              <button
                type="button"
                className="alloc-btn-cancel"
                style={{ color: "#2563eb", borderColor: "#bfdbfe" }}
                onClick={() => {
                  onClose();
                  if (onReassign) onReassign(job);
                }}
              >
                Reassign Designer
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="alloc-btn-cancel" onClick={onClose}>
              Close
            </button>
            {isApproved && !isViewingOnly && !(isDesignerUser && isAllocatedToOtherDesigner) && (
              <button
                type="button"
                className="dw-btn-primary-green"
                style={{ padding: "0.5rem 1.25rem", borderRadius: "6px" }}
                onClick={() => {
                  onClose();
                  if (onOpenWorkbench) onOpenWorkbench(job);
                }}
              >
                <Palette size={14} />
                Open in Workbench
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewDesignJobModal;
