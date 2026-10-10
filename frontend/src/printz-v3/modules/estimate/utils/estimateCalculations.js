/**
 * PrintZ V3 - Estimate Financial Calculations & Auto-Pricing Engine
 * Ensures 100% precision arithmetic avoiding floating-point rounding quirks.
 */

/**
 * Standard rounding to 2 decimal places
 */
export const roundToTwo = (num) => {
  const n = Number(num) || 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

/**
 * Currency formatter: ₹1,200.00
 */
export const formatCurrency = (amount, currency = "INR") => {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Calculate line amount = quantity * rate
 */
export const calculateLineAmount = (quantity, rate) => {
  const q = Math.max(0, Number(quantity) || 0);
  const r = Math.max(0, Number(rate) || 0);
  return roundToTwo(q * r);
};

/**
 * Authoritative financial calculation for an estimate
 * @param {Object} params { items, discount, tax, deliveryCharge }
 * @returns {Object} Clean calculated financial breakdown
 */
export const calculateEstimateTotals = ({
  items = [],
  discount = { type: "PERCENTAGE", value: 0, amount: 0 },
  tax = { type: "GST", rate: 18 },
  deliveryCharge = 0
}) => {
  // 1. Calculate subtotal from all valid item lines
  let calculatedSubtotal = 0;
  const processedItems = (items || []).map((item) => {
    let itemTotal = 0;
    const processedLines = (item.lines || []).map((line) => {
      const q = Math.max(0, Number(line.quantity) || 0);
      const r = Math.max(0, Number(line.rate) || 0);
      const amount = roundToTwo(q * r);
      itemTotal += amount;
      return {
        ...line,
        quantity: q,
        rate: r,
        amount
      };
    });
    calculatedSubtotal += itemTotal;
    return {
      ...item,
      lines: processedLines,
      itemSubtotal: roundToTwo(itemTotal)
    };
  });

  calculatedSubtotal = roundToTwo(calculatedSubtotal);

  // 2. Calculate discount
  let discountAmount = 0;
  const discountType = discount?.type || "PERCENTAGE";
  const discountVal = Math.max(0, Number(discount?.value || discount?.amount || 0));

  if (discountType === "PERCENTAGE") {
    const pct = Math.min(100, discountVal);
    discountAmount = roundToTwo((calculatedSubtotal * pct) / 100);
  } else {
    // Fixed amount discount cannot exceed subtotal
    discountAmount = roundToTwo(Math.min(calculatedSubtotal, discountVal));
  }

  // 3. Delivery charge
  const delivery = roundToTwo(Math.max(0, Number(deliveryCharge) || 0));

  // 4. Taxable amount = Subtotal - Discount + Delivery
  const taxableAmount = roundToTwo(Math.max(0, calculatedSubtotal - discountAmount + delivery));

  // 5. Tax calculations
  const taxRate = Math.max(0, Number(tax?.rate ?? 18));
  const taxType = tax?.type || "GST";
  const totalTaxAmount = roundToTwo((taxableAmount * taxRate) / 100);

  let cgstRate = 0;
  let sgstRate = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  if (taxType === "GST") {
    cgstRate = taxRate / 2;
    sgstRate = taxRate / 2;
    cgstAmount = roundToTwo(totalTaxAmount / 2);
    sgstAmount = roundToTwo(totalTaxAmount - cgstAmount); // Balance to prevent 1-paisa drift
  } else {
    igstRate = taxRate;
    igstAmount = totalTaxAmount;
  }

  // 6. Grand total
  const grandTotal = roundToTwo(taxableAmount + totalTaxAmount);

  return {
    items: processedItems,
    subtotal: calculatedSubtotal,
    discount: {
      type: discountType,
      value: discountVal,
      amount: discountAmount
    },
    deliveryCharge: delivery,
    taxableAmount,
    tax: {
      type: taxType,
      rate: taxRate,
      cgstRate,
      sgstRate,
      cgstAmount,
      sgstAmount,
      igstRate,
      igstAmount,
      taxAmount: totalTaxAmount
    },
    grandTotal
  };
};

/**
 * Generate intelligent default pricing lines based on Job Item specifications
 * @param {Object} jobItem
 * @returns {Array} Array of recommended pricing lines
 */
export const generateDefaultLinesForJobItem = (jobItem) => {
  const lines = [];
  const qty = Number(jobItem.quantity) || 100;
  const pType = (jobItem.productType || jobItem.itemName || "").toLowerCase();
  const paper = jobItem.material?.paperType || "Art Card";
  const gsm = jobItem.material?.gsm || 300;
  const side = jobItem.printing?.side || "SINGLE_SIDE";
  const isDoubleSide = side === "DOUBLE_SIDE";
  const finishingList = jobItem.finishing || [];

  if (pType.includes("visiting") || pType.includes("card")) {
    // Visiting Card: Sheets calculation (approx 24 cards per SRA3 sheet + 4% wastage)
    const sheetsNeeded = Math.ceil((qty / 24) * 1.04);
    const paperRate = gsm >= 350 ? 4.5 : 3.45;
    lines.push({
      lineId: `line_${Date.now()}_1`,
      description: `${paper} ${gsm} GSM SRA3 Stock (incl. wastage)`,
      category: "MATERIAL",
      quantity: sheetsNeeded,
      unit: "SHEETS",
      rate: paperRate,
      amount: roundToTwo(sheetsNeeded * paperRate),
      notes: "Substrate raw material"
    });

    const printRate = isDoubleSide ? 1.2 : 0.8;
    lines.push({
      lineId: `line_${Date.now()}_2`,
      description: `Digital Printing (${isDoubleSide ? "Double Side Colour" : "Single Side Colour"})`,
      category: "PRINTING",
      quantity: qty,
      unit: "CARDS",
      rate: printRate,
      amount: roundToTwo(qty * printRate),
      notes: "High fidelity digital print"
    });

    if (finishingList.includes("LAMINATION_MATTE") || finishingList.includes("LAMINATION_GLOSS")) {
      const isMatte = finishingList.includes("LAMINATION_MATTE");
      const lamRate = isDoubleSide ? 5.17 : 3.0;
      lines.push({
        lineId: `line_${Date.now()}_3`,
        description: `${isMatte ? "Matte" : "Gloss"} Thermal Lamination (${isDoubleSide ? "Both Sides" : "Single Side"})`,
        category: "FINISHING",
        quantity: sheetsNeeded,
        unit: "SHEETS",
        rate: lamRate,
        amount: roundToTwo(sheetsNeeded * lamRate),
        notes: "Surface protection"
      });
    }

    lines.push({
      lineId: `line_${Date.now()}_4`,
      description: "Precision Hydraulic Cutting & Boxing",
      category: "FINISHING",
      quantity: Math.ceil(qty / 100),
      unit: "BOXES",
      rate: 15.0,
      amount: roundToTwo(Math.ceil(qty / 100) * 15.0),
      notes: "Finishing & standard packaging"
    });
  } else if (pType.includes("banner") || pType.includes("flex")) {
    const sqft = Math.max(12, ((jobItem.size?.width || 10) * (jobItem.size?.height || 4)) * qty);
    lines.push({
      lineId: `line_${Date.now()}_1`,
      description: `Frontlit Media 340 GSM (${sqft} Sq.Ft)`,
      category: "MATERIAL",
      quantity: sqft,
      unit: "SQFT",
      rate: 15.0,
      amount: roundToTwo(sqft * 15.0),
      notes: "Outdoor banner substrate"
    });
    lines.push({
      lineId: `line_${Date.now()}_2`,
      description: "Eco-Solvent Large Format Print",
      category: "PRINTING",
      quantity: sqft,
      unit: "SQFT",
      rate: 12.0,
      amount: roundToTwo(sqft * 12.0),
      notes: "UV & waterproof print"
    });
    lines.push({
      lineId: `line_${Date.now()}_3`,
      description: "Brass Eyelets & Edge Taping",
      category: "FINISHING",
      quantity: Math.max(4, qty * 8),
      unit: "PCS",
      rate: 5.0,
      amount: roundToTwo(Math.max(4, qty * 8) * 5.0),
      notes: "Mounting grommets"
    });
  } else {
    // General / Brochure / Flyer / Poster / Letterhead
    const unitRate = pType.includes("brochure") ? 4.0 : pType.includes("letterhead") ? 1.5 : 2.5;
    lines.push({
      lineId: `line_${Date.now()}_1`,
      description: `${paper} ${gsm} GSM Substrate`,
      category: "MATERIAL",
      quantity: qty,
      unit: jobItem.unit || "PCS",
      rate: roundToTwo(unitRate * 0.4),
      amount: roundToTwo(qty * roundToTwo(unitRate * 0.4)),
      notes: "Paper stock"
    });
    lines.push({
      lineId: `line_${Date.now()}_2`,
      description: `Commercial Printing (${isDoubleSide ? "2 Sides" : "1 Side"})`,
      category: "PRINTING",
      quantity: qty,
      unit: jobItem.unit || "PCS",
      rate: roundToTwo(unitRate * 0.6),
      amount: roundToTwo(qty * roundToTwo(unitRate * 0.6)),
      notes: "Press run"
    });
  }

  // Design Fee if required
  if (jobItem.designRequired) {
    lines.push({
      lineId: `line_${Date.now()}_design`,
      description: `Graphic Design & Artwork (${jobItem.designNotes || "Custom Layout"})`,
      category: "LABOUR",
      quantity: 1,
      unit: "JOB",
      rate: 150.0,
      amount: 150.0,
      notes: "In-house creative team"
    });
  }

  return lines;
};
