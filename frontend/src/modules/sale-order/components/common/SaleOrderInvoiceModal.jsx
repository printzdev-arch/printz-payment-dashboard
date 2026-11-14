import React, { useEffect, useState } from "react";
import { Printer, X, FileText, CheckCircle2, PackageCheck } from "lucide-react";
import logo from "../../../../shared/assets/logo.png";
import saleOrderApi from "../../api/saleOrderApi";
import { formatMoney, formatDate, formatDateTime } from "../../utils/format";
import { typeLabel } from "../../utils/saleOrderStatus";
import { specSummary } from "../../utils/totals";
import "../../styles/sale-order.css";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const rupees = (value) => `₹${Number(value || 0).toFixed(2)}`;

const THERMAL_CSS = `
  .so-slip { width: 72mm; margin: 0 auto; font-family: "Courier New", Courier, monospace; font-size: 11.5px; line-height: 1.35; color: #000; }
  .so-slip .c { text-align: center; }
  .so-slip .logo { height: 38px; width: auto; display: block; margin: 0 auto 4px; }
  .so-slip .brand { font-size: 15px; font-weight: 800; letter-spacing: 1px; }
  .so-slip .sub { font-size: 10.5px; }
  .so-slip .title { font-weight: 800; margin-top: 4px; }
  .so-slip hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  .so-slip .row { display: flex; justify-content: space-between; gap: 8px; }
  .so-slip .row span:last-child { text-align: right; }
  .so-slip table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .so-slip th { text-align: left; border-bottom: 1px dashed #000; padding: 2px 0; font-weight: 800; }
  .so-slip td { padding: 3px 0; vertical-align: top; }
  .so-slip .r { text-align: right; }
  .so-slip .m { text-align: center; }
  .so-slip .small { font-size: 10px; }
  .so-slip .grand { font-size: 13.5px; font-weight: 800; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin: 4px 0; }
  .so-slip .b { font-weight: 800; }
`;

function buildThermalSlipHtml({ order, branch, customer: c, items, payments, invoiceNo, invoiceDate, isFullyPaid, logoUrl }) {
  const itemRows = items
    .map(
      (it) => `
      <tr>
        <td colspan="3">${escapeHtml(it.description || typeLabel(it.productType))}${
          Number(it.taxRate) > 0 ? ` <span class="small">(${escapeHtml(it.taxRate)}% GST)</span>` : ""
        }${specSummary(it.specification) ? `<div class="small">${escapeHtml(specSummary(it.specification))}</div>` : ""}</td>
      </tr>
      <tr>
        <td class="small">${escapeHtml(it.quantity)} ${escapeHtml(it.unit || "PCS")} x ${rupees(it.unitPrice)}</td>
        <td></td>
        <td class="r">${rupees(it.lineTotal)}</td>
      </tr>`
    )
    .join("");

  const paymentRows = payments
    .map(
      (p) => `
      <div class="row small">
        <span>${p.paymentType === "FINAL" ? "Final" : "Advance"} · ${escapeHtml(p.mode)}${p.receiptNo ? ` · ${escapeHtml(p.receiptNo)}` : ""}</span>
        <span>${rupees(p.amount)}</span>
      </div>`
    )
    .join("");

  const finalPaid = Math.max(0, Number(order.amountPaid || 0) - Number(order.advanceAmount || 0));

  return `
  <div class="so-slip">
    <div class="c">
      <img class="logo" src="${logoUrl}" alt="PrintZ" />
      <div class="sub">${escapeHtml(branch.name || "Main Branch")} · Printing & Digital Solutions</div>
      ${branch.address ? `<div class="sub">${escapeHtml(branch.address)}</div>` : ""}
      <div class="title">TAX INVOICE${isFullyPaid ? " · PAID" : ""}</div>
    </div>
    <hr />
    <div class="row"><span>Invoice:</span><span class="b">${escapeHtml(invoiceNo)}</span></div>
    <div class="row"><span>Order:</span><span>${escapeHtml(order.orderNo || "—")}</span></div>
    <div class="row"><span>Date:</span><span>${new Date(invoiceDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span></div>
    <div class="row"><span>Customer:</span><span>${escapeHtml(c.name || "Walk-in Customer")}</span></div>
    ${c.mobile ? `<div class="row"><span>Mobile:</span><span>${escapeHtml(c.mobile)}</span></div>` : ""}
    ${order.expectedDeliveryDate ? `<div class="row"><span>Deliver By:</span><span>${escapeHtml(formatDate(order.expectedDeliveryDate))}</span></div>` : ""}
    ${order.priority === "URGENT" ? `<div class="row b"><span>Priority:</span><span>URGENT</span></div>` : ""}
    <hr />
    <table>
      <thead><tr><th>Item</th><th></th><th class="r">Amount</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <hr />
    <div class="row"><span>Sub total:</span><span>${rupees(order.subtotal)}</span></div>
    ${Number(order.discountAmount) > 0 ? `<div class="row"><span>Discount:</span><span>- ${rupees(order.discountAmount)}</span></div>` : ""}
    ${
      Number(order.urgentChargeAmount) > 0
        ? `<div class="row"><span>Urgent charge${
            order.urgentChargeType === "PERCENTAGE" && order.urgentChargeValue ? ` (${escapeHtml(order.urgentChargeValue)}%)` : ""
          }:</span><span>+ ${rupees(order.urgentChargeAmount)}</span></div>`
        : ""
    }
    <div class="row"><span>Tax (GST):</span><span>${rupees(order.taxAmount)}</span></div>
    <div class="row grand"><span>GRAND TOTAL:</span><span>${rupees(order.grandTotal)}</span></div>
    <div class="row"><span>Advance:</span><span>${rupees(order.advanceAmount || order.amountPaid)}</span></div>
    ${finalPaid > 0 ? `<div class="row"><span>Paid at handover:</span><span>${rupees(finalPaid)}</span></div>` : ""}
    <div class="row b"><span>Total paid:</span><span>${rupees(order.amountPaid)}</span></div>
    <div class="row b"><span>Balance due:</span><span>${isFullyPaid ? "₹0.00" : rupees(order.balanceDue)}</span></div>
    ${payments.length > 0 ? `<hr /><div class="b small">PAYMENTS</div>${paymentRows}` : ""}
    <hr />
    <div class="c small">
      <div class="b">*** Thank you for choosing Printz! ***</div>
      <div>This is a computer generated invoice.</div>
    </div>
  </div>`;
}

