import React, { useState } from "react";
import { X, CheckCircle2, XCircle, RotateCcw, AlertTriangle } from "lucide-react";
import jobFlowApi from "../api/productionApi";
import { toast } from "react-toastify";

export const ReprintDecisionModal = ({
  isOpen,
  onClose,
  reprintRequest,
  actionType, // "APPROVE" or "REJECT"
  onSuccess,
}) => {
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    setRejectionReason("");
  }, [isOpen, actionType]);

  if (!isOpen || !reprintRequest) return null;

  const isApprove = actionType === "APPROVE";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isApprove && !rejectionReason.trim()) {
      toast.error("Please enter a rejection reason for auditing.");
      return;
    }

    setSubmitting(true);
    try {
      const id = reprintRequest._id || reprintRequest.id;
      if (isApprove) {
        await jobFlowApi.approveReprintRequest(id);
        toast.success(
          `Reprint Request ${reprintRequest.reprintRequestNo || ""} APPROVED! New reprint production batch initialized.`
        );
      } else {
        await jobFlowApi.rejectReprintRequest(id, { rejectionReason });
        toast.warning(
          `Reprint Request ${reprintRequest.reprintRequestNo || ""} REJECTED.`
        );
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit reprint decision.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal">
        <div className="jf-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                background: isApprove ? "#dcfce7" : "#fee2e2",
                color: isApprove ? "#15803d" : "#dc2626",
                padding: "6px",
                borderRadius: "8px",
                display: "flex",
              }}
            >
              {isApprove ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            </div>
            <div>
              <h3 className="jf-modal-title">
                {isApprove ? "Approve Reprint Request" : "Reject Reprint Request"}
              </h3>
              <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                Request #{reprintRequest.reprintRequestNo || "RR"} • Job #
                {reprintRequest.jobOrderNo || reprintRequest.jobOrderId?.jobNo || "JO"}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm"
            onClick={onClose}
            style={{ padding: "4px" }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="jf-modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Request Summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
                padding: "0.75rem",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "0.8125rem",
              }}
            >
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Requested Quantity:</span>
                <strong style={{ color: "#0f172a" }}>
                  {reprintRequest.quantity} units
                </strong>
              </div>
              <div>
                <span style={{ color: "#64748b", display: "block" }}>Source Stage:</span>
                <span className="jf-badge jf-badge-warning">
                  {reprintRequest.sourceStage || "QC"}
                </span>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <span style={{ color: "#64748b", display: "block" }}>Stated Defect / Reason:</span>
                <span style={{ color: "#0f172a" }}>{reprintRequest.reason || "N/A"}</span>
              </div>
            </div>

            {isApprove ? (
              <div
                style={{
                  padding: "0.75rem",
                  background: "#f0fdf4",
                  borderRadius: "8px",
                  border: "1px solid #dcfce7",
                  fontSize: "0.8125rem",
                  color: "#166534",
                }}
              >
                Approving this request will automatically generate a new production order linked to this job for{" "}
                <strong>{reprintRequest.quantity} units</strong>, and insert configured operations into the shop floor queue.
              </div>
            ) : (
              <div className="jf-form-group">
                <label className="jf-label">Rejection Reason *</label>
                <textarea
                  className="jf-input"
                  rows="3"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Existing stock can be salvaged; defect is within customer tolerance..."
                  required
                />
              </div>
            )}
          </div>

          <div className="jf-modal-footer">
            <button
              type="button"
              className="jf-btn jf-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`jf-btn ${isApprove ? "jf-btn-primary" : "jf-btn-danger"}`}
              disabled={submitting}
            >
              {submitting
                ? "Processing..."
                : isApprove
                ? "Confirm & Initialize Batch"
                : "Reject Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReprintDecisionModal;
