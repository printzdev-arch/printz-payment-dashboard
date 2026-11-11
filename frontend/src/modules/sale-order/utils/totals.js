// Estimate shown while the form is being filled. The server recalculates everything when the order is saved,
// using the same rules: tax follows the discounted amount.
const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

export const lineAmount = (it) => round2(Number(it.quantity || 0) * Number(it.unitPrice || 0));

export const calcTotals = (
  items = [],
  orderDiscount = 0,
  priority = "NORMAL",
  urgentChargeType = "AMOUNT",
  urgentChargeValue = 0
) => {
  let subtotal = 0;
  let rawTax = 0;
  items.forEach((it) => {
    const amount = lineAmount(it);
    subtotal += amount;
    rawTax += (amount * Number(it.taxRate || 0)) / 100;
  });
  subtotal = round2(subtotal);
  const discount = Math.min(round2(orderDiscount), subtotal);

  let urgentChargeAmount = 0;
  const chargeVal = round2(Number(urgentChargeValue || 0));
  if (priority === "URGENT" && chargeVal > 0) {
    if (urgentChargeType === "PERCENTAGE") {
      urgentChargeAmount = round2((subtotal * chargeVal) / 100);
    } else {
      urgentChargeAmount = chargeVal;
    }
  }

  const tax = subtotal > 0 ? round2(rawTax * ((subtotal - discount) / subtotal)) : 0;
  return {
    subtotal,
    discount,
    urgentChargeAmount,
    tax,
    grandTotal: round2(subtotal - discount + tax + urgentChargeAmount),
  };
};

export const emptyItem = () => ({
  productType: "VISITING_CARD",
  description: "",
  quantity: "",
  unit: "PCS",
  unitPrice: "",
  taxRate: 18,
  paperType: "",
  paperGsm: "",
  size: "",
  color: "",
  printingSide: "",
});

// Item fields in the form <-> the server's `specification` object
export const SPEC_FIELDS = [
  { key: "paperType", specKey: "paperType", label: "Paper Type" },
  { key: "paperGsm", specKey: "paperGsm", label: "Paper GSM" },
  { key: "size", specKey: "size", label: "Size" },
  { key: "color", specKey: "colorMode", label: "Color" },
  { key: "printingSide", specKey: "sides", label: "Printing Side" },
];

export const toSpecification = (it) =>
  SPEC_FIELDS.reduce((spec, f) => ({ ...spec, [f.specKey]: String(it[f.key] || "").trim() }), {});

export const fromSpecification = (spec = {}) =>
  SPEC_FIELDS.reduce((out, f) => ({ ...out, [f.key]: spec?.[f.specKey] || "" }), {});

// One-line summary, e.g. "Art Card · 300 gsm · A4 · Full Color · Double Sided"
export const specSummary = (spec = {}) =>
  SPEC_FIELDS.map((f) => spec?.[f.specKey]).filter(Boolean).join(" · ");
