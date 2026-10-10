import React, { useState } from "react";
import { RotateCcw, X } from "lucide-react";

export default function CustomerRequestProofChangesModal({
  isOpen,
  onClose,
  onSubmit,
  isProcessing = false,
  proofVersion = 1,
  jobNo = "JOB-2026-00001",
  itemName = "Business Card"
}) {
  const [comments, setComments] = useState("");
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!comments.trim() || comments.trim().length === 0) {
      setError("Please describe the changes required. Comment cannot be empty.");
      return;
    }
    setError(null);
    onSubmit({ comments: comments.trim() });
  };

  return (
    <div className="v3-modal-overlay">
      <div className="v3-modal-content" style={{ maxWidth: "480px" }}>
        {/* Header */}
        <div className="v3-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#fef3c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <RotateCcw size={20} color="#d97706" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                Request Changes
              </h3>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Job: {jobNo} • Item: {itemName} (Revising Proof V{proofVersion})
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="v3-modal-close" disabled={isProcessing}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: "20px" }}>
            <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
              Please describe the changes required. The assigned graphic designer will review your feedback and upload revised <strong>Proof V{proofVersion + 1}</strong>.
            </p>

            <div className="v3-form-group" style={{ marginBottom: "12px" }}>
              <label className="v3-form-label" style={{ fontWeight: 700, fontSize: "12px" }}>
                Change Request <span className="v3-required">*</span>
              </label>
              <textarea
                className="v3-textarea"
                rows={4}
                placeholder="Example: Please change the phone number and move the logo slightly to the right."
                value={comments}
                maxLength={500}
                onChange={(e) => {
                  setComments(e.target.value);
                  if (error) setError(null);
                }}
                required
                style={{ resize: "vertical", fontSize: "13px" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                {error ? (
                  <span style={{ color: "#dc2626", fontSize: "12px", fontWeight: 600 }}>{error}</span>
                ) : (
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Required</span>
                )}
                <span className="v3-char-counter">{comments.length} / 500</span>
              </div>
            </div>

            <div
              style={{
                fontSize: "11px",
                color: "#64748b",
                background: "#f8fafc",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0"
              }}
            >
              ℹ️ <strong>Version Safety:</strong> Proof V{proofVersion} will be preserved in history and never overwritten.
            </div>
          </div>

          {/* Actions */}
          <div className="v3-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="v3-btn-secondary"
              style={{ fontSize: "13px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="v3-btn-primary"
              style={{ fontSize: "13px", backgroundColor: "#d97706", borderColor: "#d97706" }}
            >
              {isProcessing ? "Submitting..." : "Submit Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
