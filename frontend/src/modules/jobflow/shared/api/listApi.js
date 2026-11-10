import api from "../../../../shared/services/api";

/**
 * Plain list lookups shared by several job-flow pages (customers, job orders, counts, branches).
 * They are merged last in jobFlowApi, so these versions are the ones pages get from jobFlowApi.
 */
export const listApi = {
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

export default listApi;
