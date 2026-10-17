import React, { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import posApi from "../api/posApi";

export const VoidSaleModal = ({ isOpen, onClose, receipt, onVoided }) => {
  const [reason, setReason] = useState("Customer cancellation at counter");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !receipt) return null;

  const handleVoid = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please provide a reason for voiding this receipt");
      return;
    }

    setLoading(true);
    try {
      const res = await posApi.voidSale(receipt._id || receipt.id, reason);
      toast.success(`Receipt ${receipt.receiptNo} voided & inventory reversed successfully`);
      if (onVoided) onVoided(res?.data || res);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to void sale receipt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-sm">
        <div className="jf-modal-header" style={{ borderBottomColor: "#fee2e2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={20} style={{ color: "#dc2626" }} />
            <div>
              <h2 className="jf-modal-title" style={{ color: "#991b1b" }}>Void Sale Receipt</h2>
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                Receipt: <strong>{receipt.receiptNo}</strong> (₹{Number(receipt.grandTotal || 0).toFixed(2)})
              </div>
            </div>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleVoid}>
          <div className="jf-modal-body">
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "0.85rem",
              fontSize: "0.82rem",
              color: "#991b1b",
              lineHeight: 1.4,
              marginBottom: "1rem"
            }}>
              <strong>Warning:</strong> Voiding this sale receipt will mark it as <code>VOIDED</code> and reverse all deducted inventory quantities back into branch stock balances.
            </div>

            <div className="jf-form-group">
              <label className="jf-label">Cancellation / Void Reason *</label>
              <textarea
                className="jf-input"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter cancellation reason..."
                required
              />
            </div>
          </div>

          <div className="jf-modal-footer">
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="jf-btn jf-btn-primary" style={{ background: "#dc2626", borderColor: "#dc2626" }} disabled={loading}>
              {loading ? "Voiding..." : "Confirm & Void Sale"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VoidSaleModal;
