import React, { useState } from "react";
import { X, Package, CheckSquare, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import deliveryApi from "../api/deliveryApi";

export const PackDeliveryModal = ({ isOpen, onClose, deliveryOrder, onPacked }) => {
  const [packingNotes, setPackingNotes] = useState("Box packed with bubble wrap and sealed");
  const [itemsVerified, setItemsVerified] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !deliveryOrder) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!itemsVerified) {
      toast.error("Please verify that all printed items are physically verified before packing");
      return;
    }

    setLoading(true);
    try {
      const res = await deliveryApi.packDeliveryOrder(deliveryOrder._id || deliveryOrder.id, {
        packingNotes,
        itemsVerified: true,
      });
      const updated = res?.data || res;
      toast.success(`Delivery Order ${deliveryOrder.deliveryNo} is packed & verified! (PACKED)`);
      if (onPacked) onPacked(updated);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark order as packed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-md">
        <div className="jf-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Package size={20} style={{ color: "var(--jf-primary)" }} />
            <div>
              <h2 className="jf-modal-title">Pack & Verify Goods</h2>
              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                Delivery No: <strong>{deliveryOrder.deliveryNo}</strong>
              </div>
            </div>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="jf-modal-body">
            <div style={{
              background: "#faf5ff",
              border: "1px solid #e9d5ff",
              borderRadius: "8px",
              padding: "0.875rem",
              marginBottom: "1rem"
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontWeight: 600, color: "#6b21a8" }}>
                <input
                  type="checkbox"
                  checked={itemsVerified}
                  onChange={(e) => setItemsVerified(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <span>I confirm that all job items, counts, and packaging seals are physically verified</span>
              </label>
            </div>

            <div className="jf-form-group">
              <label className="jf-label jf-label-required">Packing & Quality Notes</label>
              <textarea
                className="jf-textarea"
                rows={3}
                placeholder="e.g. Box packed with bubble wrap and sealed"
                value={packingNotes}
                onChange={(e) => setPackingNotes(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="jf-modal-footer">
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="jf-btn jf-btn-primary" disabled={loading || !itemsVerified}>
              {loading ? "Packing..." : "Confirm & Mark PACKED"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PackDeliveryModal;
