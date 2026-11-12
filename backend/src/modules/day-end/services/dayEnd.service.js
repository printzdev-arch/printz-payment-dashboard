const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const SaleReceipt = require("../../pos/models/SaleReceipt");
const SaleReceiptItem = require("../../pos/models/SaleReceiptItem");
const SaleOrder = require("../../sale-orders/models/SaleOrder");
const SaleOrderPayment = require("../../sale-orders/models/SaleOrderPayment");
const Branch = require("../../branches/models/Branch");
const EmailService = require("../../../utils/integrations/EmailService");

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DEFAULT_ADMIN_EMAIL = "nithya.baskaran0005@gmail.com";

const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const round2 = (n) => require("../../../utils/validation/roundMoney").roundMoney(n || 0);

/** Start/end of the current day in India time, as UTC Date objects. */
function istDayRange(now = new Date()) {
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const startUtcMs = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()) - IST_OFFSET_MS;
  const dateLabel = new Date(startUtcMs + IST_OFFSET_MS).toISOString().slice(0, 10);
  return { start: new Date(startUtcMs), end: new Date(startUtcMs + 24 * 60 * 60 * 1000), dateLabel };
}

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "-";

/** Collect everything that happened today for one branch. */
async function collectDayData(branchId, range) {
  const branchObjId = mongoose.Types.ObjectId.isValid(branchId) ? new mongoose.Types.ObjectId(String(branchId)) : null;
  const receiptBranchMatch = { $in: [String(branchId), ...(branchObjId ? [branchObjId] : [])] };
  const dateMatch = { $gte: range.start, $lt: range.end };

  const [receipts, orders, orderPayments] = await Promise.all([
    SaleReceipt.find({ branchId: receiptBranchMatch, saleDate: dateMatch, status: { $in: ["COMPLETED", "VOID"] } })
      .sort({ saleDate: 1 })
      .lean(),
    SaleOrder.find({ orderBranchId: branchObjId, orderDate: dateMatch }).sort({ orderDate: 1 }).lean(),
    SaleOrderPayment.find({ branchId: branchObjId, collectedAt: dateMatch, status: "SUCCESS" })
      .sort({ collectedAt: 1 })
      .lean(),
  ]);

  const items = receipts.length
    ? await SaleReceiptItem.find({ receiptId: { $in: receipts.map((r) => r._id) } }).lean()
    : [];
  const itemsByReceipt = new Map();
  items.forEach((it) => {
    const k = String(it.receiptId);
    if (!itemsByReceipt.has(k)) itemsByReceipt.set(k, []);
    itemsByReceipt.get(k).push(it);
  });

  // Receipts
  const completed = receipts.filter((r) => r.status === "COMPLETED");
  const voided = receipts.filter((r) => r.status === "VOID");
  const receiptByMode = {};
  completed.forEach((r) => {
    if (r.paymentMode === "SPLIT" && Array.isArray(r.splitPayments)) {
      r.splitPayments.forEach((p) => {
        receiptByMode[p.mode] = round2((receiptByMode[p.mode] || 0) + Number(p.amount || 0));
      });
    } else {
      const mode = r.paymentMode || "UNSPECIFIED";
      const paid = Number(r.amountPaid || 0) || (mode === "CREDIT" ? 0 : Number(r.grandTotal || 0));
      receiptByMode[mode] = round2((receiptByMode[mode] || 0) + (mode === "CREDIT" ? Number(r.balanceDue || r.grandTotal || 0) : paid));
    }
  });

  // Orders
  const liveOrders = orders.filter((o) => o.status !== "CANCELLED" && o.status !== "DRAFT");
  const paymentByMode = {};
  let paymentsIn = 0;
  let refunds = 0;
  orderPayments.forEach((p) => {
    if (p.paymentType === "REFUND") {
      refunds += Number(p.amount || 0);
    } else {
      paymentsIn += Number(p.amount || 0);
      paymentByMode[p.mode] = round2((paymentByMode[p.mode] || 0) + Number(p.amount || 0));
    }
  });

  const summary = {
    receiptCount: completed.length,
    receiptTotal: round2(completed.reduce((a, r) => a + Number(r.grandTotal || 0), 0)),
    receiptTax: round2(completed.reduce((a, r) => a + Number(r.taxAmount || 0), 0)),
    receiptDiscount: round2(completed.reduce((a, r) => a + Number(r.discountAmount || 0), 0)),
    receiptDue: round2(completed.reduce((a, r) => a + Number(r.balanceDue || 0), 0)),
    voidCount: voided.length,
    voidTotal: round2(voided.reduce((a, r) => a + Number(r.grandTotal || 0), 0)),
    receiptByMode,
    orderCount: orders.length,
    orderValue: round2(liveOrders.reduce((a, o) => a + Number(o.grandTotal || 0), 0)),
    orderBalance: round2(liveOrders.reduce((a, o) => a + Number(o.balanceDue || 0), 0)),
    orderPaymentsIn: round2(paymentsIn),
    orderRefunds: round2(refunds),
    orderPaymentByMode: paymentByMode,
  };
  summary.totalCollected = round2(
    Object.entries(receiptByMode).filter(([m]) => m !== "CREDIT").reduce((a, [, v]) => a + v, 0) + summary.orderPaymentsIn - summary.orderRefunds
  );

  return { receipts, itemsByReceipt, orders, orderPayments, summary };
}

