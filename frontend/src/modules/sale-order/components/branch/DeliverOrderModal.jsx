import React, { useEffect, useRef, useState } from "react";
import Modal from "../common/Modal";
import saleOrderApi from "../../api/saleOrderApi";
import { PAYMENT_MODES } from "../../utils/saleOrderStatus";
import { errorMessage, formatMoney } from "../../utils/format";
import "../../styles/sale-order.css";

const NON_CASH = ["UPI", "CARD", "BANK_TRANSFER"];

// Hand the order to the customer. Any balance has to be paid in full first.
export default function DeliverOrderModal({ isOpen, order, onClose, onDone }) {
  const balance = Number(order?.balanceDue || 0);
  const [receivedByName, setReceivedByName] = useState("");
  const [mode, setMode] = useState("CASH");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [sendReceipt, setSendReceipt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const keyRef = useRef("");

  useEffect(() => {
    if (!isOpen) return;
    setReceivedByName(order?.customerSnapshot?.name || "");
    setMode("CASH");
    setReference("");
    setRemarks("");
    setSendReceipt(false);
    setError("");
    // One key per opening: a double click can never take the payment twice
    keyRef.current = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  }, [isOpen, order?._id, order?.customerSnapshot?.name]);

  const submit = async () => {
    setError("");
    if (!receivedByName.trim()) return setError("Enter the name of the person receiving the order.");
    if (balance > 0 && NON_CASH.includes(mode) && !reference.trim()) {
      return setError("A payment reference number is required for UPI, card and bank payments.");
    }
    try {
      setSaving(true);
      const body = { receivedByName: receivedByName.trim(), remarks: remarks.trim(), sendReceipt };
      if (balance > 0) Object.assign(body, { amount: balance, mode, reference: reference.trim() });
      const delivered = await saleOrderApi.deliver(order._id, body, keyRef.current);
      onDone?.(delivered);
    } catch (err) {
      setError(errorMessage(err, "Could not deliver the order."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deliver to Customer"
      subtitle={order ? `${order.orderNo} · ${order.customerSnapshot?.name || ""}` : ""}
      footer={
        <>
          <button type="button" className="so-btn secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="so-btn primary" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : balance > 0 ? "Collect & Deliver" : "Mark Delivered"}
          </button>
        </>
      }
    >
      {error && <div className="so-alert error"><span>{error}</span></div>}

      <div className="so-card" style={{ background: "#f8fafc" }}>
        <div className="so-summary" style={{ padding: "14px 18px" }}>
          <div className="so-summary-row">
            <span>Order total</span>
            <strong>{formatMoney(order?.grandTotal)}</strong>
          </div>
          <div className="so-summary-row paid">
            <span>Already paid</span>
            <strong>{formatMoney(order?.amountPaid)}</strong>
          </div>
          <div className="so-summary-row due">
            <span>Collect now</span>
            <strong>{formatMoney(balance)}</strong>
          </div>
        </div>
      </div>

      <div className="so-form-grid">
        <div className="so-field so-span-2">
          <label>Received by <span className="req">*</span></label>
          <input className="so-input" value={receivedByName} onChange={(e) => setReceivedByName(e.target.value)} placeholder="Name of the person taking the order" />
        </div>
        {balance > 0 && (
          <>
            <div className="so-field">
              <label>Payment mode <span className="req">*</span></label>
              <select className="so-select" value={mode} onChange={(e) => setMode(e.target.value)}>
                {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            {NON_CASH.includes(mode) && (
              <div className="so-field">
                <label>Reference number <span className="req">*</span></label>
                <input className="so-input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI ID / card slip / bank ref" />
              </div>
            )}
          </>
        )}
        <div className="so-field so-span-2">
          <label>Remarks (optional)</label>
          <textarea className="so-textarea" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
      </div>

      {balance > 0 && (
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
          <input type="checkbox" checked={sendReceipt} onChange={(e) => setSendReceipt(e.target.checked)} />
          Send the payment receipt to the customer on WhatsApp
        </label>
      )}
    </Modal>
  );
}
