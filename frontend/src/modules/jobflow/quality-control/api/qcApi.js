import api from "../../../../shared/services/api";

/**
 * Quality Control & Rework Dedicated API
 * Manages Quality Inspections, Multi-point Criteria Checks, Rework Triggers, and Reprints
 */
export const qcApi = {
  // ── Quality Checks Execution & Queries ──
  getPendingQualityChecks: async (params = {}) => {
    const res = await api.get("/quality-checks/pending", { params });
    return res.data;
  },

  getQualityChecks: async (params = {}) => {
    const res = await api.get("/quality-checks", { params });
    return res.data;
  },

  getQualityCheckById: async (id) => {
    const res = await api.get(`/quality-checks/${id}`);
    return res.data;
  },

  getQcHistory: async (productionOrderId) => {
    const res = await api.get(`/production-orders/${productionOrderId}/qc-history`);
    return res.data;
  },

  getQualityCheckReport: async (id) => {
    const res = await api.get(`/quality-checks/${id}/report`);
    return res.data;
  },

  // Any error (validation, wrong status, not found) is thrown so the screen can show it
  performQualityCheck: async (productionOrderId, checkData) => {
    const payload = { ...checkData, result: checkData.result || (checkData.passed ? "PASS" : "ISSUE") };
    const res = await api.post(`/production-orders/${productionOrderId}/quality-checks`, payload);
    return res.data;
  },

  // ── Reprint Requests ──
  getReprintRequests: async (params = {}) => {
    const res = await api.get("/reprint-requests", { params });
    return res.data;
  },

  createReprintRequest: async (jobId, data) => {
    const res = await api.post(`/job-orders/${jobId}/reprint-requests`, data);
    return res.data;
  },

  approveReprintRequest: async (reprintRequestId) => {
    const res = await api.post(`/reprint-requests/${reprintRequestId}/approve`);
    return res.data;
  },

  rejectReprintRequest: async (reprintRequestId, data = {}) => {
    const res = await api.post(`/reprint-requests/${reprintRequestId}/reject`, data);
    return res.data;
  },

  // ── Associated Production & Job Orders ──
  getProductionOrders: async (params = {}) => {
    const res = await api.get("/production-orders", { params });
    return res.data;
  },

  getProductionOrderById: async (id) => {
    const res = await api.get(`/production-orders/${id}`);
    return res.data;
  },

  getJobOrders: async (params = {}) => {
    const res = await api.get("/job-orders", { params });
    return res.data;
  },

  getJobOrderById: async (id) => {
    const res = await api.get(`/job-orders/${id}`);
    return res.data;
  },

  getBranches: async () => {
    const res = await api.get("/branches");
    return res.data;
  },
};

export const qualityControlApi = qcApi;
export default qcApi;
