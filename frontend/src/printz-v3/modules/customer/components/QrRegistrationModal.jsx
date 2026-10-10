import React, { useState } from "react";
import { QrCode, Copy, Check, ExternalLink, Printer, Smartphone, ShieldCheck } from "lucide-react";
import Card from "../../../shared/components/Card";
import "../styles/customerV3.css";

export default function QrRegistrationModal({
  branchCode = "BR001",
  branchName = "Banaswadi",
  onOpenMobileView
}) {
  const [copied, setCopied] = useState(false);

  const registrationUrl = `${window.location.origin}/customer-register?branch=${branchCode}&branchName=${encodeURIComponent(branchName)}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(registrationUrl)}&color=0a3622`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintStandee = () => {
    window.open(registrationUrl, "_blank");
  };

  return (
    <Card
      title="Branch QR Registration Standee"
      subtitle={`Display or print this QR code at ${branchName} counter for self-registration`}
      icon={QrCode}
    >
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "32px", flexWrap: "wrap" }}>
        {/* QR Code Frame */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "20px",
            backgroundColor: "#ecfdf5",
            border: "2px dashed #a7f3d0",
            borderRadius: "16px",
            flexShrink: 0,
          }}
        >
          <div style={{ background: "#ffffff", padding: "12px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
            <img
              src={qrImageUrl}
              alt={`PrintZ ${branchName} Registration QR`}
              style={{ width: "176px", height: "176px", borderRadius: "8px", objectFit: "contain" }}
            />
          </div>

          <div style={{ marginTop: "12px", textAlign: "center" }}>
            <strong style={{ fontSize: "12px", color: "#065f46", display: "block" }}>Scan to Register</strong>
            <span style={{ fontSize: "11px", color: "#047857", fontFamily: "monospace", fontWeight: 700 }}>
              Branch: {branchName} ({branchCode})
            </span>
          </div>
        </div>

        {/* Instructions & Actions */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px", fontSize: "12px" }}>
          <div>
            <strong style={{ fontSize: "13px", color: "#047857", display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <Smartphone size={16} />
              How Mobile QR Registration Works:
            </strong>
            <ol style={{ paddingLeft: "18px", margin: 0, color: "#475569", lineHeight: "1.7" }}>
              <li>Customer scans QR code on their smartphone camera.</li>
              <li>Mobile-friendly registration page opens immediately.</li>
              <li>Customer enters their details & requirements.</li>
              <li>Customer profile automatically syncs to this branch queue.</li>
            </ol>
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "4px" }}>
              Direct Registration Link
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <input
                type="text"
                readOnly
                value={registrationUrl}
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: "12px", color: "#334155", fontFamily: "monospace" }}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="v3-btn-secondary"
                style={{ fontSize: "11px", padding: "4px 10px", flexShrink: 0 }}
              >
                {copied ? <Check size={13} color="#047857" /> : <Copy size={13} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", paddingTop: "4px" }}>
            <button
              type="button"
              onClick={() => {
                if (onOpenMobileView) onOpenMobileView(registrationUrl);
                else window.open(registrationUrl, "_blank");
              }}
              className="v3-btn-primary"
              style={{ fontSize: "12px", padding: "8px 16px" }}
            >
              <ExternalLink size={14} />
              Open Customer Mobile Screen
            </button>

            <button
              type="button"
              onClick={handlePrintStandee}
              className="v3-btn-secondary"
              style={{ fontSize: "12px", padding: "8px 14px" }}
            >
              <Printer size={14} />
              Print QR Standee
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#065f46", backgroundColor: "#ecfdf5", padding: "8px 12px", borderRadius: "8px", border: "1px solid #a7f3d0" }}>
            <ShieldCheck size={14} color="#047857" style={{ flexShrink: 0 }} />
            <span>Secure branch token validates customer registration session automatically.</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
