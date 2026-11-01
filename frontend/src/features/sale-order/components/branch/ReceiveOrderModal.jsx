import React, { useEffect, useState } from "react";
import Modal from "../common/Modal";
import saleOrderApi from "../../api/saleOrderApi";
import { errorMessage } from "../../utils/format";
import "../../styles/sale-order.css";

// Branch confirms the parcel arrived and counts the packages.
export default function ReceiveOrderModal({ isOpen, order, onClose, onDone }) {
  const sent = order?.dispatch?.packages || 1;
  const [received, setReceived] = useState(String(sent));
  const [remarks, setRemarks] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setReceived(String(sent));
    setRemarks("");
    setNotifyCustomer(false);
    setError("");
  }, [isOpen, sent]);

  const mismatch = Number(received) !== sent;

  const submit = async () => {
    setError("");
    const count = Number(received);
    if (!Number.isInteger(count) || count < 0) return setError("Packages received must be a whole number.");
    if (mismatch && !remarks.trim()) return setError(`You received ${count} but ${sent} were sent. Please explain in the remarks.`);
    try {
      setSaving(true);
      await saleOrderApi.receive(order._id, { packagesReceived: count, remarks: remarks.trim(), notifyCustomer });
      onDone?.();
    } catch (err) {
      setError(errorMessage(err, "Could not record the receipt."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Receive at Branch"
      subtitle={order ? `${order.orderNo} · ${order.dispatch?.dispatchNo || ""}` : ""}
      footer={
        <>
          <button type="button" className="so-btn secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="so-btn primary" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Confirm Received"}
          </button>
        </>
      }
    >
      {error && <div className="so-alert error"><span>{error}</span></div>}

      <div className="so-form-grid">
        <div className="so-field">
          <label>Packages sent</label>
          <input className="so-input" value={sent} disabled />
        </div>
        <div className="so-field">
          <label>Packages received <span className="req">*</span></label>
          <input type="number" min="0" step="1" className="so-input" value={received} onChange={(e) => setReceived(e.target.value)} />
        </div>
      </div>

      {mismatch && (
        <div className="so-field">
          <label>What is different? <span className="req">*</span></label>
          <textarea className="so-textarea" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. One box was damaged / missing" />
        </div>
      )}
      {!mismatch && (
        <div className="so-field">
          <label>Remarks (optional)</label>
          <textarea className="so-textarea" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
      )}

      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
        <input type="checkbox" checked={notifyCustomer} onChange={(e) => setNotifyCustomer(e.target.checked)} />
        Tell the customer on WhatsApp that the order is ready for pickup
      </label>
    </Modal>
  );
}
