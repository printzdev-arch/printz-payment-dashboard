import React, { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { REJECTION_REASONS_DESIGNER } from "../constants/designConstants";
import "../styles/designV3.css";

export default function RejectAssignmentModal({
  assignment,
  isOpen,
  onClose,
  onConfirmReject,
  isProcessing = false
}) {
  const [reasonCode, setReasonCode] = useState("INSUFFICIENT_INPUT");
  const [details, setDetails] = useState("");

  if (!isOpen || !assignment) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!details.trim()) {
      alert("Please provide the technical details or reason for requesting reassignment.");
      return;
    }
    const matchedReason = REJECTION_REASONS_DESIGNER.find((r) => r.code === reasonCode);
    onConfirmReject({
      reason: matchedReason?.label || reasonCode,
      reasonCode,
      details: details.trim()
    });
  };

  return (
    <div
      className="v3-modal-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box"
      }}
      onClick={onClose}
    >
      <div
        className="v3-modal-card"
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e2e8f0",
          maxWidth: "540px",
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="v3-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="v3-modal-title" style={{ margin: 0 }}>Request Reassignment</h3>
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                {assignment.assignmentNo} • {assignment.itemName}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="v3-btn-icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="v3-modal-body">
            <div style={{ backgroundColor: "#fffbeb", padding: "12px 14px", borderRadius: "8px", border: "1px solid #fef3c7", fontSize: "12px", color: "#92400e", marginBottom: "16px" }}>
              The job will return to the design queue and will be re-allocated by the manager or round robin allocation.
            </div>

            <div className="v3-form-group" style={{ marginBottom: "16px" }}>
              <label className="v3-form-label">
                Reason <span className="v3-required">*</span>
              </label>
              <select
                className="v3-select"
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
              >
                {REJECTION_REASONS_DESIGNER.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="v3-form-group">
              <label className="v3-form-label">
                Details & Specific Notes <span className="v3-required">*</span>
              </label>
              <textarea
                className="v3-textarea"
                rows={3}
                placeholder="e.g. Logo file is low resolution, need vector AI/EPS logo before starting."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="v3-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="v3-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !details.trim()}
              className="v3-btn-primary"
              style={{ backgroundColor: "#dc2626", borderColor: "#dc2626" }}
            >
              {isProcessing ? "Submitting..." : "Reject Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
