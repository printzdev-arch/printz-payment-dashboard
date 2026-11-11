import React, { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import Modal from "../../sale-order/components/common/Modal";
import mfgApi from "../api/mfgApi";
import { errorMessage, fileUrl, formatDate } from "../../sale-order/utils/format";
import { typeLabel } from "../../sale-order/utils/saleOrderStatus";
import { SPEC_FIELDS } from "../../sale-order/utils/totals";
import "../../sale-order/styles/sale-order.css";
import "../styles/mfg-unit.css";

// Shown before printing starts: what to print (item, quantity, paper / size / colour settings) and the approved
// design. Starting here moves the order to PRINTING.
export default function StartPrintModal({ isOpen, order, onClose, onDone }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSaving(false);
      setError("");
    }
  }, [isOpen, order?._id]);

  if (!order) return null;

  const items = order.items || [];
  const approved = (order.designs || []).find((d) => d.status === "APPROVED");
  const brief = String(order.customerRequirements || "").trim();

  const start = async () => {
    try {
      setSaving(true);
      setError("");
      await mfgApi.startPrint(order._id);
      onDone?.();
    } catch (err) {
      setError(errorMessage(err, "Could not start printing."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? undefined : onClose}
      wide
      icon={Printer}
      title="Start Printing"
      subtitle={`${order.orderNo} · ${order.customerSnapshot?.name || ""}`}
      footer={
        <>
          <button type="button" className="so-btn secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="so-btn primary" onClick={start} disabled={saving}>
            <Printer size={15} /> {saving ? "Starting..." : "Start Printing"}
          </button>
        </>
      }
    >
      {error && <div className="so-alert error"><span>{error}</span></div>}

      <div className="mfg-sp-meta">
        <span className="mfg-sp-chip green">Deliver by <b>{formatDate(order.expectedDeliveryDate)}</b></span>
        <span className="mfg-sp-chip">For <b>{order.orderBranch?.name || "—"}</b></span>
        {order.priority === "URGENT" && <span className="mfg-sp-chip red">URGENT</span>}
      </div>

      {items.map((it, idx) => {
        const spec = it.specification || {};
        const rows = SPEC_FIELDS.map((f) => [f.label, spec[f.specKey]]).filter(([, v]) => v);
        return (
          <div className="mfg-sp-item" key={it._id || idx}>
            <div className="mfg-sp-item-head">
              <div>
                <div className="mfg-sp-item-title">{typeLabel(it.productType)}</div>
                <div className="mfg-sp-item-desc">{it.description}</div>
              </div>
              <div className="mfg-sp-qty">
                <b>{it.quantity}</b>
                <span>{String(it.unit || "pcs").toLowerCase()}</span>
              </div>
            </div>
            {rows.length > 0 ? (
              <div className="mfg-sp-specs">
                {rows.map(([label, value]) => (
                  <div className="mfg-sp-spec" key={label}>
                    <span>{label}</span>
                    <b>{value}</b>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mfg-sp-empty">No paper or size details were entered for this item.</div>
            )}
          </div>
        );
      })}

      {(approved || brief) && (
        <div className="mfg-sp-design">
          {approved?.previewUrl && <img src={fileUrl(approved.previewUrl)} alt={`Approved design v${approved.versionNo}`} />}
          <div className="mfg-sp-design-info">
            {approved && <strong>Approved design · v{approved.versionNo}</strong>}
            {brief && <p>{brief}</p>}
            {approved?.designerNotes && <p style={{ marginBottom: 0 }}>Designer note: {approved.designerNotes}</p>}
          </div>
        </div>
      )}
    </Modal>
  );
}
