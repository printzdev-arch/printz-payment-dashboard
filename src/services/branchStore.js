// Simple in-memory cache for branches to avoid repeated Firestore reads
// Collections used elsewhere (for reference during rebuild):
// - branches
// - printerReadings
// - stockReadings
// - jumboXeroxReadings
// - totalAmountReadings

import { collection, getDocs } from "firebase/firestore";
import { db } from "./authservice";

let branchesCache = null; // string[] | null
let fetchPromise = null; // Promise<string[]> | null

export const clearBranchesCache = () => {
  branchesCache = null;
  fetchPromise = null;
};

export const getBranchesCached = async () => {
  if (branchesCache && Array.isArray(branchesCache)) return branchesCache;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const snapshot = await getDocs(collection(db, "branches"));
    const names = [
      ...new Set(
        snapshot.docs
          .map((d) =>
            d.data() && d.data().name ? String(d.data().name) : null
          )
          .filter(Boolean)
      ),
    ];
    names.sort((a, b) =>
      a.trim().toLowerCase().localeCompare(b.trim().toLowerCase())
    );
    branchesCache = names;
    return names;
  })();

  try {
    const result = await fetchPromise;
    return result;
  } finally {
    // Keep fetchPromise for callers while fetch is ongoing; don't null it here
  }
};

export const getCachedBranchesSync = () => branchesCache || [];
