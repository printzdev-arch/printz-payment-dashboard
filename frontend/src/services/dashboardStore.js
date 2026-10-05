// Global in-memory dashboard cache keyed by branchName -> date -> aggregates
// Aggregates shape per date:
// {
//   totalRevenue: number,
//   printerRevenue: number,
//   stockRevenue: number,
//   otherRevenue: number,
//   printers: {
//     [printerId: string]: { amountTotal: number, copiesTotal: number }
//   },
//   printerAmountTotal: number,
//   printerCopiesTotal: number
// }

import api from "./api";

const cache = Object.create(null); // branch -> date -> aggregates
const totalsLoaded = new Set(); // dates we've already loaded from totalAmountReadings
const printersLoaded = new Set(); // dates we've already loaded from printerReadings
let branchMapCache = null;

const getBranchMap = async () => {
  if (branchMapCache) return branchMapCache;
  try {
    const res = await api.get("/branches");
    const list = res.data?.data || [];
    branchMapCache = new Map();
    list.forEach((b) => {
      const name = b.name || b.branchName;
      if (b._id && name) branchMapCache.set(String(b._id), name);
      if (b.id && name) branchMapCache.set(String(b.id), name);
      if (b.code && name) branchMapCache.set(String(b.code).toUpperCase(), name);
    });
    return branchMapCache;
  } catch (_) {
    return new Map();
  }
};

const ensureBranchDate = (branch, date) => {
  if (!cache[branch]) cache[branch] = Object.create(null);
  if (!cache[branch][date]) {
    cache[branch][date] = {
      totalRevenue: 0,
      printerRevenue: 0,
      stockRevenue: 0,
      otherRevenue: 0,
      printers: Object.create(null),
      printerAmountTotal: 0,
      printerCopiesTotal: 0,
    };
  }
  return cache[branch][date];
};

export const getDashboardCache = () => cache;

export const clearDashboardCache = () => {
  for (const b of Object.keys(cache)) delete cache[b];
  totalsLoaded.clear();
  printersLoaded.clear();
  branchMapCache = null;
};

// Load totalAmountReadings for a list of dates. If branchFilter provided, we still fetch all for the date and filter when aggregating (we keep per-branch anyway).
export const loadTotalsForDates = async (dates) => {
  for (const d of dates) {
    if (totalsLoaded.has(d)) continue; // already have fresh per-date totals

    try {
      const branchMap = await getBranchMap();
      const res = await api.get("/total-amounts", { params: { date: d } });
      const records = res.data?.data || (Array.isArray(res.data) ? res.data : []);

      // Build fresh per-branch aggregates for this specific date
      const byBranch = Object.create(null);
      records.forEach((data) => {
        let branch = data.branchName || data.branch;
        if (!branch && data.branchId) {
          branch = branchMap.get(String(data.branchId));
        }
        branch = branch || "Unknown";
        const totalAmount = Number(data.totalAmount || 0);
        const rows = Array.isArray(data.rows) ? data.rows : [];

        if (!byBranch[branch]) {
          byBranch[branch] = {
            totalRevenue: 0,
            printerRevenue: 0,
            stockRevenue: 0,
            otherRevenue: 0,
          };
        }
        const acc = byBranch[branch];
        acc.totalRevenue += totalAmount;

        for (const r of rows) {
          const amt = Number(r?.amount || 0);
          const type = String(r?.type || "").toLowerCase();
          if (type === "printer") acc.printerRevenue += amt;
          else if (type === "stock") acc.stockRevenue += amt;
          else acc.otherRevenue += amt;
        }
      });

      // Write back to cache by assignment (idempotent), touching only totals fields
      const branches = Object.keys(byBranch);
      if (branches.length === 0) {
        // Still mark this date loaded to avoid refetch storms for empty days
        totalsLoaded.add(d);
        continue;
      }
      for (const branch of branches) {
        const agg = ensureBranchDate(branch, d);
        const src = byBranch[branch];
        agg.totalRevenue = src.totalRevenue;
        agg.printerRevenue = src.printerRevenue;
        agg.stockRevenue = src.stockRevenue;
        agg.otherRevenue = src.otherRevenue;
      }
      totalsLoaded.add(d);
    } catch (err) {
      console.error("Error loading total amounts in dashboardStore:", err);
      totalsLoaded.add(d);
    }
  }
};

