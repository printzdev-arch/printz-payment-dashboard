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
} from "lucide-react";

export const ViewDesignJobModal = ({
  isOpen,
  onClose,
  job,
  onOpenWorkbench,
  onReassign,
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
                      : status === "Revision"
                      ? "#fef3c7"
                      : "#f1f5f9",
                  color:
                    status === "Completed"
                      ? "#15803d"
                      : status === "In Progress"
                      ? "#1d4ed8"
                      : status === "Revision"
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
                  <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>
                    {designerName}
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
                  <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
                  <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>{status}</strong>
                </div>
              </div>
            </div>
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
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="alloc-btn-cancel" onClick={onClose}>
              Close
            </button>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewDesignJobModal;
