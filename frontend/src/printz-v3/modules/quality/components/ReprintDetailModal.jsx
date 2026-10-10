import React, { useState } from "react";
import { Printer, X, CheckCircle2, XCircle, AlertCircle, RefreshCw, User, Calendar } from "lucide-react";

export default function ReprintDetailModal({
  isOpen,
  onClose,
  reprintRequest,
  onApprove,
  onReject,
  currentUser = { name: "Arun Kumar", role: "manager" }
}) {
  if (!isOpen || !reprintRequest) return null;

  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canApprove = currentUser?.role === "manager" || currentUser?.role === "admin" || currentUser?.permissions?.canApproveReprint;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(reprintRequest.id || reprintRequest.reprintNo);
      onClose();
    } catch (err) {
      console.error("Failed to approve reprint:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejecting the reprint request.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onReject(reprintRequest.id || reprintRequest.reprintNo, { rejectionReason });
      onClose();
    } catch (err) {
      console.error("Failed to reject reprint:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = reprintRequest.status === "REQUESTED";

  return (
    <div className="qc-modal-overlay">
      <div className="qc-modal-content" style={{ maxWidth: "560px" }}>
        <div className="qc-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "#ffedd5",
              color: "#c2410c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Printer size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                Reprint Authorization • {reprintRequest.reprintNo}
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "#64748b" }}>
                Order #{reprintRequest.productionNo} • {reprintRequest.customerName}
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
          {/* Header Metric Box */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "14px"
          }}>
            <div>
              <span style={{ fontSize: "10.5px", color: "#64748b", display: "block" }}>Reprint Quantity</span>
              <strong style={{ fontSize: "15px", color: "#dc2626" }}>{(reprintRequest.quantity || 0).toLocaleString()} pcs</strong>
            </div>
            <div>
              <span style={{ fontSize: "10.5px", color: "#64748b", display: "block" }}>Source Stage</span>
              <strong style={{ fontSize: "13px", color: "#0f172a" }}>{reprintRequest.sourceStage || "PACKING"}</strong>
            </div>
            <div>
              <span style={{ fontSize: "10.5px", color: "#64748b", display: "block" }}>Request Status</span>
              <span className={`qc-status-pill ${reprintRequest.status === "APPROVED" ? "passed" : reprintRequest.status === "REJECTED" ? "rework" : "pending"}`}>
                {reprintRequest.status}
              </span>
            </div>
          </div>

          {/* Details List */}
          <div style={{ fontSize: "12px", color: "#334155", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
            <div><strong>Restart Operation:</strong> {reprintRequest.restartFromOperationName || reprintRequest.restartFromOperationCode || "PRINTING"}</div>
            <div><strong>Original Cycle:</strong> Cycle {reprintRequest.originalCycleNo || 0} → <strong>Corrective Cycle:</strong> {reprintRequest.reworkCycleNo || "R1"}</div>
            <div><strong>Requested By:</strong> {reprintRequest.requestedBy || "QC Inspector"}</div>
            <div><strong>Reason:</strong> {reprintRequest.reason || "Defect identified during final quality control"}</div>
          </div>

          {/* Defects List */}
          {reprintRequest.defects && reprintRequest.defects.length > 0 && (
            <div style={{ marginBottom: "14px" }}>
              <strong style={{ fontSize: "11.5px", color: "#334155", display: "block", marginBottom: "4px" }}>
                Identified Defect Log
              </strong>
              <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: "6px", padding: "6px 10px" }}>
                {reprintRequest.defects.map((d, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", padding: "2px 0" }}>
                    <span>{d.code || d.name} ({d.description})</span>
                    <strong style={{ color: "#dc2626" }}>{d.quantity} pcs</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval Details if already acted upon */}
          {reprintRequest.approvedBy && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "8px 12px", borderRadius: "6px", fontSize: "11.5px", color: "#166534", marginBottom: "10px" }}>
              <CheckCircle2 size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
              Approved by <strong>{reprintRequest.approvedBy}</strong> on {new Date(reprintRequest.approvedAt).toLocaleDateString()}
            </div>
          )}

          {reprintRequest.rejectionReason && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "8px 12px", borderRadius: "6px", fontSize: "11.5px", color: "#991b1b", marginBottom: "10px" }}>
              <XCircle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
              Rejected: "{reprintRequest.rejectionReason}"
            </div>
          )}

          {/* Rejection input box */}
          {showRejectInput && isPending && (
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#991b1b", marginBottom: "4px" }}>
                Rejection Reason *
              </label>
              <textarea
                className="prod-form-input"
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejecting reprint request..."
                required
              />
            </div>
          )}
        </div>

        <div className="qc-modal-footer">
          <button type="button" onClick={onClose} className="qc-btn-secondary" disabled={isSubmitting}>
            Close
          </button>

          {isPending && canApprove && (
            <>
              {showRejectInput ? (
                <button
                  type="button"
                  onClick={handleReject}
                  className="qc-btn-danger"
                  disabled={isSubmitting}
                >
                  Confirm Rejection ✕
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRejectInput(true)}
                  className="qc-btn-secondary"
                  style={{ color: "#dc2626", borderColor: "#fca5a5" }}
                  disabled={isSubmitting}
                >
                  Reject Request
                </button>
              )}

              {!showRejectInput && (
                <button
                  type="button"
                  onClick={handleApprove}
                  className="qc-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Authorizing..." : "Authorize Reprint & Release to Production ▶"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