// Load printerReadings for a list of dates; build per-printer sums and overall printer totals for amount and copies
export const loadPrinterReadingsForDates = async (dates) => {
  for (const d of dates) {
    if (printersLoaded.has(d)) continue; // already have fresh per-date printer totals

    try {
      const branchMap = await getBranchMap();
      const res = await api.get("/printer-readings", { params: { date: d } });
      const records = res.data?.data || (Array.isArray(res.data) ? res.data : []);

      // Build fresh per-branch printer aggregates for this date
      const byBranch = Object.create(null);
      records.forEach((data) => {
        let branch = data.branchName || data.branch;
        if (!branch && data.branchId) {
          branch = branchMap.get(String(data.branchId));
        }
        branch = branch || "Unknown";
        const readings = data.readings || {};

        if (!byBranch[branch]) {
          byBranch[branch] = {
            printers: Object.create(null),
            printerAmountTotal: 0,
            printerCopiesTotal: 0,
          };
        }
        const acc = byBranch[branch];
        if (Array.isArray(readings)) {
          readings.forEach((reading) => {
            const printerId = reading?.printerId || "default";
            const amount = Number(reading?.total || 0);
            const copies = Number(reading?.noOfCopies || 0);

            if (!acc.printers[printerId]) {
              acc.printers[printerId] = { amountTotal: 0, copiesTotal: 0 };
            }
            acc.printers[printerId].amountTotal += amount;
            acc.printers[printerId].copiesTotal += copies;
            acc.printerAmountTotal += amount;
            acc.printerCopiesTotal += copies;
          });
        } else if (readings && typeof readings === "object") {
          Object.entries(readings).forEach(([printerId, item]) => {
            if (item && typeof item === "object") {
              if ("noOfCopies" in item || "total" in item) {
                const amount = Number(item?.total || 0);
                const copies = Number(item?.noOfCopies || 0);
                if (!acc.printers[printerId]) {
                  acc.printers[printerId] = { amountTotal: 0, copiesTotal: 0 };
                }
                acc.printers[printerId].amountTotal += amount;
                acc.printers[printerId].copiesTotal += copies;
                acc.printerAmountTotal += amount;
                acc.printerCopiesTotal += copies;
              } else {
                Object.values(item).forEach((reading) => {
                  if (reading && typeof reading === "object") {
                    const amount = Number(reading?.total || 0);
                    const copies = Number(reading?.noOfCopies || 0);
                    if (!acc.printers[printerId]) {
                      acc.printers[printerId] = { amountTotal: 0, copiesTotal: 0 };
                    }
                    acc.printers[printerId].amountTotal += amount;
                    acc.printers[printerId].copiesTotal += copies;
                    acc.printerAmountTotal += amount;
                    acc.printerCopiesTotal += copies;
                  }
                });
              }
            }
          });
        }
      });

      // Write back to cache by assignment (idempotent), touching only printer fields
      const branches = Object.keys(byBranch);
      if (branches.length === 0) {
        printersLoaded.add(d);
        continue;
      }
      for (const branch of branches) {
        const agg = ensureBranchDate(branch, d);
        const src = byBranch[branch];
        agg.printers = src.printers;
        agg.printerAmountTotal = src.printerAmountTotal;
        agg.printerCopiesTotal = src.printerCopiesTotal;
      }
      printersLoaded.add(d);
    } catch (err) {
      console.error("Error loading printer readings in dashboardStore:", err);
      printersLoaded.add(d);
    }
  }
};

// Convenience aggregator for the dashboard view; combines across dates and returns per-branch totals
export const aggregateByBranchAcrossDates = (dates, branchFilter = null) => {
  const result = [];
  const branches =
    branchFilter && branchFilter.length ? branchFilter : Object.keys(cache);
  for (const branch of branches) {
    let totalRevenue = 0;
    let printerRevenue = 0;
    let stockRevenue = 0;
    let otherRevenue = 0;
    let printerCopies = 0;
    let printerAmount = 0;
    for (const d of dates) {
      const rec = cache[branch]?.[d];
      if (!rec) continue;
      totalRevenue += Number(rec.totalRevenue || 0);
      printerRevenue += Number(rec.printerRevenue || 0);
      stockRevenue += Number(rec.stockRevenue || 0);
      otherRevenue += Number(rec.otherRevenue || 0);
      printerCopies += Number(rec.printerCopiesTotal || 0);
      printerAmount += Number(rec.printerAmountTotal || 0);
    }
    // Only include branches with some presence or when branchFilter specifically asked for them
    if (
      totalRevenue !== 0 ||
      printerRevenue !== 0 ||
      stockRevenue !== 0 ||
      otherRevenue !== 0 ||
      printerCopies !== 0 ||
      (branchFilter && branchFilter.includes(branch))
    ) {
      result.push({
        branchName: branch,
        totalRevenue,
        printerRevenue,
        stockRevenue,
        otherRevenue,
        printerCopies,
        printerAmount,
      });
    }
  }
  // Sort alphabetically by branch name by default
  result.sort((a, b) => a.branchName.localeCompare(b.branchName));
  return result;
};
