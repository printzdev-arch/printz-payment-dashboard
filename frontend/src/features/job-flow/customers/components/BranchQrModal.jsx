import React, { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  X,
  Printer,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Building2,
  Sparkles,
  Download,
} from "lucide-react";
import { toast } from "react-toastify";

export const BranchQrModal = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const cardRef = useRef(null);

  if (!isOpen) return null;

  // Retrieve branch info
  const userBranch = localStorage.getItem("userBranchName") || "Banaswadii";
  let branchCode = "BN";
  try {
    const userObj = JSON.parse(localStorage.getItem("user") || "{}");
    const printzUser = JSON.parse(localStorage.getItem("printz_user") || "{}");
    branchCode =
      (userObj.branchCode && userObj.branchCode.trim()) ||
      (printzUser.branchCode && printzUser.branchCode.trim()) ||
      (userBranch.slice(0, 2).toUpperCase()) ||
      "BN";
  } catch (e) {
    branchCode = "BN";
  }

  // Determine current origin and target URL
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
  const qrUrl = `${origin}/jobflow/qr-request?branchCode=${encodeURIComponent(branchCode)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    toast.success("QR registration link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print the counter stand.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PrintZ Counter Stand - ${userBranch}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background-color: #ffffff;
            }
            .stand-card {
              width: 360px;
              border: 3px solid #064e3b;
              border-radius: 20px;
              padding: 32px 24px;
              text-align: center;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
            }
            .brand-name {
              font-size: 32px;
              font-weight: 900;
              color: #064e3b;
              margin: 0 0 4px 0;
              letter-spacing: -0.5px;
            }
            .tagline {
              font-size: 13px;
              color: #059669;
              font-weight: 600;
              margin-bottom: 20px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .branch-pill {
              display: inline-block;
              background-color: #ecfdf5;
              border: 1px solid #10b981;
              color: #065f46;
              padding: 6px 16px;
              border-radius: 999px;
              font-size: 14px;
              font-weight: 700;
              margin-bottom: 24px;
            }
            .qr-wrapper {
              background: #ffffff;
              padding: 16px;
              border-radius: 16px;
              display: inline-block;
              border: 2px dashed #cbd5e1;
              margin-bottom: 20px;
            }
            .scan-title {
              font-size: 18px;
              font-weight: 800;
              color: #0f172a;
              margin: 0 0 8px 0;
            }
            .scan-desc {
              font-size: 13px;
              color: #64748b;
              margin: 0 0 16px 0;
              line-height: 1.4;
            }
            .url-box {
              font-size: 11px;
              color: #94a3b8;
              word-break: break-all;
              padding: 8px;
              background: #f8fafc;
              border-radius: 6px;
            }
          </style>
        </head>
        <body>
          <div class="stand-card">
            <h1 class="brand-name">PrintZ</h1>
            <div class="tagline">Your Print Partner</div>
            <div class="branch-pill">📍 ${userBranch} (${branchCode})</div>
            <div class="qr-wrapper">
              ${cardRef.current?.querySelector("svg")?.outerHTML || ""}
            </div>
            <h2 class="scan-title">Scan to Register</h2>
            <p class="scan-desc">Open your Smartphone Camera or UPI scanner to enter details & walk-in print requirements.</p>
            <div class="url-box">${qrUrl}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPNG = () => {
    const svgElement = cardRef.current?.querySelector("svg");
    if (!svgElement) return;

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = 400;
    canvas.height = 400;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20, 360, 360);
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `PrintZ-${branchCode}-QR-Code.png`;
        a.click();
        toast.success("QR Code image downloaded!");
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgString)));
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "460px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                background: "#ecfdf5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <QrCode size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                Branch QR Counter Stand
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px",
              display: "flex",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Counter Card */}
        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Printable Card Area */}
          <div
            ref={cardRef}
            style={{
              width: "100%",
              maxWidth: "340px",
              borderRadius: "16px",
              border: "2px solid #065f46",
              padding: "1.5rem 1.25rem",
              textAlign: "center",
              background: "linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)",
              boxShadow: "0 10px 15px -3px rgba(6, 78, 59, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
              <Sparkles size={20} color="#059669" />
              <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "#064e3b", letterSpacing: "-0.5px" }}>
                PrintZ
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
              Your Print Partner
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.3rem 0.85rem",
                borderRadius: "999px",
                background: "#ecfdf5",
                border: "1px solid #10b981",
                color: "#065f46",
                fontSize: "0.8rem",
                fontWeight: 700,
                marginBottom: "1.25rem",
              }}
            >
              <Building2 size={13} />
              <span>{userBranch} ({branchCode})</span>
            </div>

            {/* QR Code Container */}
            <div
              style={{
                background: "#ffffff",
                padding: "14px",
                borderRadius: "14px",
                display: "inline-block",
                border: "1.5px dashed #cbd5e1",
                marginBottom: "1rem",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
              }}
            >
              <QRCodeSVG
                value={qrUrl}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            <h4 style={{ margin: "0 0 0.35rem 0", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
              Scan to Register
            </h4>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b", lineHeight: 1.4 }}>
              Open Camera or scanner app on your phone to register your print enquiry instantly.
            </p>
          </div>

          {/* Quick Info & Copy URL */}
          <div
            style={{
              width: "100%",
              marginTop: "1.25rem",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "0.6rem 0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "#475569",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: "monospace",
              }}
              title={qrUrl}
            >
              {qrUrl}
            </div>
            <button
              type="button"
              className="jf-btn jf-btn-secondary jf-btn-sm"
              onClick={handleCopy}
              style={{ flexShrink: 0, padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
            >
              {copied ? <Check size={12} color="#059669" /> : <Copy size={12} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: "0.9rem 1.25rem",
            background: "#f8fafc",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button
              type="button"
              className="jf-btn jf-btn-secondary jf-btn-sm"
              onClick={handleDownloadPNG}
              title="Download QR code image for banner or sticker"
              style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
            >
              <Download size={14} />
              <span>PNG</span>
            </button>
            <a
              href={qrUrl}
              target="_blank"
              rel="noreferrer"
              className="jf-btn jf-btn-secondary jf-btn-sm"
              style={{ display: "flex", alignItems: "center", gap: "0.35rem", textDecoration: "none" }}
            >
              <ExternalLink size={14} />
              <span>Open Form</span>
            </a>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="jf-btn jf-btn-primary jf-btn-sm"
              onClick={handlePrint}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <Printer size={15} />
              <span>Print Counter Stand</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchQrModal;
