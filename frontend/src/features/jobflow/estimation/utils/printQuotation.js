/**
 * Print Quotation Utility for PrintZ
 * Generates an official, printable quotation document in a clean popup window.
 */
export const printQuotation = (estimate) => {
  if (!estimate) return;

  const rawJob = estimate.raw || estimate;
  const specs = rawJob.specs || rawJob.specifications || estimate.specs || rawJob.items?.[0]?.specifications || {};
  const jobNo = estimate.jobNo || rawJob.jobNo || rawJob.orderNumber || "N/A";
  const customerName =
    estimate.customerName ||
    rawJob.customerName ||
    rawJob.customerSnapshot?.name ||
    rawJob.customerId?.name ||
    "Customer";
  const phone =
    estimate.phone ||
    rawJob.customerPhone ||
    rawJob.customerSnapshot?.mobile ||
    rawJob.customerId?.mobile ||
    "-";
  const branch =
    estimate.branchName ||
    rawJob.branchName ||
    rawJob.branchId?.name ||
    "Main Branch";
  const jobType = estimate.jobType || rawJob.jobType || "Print";
  const defaultQty = Number(estimate.quantity || rawJob.quantity || specs.quantity || 500);

  // Finishing services list
  const finishingServicesList = (() => {
    if (Array.isArray(estimate.finishingServices) && estimate.finishingServices.length > 0) {
      return estimate.finishingServices;
    }
    if (Array.isArray(rawJob.finishingServices) && rawJob.finishingServices.length > 0) {
      return rawJob.finishingServices;
    }
    const itemFinishing = rawJob.items?.[0]?.finishing || estimate.items?.[0]?.finishing;
    if (Array.isArray(itemFinishing) && itemFinishing.length > 0) {
      return itemFinishing.map((f, i) => ({
        id: f.id || i + 1,
        name: f.name || f.option || f.code || "Finishing",
        config: f.notes || f.config || f.option || "Standard",
        unitPrice: Number(f.unitPrice || 0),
        quantity: Number(f.quantity || defaultQty),
        total: Number(f.total || (Number(f.quantity || defaultQty) * Number(f.unitPrice || 0))),
        unit: f.unit || "sheets",
      }));
    }
    return [];
  })();

  const finishingTotal = finishingServicesList.reduce(
    (sum, s) => sum + (Number(s.total) || (Number(s.quantity || 0) * Number(s.unitPrice || 0))),
    0
  );

  const rawItems = (Array.isArray(estimate.items) && estimate.items.length > 0)
    ? estimate.items
    : (Array.isArray(rawJob.items) && rawJob.items.length > 0)
    ? rawJob.items
    : [];

  const defaultAmount = Number(
    estimate.subtotal ||
    rawJob.subtotal ||
    estimate.totalAmount ||
    rawJob.totalAmount ||
    rawJob.estimatedCost ||
    0
  );

  const productUnitRate = Number(
    specs.unitPrice ||
    estimate.items?.[0]?.rate ||
    estimate.items?.[0]?.unitRate ||
    rawJob.items?.[0]?.unitRate ||
    rawJob.items?.[0]?.unitPrice ||
    (specs.productCost && defaultQty > 0 ? Number(specs.productCost) / defaultQty : 0) ||
    (defaultAmount > finishingTotal && defaultQty > 0 ? (defaultAmount - finishingTotal) / defaultQty : 0) ||
    (defaultQty > 0 ? Math.round((defaultAmount / defaultQty) * 100) / 100 : 0)
  );

  const productBaseCost = Number(
    specs.productCost ||
    (productUnitRate > 0 ? Math.round(defaultQty * productUnitRate * 100) / 100 : 0) ||
    (defaultAmount > finishingTotal ? defaultAmount - finishingTotal : defaultAmount)
  );

  const baseItems = rawItems.length > 0
    ? rawItems.map((it) => {
        const isFinishing =
          it.itemName?.toLowerCase().includes("finishing") ||
          it.name?.toLowerCase().includes("finishing") ||
          it.itemType === "FINISHING";
        const q = Number(it.qty || it.quantity || defaultQty || 1);
        const r = isFinishing
          ? Number(it.rate || it.unitRate || it.unitPrice || 0)
          : Number(it.rate || it.unitRate || it.unitPrice || productUnitRate);
        const a = isFinishing
          ? Number(it.amount || it.totalPrice || (q * r))
          : (Number(it.amount) > 0 && Number(it.amount) !== Number(rawJob.grandTotal)
              ? Number(it.amount)
              : Math.round(q * r * 100) / 100 || productBaseCost);
        return {
          name: it.itemName || it.name || it.item || rawJob.title || rawJob.jobTitle || "Print Job Order",
          spec: it.description || it.spec || it.specification || specs.paperType || "Standard Print Specifications",
          qty: q,
          unit: it.unit || "PCS",
          rate: r,
          amount: a,
        };
      })
    : [
        {
          name: rawJob.title || rawJob.jobTitle || estimate.title || "Print Job Order",
          spec: `${specs.paperType || "Standard Paper"} ${specs.paperGsm || ""} (${specs.size || "Standard"})`.trim(),
          qty: defaultQty,
          unit: "PCS",
          rate: productUnitRate,
          amount: productBaseCost,
        },
      ];

  const hasFinishingInBase = baseItems.some(
    (it) => it.name?.toLowerCase().includes("finishing") || it.spec?.toLowerCase().includes("finishing")
  );

  const finishingItems = finishingServicesList.map((svc) => ({
    name: `Finishing: ${svc.name}`,
    spec: `${svc.config || "Standard"} (${svc.quantity || defaultQty} ${svc.unit || "sheets"})`,
    qty: Number(svc.quantity || defaultQty),
    unit: (svc.unit || "PCS").toUpperCase(),
    rate: Number(svc.unitPrice || 0),
    amount: Number(svc.total || (Number(svc.quantity || defaultQty) * Number(svc.unitPrice || 0))),
  }));

  const items = hasFinishingInBase ? baseItems : [...baseItems, ...finishingItems];
  const itemsSubtotal = items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const grandTotal = itemsSubtotal > 0
    ? itemsSubtotal
    : Math.max(
        Number(estimate.amount || 0),
        Number(estimate.total || 0),
        Number(rawJob.grandTotal || 0),
        productBaseCost + finishingTotal
      );

  const todayStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const validUntilStr = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const printWin = window.open("", "_blank", "width=850,height=950");
  if (!printWin) {
    window.print();
    return;
  }

  const itemsRowsHtml = items
    .map(
      (it, idx) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${it.name}</div>
          ${it.spec ? `<div style="font-size: 11.5px; color: #64748b; margin-top: 3px;">${it.spec}</div>` : ""}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">${it.qty} ${it.unit}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${Number(it.rate || 0).toFixed(2)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a;">₹${Number(it.amount || 0).toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  const finishingBadgesHtml = finishingServicesList.length > 0
    ? `
      <div style="margin-top: 10px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
        <span style="font-weight: 600; font-size: 11px; color: #475569;">Finishing Included:</span>
        ${finishingServicesList
          .map(
            (f) =>
              `<span style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${f.name}${f.config ? ` (${f.config})` : ""}</span>`
          )
          .join(" ")}
      </div>
    `
    : "";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Commercial Quotation - ${jobNo}</title>
      <style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 24px;
          background: #ffffff;
          font-size: 12.5px;
          line-height: 1.45;
        }
        .quote-card {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid #cbd5e1;
          padding: 28px;
          border-radius: 10px;
          background: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #059669;
          padding-bottom: 18px;
          margin-bottom: 20px;
        }
        .brand-title {
          font-size: 26px;
          font-weight: 900;
          color: #059669;
          letter-spacing: -0.02em;
          margin: 0 0 4px 0;
        }
        .brand-tagline {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }
        .quote-title {
          text-align: right;
        }
        .quote-title h1 {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
          letter-spacing: -0.01em;
        }
        .quote-badge {
          display: inline-block;
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          padding: 2px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px 18px;
          margin-bottom: 20px;
        }
        .meta-col div {
          margin-bottom: 5px;
          font-size: 12px;
        }
        .meta-col div:last-child {
          margin-bottom: 0;
        }
        .meta-label {
          color: #64748b;
          font-weight: 500;
          display: inline-block;
          width: 100px;
        }
        .specs-box {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 14px 16px;
          margin-bottom: 20px;
        }
        .specs-title {
          font-weight: 700;
          font-size: 12px;
          color: #0f172a;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .specs-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          font-size: 11.5px;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .table th {
          background: #f1f5f9;
          color: #475569;
          font-weight: 700;
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding: 9px 12px;
          border-top: 1px solid #e2e8f0;
          border-bottom: 2px solid #cbd5e1;
        }
        .totals-wrap {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 24px;
        }
        .totals-box {
          width: 320px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 14px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 6px;
          color: #475569;
        }
        .grand-total-row {
          display: flex;
          justify-content: space-between;
          font-size: 16px;
          font-weight: 800;
          color: #059669;
          border-top: 2px dashed #cbd5e1;
          padding-top: 8px;
          margin-top: 8px;
        }
        .terms-box {
          background: #fafafa;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px 14px;
          font-size: 11px;
          color: #64748b;
          margin-bottom: 28px;
        }
        .terms-box ul {
          margin: 4px 0 0 16px;
          padding: 0;
        }
        .terms-box li {
          margin-bottom: 3px;
        }
        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-top: 20px;
          padding-top: 10px;
        }
        .sig-box {
          border-top: 1px dashed #94a3b8;
          padding-top: 6px;
          text-align: center;
          font-size: 11.5px;
          color: #475569;
        }
        .no-print {
          margin-bottom: 16px;
          text-align: right;
        }
        .btn-print {
          background: #059669;
          color: white;
          border: none;
          padding: 8px 18px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
        }
        @media print {
          .no-print { display: none !important; }
          body { padding: 0; }
          .quote-card { border: none; padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="no-print">
        <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
      </div>

      <div class="quote-card">
        <!-- Header -->
        <div class="header">
          <div>
            <div class="brand-title">PrintZ</div>
            <div class="brand-tagline">Professional Printing & Design Partner</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
              Branch: <strong>${branch}</strong>
            </div>
          </div>
          <div class="quote-title">
            <h1>COMMERCIAL QUOTATION</h1>
            <div class="quote-badge">${jobNo}</div>
          </div>
        </div>

        <!-- Metadata Grid -->
        <div class="meta-grid">
          <div class="meta-col">
            <div><span class="meta-label">Customer:</span> <strong>${customerName}</strong></div>
            <div><span class="meta-label">Phone:</span> ${phone}</div>
            <div><span class="meta-label">Job Type:</span> ${jobType}</div>
          </div>
          <div class="meta-col">
            <div><span class="meta-label">Job Ref:</span> <strong>${jobNo}</strong></div>
            <div><span class="meta-label">Date Issued:</span> ${todayStr}</div>
            <div><span class="meta-label">Valid Until:</span> ${validUntilStr} (14 Days)</div>
          </div>
        </div>

        <!-- Job Specifications -->
        <div class="specs-box">
          <div class="specs-title">Job Order Specifications</div>
          <div class="specs-grid">
            <div><span style="color: #64748b;">Product:</span> <strong>${specs.productType || rawJob.productType || "Brochures"}</strong></div>
            <div><span style="color: #64748b;">Paper:</span> <strong>${specs.paperType || "Art Card"} ${specs.paperGsm || "260 gsm"}</strong></div>
            <div><span style="color: #64748b;">Size:</span> <strong>${specs.size || "A4"}</strong></div>
            <div><span style="color: #64748b;">Colors:</span> <strong>${specs.color || "Full Color"} (${specs.printingSide || "Double Sided"})</strong></div>
          </div>
          ${finishingBadgesHtml}
        </div>

        <!-- Items Table -->
        <table class="table">
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th style="text-align: left;">Item / Service Description</th>
              <th style="text-align: center; width: 110px;">Quantity</th>
              <th style="text-align: right; width: 110px;">Unit Rate</th>
              <th style="text-align: right; width: 120px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
          </tbody>
        </table>

        <!-- Totals Box -->
        <div class="totals-wrap">
          <div class="totals-box">
            <div class="total-row">
              <span>Base Product Cost:</span>
              <span>₹${productBaseCost.toFixed(2)}</span>
            </div>
            ${
              finishingTotal > 0
                ? `<div class="total-row">
                    <span>Finishing Services Total:</span>
                    <span>₹${finishingTotal.toFixed(2)}</span>
                  </div>`
                : ""
            }
            <div class="total-row" style="font-weight: 600; color: #0f172a;">
              <span>Subtotal:</span>
              <span>₹${itemsSubtotal.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Tax / GST:</span>
              <span>₹0.00 (Exempt)</span>
            </div>
            <div class="grand-total-row">
              <span>Grand Total:</span>
              <span>₹${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <!-- Terms & Conditions -->
        <div class="terms-box">
          <strong>Terms & Conditions:</strong>
          <ul>
            <li>This quotation is valid for 14 calendar days from the date of issue.</li>
            <li>Pricing is based on customer-approved specifications and artwork provided.</li>
            <li>Production commences upon quotation sign-off and receipt of advance payment.</li>
          </ul>
        </div>

        <!-- Signatures -->
        <div class="signatures">
          <div>
            <div style="height: 40px;"></div>
            <div class="sig-box">
              <strong>Authorized Signatory (PrintZ)</strong>
            </div>
          </div>
          <div>
            <div style="height: 40px;"></div>
            <div class="sig-box">
              <strong>Customer Acceptance & Signature</strong>
            </div>
          </div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWin.document.open();
  printWin.document.write(htmlContent);
  printWin.document.close();
};

export default printQuotation;

