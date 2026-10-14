import React, { useState } from "react";
import { X, Pause, Play, Ban, AlertTriangle } from "lucide-react";
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

  const getTitle = () => {
    if (isHold) return "Place Production Order on Hold";
    if (isResume) return "Resume Production Order";
    if (isCancel) return "Cancel Production Order";
    return "Order Action";
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
        await jobFlowApi.holdProductionOrder(orderId, reason);
        toast.warning(`Production Order ${productionOrder.orderNumber} placed ON_HOLD.`);
      } else if (isResume) {
        await jobFlowApi.resumeProductionOrder(orderId, reason || "Resumed by manager");
        toast.success(`Production Order ${productionOrder.orderNumber} resumed to IN_PROGRESS.`);
      } else if (isCancel) {
        await jobFlowApi.cancelProductionOrder(orderId, reason);
        toast.error(`Production Order ${productionOrder.orderNumber} CANCELLED.`);
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                background: isCancel ? "#fee2e2" : isHold ? "#fef3c7" : "#dcfce7",
                color: isCancel ? "#dc2626" : isHold ? "#d97706" : "#15803d",
                padding: "6px",
                borderRadius: "8px",
                display: "flex",
              }}
            >
              {isCancel ? <Ban size={18} /> : isHold ? <Pause size={18} /> : <Play size={18} />}
            </div>
            <div>
              <h3 className="jf-modal-title">{getTitle()}</h3>
              <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                Order #{productionOrder.orderNumber || "PO"} (Job #{productionOrder.jobOrderNo || "JO"})
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
            {isHold && (
              <div
                style={{
                  padding: "0.75rem",
                  background: "#fffbeb",
                  borderRadius: "8px",
                  border: "1px solid #fef3c7",
                  fontSize: "0.8125rem",
                  color: "#92400e",
                }}
              >
                Holding this order freezes active operations and alerts shop floor operators. You can resume this order whenever ready.
              </div>
            )}

            {isResume && (
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
                Resuming will restore this order to <strong>IN_PROGRESS</strong>, allowing operators to claim and execute eligible operations.
              </div>
            )}

            {isCancel && (
              <div
                style={{
                  padding: "0.75rem",
                  background: "#fef2f2",
                  borderRadius: "8px",
                  border: "1px solid #fee2e2",
                  fontSize: "0.8125rem",
                  color: "#991b1b",
                }}
              >
                <strong>Warning:</strong> Cancelling this production order is permanent. Remaining queued operations will be terminated.
              </div>
            )}

            <div className="jf-form-group">
              <label className="jf-label">
                {isResume ? "Remarks (Optional)" : "Reason *"}
              </label>
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
              className={`jf-btn ${
                isCancel ? "jf-btn-danger" : isHold ? "jf-btn-warning" : "jf-btn-primary"
              }`}
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
