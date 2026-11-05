import React, { useState, useEffect } from "react";
import { X, User, Phone, Truck } from "lucide-react";
import { toast } from "react-toastify";
import deliveryApi from "../api/deliveryApi";

export const AssignDeliveryModal = ({ isOpen, onClose, deliveryOrder, onAssigned }) => {
  const [deliveryPersonName, setDeliveryPersonName] = useState("");
  const [deliveryPersonPhone, setDeliveryPersonPhone] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (deliveryOrder) {
      setDeliveryPersonName(deliveryOrder.deliveryPersonName || deliveryOrder.driverName || "");
      setDeliveryPersonPhone(deliveryOrder.deliveryPersonPhone || deliveryOrder.driverPhone || "");
      setVehicleNumber(deliveryOrder.vehicleNumber || deliveryOrder.vehicle || "");
      const rawEmpId = deliveryOrder.assignedEmployeeId?._id || deliveryOrder.assignedEmployeeId || "";
      setAssignedEmployeeId(typeof rawEmpId === "string" ? rawEmpId : String(rawEmpId || ""));
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
      const payload = {
        deliveryPersonName: deliveryPersonName.trim(),
        deliveryPersonPhone: deliveryPersonPhone.trim(),
        vehicleNumber: vehicleNumber.trim(),
        sendWhatsApp: Boolean(deliveryPersonPhone.trim()),
        sendSystemNotification: true,
      };
      const empIdStr = String(assignedEmployeeId || "");
      if (empIdStr && /^[0-9a-fA-F]{24}$/.test(empIdStr)) {
        payload.assignedEmployeeId = empIdStr;
      }

      const res = await deliveryApi.assignDeliveryOrder(deliveryOrder._id || deliveryOrder.id, payload);
      const updated = res?.data || res;
      const sent = updated?.notificationChannels || updated?.data?.notificationChannels || [];
      const viaWhatsApp = Array.isArray(sent) && sent.some((c) => String(c?.channel || c).toUpperCase().includes("WHATSAPP"));
      toast.success(
        viaWhatsApp
          ? `Assigned to ${deliveryPersonName}. A WhatsApp message was sent.`
          : `Assigned to ${deliveryPersonName}.`
      );
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
            <div>
              <h2 className="jf-modal-title">Assign Delivery Person</h2>
              <div style={{ fontSize: "0.8rem", color: "#475569" }}>
                Job No: <strong>{deliveryOrder.jobNo}</strong>
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
              <label className="jf-label jf-label-required">Delivery person name</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="jf-input"
                  placeholder="e.g. Ramesh"
                  value={deliveryPersonName}
                  onChange={(e) => setDeliveryPersonName(e.target.value)}
                  required
                />
                <User size={16} style={{ position: "absolute", right: 10, top: 12, color: "#475569" }} />
              </div>
            </div>

            <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
              <label className="jf-label">Phone number</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="jf-input"
                  placeholder="e.g. 9876500000"
                  value={deliveryPersonPhone}
                  onChange={(e) => setDeliveryPersonPhone(e.target.value)}
                />
                <Phone size={16} style={{ position: "absolute", right: 10, top: 12, color: "#475569" }} />
              </div>
            </div>

            <div className="jf-form-group" style={{ marginBottom: "1rem" }}>
              <label className="jf-label">Vehicle number</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="jf-input"
                  placeholder="e.g. TN 01 AB 1234 (Hero Splendor)"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                />
                <Truck size={16} style={{ position: "absolute", right: 10, top: 12, color: "#475569" }} />
              </div>
            </div>
          </div>

          <div className="jf-modal-footer">
            <button type="button" className="jf-btn jf-btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="jf-btn jf-btn-primary" disabled={loading}>
              {loading ? "Assigning..." : "Assign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignDeliveryModal;
