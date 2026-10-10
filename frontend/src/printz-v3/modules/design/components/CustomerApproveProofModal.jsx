import React, { useState } from "react";
import { CheckCircle2, ShieldCheck, X } from "lucide-react";

export default function CustomerApproveProofModal({
  isOpen,
  onClose,
  onConfirm,
  isProcessing = false,
  proofVersion = 1,
  jobNo = "JOB-2026-00001",
  itemName = "Business Card"
}) {
  const [comments, setComments] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({ comments: comments.trim() });
  };

  return (
    <div className="v3-modal-overlay">
      <div className="v3-modal-content" style={{ maxWidth: "460px" }}>
        {/* Header */}
        <div className="v3-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#ecfdf5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <ShieldCheck size={20} color="#059669" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                Approve Design Sample?
              </h3>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Job: {jobNo} • Item: {itemName}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="v3-modal-close" disabled={isProcessing}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          <div
            style={{
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              padding: "14px 16px",
              borderRadius: "10px",
              marginBottom: "16px"
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div style={{ fontSize: "13px", color: "#166534", lineHeight: "1.5" }}>
                You are approving <strong>Sample Version V{proofVersion}</strong> for <strong>{itemName}</strong>.
                <div style={{ marginTop: "4px", fontSize: "12px", color: "#15803d" }}>
                  Once approved, this design will move to the next stage (Ready for Production).
                </div>
              </div>
            </div>
          </div>

          <div className="v3-form-group" style={{ marginBottom: "12px" }}>
            <label className="v3-form-label" style={{ fontSize: "12px" }}>
              Approval Comments (Optional)
            </label>
            <textarea
              className="v3-textarea"
              rows={3}
              placeholder="Add any specific approval notes or remarks (optional)..."
              value={comments}
              maxLength={500}
              onChange={(e) => setComments(e.target.value)}
              style={{ fontSize: "12px" }}
            />
            <div className="v3-char-counter">{comments.length} / 500</div>
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
            🔒 Creates an official approval record with version timestamp.
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
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className="v3-btn-primary"
            style={{ fontSize: "13px", backgroundColor: "#047857", borderColor: "#047857" }}
          >
            {isProcessing ? "Confirming..." : "Confirm Approval"}
          </button>
        </div>
      </div>
    </div>
  );
}
