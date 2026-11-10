import React, { useEffect, useState } from "react";
import Modal from "../../sale-order/components/common/Modal";
import mfgApi from "../api/mfgApi";
import { errorMessage } from "../../sale-order/utils/format";
import { typeLabel } from "../../sale-order/utils/saleOrderStatus";
import "../../sale-order/styles/sale-order.css";

// Record what was printed. Every item must reach at least the ordered quantity.
export default function FinishPrintModal({ isOpen, order, onClose, onDone }) {
  const items = order?.items || [];
  const [printed, setPrinted] = useState({});
  const [spoilage, setSpoilage] = useState("0");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setPrinted(Object.fromEntries(items.map((it) => [it.lineNo, String(it.quantity)])));
    setSpoilage("0");
    setRemarks("");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order?._id]);

  const submit = async () => {
    setError("");
    for (const it of items) {
      if (!(Number(printed[it.lineNo]) >= it.quantity)) {
        setError(`Item ${it.lineNo}: printed quantity must be at least ${it.quantity}.`);
        return;
      }
    }
    if (!(Number(spoilage) >= 0)) {
      setError("Spoilage cannot be negative.");
      return;
    }
    try {
      setSaving(true);
      await mfgApi.finishPrint(order._id, {
        items: items.map((it) => ({ lineNo: it.lineNo, printedQty: Number(printed[it.lineNo]) })),
        spoilageQty: Number(spoilage || 0),
        remarks: remarks.trim(),
      });
      onDone?.();
    } catch (err) {
      setError(errorMessage(err, "Could not finish printing."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Finish Printing"
      subtitle={order ? `${order.orderNo} · ${order.customerSnapshot?.name || ""}` : ""}
      footer={
        <>
          <button type="button" className="so-btn secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="so-btn primary" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Mark Printing Finished"}
          </button>
        </>
      }
    >
      {error && <div className="so-alert error"><span>{error}</span></div>}

      <div className="so-rows">
        {items.map((it) => (
          <div className="so-row" key={it._id || it.lineNo}>
            <span>
              <strong>{typeLabel(it.productType)}</strong>
              <div className="sub">Ordered: {it.quantity} {String(it.unit || "").toLowerCase()}</div>
            </span>
            <input
              type="number"
              min={it.quantity}
              className="so-input"
              style={{ width: 110 }}
              value={printed[it.lineNo] ?? ""}
              onChange={(e) => setPrinted((p) => ({ ...p, [it.lineNo]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <div className="so-form-grid" style={{ marginTop: 14 }}>
        <div className="so-field">
          <label>Spoiled / wasted pieces</label>
          <input type="number" min="0" className="so-input" value={spoilage} onChange={(e) => setSpoilage(e.target.value)} />
        </div>
        <div className="so-field so-span-2">
          <label>Remarks (optional)</label>
          <textarea className="so-textarea" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Anything the branch should know about the print" />
        </div>
      </div>
    </Modal>
  );
}
