import React, { useState } from "react";
import { X, Pause, Play, Ban } from "lucide-react";
import jobFlowApi from "../api/productionApi";
import { toast } from "react-toastify";

export const ProductionOrderActionsModal = ({
  isOpen,
  onClose,
  actionType, // "HOLD", "RESUME", "CANCEL"
  productionOrder,
  onSuccess,
}) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    setReason("");
  }, [isOpen, actionType]);

  if (!isOpen || !productionOrder) return null;

  const isHold = actionType === "HOLD";
  const isResume = actionType === "RESUME";
  const isCancel = actionType === "CANCEL";

  const jobNumber = productionOrder.jobNo || productionOrder.jobOrderNo || "Job Order";

  const getTitle = () => {
    if (isHold) return "Place Job Order on Hold";
    if (isResume) return "Resume Job Order";
    if (isCancel) return "Cancel Job Order";
    return "Job Action";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((isHold || isCancel) && !reason.trim()) {
      toast.error(`Please provide a reason to ${isHold ? "hold" : "cancel"} this order.`);
      return;
    }

    setSubmitting(true);
    try {
      const orderId = productionOrder._id || productionOrder.id;
      if (isHold) {
        await jobFlowApi.holdProductionOrder(orderId, reason.trim());
        toast.warning(`Job Order ${jobNumber} placed on hold.`);
      } else if (isResume) {
        await jobFlowApi.resumeProductionOrder(orderId, reason.trim() || "Resumed by manager");
        toast.success(`Job Order ${jobNumber} resumed.`);
      } else if (isCancel) {
        await jobFlowApi.cancelProductionOrder(orderId, reason.trim());
        toast.error(`Job Order ${jobNumber} cancelled.`);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to perform ${actionType} action.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal">
        <div className="jf-modal-header">
          <div className="prod-modal-header-left">
            <div className={`prod-modal-icon-badge ${isCancel ? "red" : isHold ? "amber" : "green"}`}>
              {isCancel ? <Ban size={18} /> : isHold ? <Pause size={18} /> : <Play size={18} />}
            </div>
            <div>
              <h3 className="jf-modal-title">{getTitle()}</h3>
              <span className="prod-modal-subtitle">
                Job Order #{jobNumber}
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
            {isHold && (
              <div className="prod-modal-alert prod-modal-alert--amber">
                Holding this order stops its operations from being started and alerts shop floor operators. You can
                resume it whenever you are ready.
              </div>
            )}

            {isResume && (
              <div className="prod-modal-alert prod-modal-alert--green">
                Resuming returns this order to the status it had before the hold (<strong>Planned</strong> or{" "}
                <strong>In Progress</strong>).
              </div>
            )}

            {isCancel && (
              <div className="prod-modal-alert prod-modal-alert--red">
                <strong>Warning:</strong> Cancelling this job order is permanent. Remaining operations will be
                closed.
              </div>
            )}

            <div className="jf-form-group">
              <label className="jf-label">{isResume ? "Remarks (Optional)" : "Reason *"}</label>
              <textarea
                className="jf-input"
                rows="3"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  isHold
                    ? "e.g. Awaiting paper stock arrival from central warehouse..."
                    : isCancel
                    ? "e.g. Customer cancelled order / specs obsolete..."
                    : "e.g. Stock received, resuming production..."
                }
                required={!isResume}
              />
            </div>
          </div>

          <div className="jf-modal-footer">
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className={`jf-btn ${isCancel ? "jf-btn-danger" : isHold ? "jf-btn-warning" : "jf-btn-primary"}`}
              disabled={submitting}
            >
              {submitting
                ? "Processing..."
                : isCancel
                ? "Confirm Cancellation"
                : isHold
                ? "Confirm Hold"
                : "Confirm Resume"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductionOrderActionsModal;