import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MessageSquareWarning } from "lucide-react";
import Modal from "./Modal";
import saleOrderApi from "../../api/saleOrderApi";
import { APPROVAL_CHANNELS } from "../../utils/saleOrderStatus";
import { errorMessage, fileUrl } from "../../utils/format";
import "../../styles/sale-order.css";

// Record what the customer decided about the design. Used by the branch and by the designer.
export default function RecordApprovalModal({ isOpen, order, defaultChannel = "CALL_TO_BRANCH", onClose, onDone }) {
  const [decision, setDecision] = useState("APPROVED");
  const [channel, setChannel] = useState(defaultChannel);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const latest = useMemo(
    () => [...(order?.designs || [])].filter((d) => d.status === "SENT").sort((a, b) => b.versionNo - a.versionNo)[0],
    [order]
  );

  useEffect(() => {
    if (isOpen) {
      setDecision("APPROVED");
      setChannel(defaultChannel);
      setRemarks("");
      setError("");
    }
  }, [isOpen, defaultChannel]);

  const submit = async () => {
    setError("");
    if (decision === "CHANGES_REQUESTED" && remarks.trim().length < 5) {
      setError("Please describe the changes the customer wants (at least 5 characters).");
      return;
    }
    try {
      setSaving(true);
      await saleOrderApi.recordApproval(order._id, {
        decision,
        channel,
        remarks: remarks.trim(),
        versionNo: latest?.versionNo,
      });
      onDone?.(decision);
    } catch (err) {
      setError(errorMessage(err, "Could not save the customer's decision."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Customer Decision"
      subtitle={order ? `${order.orderNo} · ${order.customerSnapshot?.name || ""}` : ""}
      footer={
        <>
          <button type="button" className="so-btn secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className={`so-btn ${decision === "APPROVED" ? "primary" : "danger"}`}
            onClick={submit}
            disabled={saving}
          >
            {saving ? "Saving..." : decision === "APPROVED" ? "Confirm Approval" : "Send Back for Changes"}
          </button>
        </>
      }
    >
      {error && <div className="so-alert error"><span>{error}</span></div>}

      {latest ? (
        <div className="so-design latest" style={{ gridTemplateColumns: "110px 1fr" }}>
          <div className="so-design-preview" style={{ width: 110, height: 86 }}>
            {latest.previewUrl ? <img src={fileUrl(latest.previewUrl)} alt={`Version ${latest.versionNo}`} /> : "No preview"}
          </div>
          <div>
            <div className="so-design-top">
              <strong>Version {latest.versionNo}</strong>
              <span className="so-badge orange">Waiting for customer</span>
            </div>
            <div className="so-design-meta">
              This is the design the customer was sent. Record what they told you by phone or WhatsApp.
            </div>
          </div>
        </div>
      ) : null}

      <div className="so-choice-grid">
        <label className={`so-choice ok ${decision === "APPROVED" ? "active" : ""}`}>
          <input type="radio" name="decision" checked={decision === "APPROVED"} onChange={() => setDecision("APPROVED")} />
          <div>
            <strong><CheckCircle2 size={14} style={{ verticalAlign: "-2px", color: "#16a34a" }} /> Approved</strong>
            <span>Customer is happy with the design</span>
          </div>
        </label>
        <label className={`so-choice changes ${decision === "CHANGES_REQUESTED" ? "active" : ""}`}>
          <input
            type="radio"
            name="decision"
            checked={decision === "CHANGES_REQUESTED"}
            onChange={() => setDecision("CHANGES_REQUESTED")}
          />
          <div>
            <strong><MessageSquareWarning size={14} style={{ verticalAlign: "-2px", color: "#dc2626" }} /> Needs changes</strong>
            <span>Designer will make a new version</span>
          </div>
        </label>
      </div>

      <div className="so-field">
        <label>How did the customer confirm?</label>
        <select className="so-select" value={channel} onChange={(e) => setChannel(e.target.value)}>
          {APPROVAL_CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="so-field">
        <label>
          {decision === "CHANGES_REQUESTED" ? "What should be changed?" : "Remarks (optional)"}
          {decision === "CHANGES_REQUESTED" && <span className="req">*</span>}
        </label>
        <textarea
          className="so-textarea"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder={decision === "CHANGES_REQUESTED" ? "e.g. Make the logo bigger and change the background to white" : "Any note for the team"}
        />
      </div>
    </Modal>
  );
}
