import React from "react";
import { CheckCircle2, X, AlertCircle } from "lucide-react";

export default function QualityPassConfirmModal({
  isOpen,
  onClose,
  productionOrder,
  quantityChecked,
  acceptedQty,
  comments,
  onConfirmPass,
  isSubmitting = false
}) {
  if (!isOpen || !productionOrder) return null;

  return (
    <div className="qc-modal-overlay">
      <div className="qc-modal-content" style={{ maxWidth: "480px" }}>
        <div className="qc-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "#dcfce7",
              color: "#15803d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                Confirm Quality Check PASS
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "#64748b" }}>
                Order #{productionOrder.productionNo} • {productionOrder.customerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="qc-modal-body">
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "12px" }}>
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>Total Checked</span>
                <strong style={{ fontSize: "14px", color: "#0f172a" }}>{Number(quantityChecked || 0).toLocaleString()} pcs</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>Accepted Quantity</span>
                <strong style={{ fontSize: "14px", color: "#047857" }}>{Number(acceptedQty || 0).toLocaleString()} pcs</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>Rejected Quantity</span>
                <strong style={{ fontSize: "14px", color: "#64748b" }}>0 pcs</strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>Overall Result</span>
                <span className="qc-status-pill passed">
                  <CheckCircle2 size={11} /> PASS
                </span>
              </div>
            </div>
          </div>

          {comments && (
            <div style={{ fontSize: "11.5px", color: "#475569", marginBottom: "12px" }}>
              <strong>Inspector Remarks:</strong> "{comments}"
            </div>
          )}

          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "10px 12px", fontSize: "11.5px", color: "#166534", display: "flex", gap: "8px", alignItems: "center" }}>
            <AlertCircle size={15} />
            <span>
              Approving PASS marks quality inspection complete. The order will be prepared for the packing & dispatch stage.
            </span>
          </div>
        </div>

        <div className="qc-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="qc-btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmPass}
            className="qc-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Confirm & Submit PASS ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
