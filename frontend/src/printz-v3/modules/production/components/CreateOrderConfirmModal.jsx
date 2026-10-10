import React from "react";
import { CheckCircle2, AlertCircle, X, Layers, Clock, Calendar, Hash, User } from "lucide-react";

export default function CreateOrderConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  planningData,
  isSubmitting
}) {
  if (!isOpen || !planningData) return null;

  const {
    jobNo,
    customerName,
    productName,
    requiredQty,
    plannedQty,
    priority,
    operations = [],
    plannedStart,
    expectedCompletion
  } = planningData;

  const allowance = plannedQty - requiredQty;

  return (
    <div className="prod-modal-overlay" onClick={onClose}>
      <div className="prod-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="prod-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "6px", backgroundColor: "#ecfdf5", color: "#047857", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Layers size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                Confirm Production Order Creation
              </h3>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Step 8 • Planning & Order Release
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="prod-modal-body">
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>Job Number:</span>
              <strong style={{ fontSize: "12px", fontFamily: "monospace", color: "#047857" }}>{jobNo}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>Customer:</span>
              <strong style={{ fontSize: "12px", color: "#0f172a" }}>{customerName}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>Product Item:</span>
              <strong style={{ fontSize: "12px", color: "#0f172a" }}>{productName}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>Required Quantity:</span>
              <strong style={{ fontSize: "12px", color: "#0f172a" }}>{requiredQty.toLocaleString()} pcs</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>Planned Quantity:</span>
              <strong style={{ fontSize: "12.5px", color: "#047857", fontWeight: 800 }}>
                {plannedQty.toLocaleString()} pcs {allowance > 0 ? `(+${allowance} allowance)` : ""}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>Priority:</span>
              <span className={`prod-badge prod-badge-${priority.toLowerCase()}`}>
                {priority}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>Planned Operations:</span>
              <strong style={{ fontSize: "12px", color: "#0f172a" }}>{operations.length} Sequential Operations</strong>
            </div>
          </div>

          <div className="prod-notice-box" style={{ margin: 0 }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <div>
              <strong>Order will be created with status PLANNED (Cycle 0).</strong>
              <div style={{ fontSize: "11px", color: "#15803d", marginTop: "2px" }}>
                Operations will be initialized in PENDING state. Actual machine execution and printing will begin in the production stage.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="prod-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="prod-btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="prod-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>Creating Production Order...</>
            ) : (
              <>
                <CheckCircle2 size={15} />
                Create Production Order
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
