// Simple in-memory cache for branches to avoid repeated REST API reads
import api from "./api";

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
    try {
      const response = await api.get("/branches");
      const branches = response.data?.data || [];
      const names = [
        ...new Set(
          branches
            .map((b) => (b.name || b.branchName ? String(b.name || b.branchName) : null))
            .filter(Boolean)
        ),
      ];
      names.sort((a, b) =>
        a.trim().toLowerCase().localeCompare(b.trim().toLowerCase())
      );
      branchesCache = names;
      return names;
    } catch (error) {
      console.error("Error loading cached branches:", error);
      return [];
    }
  })();

  try {
    const result = await fetchPromise;
    return result;
  } finally {
    // Keep fetchPromise for callers while fetch is ongoing; don't null it here
  }
};

export const getCachedBranchesSync = () => branchesCache || [];

export const resolveBranchId = async (branchIdentifier) => {
  if (!branchIdentifier) return null;
  const trimmed = String(branchIdentifier).trim();
  if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    if (storedUser.branchId && /^[0-9a-fA-F]{24}$/.test(String(storedUser.branchId).trim())) {
      if (!branchIdentifier || storedUser.branch === branchIdentifier || storedUser.branchName === branchIdentifier) {
        return String(storedUser.branchId).trim();
      }
    }
  } catch (e) {}

  try {
    const response = await api.get("/branches");
    const branches = response.data?.data || [];
    const target = trimmed.toLowerCase();
    const found = branches.find(
      (b) =>
        (b.name && b.name.trim().toLowerCase() === target) ||
        (b.branchName && b.branchName.trim().toLowerCase() === target) ||
        (b.code && b.code.trim().toLowerCase() === target)
    );
    if (found) {
      return (found._id || found.id || "").toString();
    }
  } catch (error) {
    console.error("Error resolving branch ID:", error);
  }
  return null;
};

export default {
  clearBranchesCache,
  getBranchesCached,
  getCachedBranchesSync,
  resolveBranchId,
};
