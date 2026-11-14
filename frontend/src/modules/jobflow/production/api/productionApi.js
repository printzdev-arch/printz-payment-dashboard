import api from "../../../../shared/services/api";

/**
 * Production Planning & Shop Floor Operations Dedicated API
 * Manages Production Orders, Work Center Queues, Operation Tracking, QC and Reprints.
 *
 * Every method returns the response body ({ success, message, data, ... }).
 * Errors are NOT swallowed: callers show the server message (error.response.data.message).
 */

// Accepts a plain string or an object and returns an object body
const withReason = (value, key = "reason") =>
  value && typeof value === "object" ? value : { [key]: value || "" };
// Non-admin users (e.g. managers) are restricted to their own branch.
// Returns that branch id, or "" when the user may see every branch.
export const getLockedBranchId = () => {
  try {
    const raw = localStorage.getItem("user");
    const u = raw ? JSON.parse(raw) : {};
    const role = String(u.role || localStorage.getItem("userRole") || "");
    if (role.toLowerCase() === "admin" || role.toUpperCase() === "SUPER_ADMIN") return "";
    const id = u.branchId?._id || u.branchId || "";
    return id ? String(id) : "";
  } catch (_) {
    return "";
  }
};

// Forces the locked branch onto outgoing query params.
const scoped = (params = {}) => {
  const locked = getLockedBranchId();
  return locked ? { ...params, branchId: locked } : params;
};
export const productionApi = {
  // ── Production Orders Planning & Lifecycle ──
  // `id` is the production order id. Body: { action: "DRAFT" | "CONFIRM", ...plan }
  planProductionOrder: async (id, planData) => {
    const res = await api.post(`/production-orders/plan/${id}`, planData);
    return res.data;
  },

  getPlanningJobs: async (params = {}) => {
    const res = await api.get("/production/planning", { params: scoped(params) });
    return res.data;
  },

  getPlanningJobById: async (id) => {
    const res = await api.get(`/production/planning/${id}`);
    return res.data;
  },

  getProductionOrders: async (params = {}) => {
    const res = await api.get("/production-orders", { params: scoped(params) });
    return res.data;
  },

  // Dashboard KPI counts, counted by the server (not from a paged list)
  getProductionStats: async (params = {}) => {
    const res = await api.get("/production-orders/stats", { params: scoped(params) });
    return res.data;
  },

  getProductionOrderById: async (id) => {
    const res = await api.get(`/production-orders/${id}`);
    return res.data;
  },

  updateProductionOrder: async (id, data) => {
    const res = await api.patch(`/production-orders/${id}`, data);
    return res.data;
  },

  // Reason is required for hold and cancel
  holdProductionOrder: async (id, reason = "") => {
    const res = await api.post(`/production-orders/${id}/hold`, withReason(reason));
    return res.data;
  },

  resumeProductionOrder: async (id, reason = "") => {
    const res = await api.post(`/production-orders/${id}/resume`, withReason(reason));
    return res.data;
  },

  cancelProductionOrder: async (id, reason = "") => {
    const res = await api.post(`/production-orders/${id}/cancel`, withReason(reason));
    return res.data;
  },

  updateProductionOperations: async (id, operations) => {
    const res = await api.put(`/production-orders/${id}/operations`, { operations });
    return res.data;
  },

  // ── Work Center Operations Queue ──
  getOperationQueue: async (params = {}) => {
    const res = await api.get("/production-operations/queue", { params: scoped(params) });
    return res.data;
  },

  getOperationQueueCounts: async (branchId) => {
    const res = await api.get("/production-operations/queue/counts", {
      params: scoped(branchId ? { branchId } : {}),
    });
    return res.data;
  },

  assignOperation: async (operationId, data = {}) => {
    const res = await api.post(`/production-operations/${operationId}/assign`, data);
    return res.data;
  },

  // data: { machineId?, machine?, assignedEmployee?, inputQty?, remarks? }
  startOperation: async (operationId, data = {}) => {
    const res = await api.post(`/production-operations/${operationId}/start`, data);
    return res.data;
  },

  // Reason is required
  pauseOperation: async (operationId, reason = "") => {
    const res = await api.post(`/production-operations/${operationId}/pause`, withReason(reason));
    return res.data;
  },

  resumeOperation: async (operationId) => {
    const res = await api.post(`/production-operations/${operationId}/resume`);
    return res.data;
  },

  completeOperation: async (operationId, completionData) => {
    const res = await api.post(`/production-operations/${operationId}/complete`, completionData);
    return res.data;
  },

  // data: { failureReason, remarks, affectedQty }
  failOperation: async (operationId, data = {}) => {
    const res = await api.post(`/production-operations/${operationId}/fail`, withReason(data, "remarks"));
    return res.data;
  },

  retryOperation: async (operationId) => {
    const res = await api.post(`/production-operations/${operationId}/retry`);
    return res.data;
  },

  // Reason is required (string or { reason })
  skipOperation: async (operationId, reason = "") => {
    const res = await api.post(`/production-operations/${operationId}/skip`, withReason(reason));
    return res.data;
  },

  // ── Reprint Requests ──
  // params: { status (comma separated, PENDING accepted), search, page, limit }
  getReprintRequests: async (params = {}) => {
    const res = await api.get("/reprint-requests", { params: scoped(params) });
    return res.data;
  },

  getReprintRequestById: async (id) => {
    const res = await api.get(`/reprint-requests/${id}`);
    return res.data;
  },

  createReprintRequest: async (jobId, data) => {
    const res = await api.post(`/job-orders/${jobId}/reprint-requests`, data);
    return res.data;
  },

  // data: { comments?, markAsUrgent? }  (manager only)
  approveReprintRequest: async (reprintRequestId, data = {}) => {
    const res = await api.post(`/reprint-requests/${reprintRequestId}/approve`, data);
    return res.data;
  },

  // A reason is required (string, or { rejectionReason })  (manager only)
  rejectReprintRequest: async (reprintRequestId, data = {}) => {
    const body =
      typeof data === "string" ? { rejectionReason: data } : { ...data };
    if (!body.rejectionReason) {
      body.rejectionReason = body.comments || body.reason || "";
    }
    const res = await api.post(`/reprint-requests/${reprintRequestId}/reject`, body);
    return res.data;
  },

  // ── Job Orders & Branch Helpers ──
  getJobOrders: async (params = {}) => {
    const res = await api.get("/job-orders", { params: scoped(params) });
    return res.data;
  },

  getJobOrderById: async (id) => {
    const res = await api.get(`/job-orders/${id}`);
    return res.data;
  },

  getBranches: async () => {
    const res = await api.get("/branches");
    const locked = getLockedBranchId();
    if (!locked) return res.data;
    // Locked users only ever see their own branch
    const d = res.data;
    const list = Array.isArray(d) ? d : d?.data || d?.items || d?.branches || [];
    return list.filter((b) => String(b._id) === locked);
  },


    // ── Machines & Operators ──
  // params: { from, to, branchId, status, type, search, shiftHours, lookup }
  getMachines: async (params = {}) => {
    const res = await api.get("/production-resources/machines", { params: scoped(params) });
    return res.data;
  },

  getMachineById: async (id, params = {}) => {
    const res = await api.get(`/production-resources/machines/${id}`, { params: scoped(params) });
    return res.data;
  },

  // params: { from, to, branchId, status, search, lookup }
  getOperators: async (params = {}) => {
    const res = await api.get("/production-resources/operators", { params: scoped(params) });
    return res.data;
  },

  // Stock items from the existing stock collection (read only): { search?, limit? }
  getStocks: async (params = {}) => {
    const res = await api.get("/production-resources/stocks", { params: scoped(params) });
    return res.data;
  },

    // ── Reports ──
  getReportTypes: async () => api.get("/production-reports").then((r) => r.data),
  getReport: async (type, params = {}) => api.get(`/production-reports/${type}`, { params: scoped(params) }).then((r) => r.data),
  exportReport: async (type, params = {}) =>
    api.get(`/production-reports/${type}/export`, { params: scoped(params), responseType: "blob" }),

      // ── Dashboard ──
  getProductionDashboard: async (params = {}) => api.get("/production-dashboard", { params: scoped(params) }).then((r) => r.data),
};

export default productionApi;