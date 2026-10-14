import React, { useState } from "react";
import { X, Truck } from "lucide-react";
import { toast } from "react-toastify";

export const DeliveryAssignModal = ({ isOpen, onClose, deliveryOrder, onAssign }) => {
  const [deliveryMethod, setDeliveryMethod] = useState("In-House Delivery");
  const [deliveryPersonName, setDeliveryPersonName] = useState("");
  const [deliveryPersonPhone, setDeliveryPersonPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (deliveryOrder) {
      setRecipientName(deliveryOrder.customerName || deliveryOrder.recipientName || "");
      setDeliveryAddress(deliveryOrder.deliveryAddress || "");
    }
  }, [deliveryOrder]);

  if (!isOpen || !deliveryOrder) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (deliveryMethod !== "Customer Pickup") {
      if (!deliveryPersonName.trim()) {
        toast.error("Delivery person name is required");
        return;
      }
      if (!deliveryPersonPhone.trim()) {
        toast.error("Delivery person contact number is required");
        return;
      }
    }

    setLoading(true);
    try {
      await onAssign(deliveryOrder._id || deliveryOrder.id, {
        deliveryMethod,
        deliveryPersonName,
        deliveryPersonPhone,
        recipientName,
        vehicleInfo,
        deliveryAddress,
        instructions,
      });
      toast.success("Delivery personnel assigned and notification dispatched successfully!");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign delivery personnel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-lg">
        <div className="jf-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Truck size={22} style={{ color: "var(--jf-primary)" }} />
            <h2 className="jf-modal-title">Manager Delivery Assignment</h2>
          </div>
          <button type="button" className="jf-btn jf-btn-secondary jf-btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="jf-modal-body">
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: 0 }}>
              Delivery No: <strong>{deliveryOrder.deliveryNo || "DO-202610-0001"}</strong> • Accepted Qty:{" "}
              <strong>{deliveryOrder.quantity || 500}</strong>
            </p>

            <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
              <label className="jf-label jf-label-required">Delivery Method</label>
              <select
                className="jf-select"
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value)}
              >
                <option value="In-House Delivery">In-House Staff Delivery</option>
                <option value="Customer Pickup">Counter Pickup</option>
                <option value="Courier">External Courier (Lalamove / GrabExpress)</option>
              </select>
            </div>

            {deliveryMethod !== "Customer Pickup" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div className="jf-form-group">
                  <label className="jf-label jf-label-required">Delivery Person Name</label>
                  <input
                    type="text"
                    className="jf-input"
                    placeholder="e.g. Ramesh Kumar"
                    value={deliveryPersonName}
                    onChange={(e) => setDeliveryPersonName(e.target.value)}
                    required
                  />
                </div>
                <div className="jf-form-group">
                  <label className="jf-label jf-label-required">Contact Number</label>
                  <input
                    type="text"
                    className="jf-input"
                    placeholder="012-987 6543"
                    value={deliveryPersonPhone}
                    onChange={(e) => setDeliveryPersonPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div className="jf-form-group">
                <label className="jf-label">Recipient Name</label>
                <input
                  type="text"
                  className="jf-input"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
              <div className="jf-form-group">
                <label className="jf-label">Vehicle Info / Tracking Ref</label>
                <input
                  type="text"
                  className="jf-input"
                  placeholder="e.g. Van WXY 1234 or Tracking ID"
                  value={vehicleInfo}
                  onChange={(e) => setVehicleInfo(e.target.value)}
                />
              </div>
            </div>

            <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
              <label className="jf-label">Delivery Address</label>
              <input
                type="text"
                className="jf-input"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="10, Jalan Puchong, 58200 Kuala Lumpur"
              />
            </div>

            <div className="jf-form-group">
              <label className="jf-label">Delivery Instructions</label>
              <textarea
                className="jf-textarea"
                placeholder="Fragile cartons. Hand over directly to store manager..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="jf-modal-footer">
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="jf-btn jf-btn-primary" disabled={loading}>
              {loading ? "Assigning..." : "Confirm & Send Instructions"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeliveryAssignModal;