const templateBtnStyle = (active) => ({
  border: "none",
  background: active ? "#0f766e" : "transparent",
  color: active ? "#ffffff" : "#475569",
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "12.5px",
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
});

export default function SaleOrderInvoiceModal({ isOpen, order: initialOrder, onClose }) {
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState("a4"); // "a4" | "thermal"

  useEffect(() => {
    if (!isOpen || !initialOrder?._id) return;
    setOrder(initialOrder);
    // If payments or full branch info are missing, fetch detailed order
    if (!initialOrder.items || !initialOrder.payments || !initialOrder.orderBranch) {
      setLoading(true);
      saleOrderApi
        .get(initialOrder._id)
        .then((full) => {
          if (full) setOrder(full);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, initialOrder]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const c = order.customerSnapshot || {};
  const branch = order.orderBranch || {};
  const items = order.items || [];
  const payments = order.payments || [];
  const invoiceNo =
    order.invoiceNo || (order.orderNo ? `INV-${order.orderNo.replace(/^SO-?/, "")}` : "INV-DRAFT");
  const invoiceDate = order.invoiceDate || order.orderDate || new Date();
  const isFullyPaid =
    Number(order.balanceDue || 0) === 0 || order.paymentStatus === "PAID" || order.status === "DELIVERED";
  const finalPaymentAmount = Math.max(0, Number(order.amountPaid || 0) - Number(order.advanceAmount || 0));

  const slipData = {
    order,
    branch,
    customer: c,
    items,
    payments,
    invoiceNo,
    invoiceDate,
    isFullyPaid,
  };

  const printThermal = () => {
    const logoUrl = new URL(logo, window.location.origin).href;
    const w = window.open("", "_blank", "width=420,height=800");
    if (!w) {
      window.print();
      return;
    }
    w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Slip - ${escapeHtml(invoiceNo)}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { padding: 4mm 0; }
    ${THERMAL_CSS}
  </style>
</head>
<body>
  ${buildThermalSlipHtml({ ...slipData, logoUrl })}
  <script>
    window.onload = function () {
      var img = document.querySelector("img");
      var go = function () { window.print(); };
      if (img && !img.complete) { img.onload = go; img.onerror = go; } else { go(); }
    };
  </script>
</body>
</html>`);
    w.document.close();
  };

  const handlePrint = () => (template === "thermal" ? printThermal() : printA4());

  const printA4 = () => {
    // The print window is a blank page, so the logo needs an absolute address
    const logoUrl = new URL(logo, window.location.origin).href;
    const w = window.open("", "_blank", "width=850,height=950");
    if (!w) {
      window.print();
      return;
    }

    const itemsRows = items
      .map(
        (it, idx) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">
          <strong style="color: #0f172a;">${it.description || typeLabel(it.productType)}</strong>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${typeLabel(it.productType)}</div>
          ${specSummary(it.specification) ? `<div style="font-size: 11px; color: #64748b;">${escapeHtml(specSummary(it.specification))}</div>` : ""}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${it.quantity} ${it.unit || "PCS"}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${Number(it.unitPrice || 0).toFixed(2)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${it.taxRate || 0}%</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${Number(it.taxAmount || 0).toFixed(2)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a;">₹${Number(it.lineTotal || 0).toFixed(2)}</td>
      </tr>
    `
      )
      .join("");

    const urgentRow =
      Number(order.urgentChargeAmount || 0) > 0
        ? `<tr>
            <td style="padding: 5px 0; color: #b45309;">Urgent Surcharge ${order.urgentChargeType === "PERCENTAGE" && order.urgentChargeValue ? `(${order.urgentChargeValue}%)` : ""}:</td>
            <td style="padding: 5px 0; text-align: right; font-weight: 600; color: #b45309;">+ ₹${Number(order.urgentChargeAmount).toFixed(2)}</td>
          </tr>`
        : "";

    const discountRow =
      Number(order.discountAmount || 0) > 0
        ? `<tr>
            <td style="padding: 5px 0; color: #166534;">Discount:</td>
            <td style="padding: 5px 0; text-align: right; font-weight: 600; color: #166534;">- ₹${Number(order.discountAmount).toFixed(2)}</td>
          </tr>`
        : "";

    const paymentRows = payments
      .map(
        (p) => `
      <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 6px 0; border-bottom: 1px dashed #cbd5e1;">
        <div>
          <strong>${p.paymentType === "FINAL" ? "Final Payment (Handover)" : "Advance Payment"}</strong> · ${p.receiptNo || "Receipt"} · ${p.mode} ${p.reference ? `(Ref: ${p.reference})` : ""}
          <span style="color: #64748b; margin-left: 8px;">${new Date(p.collectedAt || Date.now()).toLocaleString("en-IN")}</span>
        </div>
        <strong style="color: #15803d;">₹${Number(p.amount || 0).toFixed(2)}</strong>
      </div>
    `
      )
      .join("");

    w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${invoiceNo}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 36px; color: #0f172a; margin: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #0f766e; padding-bottom: 16px; margin-bottom: 24px; }
    .brand h1 { margin: 0; font-size: 26px; color: #0f766e; font-weight: 800; letter-spacing: -0.5px; }
    .brand p { margin: 4px 0 0; font-size: 13px; color: #475569; }
    .inv-meta { text-align: right; }
    .inv-meta .badge { display: inline-block; background: #ccfbf1; color: #0f766e; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 4px; margin-bottom: 4px; text-transform: uppercase; }
    .inv-meta .paid-badge { display: inline-block; background: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 4px; margin-bottom: 4px; margin-left: 6px; text-transform: uppercase; border: 1px solid #bbf7d0; }
    .inv-meta p { margin: 2px 0; font-size: 13px; color: #334155; }
    .grid { display: flex; justify-content: space-between; margin-bottom: 24px; gap: 20px; }
    .col { flex: 1; background: #f8fafc; padding: 14px 18px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; line-height: 1.5; }
    .col h3 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    th { background: #f1f5f9; padding: 10px 12px; font-weight: 700; text-align: left; border-top: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; color: #334155; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .totals { width: 340px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; font-size: 13px; }
    .totals table { width: 100%; margin: 0; }
    .totals td { padding: 4px 0; }
    .totals .grand { font-size: 16px; font-weight: 700; border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; padding: 8px 0; color: #0f766e; }
    .footer { margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <img src="${logoUrl}" alt="PrintZ" style="height:56px;width:auto;display:block;margin-bottom:6px;" />
      <p><strong>${branch.name || "Main Branch"}</strong> · Printing & Digital Solutions</p>
      ${branch.address ? `<p style="font-size: 12px; color: #64748b;">${branch.address}</p>` : ""}
    </div>
    <div class="inv-meta">
      <div>
        <span class="badge">Tax Invoice</span>
        ${isFullyPaid ? '<span class="paid-badge">PAID IN FULL</span>' : ""}
      </div>
      <p><strong>Invoice #:</strong> ${invoiceNo}</p>
      <p><strong>Date:</strong> ${new Date(invoiceDate).toLocaleDateString("en-IN")}</p>
      <p><strong>Order No:</strong> ${order.orderNo || "—"}</p>
    </div>
  </div>

  <div class="grid">
    <div class="col">
      <h3>Billed To (Customer)</h3>
      <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">${c.name || "Customer"}</div>
      <div>Mobile: ${c.mobile || "—"}</div>
      ${c.whatsappNumber ? `<div>WhatsApp: ${c.whatsappNumber}</div>` : ""}
      ${c.email ? `<div>Email: ${c.email}</div>` : ""}
      ${c.address ? `<div>Address: ${c.address}</div>` : ""}
    </div>
    <div class="col">
      <h3>Order Details</h3>
      <div><strong>Priority:</strong> ${order.priority || "NORMAL"}</div>
      <div><strong>Order Date:</strong> ${formatDate(order.orderDate)}</div>
      <div><strong>Deliver By:</strong> ${formatDate(order.expectedDeliveryDate)}</div>
      <div><strong>Payment Status:</strong> ${order.paymentStatus || "UNPAID"}</div>
      ${
        order.delivery?.deliveredAt
          ? `<div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1; color: #15803d; font-weight: 600;">
              Handed Over to ${order.delivery.receivedByName || "Customer"} on ${new Date(order.delivery.deliveredAt).toLocaleString("en-IN")}
            </div>`
          : ""
      }
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 36px; text-align: center;">#</th>
        <th>Item Description</th>
        <th style="width: 80px; text-align: center;">Qty</th>
        <th style="width: 90px; text-align: right;">Rate</th>
        <th style="width: 70px; text-align: center;">Tax %</th>
        <th style="width: 90px; text-align: right;">Tax</th>
        <th style="width: 100px; text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals">
      <table>
        <tr>
          <td>Sub total:</td>
          <td style="text-align: right; font-weight: 600;">₹${Number(order.subtotal || 0).toFixed(2)}</td>
        </tr>
        ${discountRow}
        ${urgentRow}
        <tr>
          <td>Tax (GST):</td>
          <td style="text-align: right; font-weight: 600;">₹${Number(order.taxAmount || 0).toFixed(2)}</td>
        </tr>
        <tr class="grand">
          <td>Grand Total:</td>
          <td style="text-align: right;">₹${Number(order.grandTotal || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="color: #15803d;">Advance Collected:</td>
          <td style="text-align: right; font-weight: 600; color: #15803d;">₹${Number(order.advanceAmount || order.amountPaid || 0).toFixed(2)}</td>
        </tr>
        ${
          finalPaymentAmount > 0
            ? `<tr>
                <td style="color: #15803d;">Paid at Handover:</td>
                <td style="text-align: right; font-weight: 600; color: #15803d;">₹${Number(finalPaymentAmount).toFixed(2)}</td>
              </tr>`
            : ""
        }
        <tr style="border-top: 1px dashed #cbd5e1;">
          <td style="padding-top: 6px; font-weight: 700; color: #0f766e;">Total Paid:</td>
          <td style="padding-top: 6px; text-align: right; font-weight: 700; color: #0f766e;">₹${Number(order.amountPaid || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="color: ${isFullyPaid ? "#15803d" : "#b45309"}; font-weight: 700;">Balance Due:</td>
          <td style="text-align: right; font-weight: 700; color: ${isFullyPaid ? "#15803d" : "#b45309"};">
            ${isFullyPaid ? "₹0.00 (PAID IN FULL)" : `₹${Number(order.balanceDue || 0).toFixed(2)}`}
          </td>
        </tr>
      </table>
    </div>
  </div>

  ${
    payments.length > 0
      ? `<div style="background: #f8fafc; padding: 14px 18px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 14px;">
      <div style="font-size: 11px; font-weight: 700; margin-bottom: 8px; color: #64748b; text-transform: uppercase;">Payment Receipts</div>
      ${paymentRows}
    </div>`
      : ""
  }

  <div class="footer">
    Thank you for choosing Printz! · This is a computer generated invoice.
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`);
    w.document.close();
  };

  return (
    <div className="so-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        className="so-modal wide"
        style={{
          maxWidth: "880px",
          width: "95%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Invoice"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="so-modal-head" style={{ padding: "16px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={22} style={{ color: "#0f766e" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>
                  Invoice · {invoiceNo}
                </h3>
                {isFullyPaid && (
                  <span
                    style={{
                      background: "#dcfce7",
                      color: "#15803d",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      border: "1px solid #bbf7d0",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <CheckCircle2 size={12} /> PAID IN FULL
                  </span>
                )}
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                Sale Order {order.orderNo || "Draft"} · {formatDate(invoiceDate)}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div
              role="group"
              aria-label="Invoice format"
              style={{ display: "flex", background: "#f1f5f9", padding: "3px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
            >
              <button type="button" onClick={() => setTemplate("a4")} style={templateBtnStyle(template === "a4")} aria-pressed={template === "a4"}>
                A4 Invoice
              </button>
              <button type="button" onClick={() => setTemplate("thermal")} style={templateBtnStyle(template === "thermal")} aria-pressed={template === "thermal"}>
                80mm Slip
              </button>
            </div>
            <button
              type="button"
              className="so-btn primary"
              style={{ padding: "7px 16px", fontSize: "13px", gap: "6px" }}
              onClick={handlePrint}
            >
              <Printer size={15} /> {template === "thermal" ? "Print Slip" : "Print A4"}
            </button>
            <button
              type="button"
              className="so-modal-close"
              onClick={onClose}
              aria-label="Close"
              title="Close popup"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="so-modal-body" style={{ padding: "24px", overflowY: "auto", flex: 1, gap: 0 }}>
          {loading ? (
            <div className="so-loading" style={{ padding: "40px" }}>Loading invoice details...</div>
          ) : template === "thermal" ? (
            <div style={{ display: "flex", justifyContent: "center", background: "#f1f5f9", borderRadius: "10px", padding: "20px 12px" }}>
              <style>{THERMAL_CSS}</style>
              <div
                style={{
                  background: "#ffffff",
                  width: "80mm",
                  maxWidth: "100%",
                  padding: "12px 0",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
                  borderRadius: "4px",
                }}
                dangerouslySetInnerHTML={{ __html: buildThermalSlipHtml({ ...slipData, logoUrl: logo }) }}
              />
            </div>
          ) : (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "28px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
              }}
            >
              {/* Document Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderBottom: "2px solid #0f766e",
                  paddingBottom: "18px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <img src={logo} alt="PrintZ" style={{ height: "56px", width: "auto", display: "block", marginBottom: "6px" }} />
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "24px",
                      fontWeight: 800,
                      color: "#0f766e",
                      letterSpacing: "-0.5px",
                    }}
                  >
                     PRINTZ
                  </h2>
                  <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#475569", fontWeight: 500 }}>
                    <strong>{branch.name || "Branch"}</strong> · Printing & Digital Graphics
                  </p>
                  {branch.address && (
                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                      {branch.address}
                    </p>
                  )}
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", marginBottom: "6px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        background: "#ccfbf1",
                        color: "#0f766e",
                        fontWeight: 700,
                        fontSize: "11.5px",
                        borderRadius: "6px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      TAX INVOICE
                    </span>
                    {isFullyPaid && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 10px",
                          background: "#dcfce7",
                          color: "#15803d",
                          fontWeight: 700,
                          fontSize: "11.5px",
                          borderRadius: "6px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        <CheckCircle2 size={13} /> PAID IN FULL
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "13.5px", color: "#1e293b" }}>
                    <strong>Invoice #:</strong> {invoiceNo}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
                    <strong>Date:</strong> {formatDate(invoiceDate)}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
                    <strong>Order #:</strong> {order.orderNo || "Draft"}
                  </div>
                </div>
              </div>

              {/* Customer & Order Cards Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "22px",
                }}
              >
                {/* Billed To Box */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "14px 16px",
                    fontSize: "13px",
                    lineHeight: "1.5",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "#64748b",
                      marginBottom: "6px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Billed To (Customer)
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "15px", color: "#0f172a", marginBottom: "4px" }}>
                    {c.name || "Walk-in Customer"}
                  </div>
                  <div style={{ color: "#334155" }}>
                    <strong>Mobile:</strong> {c.mobile || "—"}
                  </div>
                  {c.whatsappNumber && (
                    <div style={{ color: "#334155" }}>
                      <strong>WhatsApp:</strong> {c.whatsappNumber}
                    </div>
                  )}
                  {c.email && (
                    <div style={{ color: "#334155" }}>
                      <strong>Email:</strong> {c.email}
                    </div>
                  )}
                  {c.address && (
                    <div style={{ color: "#475569", marginTop: "3px" }}>
                      <strong>Address:</strong> {c.address}
                    </div>
                  )}
                </div>

                {/* Order Details Box */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "14px 16px",
                    fontSize: "13px",
                    lineHeight: "1.5",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "#64748b",
                      marginBottom: "6px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Order Details
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                    <span style={{ color: "#64748b" }}>Order Date:</span>
                    <strong>{formatDate(order.orderDate)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                    <span style={{ color: "#64748b" }}>Deliver By:</span>
                    <strong>{formatDate(order.expectedDeliveryDate)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                    <span style={{ color: "#64748b" }}>Priority:</span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: order.priority === "URGENT" ? "#fee2e2" : "#f1f5f9",
                        color: order.priority === "URGENT" ? "#b91c1c" : "#475569",
                        border: order.priority === "URGENT" ? "1px solid #fecaca" : "1px solid #e2e8f0",
                      }}
                    >
                      {order.priority || "NORMAL"}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                    <span style={{ color: "#64748b" }}>Payment Status:</span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "12px",
                        color:
                          order.paymentStatus === "PAID"
                            ? "#16a34a"
                            : order.paymentStatus === "ADVANCE_PAID"
                            ? "#0284c7"
                            : "#d97706",
                      }}
                    >
                      {order.paymentStatus || "UNPAID"}
                    </span>
                  </div>

                  {order.delivery?.deliveredAt && (
                    <div
                      style={{
                        marginTop: "8px",
                        paddingTop: "6px",
                        borderTop: "1px dashed #cbd5e1",
                        fontSize: "12px",
                        color: "#15803d",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 700 }}>
                        <PackageCheck size={14} /> Delivered & Handed Over
                      </div>
                      <div style={{ color: "#334155", marginTop: "2px" }}>
                        To: <strong>{order.delivery.receivedByName || "Customer"}</strong>
                      </div>
                      <div style={{ color: "#64748b", fontSize: "11px" }}>
                        On {formatDateTime(order.delivery.deliveredAt)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", marginBottom: "22px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #cbd5e1" }}>
                      <th style={{ width: "40px", padding: "10px 12px", textAlign: "center", color: "#475569", fontWeight: 700 }}>
                        #
                      </th>
                      <th style={{ padding: "10px 12px", textAlign: "left", color: "#475569", fontWeight: 700 }}>
                        Item Description
                      </th>
                      <th style={{ width: "80px", padding: "10px 12px", textAlign: "center", color: "#475569", fontWeight: 700 }}>
                        Qty
                      </th>
                      <th style={{ width: "95px", padding: "10px 12px", textAlign: "right", color: "#475569", fontWeight: 700 }}>
                        Rate (₹)
                      </th>
                      <th style={{ width: "75px", padding: "10px 12px", textAlign: "center", color: "#475569", fontWeight: 700 }}>
                        Tax %
                      </th>
                      <th style={{ width: "95px", padding: "10px 12px", textAlign: "right", color: "#475569", fontWeight: 700 }}>
                        Tax (₹)
                      </th>
                      <th style={{ width: "110px", padding: "10px 14px", textAlign: "right", color: "#475569", fontWeight: 700 }}>
                        Total (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: idx === items.length - 1 ? "none" : "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: "#64748b" }}>{idx + 1}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>
                            {it.description || typeLabel(it.productType)}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                            {typeLabel(it.productType)}
                          </div>
                          {specSummary(it.specification) && (
                            <div style={{ fontSize: "11px", color: "#64748b" }}>{specSummary(it.specification)}</div>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: "#334155" }}>
                          {it.quantity} {it.unit || "PCS"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "#334155" }}>
                          {formatMoney(it.unitPrice)}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: "#64748b" }}>
                          {it.taxRate}%
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "#334155" }}>
                          {formatMoney(it.taxAmount)}
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                          {formatMoney(it.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary Card Aligned to the Right */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
                <div
                  style={{
                    width: "350px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "14px 18px",
                    fontSize: "13px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#475569" }}>
                    <span>Sub total</span>
                    <strong style={{ color: "#0f172a" }}>{formatMoney(order.subtotal)}</strong>
                  </div>

                  {Number(order.discountAmount) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#166534" }}>
                      <span>Discount</span>
                      <strong>− {formatMoney(order.discountAmount)}</strong>
                    </div>
                  )}

                  {Number(order.urgentChargeAmount) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#b45309" }}>
                      <span>
                        Urgent Extra Charge
                        {order.urgentChargeType === "PERCENTAGE" && order.urgentChargeValue ? ` (${order.urgentChargeValue}%)` : ""}
                      </span>
                      <strong>+ {formatMoney(order.urgentChargeAmount)}</strong>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#475569" }}>
                    <span>Tax (GST)</span>
                    <strong style={{ color: "#0f172a" }}>{formatMoney(order.taxAmount)}</strong>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderTop: "2px solid #cbd5e1",
                      borderBottom: "2px solid #cbd5e1",
                      padding: "8px 0",
                      margin: "8px 0",
                      fontSize: "15px",
                      fontWeight: 700,
                    }}
                  >
                    <span>Grand Total</span>
                    <span style={{ color: "#0f766e" }}>{formatMoney(order.grandTotal)}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#15803d" }}>
                    <span>Advance Collected</span>
                    <strong>{formatMoney(order.advanceAmount || order.amountPaid)}</strong>
                  </div>

                  {finalPaymentAmount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#15803d" }}>
                      <span>Paid at Handover</span>
                      <strong>{formatMoney(finalPaymentAmount)}</strong>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderTop: "1px dashed #cbd5e1",
                      padding: "5px 0",
                      marginTop: "4px",
                      color: "#0f766e",
                      fontWeight: 700,
                    }}
                  >
                    <span>Total Amount Paid</span>
                    <strong style={{ color: "#15803d" }}>{formatMoney(order.amountPaid)}</strong>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "6px 0 2px 0",
                      color: isFullyPaid ? "#15803d" : "#b45309",
                      fontWeight: 700,
                      fontSize: "13.5px",
                    }}
                  >
                    <span>Balance Due</span>
                    <span>
                      {isFullyPaid ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle2 size={14} /> ₹0.00 (PAID)
                        </span>
                      ) : (
                        formatMoney(order.balanceDue)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Receipts Section */}
              {payments.length > 0 && (
                <div
                  style={{
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "14px",
                    marginTop: "10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#64748b",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Payment Receipts
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {payments.map((p) => (
                      <div
                        key={p._id || p.receiptNo}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "12.5px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          padding: "8px 12px",
                          borderRadius: "6px",
                        }}
                      >
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <CheckCircle2 size={15} style={{ color: "#15803d" }} />
                          <div>
                            <strong>
                              {p.paymentType === "FINAL" ? "Final Payment (Handover)" : "Advance Payment"}
                            </strong>{" "}
                            · {p.receiptNo || "Receipt"} · {p.mode}
                            {p.reference ? ` (Ref: ${p.reference})` : ""}
                            <span style={{ color: "#64748b", marginLeft: "10px", fontSize: "11.5px" }}>
                              {formatDateTime(p.collectedAt || new Date())}
                            </span>
                          </div>
                        </div>
                        <strong style={{ color: "#15803d", fontSize: "13px" }}>{formatMoney(p.amount)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Document Footer */}
              <div
                style={{
                  textAlign: "center",
                  fontSize: "11px",
                  color: "#94a3b8",
                  borderTop: "1px solid #f1f5f9",
                  paddingTop: "12px",
                  marginTop: "20px",
                }}
              >
                Thank you for your business! · Printz · Computer-generated Tax Invoice
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div className="so-modal-foot" style={{ padding: "14px 24px" }}>
          <button type="button" className="so-btn secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="so-btn primary" onClick={handlePrint} style={{ gap: "6px" }}>
            <Printer size={15} /> {template === "thermal" ? "Print 80mm Slip" : "Print A4 Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}
