import React, { useState } from "react";
import { PauseCircle, X, AlertTriangle } from "lucide-react";

export default function HoldOrderModal({
  isOpen,
  onClose,
  productionOrder,
  onConfirmHold
}) {
  if (!isOpen || !productionOrder) return null;

  const [reason, setReason] = useState("Material Shortage");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirmHold({
        reason,
        remarks
      });
      onClose();
    } catch (err) {
      console.error("Failed to place order on hold:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="prod-modal-overlay">
      <div className="prod-modal-content" style={{ maxWidth: "480px" }}>
        <div className="prod-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "#fee2e2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <PauseCircle size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                Place Order On Hold
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "#64748b" }}>
                Order #{productionOrder.productionNo} • {productionOrder.customerName}
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

        <form onSubmit={handleSubmit}>
          <div className="prod-modal-body">
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Hold Category / Reason *
              </label>
              <select
                className="prod-form-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              >
                <option value="Material Shortage">Material Shortage / Stock Out</option>
                <option value="Machine Breakdown">Machine Maintenance / Breakdown</option>
                <option value="Customer Change Request">Customer Revision Request</option>
                <option value="Quality Discrepancy">Quality Discrepancy Identified</option>
                <option value="Power / Facility Outage">Power / Facility Interruption</option>
                <option value="Other">Other Reason</option>
              </select>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                Detailed Explanation / Note *
              </label>
              <textarea
                className="prod-form-input"
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Explain the reason for pausing production and expected resolution time..."
                required
              />
            </div>

            <div className="prod-notice-box" style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#b45309" }}>
              <AlertTriangle size={15} />
              <span>
                Pausing will set the order status to <strong>ON_HOLD</strong> and freeze active operations until explicitly resumed.
              </span>
            </div>
          </div>

          <div className="prod-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="prod-btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="prod-btn-primary"
              disabled={isSubmitting}
              style={{ background: "#dc2626", borderColor: "#dc2626" }}
            >
              {isSubmitting ? "Placing On Hold..." : "Confirm Hold ⏸"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
