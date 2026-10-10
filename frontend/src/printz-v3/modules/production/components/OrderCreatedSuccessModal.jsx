import React from "react";
import { CheckCircle2, FileText, ArrowRight, Eye, Layers } from "lucide-react";

export default function OrderCreatedSuccessModal({
  isOpen,
  onClose,
  productionOrder,
  onViewOrder,
  onBackToPlanning
}) {
  if (!isOpen || !productionOrder) return null;

  return (
    <div className="prod-modal-overlay">
      <div className="prod-modal-content" style={{ maxWidth: "480px" }}>
        {/* Header */}
        <div style={{ padding: "24px 20px 16px 20px", textAlign: "center", backgroundColor: "#f0fdf4", borderBottom: "1px solid #bbf7d0" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#047857", color: "#ffffff", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
            <CheckCircle2 size={28} />
          </div>
          <h2 style={{ fontSize: "17px", fontWeight: 800, color: "#065f46", margin: "0 0 4px 0" }}>
            Production Order Created
          </h2>
          <span style={{ fontSize: "12px", color: "#047857" }}>
            Order has been planned and entered into the production queue.
          </span>
        </div>

        {/* Body */}
        <div className="prod-modal-body" style={{ padding: "18px 20px" }}>
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", paddingBottom: "8px", borderBottom: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Production No:</span>
              <strong style={{ fontSize: "14px", fontFamily: "monospace", color: "#047857" }}>
                {productionOrder.productionNo}
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>Status:</span>
              <span className="prod-badge prod-badge-planned">
                {productionOrder.status || "PLANNED"}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>Job Reference:</span>
              <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#0f172a", fontWeight: 600 }}>
                {productionOrder.jobNo}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>Customer:</span>
              <span style={{ fontSize: "12px", color: "#0f172a", fontWeight: 600 }}>
                {productionOrder.customerName}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>Planned Quantity:</span>
              <strong style={{ fontSize: "12px", color: "#0f172a" }}>
                {productionOrder.plannedQty?.toLocaleString()} pcs
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>Operations Configured:</span>
              <strong style={{ fontSize: "12px", color: "#0f172a" }}>
                {productionOrder.operations?.length || 0} Steps (Pending)
              </strong>
            </div>
          </div>

          <div style={{ fontSize: "11.5px", color: "#64748b", textAlign: "center", lineHeight: 1.4 }}>
            Production order is saved with cycle 0. Machine assignment and queue dispatch will be available in the execution stage.
          </div>
        </div>

        {/* Footer */}
        <div className="prod-modal-footer" style={{ justifyContent: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={onBackToPlanning}
            className="prod-btn-secondary"
            style={{ fontSize: "12px", padding: "8px 16px" }}
          >
            Back to Planning
          </button>
          <button
            type="button"
            onClick={() => onViewOrder(productionOrder)}
            className="prod-btn-primary"
            style={{ fontSize: "12px", padding: "8px 18px" }}
          >
            <Eye size={14} />
            View Production Order
          </button>
        </div>
      </div>
    </div>
  );
}
