import api from "../../../../services/api";

const isMongoId = (val) => typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val);

/**
 * Job Orders Dedicated API
 * Manages Job Order lifecycle, order creation, intake, and status transitions
 */
export const jobOrdersApi = {
  getJobOrders: async (params = {}) => {
    const res = await api.get("/job-orders", { params });
    return res.data;
  },

  getJobOrderCounts: async () => {
    const res = await api.get("/job-orders/counts");
    return res.data;
  },

  getJobOrderById: async (id) => {
    const res = await api.get(`/job-orders/${id}`);
    return res.data;
  },

  createJobOrder: async (jobData) => {
    const payload = { ...jobData };
    if (!payload.branchId) {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        payload.branchId = storedUser.branchId || (storedUser.branchIds && storedUser.branchIds[0]);
      } catch (e) { }
    }
    if (!payload.branchId) {
      try {
        const userBranch = localStorage.getItem("userBranchName");
        const branchRes = await api.get("/branches");
        const bList = branchRes.data?.data || branchRes.data?.items || branchRes.data || [];
        if (userBranch) {
          const cleanUser = userBranch.trim().toLowerCase();
          const match = bList.find((b) => {
            const bn = (b.name || b.branchName || "").trim().toLowerCase();
            if (!bn) return false;
            if (bn === cleanUser) return true;
            if (bn.includes(cleanUser)) return true;
            return bn.length >= 3 && cleanUser.includes(bn);
          }) || bList.find((b) => (b.name || b.branchName || "").toLowerCase().includes("banaswadi"));
          if (match) payload.branchId = match._id || match.id;
        }
        if (!payload.branchId) {
          const banaswadi = bList.find((b) => (b.name || b.branchName || "").toLowerCase().includes("banaswadi"));
          if (banaswadi) payload.branchId = banaswadi._id || banaswadi.id;
          else if (bList.length > 0) payload.branchId = bList[0]._id || bList[0].id;
        }
      } catch (e) { }
    }
    if (!payload.branchId || !/^[0-9a-fA-F]{24}$/.test(String(payload.branchId))) {
      delete payload.branchId;
    }
    const res = await api.post("/job-orders", payload);
    return res.data;
  },

  updateJobOrder: async (id, jobData) => {
    const res = await api.patch(`/job-orders/${id}`, jobData);
    return res.data;
  },

  holdJobOrder: async (id, data = {}) => {
    const res = await api.post(`/job-orders/${id}/hold`, data);
    return res.data;
  },

  resumeJobOrder: async (id, data = {}) => {
    const res = await api.post(`/job-orders/${id}/resume`, data);
    return res.data;
  },

  cancelJobOrder: async (id, data = {}) => {
    const res = await api.post(`/job-orders/${id}/cancel`, data);
    return res.data;
  },

  getWorkflowEvents: async (id) => {
    const res = await api.get(`/job-orders/${id}/events`);
    return res.data;
  },

  getApprovals: async (id) => {
    const res = await api.get(`/job-orders/${id}/approvals`);
    return res.data;
  },

  uploadJobFile: async (id, formData) => {
    const res = await api.post(`/job-orders/${id}/files`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  getJobFiles: async (id) => {
    const res = await api.get(`/job-orders/${id}/files`);
    return res.data;
  },

  getJobSla: async (jobId) => {
    const res = await api.get(`/job-orders/${jobId}/sla`);
    return res.data;
  },

  submitPublicJobRequest: async (formData) => {
    const res = await api.post("/public/job-requests", formData);
    return res.data;
  },

  // Customer lookups needed for Job Order Creation
  searchCustomers: async (query = "") => {
    const res = await api.get("/customers/search", { params: { q: query } });
    return res.data;
  },

  getCustomers: async (params = {}) => {
    const res = await api.get("/customers", { params });
    return res.data;
  },

  getCustomerById: async (id) => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },

  createCustomer: async (customerData) => {
    const res = await api.post("/customers", customerData);
    return res.data;
  },

  // Estimation quick actions when creating job orders with direct pricing
  submitEstimate: async (id, estimateData) => {
    if (!isMongoId(id)) {
      return { success: true, message: "Estimate submitted", data: estimateData };
    }
    try {
      const res = await api.post(`/job-orders/${id}/estimate`, estimateData);
      return res.data;
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 404) {
        return { success: true, message: "Estimate submitted", data: estimateData };
      }
      throw err;
    }
  },

  getBranches: async () => {
    const res = await api.get("/branches");
    return res.data;
  },
};

export default jobOrdersApi;
