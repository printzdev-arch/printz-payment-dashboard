/**
 * SaleReceiptHelper
 * Monetary calculation and print/export rendering utilities for POS.
 */
class SaleReceiptHelper {
  static round2(val) {
    return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
  }

  static calculateLineItem({ quantity, unitPrice, discount = 0, taxRate = 0 }) {
    const qty = Number(quantity) || 0;
    const price = Number(unitPrice) || 0;
    const disc = Number(discount) || 0;
    const rate = Number(taxRate) || 0;

    const baseAmount = this.round2(qty * price);
    const validDiscount = Math.min(baseAmount, Math.max(0, disc));
    const taxableAmount = this.round2(Math.max(0, baseAmount - validDiscount));
    const taxAmount = this.round2(taxableAmount * (rate / 100));
    const lineTotal = this.round2(taxableAmount + taxAmount);

    return {
      quantity: qty,
      unitPrice: price,
      discount: validDiscount,
      taxRate: rate,
      baseAmount,
      taxableAmount,
      taxAmount,
      lineTotal,
    };
  }

  static calculateTotals(calculatedLines = []) {
    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;
    let grandTotal = 0;

    for (const line of calculatedLines) {
      subtotal += line.baseAmount !== undefined ? line.baseAmount : this.round2(line.quantity * line.unitPrice);
      discountAmount += Number(line.discount) || 0;
      taxAmount += Number(line.taxAmount) || 0;
      grandTotal += Number(line.lineTotal) || 0;
    }

    return {
      subtotal: this.round2(subtotal),
      discountAmount: this.round2(discountAmount),
      taxAmount: this.round2(taxAmount),
      grandTotal: this.round2(grandTotal),
    };
  }

  static renderPrintHtml(receipt, items, template = "a4") {
    const isThermal = String(template).toLowerCase() === "thermal";
    const title = isThermal ? "POS THERMAL RECEIPT" : "TAX INVOICE / SALE RECEIPT";

    const itemRows = items
      .map(
        (it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${it.productName}</td>
          <td style="text-align: right;">${it.quantity}</td>
          <td style="text-align: right;">₹${Number(it.unitPrice).toFixed(2)}</td>
          <td style="text-align: right;">₹${Number(it.discount || 0).toFixed(2)}</td>
          <td style="text-align: right;">${it.taxRate}%</td>
          <td style="text-align: right;">₹${Number(it.taxAmount || 0).toFixed(2)}</td>
          <td style="text-align: right; font-weight: bold;">₹${Number(it.lineTotal).toFixed(2)}</td>
        </tr>`
      )
      .join("");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${receipt.receiptNo}</title>
  <style>
    body { font-family: ${isThermal ? "'Courier New', Courier, monospace" : "'Helvetica Neue', Arial, sans-serif"}; padding: 20px; color: #222; }
    .header { text-align: center; border-bottom: 2px dashed #444; padding-bottom: 10px; margin-bottom: 15px; }
    .title { font-size: ${isThermal ? "18px" : "24px"}; font-weight: bold; }
    .info { margin-bottom: 15px; font-size: ${isThermal ? "12px" : "14px"}; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: ${isThermal ? "12px" : "14px"}; }
    th, td { border-bottom: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #f8f9fa; }
    .totals { width: 300px; margin-left: auto; margin-bottom: 20px; font-size: ${isThermal ? "12px" : "14px"}; }
    .totals td { padding: 4px 8px; }
    .grand-total { font-size: ${isThermal ? "14px" : "16px"}; font-weight: bold; border-top: 2px solid #222; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; border-top: 1px dashed #aaa; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">PRINTZ DIGITAL PRINTING</div>
    <div>${title}</div>
    <div>Receipt No: <strong>${receipt.receiptNo}</strong></div>
    <div>Date: ${new Date(receipt.saleDate).toLocaleString()}</div>
    <div>Status: <strong>${receipt.status}</strong> | Payment: <strong>${receipt.paymentStatus} (${receipt.paymentMode || "N/A"})</strong></div>
  </div>

  <div class="info">
    <div><strong>Customer:</strong> ${receipt.customerSnapshot?.name || "Counter Customer"}</div>
    ${receipt.customerSnapshot?.mobile ? `<div><strong>Mobile:</strong> ${receipt.customerSnapshot.mobile}</div>` : ""}
    ${receipt.customerSnapshot?.gstin ? `<div><strong>GSTIN:</strong> ${receipt.customerSnapshot.gstin}</div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Product / Service</th>
        <th style="text-align: right;">Qty</th>
        <th style="text-align: right;">Rate</th>
        <th style="text-align: right;">Disc</th>
        <th style="text-align: right;">Tax %</th>
        <th style="text-align: right;">Tax Amt</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <table class="totals">
    <tr><td>Subtotal:</td><td style="text-align: right;">₹${Number(receipt.subtotal).toFixed(2)}</td></tr>
    <tr><td>Discount:</td><td style="text-align: right;">-₹${Number(receipt.discountAmount).toFixed(2)}</td></tr>
    <tr><td>Tax Amount:</td><td style="text-align: right;">₹${Number(receipt.taxAmount).toFixed(2)}</td></tr>
    <tr class="grand-total"><td>Grand Total:</td><td style="text-align: right;">₹${Number(receipt.grandTotal).toFixed(2)}</td></tr>
    <tr><td>Amount Paid:</td><td style="text-align: right;">₹${Number(receipt.amountPaid).toFixed(2)}</td></tr>
    <tr><td>Balance Due:</td><td style="text-align: right;">₹${Math.max(0, Number(receipt.grandTotal) - Number(receipt.amountPaid)).toFixed(2)}</td></tr>
  </table>

  <div class="footer">
    <p>Thank you for choosing PrintZ! For inquiries, visit support@printz.shop</p>
  </div>
</body>
</html>`;
  }
}

module.exports = SaleReceiptHelper;
