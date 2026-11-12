/**
 * POS bill maths. It follows the server (backend saleReceipt.helper.js) line by line, rounding each line the same
 * way, so the total on the screen is the total that gets saved. The old screen taxed the whole bill once, which
 * could differ from the saved total by a few paise.
 */
import { round2 } from "../../../shared/utils/validation";

/** Split a bill-level discount across the lines by value; the last line takes the rounding remainder. */
export const splitBillDiscount = (lines, billDiscount) => {
  const bases = lines.map((it) => round2(Number(it.quantity) * Number(it.unitPrice) || 0));
  const subtotal = round2(bases.reduce((s, v) => s + v, 0));
  const discount = round2(Math.min(Math.max(0, Number(billDiscount) || 0), subtotal));
  let left = discount;
  return bases.map((base, i) => {
    if (i === bases.length - 1) return left;
    const share = subtotal > 0 ? round2((base / subtotal) * discount) : 0;
    left = round2(left - share);
    return share;
  });
};

/** Subtotal, tax and grand total of the cart, exactly as the server will calculate them. */
export const calculatePosBill = (lines, billDiscount, gstRate) => {
  const shares = splitBillDiscount(lines, billDiscount);
  const rate = Math.min(100, Math.max(0, Number(gstRate) || 0)); // a tax rate is between 0 and 100
  let subtotal = 0;
  let discount = 0;
  let tax = 0;
  let total = 0;
  lines.forEach((it, i) => {
    const base = round2(Number(it.quantity) * Number(it.unitPrice) || 0);
    const lineDiscount = Math.min(base, Math.max(0, shares[i]));
    const taxable = round2(Math.max(0, base - lineDiscount));
    const lineTax = round2(taxable * (rate / 100)); // same expression as the server, so half-paisa cases round the same
    subtotal += base;
    discount += lineDiscount;
    tax += lineTax;
    total += round2(taxable + lineTax);
  });
  return { subtotal: round2(subtotal), discountAmount: round2(discount), taxAmount: round2(tax), grandTotal: round2(total) };
};
