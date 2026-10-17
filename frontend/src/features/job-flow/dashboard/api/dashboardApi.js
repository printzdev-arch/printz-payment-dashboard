import api from "../../../../services/api";

/**
 * JobFlow Dashboard Dedicated API
 * Manages metrics summary, recent workflow jobs, customer aggregates, and pipeline KPIs
 */
export const dashboardApi = {
  getJobOrders: async (params = {}) => {
    const res = await api.get("/job-orders", { params });
    return res.data;
  },

  getCustomers: async (params = {}) => {
    const res = await api.get("/customers", { params });
    return res.data;
  },

  getJobOrderCounts: async () => {
    const res = await api.get("/job-orders/counts");
    return res.data;
  },

  getBranches: async () => {
    const res = await api.get("/branches");
    return res.data;
  },
};

export default dashboardApi;
