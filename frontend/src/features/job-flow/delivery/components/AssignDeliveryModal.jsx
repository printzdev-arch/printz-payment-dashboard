import React, { useState, useEffect } from "react";
import { X, Send, User, Phone, Truck, MessageSquare } from "lucide-react";
import { toast } from "react-toastify";
import deliveryApi from "../api/deliveryApi";

export const AssignDeliveryModal = ({ isOpen, onClose, deliveryOrder, onAssigned }) => {
  const [deliveryPersonName, setDeliveryPersonName] = useState("");
  const [deliveryPersonPhone, setDeliveryPersonPhone] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (deliveryOrder) {
      setDeliveryPersonName(deliveryOrder.deliveryPersonName || deliveryOrder.driverName || "");
      setDeliveryPersonPhone(deliveryOrder.deliveryPersonPhone || deliveryOrder.driverPhone || "");
      setVehicleNumber(deliveryOrder.vehicleNumber || deliveryOrder.vehicle || "");
      setAssignedEmployeeId(deliveryOrder.assignedEmployeeId || "");
    }
  }, [deliveryOrder]);

  if (!isOpen || !deliveryOrder) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!deliveryPersonName.trim()) {
      toast.error("Delivery person name is required");
      return;
    }

    setLoading(true);
    try {
      const channels = [];
      if (notifyWhatsApp) channels.push("WHATSAPP");
      if (notifySms) channels.push("SMS");

      const payload = {
        deliveryPersonName,
        deliveryPersonPhone,
        vehicleNumber,
        channels: channels.length > 0 ? channels : ["WHATSAPP"],
      };
      if (assignedEmployeeId && /^[0-9a-fA-F]{24}$/.test(assignedEmployeeId) && assignedEmployeeId !== "66acdd7939539ae7343338fa") {
        payload.assignedEmployeeId = assignedEmployeeId;
      }

      const res = await deliveryApi.assignDeliveryOrder(deliveryOrder._id || deliveryOrder.id, payload);
      const updated = res?.data || res;
      toast.success(`Assigned to ${deliveryPersonName} & alert sent via ${channels.join(", ")}!`);
      if (onAssigned) onAssigned(updated);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign staff");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="jf-modal-overlay">
      <div className="jf-modal jf-modal-md">
        <div className="jf-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Send size={20} style={{ color: "var(--jf-primary)" }} />
            <div>
              <h2 className="jf-modal-title">Assign Rider & Send Alert</h2>
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
            <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
              <label className="jf-label jf-label-required">Delivery Person / Rider Name</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="jf-input"
                  placeholder="e.g. Ramesh"
                  value={deliveryPersonName}
                  onChange={(e) => setDeliveryPersonName(e.target.value)}
                  required
                />
                <User size={16} style={{ position: "absolute", right: 10, top: 12, color: "#94a3b8" }} />
              </div>
            </div>

            <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
              <label className="jf-label">Rider Contact Number</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="jf-input"
                  placeholder="e.g. 9876500000"
                  value={deliveryPersonPhone}
                  onChange={(e) => setDeliveryPersonPhone(e.target.value)}
                />
                <Phone size={16} style={{ position: "absolute", right: 10, top: 12, color: "#94a3b8" }} />
              </div>
            </div>

            <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
              <label className="jf-label">Vehicle Details / Registration No.</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="jf-input"
                  placeholder="e.g. TN 01 AB 1234 (Hero Splendor)"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                />
                <Truck size={16} style={{ position: "absolute", right: 10, top: 12, color: "#94a3b8" }} />
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "0.875rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.825rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <MessageSquare size={16} style={{ color: "#2563eb" }} />
                Instant Notification Channels:
              </div>
              <div style={{ display: "flex", gap: "1.5rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={notifyWhatsApp}
                    onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                  />
                  <span>WhatsApp Message</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={notifySms}
                    onChange={(e) => setNotifySms(e.target.checked)}
                  />
                  <span>SMS Alert</span>
                </label>
              </div>
            </div>
          </div>

          <div className="jf-modal-footer">
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="jf-btn jf-btn-primary" disabled={loading}>
              {loading ? "Assigning..." : "Assign & Notify (ASSIGNED)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignDeliveryModal;
