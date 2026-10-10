import React, { useState } from "react";
import { Send, X, Phone, MessageSquare, Mail, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "../utils/estimateCalculations";
import "../../customer/styles/customerV3.css";
import "../styles/estimateV3.css";

export default function SendEstimateModal({
  estimate,
  isOpen,
  onClose,
  onConfirmSend,
  isSending = false
}) {
  const [channel, setChannel] = useState("WHATSAPP");
  const [notes, setNotes] = useState("");

  if (!isOpen || !estimate) return null;

  const handleSend = () => {
    if (onConfirmSend) {
      onConfirmSend({
        channel,
        notes,
        sentBy: "Branch Manager"
      });
    }
  };

  return (
    <div className="v3-modal-overlay">
      <div className="v3-modal-card">
        {/* Modal Header */}
        <div className="v3-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Send size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                Send Quotation to Customer
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="v3-modal-body">
          <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#475569" }}>
            Are you sure you want to dispatch this commercial estimate to the customer? Once sent, the status will advance to <strong>SENT (Awaiting Customer Approval)</strong>.
          </p>

          {/* Quotation Snapshot */}
          <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
              <span style={{ color: "#64748b" }}>Estimate Number:</span>
              <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#047857" }}>{estimate.estimateNo} ({estimate.version || "V1"})</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
              <span style={{ color: "#64748b" }}>Customer:</span>
              <strong style={{ color: "#0f172a" }}>{estimate.customerName} ({estimate.customerMobile || "—"})</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
              <span style={{ color: "#64748b" }}>Job Order:</span>
              <strong style={{ color: "#0f172a" }}>{estimate.jobNo}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
              <span style={{ color: "#64748b" }}>Valid Until:</span>
              <span style={{ color: "#dc2626", fontWeight: 700 }}>{estimate.validUntil || "7 Days"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px dashed #cbd5e1", fontSize: "14px" }}>
              <span style={{ fontWeight: 800, color: "#0f172a" }}>Total Quotation Amount:</span>
              <strong style={{ fontSize: "16px", color: "#047857", fontWeight: 900 }}>{formatCurrency(estimate.grandTotal || 0)}</strong>
            </div>
          </div>

          {/* Delivery Channel Selector */}
          <div className="v3-form-group" style={{ marginBottom: "16px" }}>
            <label className="v3-form-label">Dispatch Channel</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setChannel("WHATSAPP")}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: channel === "WHATSAPP" ? "2px solid #047857" : "1px solid #cbd5e1",
                  background: channel === "WHATSAPP" ? "#ecfdf5" : "#ffffff",
                  color: channel === "WHATSAPP" ? "#047857" : "#475569",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <MessageSquare size={14} /> WhatsApp
              </button>

              <button
                type="button"
                onClick={() => setChannel("EMAIL")}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: channel === "EMAIL" ? "2px solid #047857" : "1px solid #cbd5e1",
                  background: channel === "EMAIL" ? "#ecfdf5" : "#ffffff",
                  color: channel === "EMAIL" ? "#047857" : "#475569",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <Mail size={14} /> Email
              </button>

              <button
                type="button"
                onClick={() => setChannel("MANUAL")}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: channel === "MANUAL" ? "2px solid #047857" : "1px solid #cbd5e1",
                  background: channel === "MANUAL" ? "#ecfdf5" : "#ffffff",
                  color: channel === "MANUAL" ? "#047857" : "#475569",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <Phone size={14} /> Direct / In-Person
              </button>
            </div>
          </div>

          {/* Optional Dispatch Note */}
          <div className="v3-form-group">
            <label className="v3-form-label">Dispatch Notes (Internal)</label>
            <input
              type="text"
              className="v3-input no-icon"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sent PDF on WhatsApp to Mr. Arjun, follow up by 3 PM"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="v3-modal-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="v3-btn-secondary"
            style={{ fontSize: "12px" }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="v3-btn-primary"
            style={{ fontSize: "12px" }}
          >
            {isSending ? "Sending..." : "Confirm & Send Estimate"}
          </button>
        </div>
      </div>
    </div>
  );
}
