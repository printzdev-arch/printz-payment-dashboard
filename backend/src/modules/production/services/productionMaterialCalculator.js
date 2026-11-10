/**
 * Automatic material requirements for a production order.
 *
 * Worked out from the order's saved specifications and quantity:
 *   - Paper / media        : quantity + wastage
 *   - Lamination film      : only when lamination is required (area based)
 *   - Ink / toner          : rough estimate from colour mode and sides
 *   - Packing material     : one pack per 100 pieces
 *
 * Available stock is matched by the stock item's NAME (stock items have no structured size/GSM fields).
 * The numbers are estimates for planning; the manager can edit any line in the plan.
 */

// Tunable assumptions
const PAPER_WASTAGE_PCT = 5; // spare sheets for set-up and spoilage
const FILM_WASTAGE_PCT = 8; // lamination film trim + roll end
const PIECES_PER_PACK = 100;
const A4_AREA_M2 = 0.210 * 0.297;
const INK_ML_PER_A4_SIDE_COLOR = 0.5; // full colour (CMYK) coverage estimate
const INK_ML_PER_A4_SIDE_MONO = 0.2; // black only estimate

const A_SERIES_M2 = { A0: 1, A1: 0.5, A2: 0.25, A3: 0.125, A4: 0.0625, A5: 0.03125, A6: 0.015625, A7: 0.0078125 };

