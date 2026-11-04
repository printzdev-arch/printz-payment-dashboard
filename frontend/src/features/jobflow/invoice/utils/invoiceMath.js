/**
 * Invoice maths (amounts are in rupees).
 *
 * This mirrors backend/src/modules/invoices/services/invoiceCalculation.service.js step for step
 * (same rounding, same discount split, same GST per line), so the figures shown while editing are the
 * figures the server saves. Change one, change the other.
 */

export const round2 = (val) => Math.round((Number(val) + Number.EPSILON) * 100) / 100;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Split the invoice discount across lines by value; the last line takes the rounding remainder
const allocateDiscount = (amounts, discount) => {
  const total = amounts.reduce((sum, v) => sum + v, 0);
  if (!(discount > 0) || !(total > 0)) return amounts.map(() => 0);
  let remaining = discount;
  return amounts.map((amount, idx) => {
    const isLast = idx === amounts.length - 1;
    const share = isLast ? remaining : Math.min(remaining, round2((discount * amount) / total));
    remaining = round2(remaining - share);
    return Math.max(0, share);
  });
};

/**
 * @param {object} args
 * @param {Array}  args.items               [{ quantity, unitPrice, taxRate, discountType?, discountValue? }]
 * @param {Array}  args.additionalCharges   [{ amount, taxRate }]  (delivery and similar charges)
 * @param {string} args.discountType        "PERCENTAGE" | "FIXED"
 * @param {number} args.discountValue       percent (0-100) or rupees
 * @param {number} args.advanceReceived     amount received so far (advance, or the whole payment)
 * @param {number} args.paidAmount          balance payments collected after the invoice
 * @param {number} args.estimateAmount      approved estimate, for the information-only variance
 * @param {boolean} args.interState         true when IGST applies instead of CGST + SGST
 */
export const calculateInvoiceTotals = ({
  items = [],
  additionalCharges = [],
  discountType = "FIXED",
  discountValue = 0,
  advanceReceived = 0,
  paidAmount = 0,
  estimateAmount = 0,
  interState = false,
  gstRate = null,
} = {}) => {
  // One GST rate applies to every item and charge. (Without it, each line's own rate is used.)
  const commonRate = gstRate === null || gstRate === undefined || gstRate === "" ? null : Math.max(0, num(gstRate));
  const lines = (items || []).map((it) => {
    const qty = Math.max(0, num(it.quantity));
    const unitPrice = Math.max(0, num(it.unitPrice));
    const baseAmount = round2(qty * unitPrice);
    let lineDiscount = 0;
    if (it.discountType === "PERCENTAGE") {
      const pct = Math.min(100, Math.max(0, num(it.discountValue)));
      lineDiscount = round2(baseAmount * (pct / 100));
    } else {
      lineDiscount = Math.min(baseAmount, Math.max(0, num(it.discountValue || it.discountAmount)));
    }
    return { qty, unitPrice, baseAmount, lineDiscount, taxRate: commonRate !== null ? commonRate : Math.max(0, num(it.taxRate)) };
  });

  const charges = (additionalCharges || []).map((ch) => ({
    amount: round2(Math.max(0, num(ch.amount))),
    taxRate: commonRate !== null ? commonRate : Math.max(0, num(ch.taxRate)),
  }));

  const itemBases = lines.map((l) => round2(l.baseAmount - l.lineDiscount));
  const chargeBases = charges.map((c) => c.amount);
  const discountBase = round2([...itemBases, ...chargeBases].reduce((sum, v) => sum + v, 0));

  let invoiceDiscount = 0;
  const dValue = Math.max(0, num(discountValue));
  if (dValue > 0) {
    invoiceDiscount =
      String(discountType || "").toUpperCase() === "PERCENTAGE"
        ? round2(discountBase * (Math.min(100, dValue) / 100))
        : Math.min(discountBase, round2(dValue));
  }
  const shares = allocateDiscount([...itemBases, ...chargeBases], invoiceDiscount);

  const taxOf = (taxable, rate) => {
    if (interState) return { cgst: 0, sgst: 0, igst: round2(taxable * (rate / 100)) };
    const half = rate / 2;
    return { cgst: round2(taxable * (half / 100)), sgst: round2(taxable * (half / 100)), igst: 0 };
  };

  let subtotal = 0;
  let discountTotal = 0;
  let taxableAmount = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let additionalChargesTotal = 0;

  lines.forEach((l, idx) => {
    const taxable = round2(Math.max(0, itemBases[idx] - shares[idx]));
    const t = taxOf(taxable, l.taxRate);
    subtotal += l.baseAmount;
    discountTotal += l.lineDiscount + shares[idx];
    taxableAmount += taxable;
    cgstTotal += t.cgst;
    sgstTotal += t.sgst;
    igstTotal += t.igst;
  });
  charges.forEach((c, idx) => {
    const share = shares[lines.length + idx];
    const taxable = round2(Math.max(0, c.amount - share));
    const t = taxOf(taxable, c.taxRate);
    additionalChargesTotal += c.amount;
    discountTotal += share;
    taxableAmount += taxable;
    cgstTotal += t.cgst;
    sgstTotal += t.sgst;
    igstTotal += t.igst;
  });

  subtotal = round2(subtotal);
  discountTotal = round2(discountTotal);
  additionalChargesTotal = round2(additionalChargesTotal);
  taxableAmount = round2(taxableAmount);
  cgstTotal = round2(cgstTotal);
  sgstTotal = round2(sgstTotal);
  igstTotal = round2(igstTotal);
  const taxTotal = round2(cgstTotal + sgstTotal + igstTotal);
  const grandTotal = round2(taxableAmount + taxTotal);

  const advanceApplied = round2(Math.min(grandTotal, Math.max(0, num(advanceReceived))));
  const confirmedPaid = round2(Math.max(0, num(paidAmount)));
  const balanceDue = round2(Math.max(0, grandTotal - advanceApplied - confirmedPaid));

  const estimate = round2(num(estimateAmount));
  const varianceAmount = round2(subtotal - estimate);
  const variancePercentage = estimate > 0 ? round2((varianceAmount / estimate) * 100) : varianceAmount > 0 ? 100 : 0;

  return {
    subtotal,
    discountTotal,
    additionalChargesTotal,
    taxableAmount,
    cgstTotal,
    sgstTotal,
    igstTotal,
    taxTotal,
    grandTotal,
    advanceApplied,
    paidAmount: confirmedPaid,
    balanceDue,
    varianceAmount,
    variancePercentage,
    approvalRequired: false,
  };
};

/**
 * The discount the user typed, as the pair the server expects.
 * Whichever box was used last decides: a percentage, or a fixed rupee amount.
 */
export const discountToPayload = (mode, percentValue, amountValue) => {
  if (mode === "PERCENTAGE") {
    return { discountType: "PERCENTAGE", discountValue: Math.min(100, Math.max(0, num(percentValue))) };
  }
  return { discountType: "FIXED", discountValue: Math.max(0, num(amountValue)) };
};
