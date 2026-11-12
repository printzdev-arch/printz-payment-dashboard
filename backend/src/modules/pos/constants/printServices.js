/**
 * POS print services (Color Print / Black & White).
 * These are priced from this table on the server; the client only sends the selection.
 * Rate is per printed page. Double-sided prints are charged for two pages per sheet.
 */
const PRINT_TYPES = {
  COLOR: "Color Print",
  BW: "Black / White",
};

const PAPER_RATES = {
  PLAIN: { label: "Plain", rate: 10 },
  BOND: { label: "Bond", rate: 20 },
  LEGAL: { label: "Legal", rate: 30 },
};

const SIDES = {
  SINGLE: { label: "Single", multiplier: 1 },
  DOUBLE: { label: "Double", multiplier: 2 },
};

const PRINT_SERVICE_PREFIX = "SVC-PRINT-";

const isPrintServiceId = (id) => typeof id === "string" && id.startsWith(PRINT_SERVICE_PREFIX);

/** Returns { productId, productName, unitPrice } or null when the selection is invalid. */
const resolvePrintService = ({ printType, sides, paperType } = {}) => {
  const type = PRINT_TYPES[printType];
  const side = SIDES[sides];
  const paper = PAPER_RATES[paperType];
  if (!type || !side || !paper) return null;
  return {
    productId: `${PRINT_SERVICE_PREFIX}${printType}-${sides}-${paperType}`,
    productName: `${type} - ${side.label} side - ${paper.label}`,
    unitPrice: paper.rate * side.multiplier,
  };
};

module.exports = { PRINT_TYPES, PAPER_RATES, SIDES, isPrintServiceId, resolvePrintService };
