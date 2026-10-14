import React, { useState } from "react";
import { X, SkipForward, AlertCircle } from "lucide-react";
import jobFlowApi from "../api/productionApi";
import { toast } from "react-toastify";

export const OperationSkipModal = ({
  isOpen,
  onClose,
  operation,
  productionOrder,
  onSuccess,
}) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !operation) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please provide a reason for skipping this finishing operation.");
      return;
    }

    setSubmitting(true);
    try {
      const opId = operation._id || operation.id;
      await jobFlowApi.skipOperation(opId, reason);
      toast.info(`Operation "${operation.operationName || operation.operation}" skipped.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to skip operation.");
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
                background: "#f1f5f9",
                color: "#475569",
                padding: "6px",
                borderRadius: "8px",
                display: "flex",
              }}
            >
              <SkipForward size={18} />
            </div>
            <div>
              <h3 className="jf-modal-title">Skip Finishing Operation</h3>
              <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                Step #{operation.sequenceNo || operation.sequence}:{" "}
                {operation.operationName || operation.operation}
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
            <div
              style={{
                padding: "0.75rem",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "0.8125rem",
                color: "#334155",
              }}
            >
              Skipping an operation bypasses it in the sequence and unlocks the next dependent operation. This action is permanently audited in the workflow timeline.
            </div>

            <div className="jf-form-group">
              <label className="jf-label">Reason for Skipping *</label>
              <textarea
                className="jf-input"
                rows="3"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Substrate pre-treated; secondary lamination waived per customer approved change order..."
                required
              />
            </div>
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
              className="jf-btn jf-btn-secondary"
              disabled={submitting}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {submitting ? (
                "Processing..."
              ) : (
                <>
                  <SkipForward size={16} />
                  Confirm Skip
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OperationSkipModal;
