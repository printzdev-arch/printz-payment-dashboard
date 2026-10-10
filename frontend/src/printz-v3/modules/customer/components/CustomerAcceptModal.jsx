import React from "react";
import { CheckCircle2, X, AlertCircle } from "lucide-react";
import { formatCurrency } from "../../estimate/utils/estimateCalculations";
import "../styles/customerV3.css";
import "../../estimate/styles/estimateV3.css";

export default function CustomerAcceptModal({
  estimate,
  isOpen,
  onClose,
  onConfirmAccept,
  isProcessing = false
}) {
  if (!isOpen || !estimate) return null;

  return (
    <div className="v3-modal-overlay">
      <div className="v3-modal-card" style={{ maxWidth: "480px" }}>
        {/* Modal Header */}
        <div className="v3-modal-header" style={{ borderBottom: "none", paddingBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#ecfdf5",
                color: "#047857",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                Confirm Estimate Approval
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="v3-modal-body" style={{ paddingTop: "8px" }}>
          <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
            You are about to approve the commercial quotation for your job order. Once confirmed, PrintZ team will initiate production planning as per these specifications.
          </p>

          <div
            style={{
              background: "#f8fafc",
              padding: "14px 16px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              marginBottom: "16px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
              <span style={{ color: "#64748b" }}>Estimate Number:</span>
              <strong style={{ fontFamily: "monospace", color: "#047857" }}>{estimate.estimateNo}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
              <span style={{ color: "#64748b" }}>Job Order:</span>
              <strong style={{ color: "#0f172a" }}>{estimate.job?.jobTitle || estimate.jobTitle || "Print Job"}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
              <span style={{ color: "#64748b" }}>Validity:</span>
              <span style={{ color: "#475569" }}>Valid Until {estimate.validUntil || "7 Days"}</span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "10px",
                borderTop: "1px dashed #cbd5e1"
              }}
            >
              <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "14px" }}>Quoted Grand Total:</span>
              <strong style={{ fontSize: "18px", color: "#047857", fontWeight: 900 }}>
                {formatCurrency(estimate.grandTotal || 0)}
              </strong>
            </div>
          </div>

          <div style={{ fontSize: "11px", color: "#64748b", background: "#f1f5f9", padding: "8px 10px", borderRadius: "6px" }}>
            ℹ️ By confirming, you agree to the quoted specifications, pricing, and standard payment terms.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="v3-modal-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="v3-btn-secondary"
            style={{ fontSize: "12px" }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirmAccept}
            disabled={isProcessing}
            className="v3-btn-primary"
            style={{
              fontSize: "12px",
              padding: "8px 20px",
              backgroundColor: "#047857",
              borderColor: "#047857"
            }}
          >
            {isProcessing ? "Confirming..." : "Confirm & Accept Estimate"}
          </button>
        </div>
      </div>
    </div>
  );
}
