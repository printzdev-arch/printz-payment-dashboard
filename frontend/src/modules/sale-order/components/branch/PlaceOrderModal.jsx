import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "../common/Modal";
import saleOrderApi from "../../api/saleOrderApi";
import { PAYMENT_MODES } from "../../utils/saleOrderStatus";
import { errorMessage, formatMoney } from "../../utils/format";
import "../../styles/sale-order.css";

const NON_CASH = ["UPI", "CARD", "BANK_TRANSFER"];

// Collect the advance and place the order. The unit gets it as soon as this succeeds.
export default function PlaceOrderModal({ isOpen, order, canOverride, onClose, onPlaced }) {
  const total = Number(order?.grandTotal || 0);
  const [advance, setAdvance] = useState("");
  const [mode, setMode] = useState("CASH");
  const [reference, setReference] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [required, setRequired] = useState(null); // minimum advance reported by the server
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const keyRef = useRef("");

  useEffect(() => {
    if (isOpen) {
      setAdvance(String(Math.round(total * 0.5 * 100) / 100));
      setMode("CASH");
      setReference("");
      setOverrideReason("");
      setRequired(null);
      setError("");
      // One key per opening: a double click can never take the payment twice
      keyRef.current = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    }
  }, [isOpen, total]);

  const advanceNum = Number(advance || 0);
  const balance = Math.max(0, Math.round((total - advanceNum) * 100) / 100);
  const lowAdvance = required !== null && advanceNum + 0.004 < required;

  const submit = async () => {
    setError("");
    if (!(advanceNum > 0) || advanceNum > total) {
      setError(`Enter an advance more than ₹0 and not more than ${formatMoney(total)}.`);
      return;
    }
    if (NON_CASH.includes(mode) && !reference.trim()) {
      setError("A payment reference number is required for UPI, card and bank payments.");
      return;
    }
    try {
      setSaving(true);
      const placed = await saleOrderApi.place(
        order._id,
        {
          advanceAmount: advanceNum,
          mode,
          reference: reference.trim(),
          overrideReason: overrideReason.trim() || undefined,
        },
        keyRef.current
      );
      onPlaced?.(placed);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.code === "ADVANCE_TOO_LOW") {
        setRequired(Number(data?.details?.required || 0));
        setError(data.message);
      } else {
        setError(errorMessage(err, "Could not place the order."));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Collect Advance & Place Order"
      subtitle={order ? `Draft for ${order.customerSnapshot?.name || "customer"}` : ""}
      footer={
        <>
          <button type="button" className="so-btn secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="so-btn primary" onClick={submit} disabled={saving}>
            {saving ? "Placing..." : "Collect & Place Order"}
          </button>
        </>
      }
    >
      {error && (
        <div className={`so-alert ${lowAdvance ? "warn" : "error"}`}>
          {lowAdvance ? <AlertTriangle size={17} /> : null}
          <span>{error}</span>
        </div>
      )}

      <div className="so-card" style={{ background: "#f8fafc" }}>
        <div className="so-summary" style={{ padding: "14px 18px" }}>
          <div className="so-summary-row">
            <span>Order total</span>
            <strong>{formatMoney(total)}</strong>
          </div>
          <div className="so-summary-row due">
            <span>Balance after this advance</span>
            <strong>{formatMoney(balance)}</strong>
          </div>
        </div>
      </div>

      <div className="so-form-grid">
        <div className="so-field">
          <label>Advance amount <span className="req">*</span></label>
          <div className="so-prefix">
            <span>₹</span>
            <input type="number" min="0" step="0.01" className="so-input" value={advance} onChange={(e) => setAdvance(e.target.value)} />
          </div>
          <span className="so-hint">A minimum advance is required before the order goes to the unit.</span>
        </div>
        <div className="so-field">
          <label>Payment mode <span className="req">*</span></label>
          <select className="so-select" value={mode} onChange={(e) => setMode(e.target.value)}>
            {PAYMENT_MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        {NON_CASH.includes(mode) && (
          <div className="so-field so-span-2">
            <label>Reference number <span className="req">*</span></label>
            <input
              className="so-input"
              placeholder="UPI transaction ID / card slip / bank reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        )}
      </div>

      {lowAdvance && (
        <div className="so-field">
          <label>Reason for a lower advance {canOverride && <span className="req">*</span>}</label>
          {canOverride ? (
            <>
              <textarea
                className="so-textarea"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Regular customer, balance will be paid on delivery"
              />
              <span className="so-hint">Only a branch manager can place an order below the minimum. This reason is recorded.</span>
            </>
          ) : (
            <div className="so-alert info" style={{ marginBottom: 0 }}>
              <span>
                Collect at least <strong>{formatMoney(required)}</strong>, or ask a branch manager to place this order
                with a reason.
              </span>
            </div>
          )}
          <button type="button" className="so-btn secondary sm" style={{ alignSelf: "flex-start" }} onClick={() => setAdvance(String(required))}>
            Use minimum {formatMoney(required)}
          </button>
        </div>
      )}
    </Modal>
  );
}
