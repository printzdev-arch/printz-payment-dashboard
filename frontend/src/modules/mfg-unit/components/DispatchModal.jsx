import React, { useEffect, useState } from "react";
import StyledSelect from "../../../shared/ui/selects/StyledSelect";
import Modal from "../../sale-order/components/common/Modal";
import mfgApi from "../api/mfgApi";
import { errorMessage } from "../../sale-order/utils/format";
import "../../sale-order/styles/sale-order.css";

const MODES = [
  { value: "OWN_VEHICLE", label: "Own vehicle" },
  { value: "COURIER", label: "Courier" },
  { value: "STAFF_HAND_DELIVERY", label: "Staff hand delivery" },
];

// Send the finished parcel to the branch that placed the order.
export default function DispatchModal({ isOpen, order, onClose, onDone }) {
  const [packages, setPackages] = useState("1");
  const [mode, setMode] = useState("OWN_VEHICLE");
  const [trackingRef, setTrackingRef] = useState("");
  const [carrierDetails, setCarrierDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setPackages("1");
    setMode("OWN_VEHICLE");
    setTrackingRef("");
    setCarrierDetails("");
    setError("");
  }, [isOpen]);

  const submit = async () => {
    setError("");
    const count = Number(packages);
    if (!Number.isInteger(count) || count < 1) return setError("Enter at least 1 package.");
    if (mode === "COURIER" && !trackingRef.trim()) return setError("A tracking number is required for courier dispatch.");
    try {
      setSaving(true);
      await mfgApi.dispatch(order._id, {
        packages: count,
        mode,
        trackingRef: trackingRef.trim(),
        carrierDetails: carrierDetails.trim(),
      });
      onDone?.();
    } catch (err) {
      setError(errorMessage(err, "Could not dispatch the order."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dispatch to Branch"
      subtitle={order ? `${order.orderNo} → ${order.orderBranch?.name || "branch"}` : ""}
      footer={
        <>
          <button type="button" className="so-btn secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="so-btn primary" onClick={submit} disabled={saving}>
            {saving ? "Dispatching..." : "Dispatch Order"}
          </button>
        </>
      }
    >
      {error && <div className="so-alert error"><span>{error}</span></div>}

      <div className="so-alert info">
        <span>The parcel goes to <strong>{order?.orderBranch?.name || "the ordering branch"}</strong>. The branch is told as soon as you dispatch.</span>
      </div>

      <div className="so-form-grid">
        <div className="so-field">
          <label>Number of packages <span className="req">*</span></label>
          <input type="number" min="1" step="1" className="so-input" value={packages} onChange={(e) => setPackages(e.target.value)} />
        </div>
        <div className="so-field">
          <label>How is it being sent? <span className="req">*</span></label>
          <StyledSelect className="so-select" value={mode} onChange={(e) => setMode(e.target.value)}>
            {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </StyledSelect>
        </div>
        {mode === "COURIER" && (
          <div className="so-field so-span-2">
            <label>Tracking number <span className="req">*</span></label>
            <input className="so-input" value={trackingRef} onChange={(e) => setTrackingRef(e.target.value)} placeholder="Courier tracking / AWB number" />
          </div>
        )}
        <div className="so-field so-span-2">
          <label>{mode === "COURIER" ? "Courier name" : mode === "OWN_VEHICLE" ? "Vehicle / driver" : "Staff member"} (optional)</label>
          <input className="so-input" value={carrierDetails} onChange={(e) => setCarrierDetails(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
