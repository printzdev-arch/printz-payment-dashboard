class InvoiceCalculationService {
  /**
   * Safe financial rounding to 2 decimal places using epsilon correction.
   */
  static round2(val) {
    return require("../../../utils/validation/roundMoney").roundMoney(val);
  }

  /** A real finite number, or 0 for text, null, NaN and Infinity. */
  static finite(val) {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * Determine whether the transaction is inter-state or intra-state.
   */
  static isInterState(customerSnapshot = {}, branchSnapshot = {}) {
    const custGstin = (customerSnapshot.gstin || "").trim().toUpperCase();
    const branchGstin = (branchSnapshot.gstin || "").trim().toUpperCase();

    if (custGstin.length >= 2 && branchGstin.length >= 2) {
      const custStateCode = custGstin.slice(0, 2);
      const branchStateCode = branchGstin.slice(0, 2);
      return custStateCode !== branchStateCode;
    }

    return false;
  }

  /**
   * Split an invoice-level discount across lines in proportion to their value.
   * The shares always add up to exactly the discount (the last line takes the rounding remainder).
   */
  static allocateDiscount(amounts, discount) {
    const total = amounts.reduce((sum, v) => sum + v, 0);
    if (!(discount > 0) || !(total > 0)) return amounts.map(() => 0);
    let remaining = discount;
    return amounts.map((amount, idx) => {
      const isLast = idx === amounts.length - 1;
      const share = isLast ? remaining : Math.min(remaining, this.round2((discount * amount) / total));
      remaining = this.round2(remaining - share);
      return Math.max(0, share);
    });
  }

  /**
   * Calculate full invoice totals including items, additional charges (e.g. delivery), the invoice discount
   * (a percentage or a fixed amount, any size), GST, advance and balance.
   *
   * The same rules are mirrored in the frontend
   * (frontend/src/features/jobflow/invoice/utils/invoiceMath.js).
   */
  static calculateInvoice({
    items = [],
    additionalCharges = [],
    customerSnapshot = {},
    branchSnapshot = {},
    estimateAmount = 0,
    advanceReceived = 0,
    paidAmount = 0,
    discountType = null,
    discountValue = 0,
    gstRate = null,
  }) {
    // One GST rate applies to every item and charge of the invoice. (Without it, each line's own rate is used.)
    const commonRate =
      gstRate === null || gstRate === undefined || gstRate === "" ? null : Math.max(0, this.finite(gstRate));
    const interState = this.isInterState(customerSnapshot, branchSnapshot);

    // 1. Items (a line's own discount is still honoured) and additional charges
    const lines = items.map((it) => {
      const qty = Math.max(0, this.finite(it.quantity));
      const unitPrice = Math.max(0, this.finite(it.unitPrice));
      const baseAmount = this.round2(qty * unitPrice);
      let lineDiscount = 0;
      if (it.discountType === "PERCENTAGE") {
        const pct = Math.min(100, Math.max(0, this.finite(it.discountValue)));
        lineDiscount = this.round2(baseAmount * (pct / 100));
      } else {
        lineDiscount = Math.min(baseAmount, Math.max(0, this.finite(it.discountValue || it.discountAmount)));
      }
      return {
        item: it,
        qty,
        unitPrice,
        baseAmount,
        lineDiscount,
        taxRate: commonRate !== null ? commonRate : Math.min(100, Math.max(0, this.finite(it.taxRate))),
      };
    });

    const charges = (additionalCharges || []).map((ch) => ({
      ch,
      amount: this.round2(Math.max(0, this.finite(ch.amount))),
      taxRate: commonRate !== null ? commonRate : Math.min(100, Math.max(0, this.finite(ch.taxRate))),
    }));

    // 2. Invoice-level discount on everything that is billed (items after their own discount, plus charges)
    const itemBases = lines.map((l) => this.round2(l.baseAmount - l.lineDiscount));
    const chargeBases = charges.map((c) => c.amount);
    const discountBase = this.round2([...itemBases, ...chargeBases].reduce((sum, v) => sum + v, 0));

    let invoiceDiscount = 0;
    const dValue = Math.max(0, this.finite(discountValue));
    if (dValue > 0) {
      invoiceDiscount =
        String(discountType || "").toUpperCase() === "PERCENTAGE"
          ? this.round2(discountBase * (Math.min(100, dValue) / 100))
          : Math.min(discountBase, this.round2(dValue));
    }
    const shares = this.allocateDiscount([...itemBases, ...chargeBases], invoiceDiscount);

    // 3. Tax per line on what remains after discount
    const taxOf = (taxable, rate) => {
      if (interState) {
        return { cgst: 0, sgst: 0, igst: this.round2(taxable * (rate / 100)) };
      }
      const half = rate / 2;
      return { cgst: this.round2(taxable * (half / 100)), sgst: this.round2(taxable * (half / 100)), igst: 0 };
    };

    let subtotal = 0;
    let discountTotal = 0;
    let taxableAmount = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const calculatedItems = lines.map((l, idx) => {
      const taxable = this.round2(Math.max(0, itemBases[idx] - shares[idx]));
      const t = taxOf(taxable, l.taxRate);
      const taxAmount = this.round2(t.cgst + t.sgst + t.igst);
      subtotal += l.baseAmount;
      discountTotal += l.lineDiscount + shares[idx];
      taxableAmount += taxable;
      cgstTotal += t.cgst;
      sgstTotal += t.sgst;
      igstTotal += t.igst;
      return {
        ...l.item,
        quantity: l.qty,
        unitPrice: l.unitPrice,
        discountAmount: this.round2(l.lineDiscount + shares[idx]),
        taxRate: l.taxRate,
        taxableAmount: taxable,
        cgstAmount: t.cgst,
        sgstAmount: t.sgst,
        igstAmount: t.igst,
        taxAmount,
        lineTotal: this.round2(taxable + taxAmount),
      };
    });

    let additionalChargesTotal = 0;
    const calculatedAdditionalCharges = charges.map((c, idx) => {
      const share = shares[lines.length + idx];
      const taxable = this.round2(Math.max(0, c.amount - share));
      const t = taxOf(taxable, c.taxRate);
      additionalChargesTotal += c.amount;
      discountTotal += share;
      taxableAmount += taxable;
      cgstTotal += t.cgst;
      sgstTotal += t.sgst;
      igstTotal += t.igst;
      return {
        description: c.ch.description || "Additional Charge",
        amount: c.amount,
        taxRate: c.taxRate,
        taxAmount: this.round2(t.cgst + t.sgst + t.igst),
      };
    });

    subtotal = this.round2(subtotal);
    discountTotal = this.round2(discountTotal);
    additionalChargesTotal = this.round2(additionalChargesTotal);
    taxableAmount = this.round2(taxableAmount);
    cgstTotal = this.round2(cgstTotal);
    sgstTotal = this.round2(sgstTotal);
    igstTotal = this.round2(igstTotal);
    const taxTotal = this.round2(cgstTotal + sgstTotal + igstTotal);
    const grandTotal = this.round2(taxableAmount + taxTotal);

    const advanceApplied = this.round2(Math.min(grandTotal, Math.max(0, this.finite(advanceReceived))));
    const confirmedPaid = this.round2(Math.max(0, this.finite(paidAmount)));
    const balanceDue = this.round2(Math.max(0, grandTotal - advanceApplied - confirmedPaid));

    // Informational only: goods billed against the estimate, before discount, GST and charges.
    // GST, discount and delivery are added on the invoice, so they never need an approval.
    const estimateSnapshot = this.round2(this.finite(estimateAmount));
    const varianceAmount = this.round2(subtotal - estimateSnapshot);
    const variancePercentage = estimateSnapshot > 0
      ? this.round2((varianceAmount / estimateSnapshot) * 100)
      : (varianceAmount > 0 ? 100 : 0);

    return {
      items: calculatedItems,
      additionalCharges: calculatedAdditionalCharges,
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
      estimateAmountSnapshot: estimateSnapshot,
      varianceAmount,
      variancePercentage,
      approvalRequired: false,
      isInterState: interState,
    };
  }
}

module.exports = InvoiceCalculationService;
