import api from "../../../../shared/services/api";

// The paginated salary endpoints reject limit > 100. Callers that want "all
// rows" ask for a large limit; this walks the pages at 100 per request and
// returns the merged list in the same response shape.
const MAX_PAGE_SIZE = 100;
const MAX_PAGES = 50;

const fetchAllPages = async (path, params = {}) => {
  const wanted = Number(params.limit) || MAX_PAGE_SIZE;
  const pageSize = Math.min(wanted, MAX_PAGE_SIZE);

  if (wanted <= MAX_PAGE_SIZE) {
    const res = await api.get(path, { params: { ...params, limit: pageSize } });
    return res.data;
  }

  const merged = [];
  let first = null;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const res = await api.get(path, { params: { ...params, limit: pageSize, page } });
    const body = res.data;
    if (!first) first = body;
    const rows = Array.isArray(body?.data) ? body.data : [];
    merged.push(...rows);
    const totalPages = Number(body?.meta?.totalPages) || 1;
    if (page >= totalPages || rows.length === 0 || merged.length >= wanted) break;
  }
  return { ...(first || {}), data: merged.slice(0, wanted) };
};

export const salaryApi = {
  // ─── Salary Runs (Payroll Processing) ─────────────────────────────────────
  listRuns: async (params = {}) => {
    const res = await api.get("/salary/runs", { params });
    return res.data;
  },

  createRun: async (data) => {
    const res = await api.post("/salary/runs", data);
    return res.data;
  },

  getRunById: async (id) => {
    const res = await api.get(`/salary/runs/${id}`);
    return res.data;
  },

  getProcessingStatus: async () => {
    const res = await api.get("/salary/processing-status");
    return res.data;
  },

  calculateRun: async (id) => {
    const res = await api.post(`/salary/runs/${id}/calculate`);
    return res.data;
  },

  approveRun: async (id) => {
    const res = await api.post(`/salary/runs/${id}/approve`);
    return res.data;
  },

  payRun: async (id) => {
    const res = await api.post(`/salary/runs/${id}/pay`);
    return res.data;
  },

  // Super Admin only: sends an approved (not yet paid) run back to calculated; a reason is required
  reopenRun: async (id, reason) => {
    const res = await api.post(`/salary/runs/${id}/reopen`, { reason });
    return res.data;
  },

  lockRun: async (id) => {
    const res = await api.post(`/salary/runs/${id}/lock`);
    return res.data;
  },

  // ─── Salary Records & Entries (Reports) ───────────────────────────────────
  listRecords: async (params = {}) => {
    const res = await api.get("/salary/records", { params });
    return res.data;
  },

  listEntries: async (params = {}) => {
    const res = await api.get("/salary/entries", { params });
    return res.data;
  },

  // ─── Salary Components & Structures (Setup) ──────────────────────────────
  listComponents: async (params = {}) => {
    const res = await api.get("/salary/components", { params });
    return res.data;
  },

  createComponent: async (data) => {
    const res = await api.post("/salary/components", data);
    return res.data;
  },

  listStructures: async (params = {}) => fetchAllPages("/salary/structures", params),

  createStructure: async (data) => {
    const res = await api.post("/salary/structures", data);
    return res.data;
  },

  // ─── Salary Adjustments ───────────────────────────────────────────────────
  listAdjustments: async (params = {}) => fetchAllPages("/salary/adjustments", params),

  createAdjustment: async (data) => {
    const res = await api.post("/salary/adjustments", data);
    return res.data;
  },

  cancelAdjustment: async (id) => {
    const res = await api.post(`/salary/adjustments/${id}/cancel`);
    return res.data;
  },

  // ─── Employee Loans & Repayments ──────────────────────────────────────────
  listLoans: async (params = {}) => fetchAllPages("/salary/loans", params),

  skipLoanMonth: async (id, data) => {
    const res = await api.post(`/salary/loans/${id}/skip-month`, data);
    return res.data;
  },

  unskipLoanMonth: async (id, data) => {
    const res = await api.post(`/salary/loans/${id}/unskip-month`, data);
    return res.data;
  },

  createLoan: async (data) => {
    const res = await api.post("/salary/loans", data);
    return res.data;
  },

  listLoanRepayments: async (params = {}) => fetchAllPages("/salary/loan-repayments", params),

  createLoanRepayment: async (data) => {
    const res = await api.post("/salary/loan-repayments", data);
    return res.data;
  },

  // ─── Helper Reference Lookups ────────────────────────────────────────────
  getBranches: async () => {
    try {
      const res = await api.get("/branches");
      const raw = res.data;
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data)) return raw.data;
      if (Array.isArray(raw?.items)) return raw.items;
      if (Array.isArray(raw?.branches)) return raw.branches;
      return [];
    } catch {
      return [];
    }
  },

  // The employees endpoint caps pages at 100 and returns { employees, total, pages }
  // with branchId populated. Walk all pages and filter by branchId on the client
  // (this endpoint call sends no branch filter).
  getEmployees: async (params = {}) => {
    const { branchId, limit, ...rest } = params;
    const wanted = Number(limit) || 100;
    const pickList = (raw) => {
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data?.employees)) return raw.data.employees;
      if (Array.isArray(raw?.data?.items)) return raw.data.items;
      if (Array.isArray(raw?.data)) return raw.data;
      if (Array.isArray(raw?.items)) return raw.items;
      if (Array.isArray(raw?.employees)) return raw.employees;
      return [];
    };
    try {
      const all = [];
      for (let page = 1; page <= 50; page += 1) {
        const res = await api.get("/employees", { params: { ...rest, page, limit: 100 } });
        const rows = pickList(res.data);
        all.push(...rows);
        const pages = Number(res.data?.data?.pages) || 1;
        if (page >= pages || rows.length === 0 || all.length >= wanted) break;
      }
      return all
        .filter((e) => {
          if (!branchId) return true;
          const b = e.branchId?._id || e.branchId;
          return !b || String(b) === String(branchId);
        });
    } catch {
      return [];
    }
  },

  // Non-admin users (e.g. managers) are restricted to their own branch.
  // Returns that branch id, or "" when the user may pick any branch.
  getLockedBranchId: () => {
    try {
      const rawUser = localStorage.getItem("user");
      const u = rawUser ? JSON.parse(rawUser) : {};
      const role = String(u.role || localStorage.getItem("userRole") || "");
      if (role.toLowerCase() === "admin" || role.toUpperCase() === "SUPER_ADMIN") return "";
      const id = u.branchId?._id || u.branchId || "";
      return id ? String(id) : "";
    } catch (_) {
      return "";
    }
  },

  getDefaultBranchId: (branches = []) => {
    if (!Array.isArray(branches) || branches.length === 0) return "";
    try {
      const rawUser = localStorage.getItem("user");
      const storedUser = rawUser ? JSON.parse(rawUser) : {};
      const userBranchId = storedUser.branchId?._id || storedUser.branchId;
      const userBranchName =
        storedUser.branchName ||
        storedUser.branch ||
        localStorage.getItem("userBranchName");

      if (userBranchId && branches.some((b) => String(b._id) === String(userBranchId))) {
        return String(userBranchId);
      }
      if (userBranchName) {
        const match = branches.find(
          (b) =>
            b.name?.toLowerCase().trim() === userBranchName.toLowerCase().trim() ||
            b.name?.toLowerCase().includes(userBranchName.toLowerCase().trim())
        );
        if (match) return String(match._id);
      }
    } catch (_) {}
    return String(branches[0]?._id || "");
  },
};

export default salaryApi;
