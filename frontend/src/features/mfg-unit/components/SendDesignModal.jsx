import React, { useEffect, useState } from "react";
import { AlertTriangle, MessageCircle } from "lucide-react";
import Modal from "../../sale-order/components/common/Modal";
import mfgApi from "../api/mfgApi";
import { errorMessage, fileUrl } from "../../sale-order/utils/format";
import "../styles/mfg-unit.css";

// Final check before the design goes to the customer's WhatsApp.
export default function SendDesignModal({ isOpen, order, design, onClose, onSent }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) setError("");
  }, [isOpen]);

  const customer = order?.customerSnapshot || {};

  const send = async () => {
    try {
      setSending(true);
      setError("");
      await mfgApi.sendDesign(order._id, design.versionNo);
      onSent?.();
    } catch (err) {
      setError(errorMessage(err, "The design could not be sent."));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Design to Customer"
      subtitle={order ? `${order.orderNo} · Version ${design?.versionNo}` : ""}
      footer={
        <>
          <button type="button" className="so-btn secondary" onClick={onClose} disabled={sending}>Cancel</button>
          <button type="button" className="so-btn primary" onClick={send} disabled={sending || !customer.whatsappOptIn}>
            <MessageCircle size={15} /> {sending ? "Sending..." : "Send on WhatsApp"}
          </button>
        </>
      }
    >
      {error && <div className="so-alert error"><span>{error}</span></div>}

      {!customer.whatsappOptIn && (
        <div className="so-alert warn">
          <AlertTriangle size={17} />
          <span>
            <strong>The customer has not agreed to WhatsApp messages.</strong> Ask the branch to confirm consent with the
            customer before the design can be sent.
          </span>
        </div>
      )}

      <div className="so-design latest" style={{ gridTemplateColumns: "150px 1fr" }}>
        <div className="so-design-preview">
          {design?.previewUrl ? <img src={fileUrl(design.previewUrl)} alt="Design preview" /> : "No preview"}
        </div>
        <div>
          <div className="so-design-top"><strong>Version {design?.versionNo}</strong></div>
          <div className="so-design-meta">
            Sending to <strong>{customer.name}</strong>
            <br />
            WhatsApp: <strong>+91 {customer.whatsappNumber}</strong>
          </div>
          {design?.designerNotes ? <div className="so-design-note">Note: {design.designerNotes}</div> : null}
        </div>
      </div>

      <div className="so-hint">
        The customer will get this image and the order number. After they reply or call, the branch (or you) records their
        decision.
      </div>
    </Modal>
  );
}
