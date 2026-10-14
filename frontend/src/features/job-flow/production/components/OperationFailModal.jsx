import React, { useState } from "react";
import { X, AlertTriangle, XCircle } from "lucide-react";
import jobFlowApi from "../api/productionApi";
import { toast } from "react-toastify";

export const OperationFailModal = ({
  isOpen,
  onClose,
  operation,
  productionOrder,
  onSuccess,
}) => {
  const [failureReason, setFailureReason] = useState("Machine Jam / Mechanical Breakdown");
  const [remarks, setRemarks] = useState("");
  const [affectedQty, setAffectedQty] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (operation) {
      setAffectedQty(operation.inputQty || operation.plannedQty || 100);
      setRemarks("");
    }
  }, [operation]);

  if (!isOpen || !operation) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!remarks.trim()) {
      toast.error("Please provide detailed remarks explaining the failure.");
      return;
    }

    setSubmitting(true);
    try {
      const opId = operation._id || operation.id;
      const payload = {
        failureReason,
        remarks,
        affectedQty: Number(affectedQty) || 0,
        failedAt: new Date(),
      };

      await jobFlowApi.failOperation(opId, payload);
      toast.warning(`Operation marked as FAILED. Supervisor notified for review.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record operation failure.");
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
                background: "#fee2e2",
                color: "#dc2626",
                padding: "6px",
                borderRadius: "8px",
                display: "flex",
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="jf-modal-title">Record Operation Failure</h3>
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
                background: "#fef2f2",
                borderRadius: "8px",
                border: "1px solid #fecaca",
                fontSize: "0.8125rem",
                color: "#991b1b",
              }}
            >
              Failing this operation halts the production flow for this job until a supervisor reviews, retries, or initiates rework.
            </div>

            <div className="jf-form-group">
              <label className="jf-label">Failure Category / Reason *</label>
              <select
                className="jf-input"
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                required
              >
                <option value="Machine Jam / Mechanical Breakdown">Machine Jam / Mechanical Breakdown</option>
                <option value="Severe Color Mismatch / Registration Off">Severe Color Mismatch / Registration Off</option>
                <option value="Substrate / Paper Defect (Tearing, Creasing)">Substrate / Paper Defect (Tearing, Creasing)</option>
                <option value="Ink / Lamination Delamination">Ink / Lamination Delamination</option>
                <option value="Die Cut Misalignment">Die Cut Misalignment</option>
                <option value="Operator Error">Operator Error</option>
                <option value="Power Interruption / Hardware Fault">Power Interruption / Hardware Fault</option>
                <option value="Other Operational Fault">Other Operational Fault</option>
              </select>
            </div>

            <div className="jf-form-group">
              <label className="jf-label">Affected Quantity (Pieces) *</label>
              <input
                type="number"
                min="1"
                className="jf-input"
                value={affectedQty}
                onChange={(e) => setAffectedQty(e.target.value)}
                required
              />
            </div>

            <div className="jf-form-group">
              <label className="jf-label">Detailed Incident Explanation *</label>
              <textarea
                className="jf-input"
                rows="3"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Explain the machine state, what happened during execution, and physical condition of media..."
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
              className="jf-btn jf-btn-danger"
              disabled={submitting}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {submitting ? (
                "Recording..."
              ) : (
                <>
                  <XCircle size={16} />
                  Confirm Failure
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OperationFailModal;
