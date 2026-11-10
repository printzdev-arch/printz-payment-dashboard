import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "../common/Modal";
import saleOrderApi from "../../api/saleOrderApi";
import { PAYMENT_MODES } from "../../utils/saleOrderStatus";
import { errorMessage, formatMoney } from "../../utils/format";
import "../../styles/sale-order.css";

const NON_CASH = ["UPI", "CARD", "BANK_TRANSFER"];

// Before design starts the whole advance is refunded. After that only an admin cancels and picks the refund.
export default function CancelOrderModal({ isOpen, order, designStarted, onClose, onDone }) {
  const paid = Number(order?.amountPaid || 0);
  const [reason, setReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMode, setRefundMode] = useState("CASH");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setReason("");
    setRefundAmount(String(paid));
    setRefundMode("CASH");
    setReference("");
    setError("");
  }, [isOpen, paid]);

  const refund = paid > 0 ? (designStarted ? Number(refundAmount || 0) : paid) : 0;

  const submit = async () => {
    setError("");
    if (reason.trim().length < 5) return setError("Please give a reason of at least 5 characters.");
    if (paid > 0 && designStarted && !(refund >= 0 && refund <= paid)) {
      return setError(`The refund must be between ₹0 and ${formatMoney(paid)}.`);
    }
    if (refund > 0 && NON_CASH.includes(refundMode) && !reference.trim()) {
      return setError("A reference number is required for non-cash refunds.");
    }
    try {
      setSaving(true);
      const body = { reason: reason.trim() };
      if (paid > 0) {
        if (designStarted) body.refundAmount = refund;
        body.refundMode = refundMode;
        body.reference = reference.trim();
      }
      await saleOrderApi.cancel(order._id, body);
      onDone?.();
    } catch (err) {
      setError(errorMessage(err, "Could not cancel the order."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel Order"
      subtitle={order ? `${order.orderNo} · ${order.customerSnapshot?.name || ""}` : ""}
      footer={
        <>
          <button type="button" className="so-btn secondary" onClick={onClose} disabled={saving}>Keep Order</button>
          <button type="button" className="so-btn danger" onClick={submit} disabled={saving}>
            {saving ? "Cancelling..." : "Cancel Order"}
          </button>
        </>
      }
    >
      {error && <div className="so-alert error"><span>{error}</span></div>}

      <div className="so-alert warn">
        <AlertTriangle size={17} />
        <span>
          This cannot be undone.{" "}
          {designStarted
            ? "Design work has already started, so you choose how much to refund."
            : paid > 0 ? `The full advance of ${formatMoney(paid)} will be refunded.` : "No money has been collected on this order."}
        </span>
      </div>

      <div className="so-field">
        <label>Reason <span className="req">*</span></label>
        <textarea className="so-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer no longer needs the order" />
      </div>

      {paid > 0 && (
        <div className="so-form-grid">
          {designStarted && (
            <div className="so-field">
              <label>Refund amount <span className="req">*</span></label>
              <div className="so-prefix">
                <span>₹</span>
                <input type="number" min="0" max={paid} step="0.01" className="so-input" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
              </div>
              <span className="so-hint">Paid so far: {formatMoney(paid)}</span>
            </div>
          )}
          <div className="so-field">
            <label>Refund mode</label>
            <select className="so-select" value={refundMode} onChange={(e) => setRefundMode(e.target.value)}>
              {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {NON_CASH.includes(refundMode) && refund > 0 && (
            <div className="so-field so-span-2">
              <label>Reference number <span className="req">*</span></label>
              <input className="so-input" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
