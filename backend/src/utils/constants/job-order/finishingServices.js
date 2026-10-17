/**
 * Centralized Finishing Services Order Configuration & Helpers (Backend)
 *
 * Fixed Production Sequence:
 * 1. Print: 0 — always present as first item
 * 2. Cutting: 1
 * 3. Creasing: 2
 * 4. Folding: 3
 * 5. Numbering: 4
 * 6. Perforation: 5
 * 7. Lamination: 6
 * 8. Binding: 7
 * 9. Packing: 8 — always present as last item
 */

const FINISHING_SERVICE_ORDER = {
  Print: 0,
  Cutting: 1,
  Creasing: 2,
  Folding: 3,
  Numbering: 4,
  Perforation: 5,
  Lamination: 6,
  Binding: 7,
  Packing: 8,
};

function getServiceRank(serviceName) {
  if (!serviceName) return 99;
  const clean = String(serviceName).trim().toLowerCase();
  for (const [key, rank] of Object.entries(FINISHING_SERVICE_ORDER)) {
    if (key.toLowerCase() === clean) {
      return rank;
    }
  }
  return 99;
}

function isStaticFinishingService(serviceName) {
  if (!serviceName) return false;
  const clean = String(serviceName).trim().toLowerCase();
  return clean === "print" || clean === "packing";
}

function sortFinishingServices(services = []) {
  if (!Array.isArray(services)) return [];
  return [...services].sort((a, b) => {
    const nameA = typeof a === "object" ? a?.name : String(a);
    const nameB = typeof b === "object" ? b?.name : String(b);
    const rankA = getServiceRank(nameA);
    const rankB = getServiceRank(nameB);
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    const idA = typeof a === "object" ? String(a?.id || "") : "";
    const idB = typeof b === "object" ? String(b?.id || "") : "";
    return idA.localeCompare(idB);
  });
}

function ensureStaticFinishingServices(services = [], jobQuantity = 500) {
  const list = Array.isArray(services) ? [...services] : [];

  const seen = new Set();
  const deduped = [];
  for (const s of list) {
    if (!s) continue;
    const name = typeof s === "object" ? s.name : String(s);
    if (!name) continue;
    const key = name.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(s);
    }
  }

  const hasPrint = deduped.some((s) => {
    const n = typeof s === "object" ? s.name : String(s);
    return String(n).trim().toLowerCase() === "print";
  });
  if (!hasPrint) {
    const qty = Number(jobQuantity) || 500;
    deduped.unshift({
      id: "static-print",
      name: "Print",
      config: "Full Color (CMYK)",
      unitPrice: 0.20,
      quantity: qty,
      total: Math.round(qty * 0.20 * 100) / 100,
      unit: "sheets",
    });
  }

  const hasPacking = deduped.some((s) => {
    const n = typeof s === "object" ? s.name : String(s);
    return String(n).trim().toLowerCase() === "packing";
  });
  if (!hasPacking) {
    const qty = Number(jobQuantity) || 500;
    const packs = Math.max(1, Math.ceil(qty / 100));
    deduped.push({
      id: "static-packing",
      name: "Packing",
      config: "Shrink Wrap",
      unitPrice: 0.20,
      quantity: packs,
      total: Math.round(packs * 0.20 * 100) / 100,
      unit: "packs",
    });
  }

  return sortFinishingServices(deduped);
}

module.exports = {
  FINISHING_SERVICE_ORDER,
  getServiceRank,
  isStaticFinishingService,
  sortFinishingServices,
  ensureStaticFinishingServices,
};
