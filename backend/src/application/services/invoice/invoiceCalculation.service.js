const { VARIANCE_POLICY } = require("../../../shared/constants/invoice");

class InvoiceCalculationService {
  /**
   * Safe financial rounding to 2 decimal places using epsilon correction.
   */
  static round2(val) {
    return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
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
   * Calculate a single line item.
   */
  static calculateLineItem(item, isInterState = false) {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const taxRate = Math.max(0, Number(item.taxRate) || 0);

    const baseAmount = this.round2(qty * unitPrice);

    let discountAmount = 0;
    if (item.discountType === "PERCENTAGE") {
      const pct = Math.min(100, Math.max(0, Number(item.discountValue) || 0));
      discountAmount = this.round2(baseAmount * (pct / 100));
    } else {
      discountAmount = Math.min(baseAmount, Math.max(0, Number(item.discountValue || item.discountAmount) || 0));
    }

    const taxableAmount = this.round2(Math.max(0, baseAmount - discountAmount));

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (isInterState) {
      igstAmount = this.round2(taxableAmount * (taxRate / 100));
    } else {
      const halfRate = taxRate / 2;
      cgstAmount = this.round2(taxableAmount * (halfRate / 100));
      sgstAmount = this.round2(taxableAmount * (halfRate / 100));
    }

    const taxAmount = this.round2(cgstAmount + sgstAmount + igstAmount);
    const lineTotal = this.round2(taxableAmount + taxAmount);

    return {
      ...item,
      quantity: qty,
      unitPrice,
      discountAmount,
      taxRate,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      taxAmount,
      lineTotal,
    };
  }

  /**
   * Calculate full invoice totals including items, additional charges, taxes, advances, and variance.
   */
  static calculateInvoice({
    items = [],
    additionalCharges = [],
    customerSnapshot = {},
    branchSnapshot = {},
    estimateAmount = 0,
    advanceReceived = 0,
    paidAmount = 0,
    tolerancePercent = VARIANCE_POLICY.DEFAULT_TOLERANCE_PERCENT,
    toleranceAbsolute = VARIANCE_POLICY.DEFAULT_TOLERANCE_ABSOLUTE,
  }) {
    const interState = this.isInterState(customerSnapshot, branchSnapshot);

    let subtotal = 0;
    let discountTotal = 0;
    let taxableAmount = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const calculatedItems = items.map((it) => {
      const calc = this.calculateLineItem(it, interState);
      subtotal += this.round2(calc.quantity * calc.unitPrice);
      discountTotal += calc.discountAmount;
      taxableAmount += calc.taxableAmount;
      cgstTotal += calc.cgstAmount;
      sgstTotal += calc.sgstAmount;
      igstTotal += calc.igstAmount;
      return calc;
    });

    let additionalChargesTotal = 0;
    const calculatedAdditionalCharges = (additionalCharges || []).map((ch) => {
      const amt = Math.max(0, Number(ch.amount) || 0);
      const rate = Math.max(0, Number(ch.taxRate) || 0);
      const tax = this.round2(amt * (rate / 100));
      additionalChargesTotal += amt;
      taxableAmount += amt;

      if (interState) {
        igstTotal += tax;
      } else {
        const half = this.round2(tax / 2);
        cgstTotal += half;
        sgstTotal += this.round2(tax - half);
      }

      return {
        description: ch.description || "Additional Charge",
        amount: amt,
        taxRate: rate,
        taxAmount: tax,
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

    const advanceApplied = this.round2(Math.min(grandTotal, Math.max(0, Number(advanceReceived) || 0)));
    const confirmedPaid = this.round2(Math.max(0, Number(paidAmount) || 0));
    const balanceDue = this.round2(Math.max(0, grandTotal - advanceApplied - confirmedPaid));

    // Variance calculation against approved estimate
    const estimateSnapshot = this.round2(Number(estimateAmount) || 0);
    const varianceAmount = this.round2(grandTotal - estimateSnapshot);
    const variancePercentage = estimateSnapshot > 0
      ? this.round2((varianceAmount / estimateSnapshot) * 100)
      : (varianceAmount > 0 ? 100 : 0);

    const exceedsPercentage = variancePercentage > tolerancePercent;
    const exceedsAbsolute = varianceAmount > toleranceAbsolute;
    const approvalRequired = (varianceAmount > 0) && (exceedsPercentage || exceedsAbsolute);

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
      approvalRequired,
      isInterState: interState,
    };
  }
}

module.exports = InvoiceCalculationService;
