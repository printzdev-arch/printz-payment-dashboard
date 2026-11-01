/**
 * Invoice PDF & Printable HTML Rendering Service
 */
class InvoicePdfService {
  static renderPrintHtml(invoice) {
    const doc = invoice.toObject ? invoice.toObject() : invoice;
    const cust = doc.customerSnapshot || {};
    const branch = doc.branchSnapshot || {};
    const items = doc.items || [];
    const charges = doc.additionalCharges || [];

    const currencySymbol = doc.currency === "INR" ? "₹" : (doc.currency || "₹");

    const itemsRows = items.map((it, idx) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0;">
          <strong>${it.itemName || "Item"}</strong>
          ${it.description ? `<br><span style="font-size: 11px; color: #64748b;">${it.description}</span>` : ""}
        </td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${it.quantity} ${it.unit || "PCS"}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${currencySymbol}${(it.unitPrice || 0).toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${currencySymbol}${(it.discountAmount || 0).toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${currencySymbol}${(it.taxableAmount || 0).toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${it.taxRate}%</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${currencySymbol}${(it.taxAmount || 0).toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${currencySymbol}${(it.lineTotal || 0).toFixed(2)}</td>
      </tr>
    `).join("");

    const chargesRows = charges.length > 0 ? charges.map((ch) => `
      <tr>
        <td colspan="7" style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${ch.description}:</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${currencySymbol}${(ch.taxAmount || 0).toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${currencySymbol}${((ch.amount || 0) + (ch.taxAmount || 0)).toFixed(2)}</td>
      </tr>
    `).join("") : "";

    const dateFormatted = doc.invoiceDate ? new Date(doc.invoiceDate).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");
    const dueDateFormatted = doc.dueDate ? new Date(doc.dueDate).toLocaleDateString("en-IN") : "-";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${doc.invoiceNumber || "DRAFT"}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; margin: 0; padding: 24px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px; }
    .company-title { font-size: 24px; font-weight: bold; color: #1e3a8a; }
    .invoice-title { font-size: 28px; font-weight: 800; color: #0f172a; text-align: right; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    .badge-draft { background: #fef3c7; color: #92400e; }
    .badge-finalized { background: #dcfce7; color: #166534; }
    .badge-pending { background: #e0e7ff; color: #3730a3; }
    .grid { display: flex; justify-content: space-between; margin-bottom: 24px; }
    .col { flex: 1; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    .table th { background: #f8fafc; padding: 10px 8px; border: 1px solid #cbd5e1; font-weight: 600; text-align: left; }
    .summary-table { width: 320px; margin-left: auto; border-collapse: collapse; font-size: 13px; }
    .summary-table td { padding: 6px 8px; }
    .total-row { font-size: 16px; font-weight: bold; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-title">PRINTZ PAYMENT DASHBOARD</div>
      <div style="font-size: 13px; color: #475569; margin-top: 4px;">
        <strong>${branch.name || "Main Branch"}</strong> (${branch.code || "HQ"})<br>
        ${branch.address || "Printing & Digital Graphics Center"}<br>
        ${branch.gstin ? `GSTIN: ${branch.gstin}<br>` : ""}
      </div>
    </div>
    <div style="text-align: right;">
      <div class="invoice-title">TAX INVOICE</div>
      <div style="font-size: 14px; font-weight: 600; margin-top: 4px;">
        Invoice #: ${doc.invoiceNumber || "DRAFT"}
      </div>
      <div style="margin-top: 6px;">
        <span class="badge ${doc.status === 'FINALIZED' || doc.status === 'PAID' ? 'badge-finalized' : (doc.status === 'DRAFT' ? 'badge-draft' : 'badge-pending')}">
          ${doc.status}
        </span>
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="col">
      <div style="font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">BILL TO:</div>
      <div style="font-size: 15px; font-weight: bold; margin-top: 4px;">${cust.name || "Walk-in Customer"}</div>
      ${cust.company ? `<div style="font-size: 13px; color: #334155;">${cust.company}</div>` : ""}
      ${cust.address ? `<div style="font-size: 13px; color: #475569; margin-top: 2px;">${cust.address}</div>` : ""}
      ${cust.mobile ? `<div style="font-size: 13px; color: #475569;">Mobile: ${cust.mobile}</div>` : ""}
      ${cust.gstin ? `<div style="font-size: 13px; font-weight: 600; color: #1e3a8a;">GSTIN: ${cust.gstin}</div>` : ""}
    </div>
    <div class="col" style="text-align: right;">
      <div style="font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">INVOICE DETAILS:</div>
      <table style="margin-left: auto; font-size: 13px; margin-top: 4px; text-align: right;">
        <tr><td style="color: #64748b; padding-right: 12px;">Invoice Date:</td><td><strong>${dateFormatted}</strong></td></tr>
        <tr><td style="color: #64748b; padding-right: 12px;">Due Date:</td><td>${dueDateFormatted}</td></tr>
        <tr><td style="color: #64748b; padding-right: 12px;">Job Order #:</td><td><strong>${doc.jobNo || "-"}</strong></td></tr>
        ${doc.deliveryOrderId ? `<tr><td style="color: #64748b; padding-right: 12px;">Delivery Ref:</td><td>DO-${String(doc.deliveryOrderId).slice(-6)}</td></tr>` : ""}
      </table>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">#</th>
        <th>Item & Description</th>
        <th style="width: 80px; text-align: center;">Qty</th>
        <th style="width: 80px; text-align: right;">Rate</th>
        <th style="width: 70px; text-align: right;">Disc</th>
        <th style="width: 85px; text-align: right;">Taxable</th>
        <th style="width: 60px; text-align: center;">GST %</th>
        <th style="width: 75px; text-align: right;">GST Amt</th>
        <th style="width: 95px; text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
      ${chargesRows}
    </tbody>
  </table>

  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
    <div style="flex: 1; padding-right: 30px; font-size: 12px; color: #475569;">
      <strong>Terms & Conditions:</strong>
      <ol style="padding-left: 16px; margin-top: 4px; line-height: 1.4;">
        <li>Goods once sold and delivered will not be returned.</li>
        <li>Payment is due within the stipulated credit terms.</li>
        <li>Interest @ 18% p.a. will be levied on overdue payments.</li>
      </ol>
      ${doc.remarks ? `<div style="margin-top: 10px;"><strong>Remarks:</strong> ${doc.remarks}</div>` : ""}
    </div>

    <div>
      <table class="summary-table">
        <tr>
          <td>Subtotal:</td>
          <td style="text-align: right;">${currencySymbol}${(doc.subtotal || 0).toFixed(2)}</td>
        </tr>
        ${doc.discountTotal > 0 ? `
        <tr>
          <td style="color: #16a34a;">Discount:</td>
          <td style="text-align: right; color: #16a34a;">-${currencySymbol}${(doc.discountTotal || 0).toFixed(2)}</td>
        </tr>
        ` : ""}
        ${doc.additionalChargesTotal > 0 ? `
        <tr>
          <td>Additional Charges:</td>
          <td style="text-align: right;">${currencySymbol}${(doc.additionalChargesTotal || 0).toFixed(2)}</td>
        </tr>
        ` : ""}
        <tr>
          <td>Taxable Amount:</td>
          <td style="text-align: right;">${currencySymbol}${(doc.taxableAmount || 0).toFixed(2)}</td>
        </tr>
        ${doc.cgstTotal > 0 ? `
        <tr>
          <td style="color: #64748b;">CGST:</td>
          <td style="text-align: right;">${currencySymbol}${(doc.cgstTotal || 0).toFixed(2)}</td>
        </tr>
        ` : ""}
        ${doc.sgstTotal > 0 ? `
        <tr>
          <td style="color: #64748b;">SGST:</td>
          <td style="text-align: right;">${currencySymbol}${(doc.sgstTotal || 0).toFixed(2)}</td>
        </tr>
        ` : ""}
        ${doc.igstTotal > 0 ? `
        <tr>
          <td style="color: #64748b;">IGST:</td>
          <td style="text-align: right;">${currencySymbol}${(doc.igstTotal || 0).toFixed(2)}</td>
        </tr>
        ` : ""}
        <tr class="total-row">
          <td>Grand Total:</td>
          <td style="text-align: right; color: #1e3a8a;">${currencySymbol}${(doc.grandTotal || 0).toFixed(2)}</td>
        </tr>
        ${doc.advanceApplied > 0 ? `
        <tr>
          <td style="color: #0284c7;">Advance Applied:</td>
          <td style="text-align: right; color: #0284c7;">-${currencySymbol}${(doc.advanceApplied || 0).toFixed(2)}</td>
        </tr>
        ` : ""}
        ${doc.paidAmount > 0 ? `
        <tr>
          <td style="color: #16a34a;">Paid Amount:</td>
          <td style="text-align: right; color: #16a34a;">-${currencySymbol}${(doc.paidAmount || 0).toFixed(2)}</td>
        </tr>
        ` : ""}
        <tr style="font-size: 14px; font-weight: bold; background: #f8fafc;">
          <td>Balance Due:</td>
          <td style="text-align: right; color: #dc2626;">${currencySymbol}${(doc.balanceDue || 0).toFixed(2)}</td>
        </tr>
      </table>
    </div>
  </div>

  <div class="footer">
    This is a system generated document authenticated by Printz Digital Systems. No signature is required.
  </div>
</body>
</html>`;
  }
}

module.exports = InvoicePdfService;
