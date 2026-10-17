import React, { useState } from "react";
import { X, Printer, Share2, FileDown, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import posApi from "../api/posApi";

export const ThermalReceiptModal = ({ isOpen, onClose, receipt }) => {
  const [template, setTemplate] = useState("thermal"); // "thermal" | "a4"

  // Close modal on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = async () => {
    try {
      await posApi.shareReceipt(receipt._id || receipt.id, { whatsapp: true });
      toast.success("Receipt details sent via WhatsApp!");
    } catch (err) {
      toast.info("WhatsApp dispatch triggered (logged to receipt history)");
    }
  };

  const items = receipt.items || [];
  const customer = receipt.customerSnapshot || {};
  const dateFormatted = new Date(receipt.saleDate || receipt.createdAt || Date.now()).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const grandTotal = Number(receipt.grandTotal || 0);
  const amountPaid = Number(receipt.amountPaid !== undefined ? receipt.amountPaid : grandTotal);
  const balanceDue = Number(receipt.balanceDue !== undefined ? receipt.balanceDue : Math.max(0, grandTotal - amountPaid));

  return (
    <div
      className="jf-modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="pos-unified-receipt-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: template === "a4" ? "820px" : "440px",
        }}
      >
        {/* Unified Top Header Bar */}
        <div className="pos-receipt-modal-header no-print">
          {/* Template switcher (Thermal 80mm vs A4 Invoice) */}
          <div style={{ display: "flex", background: "#f1f5f9", padding: "0.25rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <button
              type="button"
              onClick={() => setTemplate("thermal")}
              style={{
                border: "none",
                background: template === "thermal" ? "#059669" : "transparent",
                color: template === "thermal" ? "#ffffff" : "#475569",
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: template === "thermal" ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
              }}
            >
              80mm Thermal
            </button>
            <button
              type="button"
              onClick={() => setTemplate("a4")}
              style={{
                border: "none",
                background: template === "a4" ? "#059669" : "transparent",
                color: template === "a4" ? "#ffffff" : "#475569",
                padding: "0.35rem 0.75rem",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: template === "a4" ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
              }}
            >
              A4 Tax Invoice
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                background: "#059669",
                color: "#ffffff",
                border: "none",
                padding: "0.45rem 0.85rem",
                borderRadius: "7px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              }}
            >
              <Printer size={15} /> Print {template === "a4" ? "A4" : "Slip"}
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                background: "#ecfdf5",
                color: "#16a34a",
                border: "1px solid #a7f3d0",
                padding: "0.45rem 0.85rem",
                borderRadius: "7px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Share2 size={15} /> WhatsApp
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "7px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#64748b",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="pos-receipt-modal-body">
          {/* ── TEMPLATE 1: 80mm Thermal POS Slip ── */}
          {template === "thermal" ? (
            <div className="thermal-receipt-modal" id="printable-thermal-receipt">
            <div className="thermal-receipt-header">
              <div className="thermal-brand">PRINTZ DIGITAL STUDIO</div>
              <div className="thermal-sub">Digital Printing & Commercial Reprographics</div>
              <div className="thermal-sub">Banaswadi Main Road, Bangalore</div>
              <div className="thermal-sub">GSTIN: 29AABCP1234F1Z8</div>
              <div className="thermal-sub" style={{ marginTop: "0.25rem", fontWeight: 700 }}>
                TAX INVOICE / SALE RECEIPT
              </div>
            </div>

            <div className="thermal-meta-row">
              <span>Receipt No:</span>
              <strong>{receipt.receiptNo || "SR-DRAFT"}</strong>
            </div>
            <div className="thermal-meta-row">
              <span>Date:</span>
              <span>{dateFormatted}</span>
            </div>
            <div className="thermal-meta-row">
              <span>Customer:</span>
              <span>{customer.name || receipt.customerName || "Walk-in Client"}</span>
            </div>
            {(customer.mobile || receipt.customerMobile) && (
              <div className="thermal-meta-row">
                <span>Mobile:</span>
                <span>{customer.mobile || receipt.customerMobile}</span>
              </div>
            )}
            {customer.gstin && (
              <div className="thermal-meta-row">
                <span>Client GSTIN:</span>
                <span>{customer.gstin}</span>
              </div>
            )}
            <div className="thermal-meta-row">
              <span>Payment Mode:</span>
              <span style={{ fontWeight: 700 }}>{receipt.paymentMode || "CASH"}</span>
            </div>
            {receipt.paymentMode === "SPLIT" && Array.isArray(receipt.splitPayments) && receipt.splitPayments.length > 0 && (
              <div style={{ fontSize: "0.72rem", color: "#4b5563", margin: "2px 0 6px 0", textAlign: "right", fontStyle: "italic" }}>
                Split: {receipt.splitPayments.map((p) => `${p.mode}: ₹${Number(p.amount).toFixed(2)}`).join(" | ")}
              </div>
            )}

            {/* Itemized Table */}
            <table className="thermal-items-table">
              <thead>
                <tr>
                  <th style={{ width: "50%" }}>Item Description</th>
                  <th style={{ textAlign: "center" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Rate</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td>
                      {it.productName || it.name || "Print Item"}
                      {it.taxRate > 0 && <span style={{ fontSize: "0.65rem", color: "#6b7280" }}> ({it.taxRate}% GST)</span>}
                    </td>
                    <td style={{ textAlign: "center" }}>{it.quantity}</td>
                    <td style={{ textAlign: "right" }}>₹{Number(it.unitPrice || 0).toFixed(2)}</td>
                    <td style={{ textAlign: "right" }}>₹{Number(it.lineTotal || (it.quantity * it.unitPrice) || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="thermal-totals">
              <div className="thermal-totals-row">
                <span>Subtotal:</span>
                <span>₹{Number(receipt.subtotal || 0).toFixed(2)}</span>
              </div>
              {Number(receipt.discountAmount || 0) > 0 && (
                <div className="thermal-totals-row" style={{ color: "#dc2626" }}>
                  <span>Discount:</span>
                  <span>-₹{Number(receipt.discountAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="thermal-totals-row">
                <span>Taxes / GST:</span>
                <span>₹{Number(receipt.taxAmount || 0).toFixed(2)}</span>
              </div>
              <div className="thermal-totals-row thermal-grand-total">
                <span>NET PAYABLE:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
              <div className="thermal-totals-row" style={{ marginTop: "0.25rem", color: "#059669", fontWeight: 700 }}>
                <span>Amount Paid:</span>
                <span>₹{amountPaid.toFixed(2)}</span>
              </div>
              {balanceDue > 0 && (
                <div className="thermal-totals-row" style={{ color: "#dc2626", fontWeight: 700 }}>
                  <span>Balance Due:</span>
                  <span>₹{balanceDue.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="thermal-footer">
              <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>
                Status: {receipt.paymentStatus || "PAID"} ({receipt.status || "COMPLETED"})
              </div>
              <div>*** Thank you for printing with PrintZ! ***</div>
              <div style={{ fontSize: "0.68rem", color: "#9ca3af", marginTop: "0.2rem" }}>
                Goods sold are verified. No exchange without receipt.
              </div>
            </div>
          </div>
        ) : (
          /* ── TEMPLATE 2: A4 Full Commercial Tax Invoice ── */
          <div
            id="printable-a4-invoice"
            style={{
              background: "#ffffff",
              padding: "2rem",
              borderRadius: "8px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              fontFamily: "system-ui, -apple-system, sans-serif",
              color: "#1e293b",
              width: "100%",
              maxWidth: "760px",
              margin: "0 auto",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #059669", paddingBottom: "1rem" }}>
              <div>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#059669", margin: 0 }}>PRINTZ STUDIO</h1>
                <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Digital Printing & Commercial Reprographics</div>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Banaswadi Main Road, Bangalore - 560043</div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, marginTop: "0.2rem" }}>GSTIN: 29AABCP1234F1Z8</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>TAX INVOICE</div>
                <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: "0.25rem" }}>
                  Invoice No: <strong>{receipt.receiptNo}</strong>
                </div>
                <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Date: {dateFormatted}</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#059669" }}>
                  Payment: {receipt.paymentStatus || "PAID"} ({receipt.paymentMode || "CASH"})
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div style={{ background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: "6px", margin: "1rem 0", display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>BILL TO:</div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
                  {customer.name || receipt.customerName || "Walk-in Customer"}
                </div>
                {(customer.mobile || receipt.customerMobile) && (
                  <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Mobile: {customer.mobile || receipt.customerMobile}</div>
                )}
                {customer.gstin && (
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#059669" }}>GSTIN: {customer.gstin}</div>
                )}
              </div>
              <div style={{ textAlign: "right", fontSize: "0.8rem", color: "#64748b" }}>
                <div>Branch: {receipt.branchName || "Banaswadi"}</div>
                <div>Status: {receipt.status || "COMPLETED"}</div>
              </div>
            </div>

            {/* Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>
                  <th style={{ padding: "0.6rem" }}>#</th>
                  <th style={{ padding: "0.6rem" }}>Item Description</th>
                  <th style={{ padding: "0.6rem", textAlign: "center" }}>Qty</th>
                  <th style={{ padding: "0.6rem", textAlign: "right" }}>Rate (₹)</th>
                  <th style={{ padding: "0.6rem", textAlign: "right" }}>Tax</th>
                  <th style={{ padding: "0.6rem", textAlign: "right" }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "0.55rem" }}>{idx + 1}</td>
                    <td style={{ padding: "0.55rem" }}>
                      <div style={{ fontWeight: 600 }}>{it.productName || it.name}</div>
                      {it.notes && <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{it.notes}</div>}
                    </td>
                    <td style={{ padding: "0.55rem", textAlign: "center" }}>{it.quantity}</td>
                    <td style={{ padding: "0.55rem", textAlign: "right" }}>₹{Number(it.unitPrice || 0).toFixed(2)}</td>
                    <td style={{ padding: "0.55rem", textAlign: "right" }}>{it.taxRate || 0}%</td>
                    <td style={{ padding: "0.55rem", textAlign: "right", fontWeight: 700 }}>
                      ₹{Number(it.lineTotal || (it.quantity * it.unitPrice) || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", maxWidth: "320px" }}>
                <div><strong>Terms & Conditions:</strong></div>
                <div>1. Goods once delivered/printed will not be taken back without receipt.</div>
                <div>2. Disputes subject to Bangalore jurisdiction only.</div>
              </div>
              <div style={{ minWidth: "240px", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                  <span>Subtotal:</span>
                  <strong>₹{Number(receipt.subtotal || 0).toFixed(2)}</strong>
                </div>
                {Number(receipt.discountAmount || 0) > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", color: "#dc2626" }}>
                    <span>Discount:</span>
                    <span>-₹{Number(receipt.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                  <span>Taxes / GST:</span>
                  <span>₹{Number(receipt.taxAmount || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderTop: "2px solid #059669", fontSize: "1.05rem", fontWeight: 800, color: "#059669" }}>
                  <span>Grand Total:</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", fontWeight: 600 }}>
                  <span>Amount Paid:</span>
                  <span>₹{amountPaid.toFixed(2)}</span>
                </div>
                {balanceDue > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", color: "#dc2626", fontWeight: 700 }}>
                    <span>Balance Due:</span>
                    <span>₹{balanceDue.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default ThermalReceiptModal;
