import React, { useEffect, useState } from "react";
import Modal from "../../sale-order/components/common/Modal";
import mfgApi from "../api/mfgApi";
import { AVAILABILITY, availabilityTone } from "../utils/mfgRole";
import { errorMessage } from "../../sale-order/utils/format";
import { initialsOf } from "../../sale-order/utils/format";
import "../styles/mfg-unit.css";

// Unit manager picks a designer for a waiting order (assign) or moves a running order to someone else (reassign).
export default function AssignDesignerModal({ isOpen, order, mode = "assign", onClose, onDone }) {
  const [designers, setDesigners] = useState([]);
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reassign = mode === "reassign";
  const currentId = String(order?.currentAssignment?.designerUserId || "");

  useEffect(() => {
    if (!isOpen) return;
    setSelected("");
    setReason("");
    setError("");
    setLoading(true);
    mfgApi
      .designers()
      .then(setDesigners)
      .catch((err) => setError(errorMessage(err, "Could not load the designers.")))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const picked = designers.find((d) => String(d.userId) === selected);
  const overCapacity = picked && picked.activeOrders >= picked.maxActiveOrders;

  const submit = async () => {
    setError("");
    if (!selected) return setError("Please choose a designer.");
    if (reassign && !reason.trim()) return setError("A reason is required to reassign an order.");
    if (overCapacity && !reason.trim()) return setError("This designer is at capacity. Please give a reason.");
    try {
      setSaving(true);
      const body = { designerUserId: selected, reason: reason.trim() };
      if (reassign) await mfgApi.reassign(order._id, body);
      else await mfgApi.assign(order._id, body);
      onDone?.();
    } catch (err) {
      setError(errorMessage(err, "Could not save the assignment."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={reassign ? "Reassign Order" : "Assign Designer"}
      subtitle={order ? `${order.orderNo} · ${order.customerSnapshot?.name || ""}` : ""}
      footer={
        <>
          <button type="button" className="so-btn secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="so-btn primary" onClick={submit} disabled={saving || loading}>
            {saving ? "Saving..." : reassign ? "Reassign" : "Assign Designer"}
          </button>
        </>
      }
    >
      {error && <div className="so-alert error"><span>{error}</span></div>}

      {loading ? (
        <div className="so-loading" style={{ padding: 24 }}>Loading designers...</div>
      ) : designers.length === 0 ? (
        <div className="so-alert info"><span>No designers are set up for this unit yet.</span></div>
      ) : (
        <div className="mfg-pick-list">
          {designers.map((d) => {
            const isCurrent = String(d.userId) === currentId;
            const label = AVAILABILITY.find((a) => a.value === d.availability)?.label || d.availability;
            return (
              <label
                key={d._id}
                className={`mfg-pick ${selected === String(d.userId) ? "active" : ""} ${isCurrent ? "disabled" : ""}`}
              >
                <input
                  type="radio"
                  name="designer"
                  disabled={isCurrent}
                  checked={selected === String(d.userId)}
                  onChange={() => setSelected(String(d.userId))}
                />
                <span className="so-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>{initialsOf(d.displayName)}</span>
                <span className="who">
                  <strong>{d.displayName}{isCurrent ? " (current)" : ""}</strong>
                  <span>{d.activeOrders} of {d.maxActiveOrders} orders in hand</span>
                </span>
                <span className={`so-badge ${availabilityTone[d.availability] || "slate"}`}>{label}</span>
              </label>
            );
          })}
        </div>
      )}

      {(reassign || overCapacity) && (
        <div className="so-field">
          <label>Reason <span className="req">*</span></label>
          <textarea
            className="so-textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={reassign ? "e.g. Designer is on leave today" : "e.g. Urgent order, extra capacity needed"}
          />
        </div>
      )}
    </Modal>
  );
}
