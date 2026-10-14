import React, { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";

export const RejectDesignModal = ({ isOpen, onClose, job, onConfirmReject }) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Rejection reason is mandatory. Please state why you cannot accept this assignment.");
      return;
    }

    setLoading(true);
    try {
      await onConfirmReject(job._id || job.id, reason.trim());
      setReason("");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject assignment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal" style={{ maxWidth: "520px" }}>
        <div className="jf-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={20} style={{ color: "#dc2626" }} />
            <h2 className="jf-modal-title">Reject Design Assignment</h2>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="jf-modal-body">
            <p style={{ fontSize: "0.875rem", color: "#475569", marginTop: 0 }}>
              Please provide a valid reason for rejecting this assignment for Job{" "}
              <strong>{job?.jobNo || job?.orderNumber || "Order"}</strong>. The job will return to the Design Queue and be reassigned to another designer.
            </p>

            <div className="jf-form-group">
              <label className="jf-label jf-label-required">Reason</label>
              <textarea
                className="jf-textarea"
                placeholder="Currently handling other urgent work / Missing critical artwork specifications..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={4}
              />
            </div>
          </div>

          <div className="jf-modal-footer">
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="jf-btn jf-btn-danger" disabled={loading}>
              {loading ? "Rejecting..." : "Reject Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RejectDesignModal;
