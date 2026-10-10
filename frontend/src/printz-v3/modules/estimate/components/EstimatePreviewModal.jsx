import React, { useRef } from "react";
import { X, Printer, Download, CheckCircle2, Building, Calendar, Phone, Mail, FileText } from "lucide-react";
import { formatCurrency } from "../utils/estimateCalculations";
import "../../customer/styles/customerV3.css";
import "../styles/estimateV3.css";

export default function EstimatePreviewModal({
  estimate,
  isOpen,
  onClose,
  onMarkReady,
  onSend
}) {
  const printRef = useRef(null);

  if (!isOpen || !estimate) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="v3-modal-overlay">
      <div className="v3-modal-card" style={{ maxWidth: "850px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Modal Top Header */}
        <div className="v3-modal-header no-print">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={18} color="#047857" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
              Quotation Preview — {estimate.estimateNo}
            </h3>
            <span className="v3-version-tag">{estimate.version || "V1"}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
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

        {/* Modal Printable Body */}
        <div
          ref={printRef}
          className="v3-modal-body v3-printable-quotation"
          style={{ overflowY: "auto", flex: 1, padding: "28px" }}
        >
          {/* Header & Company Details */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #047857", paddingBottom: "18px", marginBottom: "20px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#047857", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "16px" }}>
                  P
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 900, color: "#047857" }}>PrintZ</h2>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Commercial Printing & Packaging</span>
                </div>
              </div>
              <div style={{ fontSize: "12px", color: "#475569", marginTop: "8px", lineHeight: "1.5" }}>
                <div>Branch: <strong>{estimate.branchName || "Banaswadi"}</strong></div>
                <div>GSTIN: 29ABCDE1234F1Z5 • support@printz.in</div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Commercial Quotation
              </h3>
              <div style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 800, color: "#047857" }}>
                {estimate.estimateNo}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                Date: {estimate.createdAt ? new Date(estimate.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
              </div>
              <div style={{ fontSize: "12px", color: "#dc2626", fontWeight: 600 }}>
                Valid Until: {estimate.validUntil || "7 Days"}
              </div>
            </div>
          </div>

          {/* Customer & Job Info Two Columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "6px" }}>
                Quotation For:
              </div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                {estimate.customerName || "Customer"}
              </div>
              {estimate.customerCompany && (
                <div style={{ fontSize: "12px", color: "#334155", fontWeight: 600 }}>
                  {estimate.customerCompany}
                </div>
              )}
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                Code: {estimate.customerCode || "—"} • Mobile: {estimate.customerMobile || "—"}
              </div>
            </div>

            <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "6px" }}>
                Job Order Reference:
              </div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                {estimate.jobTitle || "Print Job"}
              </div>
              <div style={{ fontSize: "12px", color: "#047857", fontWeight: 700 }}>
                Job No: {estimate.jobNo}
              </div>
            </div>
          </div>

          {/* Pricing Lines Table */}
          <div className="v3-lines-table-wrapper" style={{ marginBottom: "20px" }}>
            <table className="v3-lines-table">
              <thead>
                <tr>
                  <th style={{ width: "35px" }}>#</th>
                  <th>Description / Requirement</th>
                  <th style={{ width: "120px" }}>Category</th>
                  <th style={{ width: "80px", textAlign: "right" }}>Qty</th>
                  <th style={{ width: "65px" }}>Unit</th>
                  <th style={{ width: "90px", textAlign: "right" }}>Rate</th>
                  <th style={{ width: "100px", textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(estimate.items || []).flatMap((it) => it.lines || []).map((line, idx) => (
                  <tr key={line.lineId || idx}>
                    <td style={{ textAlign: "center", color: "#94a3b8" }}>{idx + 1}</td>
                    <td>
                      <strong style={{ color: "#0f172a" }}>{line.description}</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#475569" }}>
                        {line.category}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{Number(line.quantity || 0).toLocaleString()}</td>
                    <td style={{ fontSize: "12px", color: "#64748b" }}>{line.unit || "PCS"}</td>
                    <td style={{ textAlign: "right" }}>{formatCurrency(line.rate || 0)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                      {formatCurrency(line.amount || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown & Terms */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "4px" }}>
                Terms & Conditions:
              </div>
              <div style={{ fontSize: "11px", color: "#475569", whiteSpace: "pre-line", lineHeight: "1.5", background: "#f8fafc", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                {estimate.termsAndConditions}
              </div>

              {estimate.customerNotes && (
                <div style={{ marginTop: "8px", fontSize: "11px", color: "#047857", background: "#ecfdf5", padding: "8px 10px", borderRadius: "6px" }}>
                  <strong>Note:</strong> {estimate.customerNotes}
                </div>
              )}
            </div>

            {/* Calculations Card */}
            <div style={{ background: "#f8fafc", padding: "14px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div className="v3-calc-row">
                <span>Subtotal:</span>
                <strong>{formatCurrency(estimate.subtotal || 0)}</strong>
              </div>

              {Number(estimate.discount?.amount || 0) > 0 && (
                <div className="v3-calc-row" style={{ color: "#dc2626" }}>
                  <span>Discount ({estimate.discount?.type === "PERCENTAGE" ? `${estimate.discount?.value}%` : "Fixed"}):</span>
                  <strong>-{formatCurrency(estimate.discount?.amount || 0)}</strong>
                </div>
              )}

              {Number(estimate.deliveryCharge || 0) > 0 && (
                <div className="v3-calc-row">
                  <span>Delivery Charge:</span>
                  <strong>{formatCurrency(estimate.deliveryCharge || 0)}</strong>
                </div>
              )}

              <div className="v3-calc-row">
                <span>Taxable Amount:</span>
                <strong>{formatCurrency(estimate.taxableAmount || 0)}</strong>
              </div>

              {estimate.tax?.type === "GST" ? (
                <>
                  <div className="v3-calc-row">
                    <span>CGST ({estimate.tax?.cgstRate || 9}%):</span>
                    <span>{formatCurrency(estimate.tax?.cgstAmount || 0)}</span>
                  </div>
                  <div className="v3-calc-row">
                    <span>SGST ({estimate.tax?.sgstRate || 9}%):</span>
                    <span>{formatCurrency(estimate.tax?.sgstAmount || 0)}</span>
                  </div>
                </>
              ) : (
                <div className="v3-calc-row">
                  <span>IGST ({estimate.tax?.rate || 18}%):</span>
                  <span>{formatCurrency(estimate.tax?.taxAmount || 0)}</span>
                </div>
              )}

              <div className="v3-calc-divider" />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "16px", fontWeight: 900, color: "#047857" }}>
                <span>Grand Total:</span>
                <span>{formatCurrency(estimate.grandTotal || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="v3-modal-footer no-print">
          <button
            type="button"
            onClick={onClose}
            className="v3-btn-secondary"
            style={{ fontSize: "12px" }}
          >
            Close
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="v3-btn-secondary"
            style={{ fontSize: "12px", borderColor: "#047857", color: "#047857" }}
          >
            <Printer size={14} /> Print / Save PDF
          </button>

          {estimate.status === "DRAFT" && onMarkReady && (
            <button
              type="button"
              onClick={() => {
                onMarkReady(estimate);
                onClose();
              }}
              className="v3-btn-primary"
              style={{ fontSize: "12px" }}
            >
              <CheckCircle2 size={14} /> Mark as Ready
            </button>
          )}

          {estimate.status === "READY" && onSend && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onSend(estimate);
              }}
              className="v3-btn-primary"
              style={{ fontSize: "12px", backgroundColor: "#0284c7", borderColor: "#0284c7" }}
            >
              Send to Customer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
