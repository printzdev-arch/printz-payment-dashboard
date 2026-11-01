import React, { useState, useEffect } from "react";
import { X, Pause } from "lucide-react";
import jobFlowApi from "../api/productionApi";
import { toast } from "react-toastify";

const PAUSE_REASONS = [
  "Machine maintenance / adjustment",
  "Waiting for material",
  "Shift change / break",
  "Waiting for approval",
  "Power interruption",
  "Other",
];

export const OperationPauseModal = ({
  isOpen,
  onClose,
  operation,
  productionOrder,
  onSuccess,
}) => {
  const [category, setCategory] = useState(PAUSE_REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCategory(PAUSE_REASONS[0]);
    setDetails("");
  }, [isOpen, operation]);

  if (!isOpen || !operation) return null;

  const opName = operation.operationName || operation.operation || operation.operationCode;
  const poNumber = productionOrder?.productionNo || productionOrder?.orderNumber || "—";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (category === "Other" && !details.trim()) {
      toast.error("Please describe why the operation is being paused.");
      return;
    }

    const reason = details.trim() ? `${category}: ${details.trim()}` : category;

    setSubmitting(true);
    try {
      const opId = operation._id || operation.id;
      await jobFlowApi.pauseOperation(opId, reason);
      toast.info(`Operation "${opName}" paused.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to pause operation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal">
        <div className="jf-modal-header">
          <div className="prod-modal-header-left">
            <div className="prod-modal-icon-badge amber">
              <Pause size={18} />
            </div>
            <div>
              <h3 className="jf-modal-title">Pause Operation</h3>
              <span className="prod-modal-subtitle">
                {poNumber} · Step #{operation.sequenceNo || operation.sequence || "—"}: {opName}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="jf-btn jf-btn-secondary jf-btn-sm prod-modal-close-btn"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="jf-modal-body prod-modal-body-stack">
            <div className="prod-modal-alert prod-modal-alert--amber">
              Pausing stops the working-time clock for this operation. Resume it when work continues. The pause and
              its reason are recorded in the audit log.
            </div>

            <div className="jf-form-group">
              <label className="jf-label">Reason *</label>
              <select className="jf-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {PAUSE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="jf-form-group">
              <label className="jf-label">Details {category === "Other" ? "*" : "(Optional)"}</label>
              <textarea
                className="jf-input"
                rows="3"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Add any detail the next person should know..."
              />
            </div>
          </div>

          <div className="jf-modal-footer">
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="jf-btn jf-btn-warning prod-btn-with-icon"
              disabled={submitting}
            >
              {submitting ? (
                "Pausing..."
              ) : (
                <>
                  <Pause size={16} />
                  Confirm Pause
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OperationPauseModal;