/** Area of one piece in square metres from a size text ("A4", "90 x 54 mm", "6x4 in"); null when unknown. */
const areaM2 = (sizeText) => {
  const text = String(sizeText || "").trim().toUpperCase();
  if (!text) return null;
  const a = text.match(/\bA([0-8])\b/);
  if (a) return A_SERIES_M2[`A${a[1]}`] ?? null;
  const dims = text.match(/(\d+(?:\.\d+)?)\s*[X×]\s*(\d+(?:\.\d+)?)\s*(MM|CM|IN|INCH|"|FT)?/);
  if (!dims) return null;
  const w = Number(dims[1]);
  const h = Number(dims[2]);
  const unit = dims[3] || "MM";
  const toM = unit === "MM" ? 0.001 : unit === "CM" ? 0.01 : unit === "FT" ? 0.3048 : 0.0254;
  const area = w * toM * (h * toM);
  return area > 0 ? area : null;
};

const round2 = (n) => Math.round(n * 100) / 100;
const withWastage = (n, pct) => Math.ceil(n * (1 + pct / 100));
const norm = (s) => String(s || "").toLowerCase();
const stockQty = (s) => Number(s.qty ?? s.quantity ?? s.currentStock ?? 0) || 0;

/** First stock item whose name contains every keyword (case-insensitive); falls back to any keyword. */
const findStock = (stockItems, allKeywords, anyKeywords = []) => {
  const all = allKeywords.map(norm).filter(Boolean);
  const any = anyKeywords.map(norm).filter(Boolean);
  // A keyword must start a word, so "ink" does not match "Shrink"
  const has = (name, k) => new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(name);
  const hit = (name, list, mode) => (mode === "all" ? list.every((k) => has(name, k)) : list.some((k) => has(name, k)));
  let found = null;
  if (all.length) found = stockItems.find((s) => hit(norm(s.itemName), all, "all"));
  if (!found && any.length) found = stockItems.find((s) => hit(norm(s.itemName), any, "any"));
  return found || null;
};

const line = ({ name, spec, requiredQty, unit, relatedOperation, remarks, stock }) => {
  const availableStock = stock ? stockQty(stock) : 0;
  return {
    itemId: stock ? String(stock._id) : null,
    name,
    spec,
    requiredQty,
    unit,
    availableStock,
    shortage: Math.max(0, requiredQty - availableStock),
    relatedOperation,
    remarks: stock ? remarks : `${remarks ? `${remarks} ` : ""}(not found in stock list)`.trim(),
    autoCalculated: true,
  };
};

/**
 * @param {object} snapshot  order.specificationsSnapshot
 * @param {number} quantity  planned quantity (pieces)
 * @param {Array}  stockItems stock items {_id, itemName, qty, ...}
 */
function calculateMaterials(snapshot = {}, quantity = 0, stockItems = []) {
  const qty = Number(quantity) || 0;
  if (qty <= 0) return [];

  const lines = [];
  const size = snapshot.size || "";
  const area = areaM2(size);
  const paperType = snapshot.material || "";
  const gsm = snapshot.paperGsm ? String(snapshot.paperGsm).replace(/[^0-9]/g, "") : "";
  const doubleSided = /double|both|2/i.test(String(snapshot.printingSide || ""));
  const sides = doubleSided ? 2 : 1;

  // 1. Paper / media
  const sheets = withWastage(qty, PAPER_WASTAGE_PCT);
  lines.push(
    line({
      name: [paperType || "Paper", gsm ? `${gsm} GSM` : ""].filter(Boolean).join(" "),
      spec: [size, snapshot.printingSide].filter(Boolean).join(", "),
      requiredQty: sheets,
      unit: "sheets",
      relatedOperation: "PRINT",
      remarks: `${qty} pcs + ${PAPER_WASTAGE_PCT}% wastage`,
      stock: findStock(stockItems, [paperType, gsm].filter(Boolean), [paperType]),
    })
  );

  // 2. Lamination film
  const lam = String(snapshot.lamination || "").trim();
  if (lam && !/not required|none|n\/a/i.test(lam)) {
    const filmArea = area ? round2(qty * area * sides * (1 + FILM_WASTAGE_PCT / 100)) : null;
    lines.push(
      line({
        name: `Lamination film (${lam})`,
        spec: size,
        requiredQty: filmArea ?? withWastage(qty, FILM_WASTAGE_PCT),
        unit: filmArea ? "sq.m" : "sheets",
        relatedOperation: "LAMINATION",
        remarks: filmArea ? `${qty} pcs x ${sides} side(s) + ${FILM_WASTAGE_PCT}% wastage` : `${qty} pcs + ${FILM_WASTAGE_PCT}% wastage (size unknown)`,
        stock: findStock(stockItems, ["lamination", lam.split(" ")[0]], ["lamination", "film"]),
      })
    );
  }

  // 3. Ink / toner (estimate)
  const mono = /black|k-only|b&w|mono|grey|gray/i.test(String(snapshot.colorMode || ""));
  const a4Equivalent = area ? area / A4_AREA_M2 : 1;
  const inkMl = Math.ceil(sheets * sides * a4Equivalent * (mono ? INK_ML_PER_A4_SIDE_MONO : INK_ML_PER_A4_SIDE_COLOR));
  lines.push(
    line({
      name: mono ? "Black ink / toner" : "Colour ink / toner (CMYK)",
      spec: snapshot.colorMode || "",
      requiredQty: inkMl,
      unit: "ml",
      relatedOperation: "PRINT",
      remarks: "Estimate from colour mode and sides",
      stock: findStock(stockItems, ["ink"], ["ink", "toner"]),
    })
  );

  // 4. Packing material
  const packs = Math.max(1, Math.ceil(qty / PIECES_PER_PACK));
  lines.push(
    line({
      name: "Packing material (wrap / carton)",
      spec: snapshot.packing || "Standard Packaging",
      requiredQty: packs,
      unit: "packs",
      relatedOperation: "PACKING",
      remarks: `1 pack per ${PIECES_PER_PACK} pcs`,
      stock: findStock(stockItems, ["pack"], ["pack", "wrap", "carton"]),
    })
  );

  return lines;
}

module.exports = {
  calculateMaterials,
  areaM2,
  PAPER_WASTAGE_PCT,
  FILM_WASTAGE_PCT,
  PIECES_PER_PACK,
};
