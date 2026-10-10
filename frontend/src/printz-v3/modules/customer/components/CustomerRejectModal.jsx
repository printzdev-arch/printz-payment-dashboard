import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { REJECTION_REASONS } from "../../estimate/constants/estimateConstants";
import "../styles/customerV3.css";
import "../../estimate/styles/estimateV3.css";

export default function CustomerRejectModal({
  estimate,
  isOpen,
  onClose,
  onConfirmReject,
  isProcessing = false
}) {
  const [reasonCode, setReasonCode] = useState(REJECTION_REASONS[0].code);
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");

  if (!isOpen || !estimate) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!comments.trim()) {
      setError("Please describe the adjustments or feedback needed for the revision.");
      return;
    }
    setError("");

    const selected = REJECTION_REASONS.find((r) => r.code === reasonCode);
    onConfirmReject({
      reasonCode,
      reason: selected?.label || "Pricing or Specification Change",
      comments: comments.trim()
    });
  };

  return (
    <div className="v3-modal-overlay">
      <div className="v3-modal-card" style={{ maxWidth: "520px" }}>
        {/* Modal Header */}
        <div className="v3-modal-header" style={{ borderBottom: "none", paddingBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#fef2f2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                Request Quotation Changes
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

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="v3-modal-body" style={{ paddingTop: "8px" }}>
            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
              Please let our branch team know what needs to be changed. We will review your feedback and issue an updated revised quotation.
            </p>

            {/* Rejection Reason Dropdown */}
            <div className="v3-form-group" style={{ marginBottom: "14px" }}>
              <label className="v3-form-label">
                Primary Reason for Change <span className="v3-required-star">*</span>
              </label>
              <select
                className="v3-input no-icon"
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                style={{ fontWeight: 600 }}
              >
                {REJECTION_REASONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Specific Feedback Comments */}
            <div className="v3-form-group" style={{ marginBottom: "14px" }}>
              <label className="v3-form-label">
                Detailed Comments & Instructions <span className="v3-required-star">*</span>
              </label>
              <textarea
                rows={3}
                className="v3-input no-icon"
                style={{ height: "auto", padding: "10px 12px", fontFamily: "inherit" }}
                value={comments}
                onChange={(e) => {
                  setComments(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. Please change quantity from 1000 to 2000, or remove spot UV lamination to reduce cost."
              />
              {error && (
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#dc2626", fontWeight: 600 }}>
                  ⚠️ {error}
                </p>
              )}
            </div>

            <div style={{ fontSize: "11px", color: "#64748b", background: "#f8fafc", padding: "8px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              💡 Your original job order will remain safe and active while our branch manager prepares a revised version.
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
              type="submit"
              disabled={isProcessing}
              className="v3-btn-primary"
              style={{
                fontSize: "12px",
                padding: "8px 20px",
                backgroundColor: "#dc2626",
                borderColor: "#dc2626"
              }}
            >
              {isProcessing ? "Submitting..." : "Submit Change Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
