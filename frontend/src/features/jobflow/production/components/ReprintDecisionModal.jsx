import React, { useState } from "react";
import { X, CheckCircle2, XCircle } from "lucide-react";
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
  const [comments, setComments] = useState("");
  const [markAsUrgent, setMarkAsUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    setRejectionReason("");
    setComments("");
    setMarkAsUrgent(false);
  }, [isOpen, actionType, reprintRequest]);

  if (!isOpen || !reprintRequest) return null;

  const isApprove = actionType === "APPROVE";
  const requestNo = reprintRequest.requestNo || reprintRequest.reprintRequestNo || "—";
  const jobNo = reprintRequest.jobNo || reprintRequest.jobOrderNo || reprintRequest.jobOrderId?.jobNo || "—";
  const qty = reprintRequest.requestedQty ?? reprintRequest.quantity;
  const restartOp = reprintRequest.restartFromOperationCode || "PRINT";

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
        await jobFlowApi.approveReprintRequest(id, { comments: comments.trim(), markAsUrgent });
        toast.success(`Reprint request ${requestNo} approved. A new reprint production order has been created.`);
      } else {
        await jobFlowApi.rejectReprintRequest(id, { rejectionReason: rejectionReason.trim() });
        toast.warning(`Reprint request ${requestNo} rejected.`);
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
          <div className="prod-modal-header-left">
            <div className={`prod-modal-icon-badge ${isApprove ? "green" : "red"}`}>
              {isApprove ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            </div>
            <div>
              <h3 className="jf-modal-title">{isApprove ? "Approve Reprint Request" : "Reject Reprint Request"}</h3>
              <span className="prod-modal-subtitle">
                Request #{requestNo} • Job #{jobNo}
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
            <div className="prod-modal-info-box">
              <div>
                <span className="prod-modal-label">Requested Quantity:</span>
                <strong className="prod-modal-val">{qty ?? "—"} units</strong>
              </div>
              <div>
                <span className="prod-modal-label">Restart From:</span>
                <span className="jf-badge jf-badge-warning">{restartOp}</span>
              </div>
              <div className="prod-modal-info-full">
                <span className="prod-modal-label">Stated Defect / Reason:</span>
                <span className="prod-modal-val">{reprintRequest.reason || "N/A"}</span>
              </div>
            </div>

            {isApprove ? (
              <>
                <div className="prod-modal-alert prod-modal-alert--green">
                  Approving creates a new reprint production order for <strong>{qty ?? "—"} units</strong>, starting from{" "}
                  <strong>{restartOp}</strong>, and adds its operations to the Production Tracking queue. The original
                  order stays as it is.
                </div>

                <div className="jf-form-group">
                  <label className="jf-label">Manager Comments (Optional)</label>
                  <textarea
                    className="jf-input"
                    rows="2"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Any instructions for the production team..."
                  />
                </div>

                <label className="prod-modal-packing-check">
                  <input type="checkbox" checked={markAsUrgent} onChange={(e) => setMarkAsUrgent(e.target.checked)} />
                  <span>Mark this reprint as urgent</span>
                </label>
              </>
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
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className={`jf-btn ${isApprove ? "jf-btn-primary" : "jf-btn-danger"}`}
              disabled={submitting}
            >
              {submitting ? "Processing..." : isApprove ? "Approve & Create Reprint Order" : "Reject Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReprintDecisionModal;