import React, { useEffect } from "react";
import logo from "../../../../shared/assets/logo.png";
import { Printer, X, CheckCircle, Clock, ShieldCheck, Receipt, CreditCard } from "lucide-react";

export const InvoiceBillModal = ({ isOpen, invoice, onClose, autoPrint = false, onSettle }) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && autoPrint && invoice) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint, invoice]);

  if (!isOpen || !invoice) return null;

  const doc = invoice.raw || invoice;
  const cust = doc.customerSnapshot || doc.customer || {
    name: doc.customerName || "Customer",
    mobile: doc.customerPhone || "-",
    address: doc.customerAddress || "-",
    company: doc.company || "",
    gstin: doc.gstin || "",
  };

  const branch = doc.branchSnapshot || {
    name: "Guna Printz - Main Branch",
    address: "12/4, 2nd Main Road, Banaswadi, Bangalore - 560043",
    phone: "+91 98450 12345",
    gstin: "29AABCG1234F1Z5",
    state: "Karnataka (29)",
  };

  const items = doc.items || [];
  const charges = doc.additionalCharges || [];

  const invoiceNum = doc.invoiceNumber || `INV-${String(doc._id || "").slice(-6)}`;
  const jobNo = doc.jobNo || "JOB-CURRENT";
  const invoiceDate = doc.invoiceDate
    ? new Date(doc.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : (doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Today");
  const dueDate = doc.dueDate
    ? new Date(doc.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "-";

  const subtotal = Number(doc.subtotal || 0);
  const discountTotal = Number(doc.discountTotal || 0);
  const taxableAmount = Number(doc.taxableAmount || (subtotal - discountTotal) || 0);
  const cgstTotal = Number(doc.cgstTotal || 0);
  const sgstTotal = Number(doc.sgstTotal || 0);
  const grandTotal = Number(doc.grandTotal || 0);
  const advancePaid = Number(doc.advancePaid || doc.advanceApplied || 0);
  const totalPaid = doc.status === "PAID"
    ? grandTotal
    : Math.max(advancePaid, Number(doc.paidAmount || 0));
  const additionalPaid = Math.max(0, totalPaid - advancePaid);
  const paidAmount = additionalPaid;
  const computedBalance = Math.max(0, Math.round((grandTotal - totalPaid) * 100) / 100);
  const balanceDue = Number(
    doc.status === "PAID"
      ? 0
      : (doc.balanceDue !== undefined && doc.balanceDue !== null && Number(doc.balanceDue) <= computedBalance
          ? doc.balanceDue
          : computedBalance)
  );

  const jobTypeStr = String(doc.jobType || doc.raw?.jobType || doc.jobOrderId?.jobType || "").toUpperCase();
  // Paid in full when the invoice was finalized (full-payment plan), as opposed to an advance with a balance
  const isPrintOnly = String(doc.paymentPlan || "").toUpperCase() === "FULL" && balanceDue <= 0;
  const isPaid = balanceDue <= 0 || doc.status === "PAID" || doc.paymentStatus === "PAID";

  const handlePrint = () => {
    // The print window is a blank page, so the logo needs an absolute address
    const logoUrl = new URL(logo, window.location.origin).href;
    const printWin = window.open("", "_blank", "width=850,height=950");
    if (!printWin) {
      window.print();
      return;
    }

    const itemsRowsHtml = items.map((it, idx) => {
      const lineQty = Number(it.quantity || 1);
      const linePrice = Number(it.unitPrice || 0);
      const lineTaxRate = Number(it.taxRate !== undefined ? it.taxRate : (doc.taxRate || 0));
      const lineTotal = Number(it.lineTotal || (lineQty * linePrice));
      return `
        <tr>
          <td style="padding: 9px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 9px 10px; border-bottom: 1px solid #e2e8f0;">
            <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${it.itemName || "Print Item"}</div>
            ${it.description ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">${it.description}</div>` : ""}
          </td>
          <td style="padding: 9px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">${lineQty} ${it.unit || "PCS"}</td>
          <td style="padding: 9px 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹ ${linePrice.toFixed(2)}</td>
          <td style="padding: 9px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${lineTaxRate}%</td>
          <td style="padding: 9px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">₹ ${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join("");

    const chargesRowsHtml = charges.map((ch) => `
      <tr>
        <td colspan="5" style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #475569;">
          ${ch.description || "Additional Service"}:
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">
          ₹ ${Number(ch.amount || 0).toFixed(2)}
        </td>
      </tr>
    `).join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice Bill - ${invoiceNum}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            background: #ffffff;
            font-size: 12.5px;
            line-height: 1.45;
          }
          .bill-card {
            max-width: 780px;
            margin: 0 auto;
            border: 1px solid #cbd5e1;
            padding: 24px;
            border-radius: 8px;
          }
          .bill-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #059669;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .brand-title {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: -0.02em;
            color: #065f46;
          }
          .brand-subtitle {
            font-size: 11px;
            font-weight: 600;
            color: #047857;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 2px;
          }
          .brand-address {
            font-size: 11.5px;
            color: #475569;
            margin-top: 6px;
            line-height: 1.35;
          }
          .bill-tag {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            text-align: right;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          .meta-pill {
            display: inline-block;
            margin-top: 6px;
            padding: 3px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            background: ${isPaid ? "#dcfce7" : "#fef3c7"};
            color: ${isPaid ? "#166534" : "#92400e"};
          }
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 20px;
          }
          .info-block-title {
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            margin-bottom: 4px;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .table th {
            background: #f1f5f9;
            border-top: 1px solid #cbd5e1;
            border-bottom: 1.5px solid #94a3b8;
            padding: 9px 10px;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 700;
            color: #334155;
          }
          .totals-table {
            width: 340px;
            margin-left: auto;
            border-collapse: collapse;
          }
          .totals-table td {
            padding: 5px 8px;
            font-size: 12.5px;
          }
          .total-highlight {
            font-size: 15px;
            font-weight: 800;
            border-top: 1.5px solid #0f172a;
            border-bottom: 1.5px solid #0f172a;
            color: #0f172a;
          }
          .balance-row {
            font-size: 14px;
            font-weight: 800;
            background: ${balanceDue > 0 ? "#fffbeb" : "#f0fdf4"};
            color: ${balanceDue > 0 ? "#b45309" : "#166534"};
          }
          .footer-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-top: 32px;
            padding-top: 18px;
            border-top: 1px solid #e2e8f0;
          }
          .sig-box {
            margin-top: 40px;
            border-top: 1px dashed #94a3b8;
            padding-top: 6px;
            text-align: center;
            font-size: 11px;
            color: #475569;
          }
        </style>
      </head>
      <body>
        <div class="bill-card">
          <div class="bill-header">
            <div>
              <img src="${logoUrl}" alt="PrintZ" style="height:56px;width:auto;display:block;margin-bottom:6px;" />
              <div class="brand-title">GUNA PRINTZ</div>
              <div class="brand-subtitle">Commercial Printing, Designing & Offset Press</div>
              <div class="brand-address">
                ${branch.address || "12/4, 2nd Main Road, Banaswadi, Bangalore - 560043"}<br>
                Phone: ${branch.phone || "+91 98450 12345"} | GSTIN: ${branch.gstin || "29AABCG1234F1Z5"}
              </div>
            </div>
            <div style="text-align: right;">
              <div class="bill-tag">Tax Invoice / Bill</div>
              <div style="font-size: 13px; font-weight: 700; color: #047857; margin-top: 2px;"># ${invoiceNum}</div>
              <div class="meta-pill">${doc.status || (isPaid ? "PAID" : "FINALIZED")}</div>
            </div>
          </div>

          <div class="details-grid">
            <div>
              <div class="info-block-title">Billed To (Customer):</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${cust.name || "Customer"}</div>
              ${cust.company ? `<div style="font-size: 12px; font-weight: 600; color: #334155;">${cust.company}</div>` : ""}
              <div style="font-size: 12px; color: #475569;">Mobile: <strong>${cust.mobile || "-"}</strong></div>
              ${cust.address && cust.address !== "-" ? `<div style="font-size: 11.5px; color: #64748b;">Address: ${cust.address}</div>` : ""}
              ${cust.gstin ? `<div style="font-size: 11.5px; font-weight: 700; color: #0369a1; margin-top: 3px;">GSTIN: ${cust.gstin}</div>` : ""}
            </div>

            <div style="text-align: right;">
              <div class="info-block-title">Order & Payment Meta:</div>
              <div style="font-size: 12px; margin-bottom: 2px;">Invoice Date: <strong>${invoiceDate}</strong></div>
              <div style="font-size: 12px; margin-bottom: 2px;">Job Order No: <strong>${jobNo}</strong></div>
              <div style="font-size: 12px; margin-bottom: 2px;">Due Date: <strong>${dueDate}</strong></div>
              <div style="font-size: 12px; margin-bottom: 2px;">Payment Mode: <strong>${doc.paymentMode || "UPI"}</strong></div>
              ${doc.paymentReference ? `<div style="font-size: 11.5px; color: #64748b;">Ref #: <strong>${doc.paymentReference}</strong></div>` : ""}
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th style="text-align: left;">Item Description & Specifications</th>
                <th style="width: 75px; text-align: center;">Qty</th>
                <th style="width: 90px; text-align: right;">Rate (₹)</th>
                <th style="width: 65px; text-align: center;">Tax</th>
                <th style="width: 100px; text-align: right;">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
              ${chargesRowsHtml}
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="max-width: 360px; font-size: 11px; color: #64748b;">
              <div style="font-weight: 700; color: #334155; text-transform: uppercase; margin-bottom: 4px;">Terms & Conditions:</div>
              <ol style="padding-left: 14px; margin: 0; line-height: 1.45;">
                <li>Goods once printed and dispatched will not be taken back or refunded.</li>
                <li>Please verify sample proofs before bulk production.</li>
                <li>Settlement balance is due upon order delivery.</li>
              </ol>
              ${doc.remarks ? `<div style="margin-top: 8px;"><strong>Remarks:</strong> ${doc.remarks}</div>` : ""}
            </div>

            <div>
              <table class="totals-table">
                <tr>
                  <td style="color: #64748b;">Subtotal:</td>
                  <td style="text-align: right; font-weight: 600;">₹ ${subtotal.toFixed(2)}</td>
                </tr>
                ${discountTotal > 0 ? `
                  <tr>
                    <td style="color: #15803d;">Commercial Discount:</td>
                    <td style="text-align: right; font-weight: 600; color: #15803d;">- ₹ ${discountTotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="color: #475569;">Net Taxable Subtotal:</td>
                    <td style="text-align: right; font-weight: 600;">₹ ${taxableAmount.toFixed(2)}</td>
                  </tr>
                ` : ""}
                ${(cgstTotal + sgstTotal) > 0 ? `
                  <tr>
                    <td style="color: #64748b;">SST / Tax:</td>
                    <td style="text-align: right;">₹ ${(cgstTotal + sgstTotal).toFixed(2)}</td>
                  </tr>
                ` : ""}
                <tr class="total-highlight">
                  <td>Grand Total:</td>
                  <td style="text-align: right;">₹ ${grandTotal.toFixed(2)}</td>
                </tr>
                ${isPrintOnly ? `
                <tr>
                  <td style="color: #6b21a8; font-weight: 700;">Full Payment Collected:</td>
                  <td style="text-align: right; font-weight: 700; color: #6b21a8;">- ₹ ${grandTotal.toFixed(2)}</td>
                </tr>
                <tr class="balance-row">
                  <td>Balance Due:</td>
                  <td style="text-align: right; font-weight: 800; color: #059669;">₹ 0.00 (Fully Settled)</td>
                </tr>
                ` : isPaid || balanceDue <= 0 ? `
                <tr>
                  <td style="color: #059669; font-weight: 700;">Initial Advance Paid:</td>
                  <td style="text-align: right; font-weight: 700; color: #059669;">- ₹ ${advancePaid.toFixed(2)}</td>
                </tr>
                ${paidAmount > 0 ? `
                <tr>
                  <td style="color: #059669; font-weight: 700;">Balance Collected:</td>
                  <td style="text-align: right; font-weight: 700; color: #059669;">- ₹ ${paidAmount.toFixed(2)}</td>
                </tr>
                ` : ""}
                <tr class="balance-row">
                  <td>Balance Due:</td>
                  <td style="text-align: right; font-weight: 800; color: #059669;">₹ 0.00 (Fully Settled)</td>
                </tr>
                ` : `
                <tr>
                  <td style="color: #059669; font-weight: 700;">Less: Initial Advance Paid:</td>
                  <td style="text-align: right; font-weight: 700; color: #059669;">- ₹ ${advancePaid.toFixed(2)}</td>
                </tr>
                <tr class="balance-row">
                  <td>Balance Due at Settlement:</td>
                  <td style="text-align: right; font-weight: 800; color: #b45309;">₹ ${balanceDue.toFixed(2)}</td>
                </tr>
                `}
              </table>
            </div>
          </div>

          <div class="footer-section">
            <div class="sig-box">
              Customer Signature / Verification
            </div>
            <div class="sig-box" style="font-weight: 700; color: #065f46;">
              For Guna Printz (Authorized Signatory)
            </div>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.65)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "1rem"
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "14px",
        width: "100%",
        maxWidth: "800px",
        maxHeight: "92vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        overflow: "hidden"
      }}>
        {/* Modal Top Header Bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.85rem 1.25rem",
          background: "#0f172a",
          color: "#ffffff"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Receipt size={18} style={{ color: "#34d399" }} />
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
              Commercial Bill / Tax Invoice: {invoiceNum}
            </span>
            <span style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "4px",
              background: isPaid ? "#065f46" : "#78350f",
              color: isPaid ? "#a7f3d0" : "#fef3c7"
            }}>
              {doc.status || (isPaid ? "PAID" : "FINALIZED")}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {!isPaid && balanceDue > 0 && onSettle && (
              <button
                type="button"
                onClick={() => onSettle(doc)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  background: "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(5,150,105,0.2)"
                }}
                title="Collect Outstanding Balance via Cashier"
              >
                <CreditCard size={15} /> Collect Balance (₹{balanceDue.toFixed(2)})
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                fontSize: "0.8rem",
                fontWeight: 700,
                background: "#0284c7",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              <Printer size={15} /> Print Bill / Invoice
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Bill Content */}
        <div style={{ overflowY: "auto", padding: "1.5rem" }}>
          <div style={{
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "10px",
            padding: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
          }}>
            {/* Bill Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "2.5px solid #059669",
              paddingBottom: "1rem",
              marginBottom: "1.25rem"
            }}>
              <div>
                <img src={logo} alt="PrintZ" style={{ height: "56px", width: "auto", display: "block", marginBottom: "6px" }} />
                <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#065f46", letterSpacing: "-0.02em" }}>
                  GUNA PRINTZ
                </div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#047857", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2px" }}>
                  Digital Color Printing, Multi-Colour Offset & Designing
                </div>
                <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "4px", lineHeight: 1.4 }}>
                  {branch.address}<br />
                  Phone: <strong>{branch.phone}</strong> | GSTIN: <strong>{branch.gstin}</strong>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", textTransform: "uppercase" }}>
                  Tax Invoice / Bill
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#047857", marginTop: "2px" }}>
                  # {invoiceNum}
                </div>
                <div style={{ marginTop: "6px" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: "6px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    background: isPaid ? "#dcfce7" : "#fef3c7",
                    color: isPaid ? "#166534" : "#92400e"
                  }}>
                    {isPaid ? "PAID IN FULL" : (balanceDue > 0 ? "PARTIAL / BALANCE DUE" : "FINALIZED")}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer & Order Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.25rem",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "1rem 1.25rem",
              marginBottom: "1.25rem"
            }}>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "4px" }}>
                  Billed To (Customer):
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                  {cust.name || "Customer"}
                </div>
                {cust.company && (
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                    {cust.company}
                  </div>
                )}
                <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: "2px" }}>
                  Phone: <strong>{cust.mobile || "-"}</strong>
                </div>
                {cust.address && cust.address !== "-" && (
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    {cust.address}
                  </div>
                )}
                {cust.gstin && (
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0369a1", marginTop: "2px" }}>
                    GSTIN: {cust.gstin}
                  </div>
                )}
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "4px" }}>
                  Order & Payment Meta:
                </div>
                <div style={{ fontSize: "0.8rem", color: "#334155", marginBottom: "2px" }}>
                  Invoice Date: <strong>{invoiceDate}</strong>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#334155", marginBottom: "2px" }}>
                  Job Order No: <strong>{jobNo}</strong>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#334155", marginBottom: "2px" }}>
                  Due Date: <strong>{dueDate}</strong>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#334155", marginBottom: "2px" }}>
                  Payment Mode: <strong>{doc.paymentMode || "UPI"}</strong>
                </div>
                {doc.paymentReference && (
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Ref #: <strong>{doc.paymentReference}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.25rem", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", borderTop: "1px solid #cbd5e1", borderBottom: "1.5px solid #94a3b8" }}>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: "35px", color: "#334155" }}>#</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", color: "#334155" }}>Item Description & Specifications</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: "75px", color: "#334155" }}>Qty</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", width: "90px", color: "#334155" }}>Rate (₹)</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: "65px", color: "#334155" }}>Tax</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", width: "105px", color: "#334155" }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "1.5rem", color: "#64748b" }}>
                      No line items recorded.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const lineQty = Number(it.quantity || 1);
                    const linePrice = Number(it.unitPrice || 0);
                    const lineTaxRate = Number(it.taxRate !== undefined ? it.taxRate : (doc.taxRate || 0));
                    const lineTotal = Number(it.lineTotal || (lineQty * linePrice));
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "8px 10px", textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{it.itemName || "Print Item"}</div>
                          {it.description && (
                            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>{it.description}</div>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600 }}>{lineQty} {it.unit || "PCS"}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }}>₹ {linePrice.toFixed(2)}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>{lineTaxRate}%</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>₹ {lineTotal.toFixed(2)}</td>
                      </tr>
                    );
                  })
                )}
                {charges.map((ch, idx) => (
                  <tr key={`ch-${idx}`} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td colSpan={5} style={{ padding: "7px 10px", textAlign: "right", color: "#475569" }}>
                      {ch.description || "Additional Service"}:
                    </td>
                    <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700 }}>
                      ₹ {Number(ch.amount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculation & Terms Summary */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "2rem" }}>
              <div style={{ flex: 1, fontSize: "0.75rem", color: "#64748b" }}>
                <div style={{ fontWeight: 700, color: "#334155", textTransform: "uppercase", marginBottom: "4px" }}>
                  Terms & Conditions:
                </div>
                <ol style={{ paddingLeft: "14px", margin: 0, lineHeight: 1.5 }}>
                  <li>Goods once sold and delivered will not be taken back or refunded.</li>
                  <li>Customer must verify proofs before bulk printing approval.</li>
                  <li>Balance payment is strictly due upon handover/settlement.</li>
                </ol>
                {doc.remarks && (
                  <div style={{ marginTop: "8px" }}>
                    <strong>Remarks:</strong> {doc.remarks}
                  </div>
                )}
              </div>

              <div style={{ width: "320px" }}>
                <table style={{ width: "100%", fontSize: "0.82rem", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: "4px 6px", color: "#64748b" }}>Subtotal:</td>
                      <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 600 }}>₹ {subtotal.toFixed(2)}</td>
                    </tr>
                    {discountTotal > 0 && (
                      <>
                        <tr>
                          <td style={{ padding: "4px 6px", color: "#15803d" }}>Commercial Discount:</td>
                          <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 600, color: "#15803d" }}>- ₹ {discountTotal.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "4px 6px", color: "#475569" }}>Net Taxable Subtotal:</td>
                          <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 600 }}>₹ {taxableAmount.toFixed(2)}</td>
                        </tr>
                      </>
                    )}
                    {(cgstTotal + sgstTotal) > 0 && (
                      <tr>
                        <td style={{ padding: "4px 6px", color: "#64748b" }}>SST / Tax:</td>
                        <td style={{ padding: "4px 6px", textAlign: "right" }}>₹ {(cgstTotal + sgstTotal).toFixed(2)}</td>
                      </tr>
                    )}
                    <tr style={{ borderTop: "1.5px solid #0f172a", borderBottom: "1.5px solid #0f172a" }}>
                      <td style={{ padding: "6px", fontWeight: 800, fontSize: "0.95rem" }}>Grand Total:</td>
                      <td style={{ padding: "6px", textAlign: "right", fontWeight: 800, fontSize: "0.95rem", color: "#065f46" }}>₹ {grandTotal.toFixed(2)}</td>
                    </tr>
                    {isPrintOnly ? (
                      <>
                        <tr>
                          <td style={{ padding: "5px 6px", color: "#6b21a8", fontWeight: 700 }}>Full Payment Collected:</td>
                          <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700, color: "#6b21a8" }}>- ₹ {grandTotal.toFixed(2)}</td>
                        </tr>
                        <tr style={{
                          background: "#f0fdf4",
                          borderRadius: "6px"
                        }}>
                          <td style={{ padding: "6px", fontWeight: 800, color: "#166534" }}>
                            Balance Due:
                          </td>
                          <td style={{ padding: "6px", textAlign: "right", fontWeight: 800, color: "#166534" }}>
                            ₹ 0.00 (Fully Settled)
                          </td>
                        </tr>
                      </>
                    ) : isPaid || balanceDue <= 0 ? (
                      <>
                        <tr>
                          <td style={{ padding: "5px 6px", color: "#059669", fontWeight: 700 }}>Initial Advance Paid:</td>
                          <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700, color: "#059669" }}>- ₹ {advancePaid.toFixed(2)}</td>
                        </tr>
                        {paidAmount > 0 && (
                          <tr>
                            <td style={{ padding: "5px 6px", color: "#059669", fontWeight: 700 }}>Balance Collected:</td>
                            <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700, color: "#059669" }}>- ₹ {paidAmount.toFixed(2)}</td>
                          </tr>
                        )}
                        <tr style={{
                          background: "#f0fdf4",
                          borderRadius: "6px"
                        }}>
                          <td style={{ padding: "6px", fontWeight: 800, color: "#166534" }}>
                            Balance Due:
                          </td>
                          <td style={{ padding: "6px", textAlign: "right", fontWeight: 800, color: "#166534" }}>
                            ₹ 0.00 (Fully Settled)
                          </td>
                        </tr>
                      </>
                    ) : (
                      <>
                        <tr>
                          <td style={{ padding: "5px 6px", color: "#059669", fontWeight: 700 }}>Less: Initial Advance Paid:</td>
                          <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700, color: "#059669" }}>- ₹ {advancePaid.toFixed(2)}</td>
                        </tr>
                        <tr style={{
                          background: balanceDue > 0 ? "#fffbeb" : "#f0fdf4",
                          borderRadius: "6px"
                        }}>
                          <td style={{ padding: "6px", fontWeight: 800, color: balanceDue > 0 ? "#b45309" : "#166534" }}>
                            Balance Due at Settlement:
                          </td>
                          <td style={{ padding: "6px", textAlign: "right", fontWeight: 800, color: balanceDue > 0 ? "#b45309" : "#166534" }}>
                            ₹ {balanceDue.toFixed(2)}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
                {!isPaid && balanceDue > 0 && onSettle && (
                  <div style={{ marginTop: "0.75rem", textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => onSettle(doc)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 16px",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        background: "#059669",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(5,150,105,0.25)"
                      }}
                    >
                      <CreditCard size={14} /> Settle Remaining Balance Now (₹{balanceDue.toFixed(2)})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Signature Blocks */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "2rem",
              marginTop: "2.5rem",
              paddingTop: "1rem",
              borderTop: "1px solid #e2e8f0"
            }}>
              <div style={{ textAlign: "center", borderTop: "1px dashed #cbd5e1", paddingTop: "6px", fontSize: "0.75rem", color: "#64748b" }}>
                Customer Signature / Verification
              </div>
              <div style={{ textAlign: "center", borderTop: "1px dashed #cbd5e1", paddingTop: "6px", fontSize: "0.75rem", fontWeight: 700, color: "#065f46" }}>
                For Guna Printz (Authorized Signatory)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceBillModal;


