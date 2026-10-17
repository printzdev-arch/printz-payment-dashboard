import api from "../../../../services/api";

/**
 * Customers Dedicated API
 * Manages customer directory, search, registration, and QR customer flow
 */
export const customersApi = {
  // ── Customer Management ──
  getCustomers: async (params = {}) => {
    const query = {
      ...params,
      limit: params.limit || 50,
      q: params.q || params.search || params.query || undefined,
      customerType:
        params.customerType && params.customerType !== "all"
          ? params.customerType
          : undefined,
      customerSource:
        params.customerSource ||
        (params.type && params.type !== "all"
          ? params.type === "company"
            ? "COMPANY"
            : "INDIVIDUAL"
          : undefined),
      isActive:
        params.isActive !== undefined
          ? params.isActive
          : params.status && params.status !== "all"
            ? params.status === "Active" || params.status === "active"
            : undefined,
      branchId:
        params.branchId ||
        (params.branch && params.branch !== "all" && /^[0-9a-fA-F]{24}$/.test(params.branch)
          ? params.branch
          : undefined),
    };
    const res = await api.get("/customers", { params: query });
  //  console.log("Customers Response:", res.data);
    return res.data;
  
  },

  searchCustomers: async (query = "") => {
    const res = await api.get("/customers/search", { params: { q: query } });
    return res.data;
  },

  getCustomerById: async (id) => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },

  createCustomer: async (customerData) => {
    const payload = { ...customerData };
    if (!payload.mobile && payload.phone) {
      payload.mobile = payload.phone;
    }
    if (!payload.phone && payload.mobile) {
      payload.phone = payload.mobile;
    }
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
    const res = await api.post("/customers", payload);
    
    return res.data;
  },

  updateCustomer: async (id, customerData) => {
    const res = await api.patch(`/customers/${id}`, customerData);
    return res.data;
  },

  deleteCustomer: async (id) => {
    const res = await api.delete(`/customers/${id}`);
    return res.data;
  },

  getCustomerRequests: async (params = {}) => {
    const res = await api.get("/customer-requests", { params });
    return res.data;
  },

  getCustomerRequestById: async (id) => {
    const res = await api.get(`/customer-requests/${id}`);
    return res.data;
  },

  updateCustomerRequestStatus: async (id, data) => {
    const res = await api.patch(`/customer-requests/${id}/status`, data);
    return res.data;
  },

  convertCustomerRequestToJob: async (id) => {
    const res = await api.post(`/customer-requests/${id}/convert-to-job`);
    return res.data;
  },

  // ── Public Self-Service & QR Endpoints ──
  checkCustomerExists: async (params) => {
    const res = await api.get("/public/check-customer", { params });
    return res.data;
  },

  submitPublicJobRequest: async (formData) => {
    const res = await api.post("/public/job-requests", formData);
    return res.data;
  },

  // ── Metadata & Cross-feature Helpers ──
  getBranches: async () => {
    const res = await api.get("/branches");
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
};

export default customersApi;