/** Build the PDF and resolve with a Buffer. */
function buildPdf({ branch, manager, range, data }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const GREEN = "#059669";
    const GREY = "#475569";
    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bottom = () => doc.page.height - doc.page.margins.bottom - 20;

    const ensure = (h) => {
      if (doc.y + h > bottom()) doc.addPage();
    };

    const section = (title) => {
      ensure(60);
      doc.moveDown(0.8);
      doc.font("Helvetica-Bold").fontSize(12).fillColor(GREEN).text(title, left, doc.y);
      doc.moveTo(left, doc.y + 2).lineTo(left + width, doc.y + 2).strokeColor(GREEN).lineWidth(1).stroke();
      doc.moveDown(0.5);
      doc.fillColor("#000");
    };

    // columns: [{label, w (fraction), align}]
    const table = (cols, rows) => {
      const widths = cols.map((c) => c.w * width);
      const drawRow = (cells, header) => {
        doc.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(8);
        const heights = cells.map((c, i) => doc.heightOfString(String(c ?? ""), { width: widths[i] - 6 }));
        const h = Math.max(...heights, 10) + 6;
        ensure(h);
        const y = doc.y;
        if (header) doc.rect(left, y, width, h).fill("#ecfdf5");
        doc.fillColor(header ? GREEN : "#000");
        let x = left;
        cells.forEach((c, i) => {
          doc.text(String(c ?? ""), x + 3, y + 3, { width: widths[i] - 6, align: cols[i].align || "left" });
          x += widths[i];
        });
        doc.y = y + h;
        doc.moveTo(left, doc.y).lineTo(left + width, doc.y).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
        doc.fillColor("#000");
      };
      drawRow(cols.map((c) => c.label), true);
      if (!rows.length) {
        doc.font("Helvetica-Oblique").fontSize(8).fillColor(GREY).text("No records for today.", left + 3, doc.y + 4);
        doc.moveDown(0.8);
        doc.fillColor("#000");
        return;
      }
      rows.forEach((r) => drawRow(r, false));
    };

    // Header
    doc.font("Helvetica-Bold").fontSize(18).fillColor(GREEN).text("Printz - Day End Report", left, 40);
    doc.font("Helvetica").fontSize(10).fillColor(GREY);
    doc.text(`Branch: ${branch?.name || "-"}${branch?.code ? ` (${branch.code})` : ""}`);
    doc.text(`Business date: ${range.dateLabel}`);
    doc.text(`Closed by: ${manager?.name || manager?.email || "Branch Manager"}`);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`);
    doc.fillColor("#000");

    const s = data.summary;

    // Summary
    section("Day Summary");
    table(
      [
        { label: "Metric", w: 0.6 },
        { label: "Value", w: 0.4, align: "right" },
      ],
      [
        ["Counter sale receipts (completed)", s.receiptCount],
        ["Counter sales total", money(s.receiptTotal)],
        ["  of which GST", money(s.receiptTax)],
        ["  discounts given", money(s.receiptDiscount)],
        ["  credit / balance due on receipts", money(s.receiptDue)],
        ["Voided receipts", `${s.voidCount} (${money(s.voidTotal)})`],
        ["Sale orders created today", s.orderCount],
        ["Sale orders value (excl. cancelled)", money(s.orderValue)],
        ["Sale orders balance outstanding", money(s.orderBalance)],
        ["Sale order payments received", money(s.orderPaymentsIn)],
        ["Sale order refunds", money(s.orderRefunds)],
        ["TOTAL CASH-IN COLLECTED TODAY", money(s.totalCollected)],
      ]
    );

    const modes = new Set([...Object.keys(s.receiptByMode), ...Object.keys(s.orderPaymentByMode)]);
    section("Collections by Payment Mode");
    table(
      [
        { label: "Mode", w: 0.4 },
        { label: "Counter receipts", w: 0.3, align: "right" },
        { label: "Sale order payments", w: 0.3, align: "right" },
      ],
      [...modes].map((m) => [m, money(s.receiptByMode[m] || 0), money(s.orderPaymentByMode[m] || 0)])
    );

    // Receipts
    section(`Counter Sale Receipts (${data.receipts.length})`);
    table(
      [
        { label: "Receipt No", w: 0.17 },
        { label: "Time", w: 0.08 },
        { label: "Customer", w: 0.25 },
        { label: "Mode", w: 0.1 },
        { label: "Status", w: 0.12 },
        { label: "Total", w: 0.14, align: "right" },
        { label: "Due", w: 0.14, align: "right" },
      ],
      data.receipts.map((r) => [
        r.receiptNo,
        fmtTime(r.saleDate),
        r.customerSnapshot?.name || "Walk-in",
        r.paymentMode || "-",
        r.status,
        money(r.grandTotal),
        money(r.balanceDue),
      ])
    );

    // Receipt line items
    if (data.receipts.length) {
      section("Receipt Line Items");
      const rows = [];
      data.receipts.forEach((r) => {
        (data.itemsByReceipt.get(String(r._id)) || []).forEach((it) => {
          rows.push([r.receiptNo, it.productName, it.quantity, money(it.unitPrice), money(it.lineTotal)]);
        });
      });
      table(
        [
          { label: "Receipt No", w: 0.18 },
          { label: "Item", w: 0.4 },
          { label: "Qty", w: 0.08, align: "right" },
          { label: "Rate", w: 0.16, align: "right" },
          { label: "Amount", w: 0.18, align: "right" },
        ],
        rows
      );
    }

    // Orders
    section(`Sale Orders Created Today (${data.orders.length})`);
    table(
      [
        { label: "Order No", w: 0.15 },
        { label: "Customer", w: 0.2 },
        { label: "Status", w: 0.14 },
        { label: "Priority", w: 0.1 },
        { label: "Total", w: 0.14, align: "right" },
        { label: "Paid", w: 0.14, align: "right" },
        { label: "Balance", w: 0.13, align: "right" },
      ],
      data.orders.map((o) => [
        o.orderNo,
        o.customerSnapshot?.name || "-",
        o.status,
        o.priority,
        money(o.grandTotal),
        money(o.amountPaid),
        money(o.balanceDue),
      ])
    );

    // Order payments
    section(`Sale Order Payments Received Today (${data.orderPayments.length})`);
    table(
      [
        { label: "Receipt No", w: 0.22 },
        { label: "Time", w: 0.1 },
        { label: "Type", w: 0.18 },
        { label: "Mode", w: 0.2 },
        { label: "Amount", w: 0.3, align: "right" },
      ],
      data.orderPayments.map((p) => [p.receiptNo, fmtTime(p.collectedAt), p.paymentType, p.mode, money(p.amount)])
    );

    // Footer page numbers
    const range2 = doc.bufferedPageRange();
    for (let i = 0; i < range2.count; i++) {
      doc.switchToPage(range2.start + i);
      doc.page.margins.bottom = 0; // writing in the margin would otherwise add a blank page
      doc.font("Helvetica").fontSize(8).fillColor(GREY);
      doc.text(`Page ${i + 1} of ${range2.count}`, left, doc.page.height - 30, { width, align: "center", lineBreak: false });
    }

    doc.end();
  });
}

/** Build today's branch report and email it to the admin. */
async function closeDayAndEmail(user) {
  const branchId = user?.branchId?._id || user?.branchId || (Array.isArray(user?.branchIds) ? user.branchIds[0] : null);
  if (!branchId || !mongoose.Types.ObjectId.isValid(String(branchId))) {
    const err = new Error("Your login is not linked to a branch, so a day-end report cannot be built.");
    err.statusCode = 400;
    throw err;
  }

  const range = istDayRange();
  const [branch, data] = await Promise.all([
    Branch.findById(branchId).select("name code").lean(),
    collectDayData(branchId, range),
  ]);

  const manager = { name: user.name || user.fullName || user.username, email: user.email };
  const pdf = await buildPdf({ branch, manager, range, data });

  const to = process.env.ADMIN_REPORT_EMAIL || DEFAULT_ADMIN_EMAIL;
  const branchName = branch?.name || "Branch";
  const filename = `DayEnd_${String(branchName).replace(/[^A-Za-z0-9]+/g, "_")}_${range.dateLabel}.pdf`;
  const s = data.summary;

  const mail = await EmailService.sendDayEndReport({
    to,
    subject: `Day End Report - ${branchName} - ${range.dateLabel}`,
    text:
      `Day end report for ${branchName} (${range.dateLabel}), closed by ${manager.name || "the branch manager"}.\n\n` +
      `Counter receipts: ${s.receiptCount} (${money(s.receiptTotal)})\n` +
      `Sale orders created: ${s.orderCount} (${money(s.orderValue)})\n` +
      `Total collected: ${money(s.totalCollected)}\n\nFull details are in the attached PDF.`,
    filename,
    pdf,
  });

  return {
    sentTo: to,
    delivered: mail.delivered,
    previewUrl: mail.previewUrl || null,
    filename,
    businessDate: range.dateLabel,
    summary: s,
  };
}

module.exports = { closeDayAndEmail, collectDayData, istDayRange, buildPdf };
