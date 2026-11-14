import { useEffect, useState } from "react";
import api from "../services/api";

/**
 * Branch helpers shared by every page that has a branch picker.
 *  - getLockedBranchId(): the branch a non-admin user (for example a manager) is limited to, or "" for admins
 *  - useBranches(): the branch list, loaded once and shared between pages
 */

export const getLockedBranchId = () => {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    const role = String(u.role || localStorage.getItem("userRole") || "");
    if (role.toLowerCase() === "admin" || role.toUpperCase() === "SUPER_ADMIN") return "";
    const id = u.branchId?._id || u.branchId || "";
    return id ? String(id) : "";
  } catch {
    return "";
  }
};

const CACHE_MS = 30 * 1000;
let cache = { at: 0, promise: null };

export const clearBranchCache = () => {
  cache = { at: 0, promise: null };
};

const loadBranches = () => {
  const now = Date.now();
  if (cache.promise && now - cache.at < CACHE_MS) return cache.promise;
  const promise = api
    .get("/branches")
    .then((res) => {
      const list = res.data?.data || res.data || [];
      return Array.isArray(list) ? list : [];
    })
    .catch(() => {
      clearBranchCache();
      return [];
    });
  cache = { at: now, promise };
  return promise;
};

export const useBranches = (enabled = true) => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    setLoading(true);
    loadBranches().then((list) => {
      if (!active) return;
      setBranches(list);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [enabled]);

  return { branches, loading };
};
