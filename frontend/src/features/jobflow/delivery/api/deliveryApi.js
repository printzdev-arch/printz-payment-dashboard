import api from "../../../../services/api";

/**
 * Delivery Management Dedicated API
 * Manages Delivery Orders, Ready-for-Delivery review, Packing, Dispatch, OTP verification, and Handover proof
 */
export const deliveryApi = {
  // ── Step 1: Manager Review (Ready for Delivery Queue) ──
  getReadyJobsForDelivery: async (params = {}) => {
    const res = await api.get("/delivery-orders/ready-jobs", { params });
    return res.data;
  },

  reviewJob: async (jobOrderId, data = {}) => {
    const res = await api.post(`/delivery-orders/review-job/${jobOrderId}`, data);
    return res.data;
  },

  // ── Step 2: Delivery Orders CRUD ──
  getDeliveryOrders: async (params = {}) => {
    const res = await api.get("/delivery-orders", { params });
    return res.data;
  },

  getDeliveryStaff: async (params = {}) => {
    try {
      const res = await api.get("/delivery-orders/delivery-staff", { params });
      return res.data;
    } catch {
      const res = await api.get("/employees", { params });
      return res.data;
    }
  },

  getDeliveryOrderById: async (id) => {
    const res = await api.get(`/delivery-orders/${id}`);
    return res.data;
  },

  createDeliveryOrder: async (data) => {
    const res = await api.post("/delivery-orders", data);
    return res.data;
  },

  updateDeliveryDetails: async (id, data) => {
    const res = await api.put(`/delivery-orders/${id}`, data);
    return res.data;
  },

  // ── Step 3: Assign Delivery & Send Details ──
  assignDeliveryOrder: async (id, data) => {
    const res = await api.post(`/delivery-orders/${id}/assign`, data);
    return res.data;
  },

  // ── Step 4: Pack & Verify Goods ──
  packDeliveryOrder: async (id, data = {}) => {
    const res = await api.post(`/delivery-orders/${id}/pack`, data);
    return res.data;
  },

  // ── Step 5: Dispatch or Counter Pickup ──
  dispatchDeliveryOrder: async (id, data = {}) => {
    const res = await api.post(`/delivery-orders/${id}/dispatch`, data);
    return res.data;
  },

  // ── OTP Handover Verification ──
  generateOtp: async (id) => {
    const res = await api.post(`/delivery-orders/${id}/generate-otp`);
    return res.data;
  },

  verifyOtp: async (id, data) => {
    const res = await api.post(`/delivery-orders/${id}/verify-otp`, data);
    return res.data;
  },

  // ── Step 6 & 7: Handover Evidence (Proof) & Delivery Confirmation ──
  recordHandoverEvidence: async (id, data) => {
    const res = await api.post(`/delivery-orders/${id}/proof`, data);
    return res.data;
  },

  deliverDeliveryOrder: async (id, data) => {
    const res = await api.post(`/delivery-orders/${id}/deliver`, data);
    return res.data;
  },

  deliverOrder: async (id, data) => {
    const res = await api.post(`/delivery-orders/${id}/deliver`, data);
    return res.data;
  },

  getDeliveryProof: async (id) => {
    const res = await api.get(`/delivery-orders/${id}/proof`);
    return res.data;
  },

  getDeliveryProofs: async (params = {}) => {
    const res = await api.get("/delivery-proofs", { params });
    return res.data;
  },

  // ── Job Orders & Branch Helpers ──
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

export default deliveryApi;
