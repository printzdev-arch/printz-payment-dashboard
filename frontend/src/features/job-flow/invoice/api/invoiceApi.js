import api from "../../../../services/api";

/**
 * Invoice Management Dedicated API
 * Phase 2: Invoice Generation, Live Variance Calculation, Approvals, Finalization & WhatsApp Sharing
 */
export const invoiceApi = {
  // ── 1. Fetch Invoicing Eligibility & Pending Queue ──
  getPendingEligibleInvoices: async (params = {}) => {
    const res = await api.get("/invoices/pending", { params });
    return res.data;
  },

  getPendingJobSnapshot: async (jobOrderId) => {
    const res = await api.get(`/invoices/pending/${jobOrderId}`);
    return res.data;
  },

  // ── 2. Invoices Retrieval ──
  getInvoices: async (params = {}) => {
    const res = await api.get("/invoices", { params });
    return res.data;
  },

  getInvoiceById: async (id) => {
    const res = await api.get(`/invoices/${id}`);
    return res.data;
  },

  // ── 3. Draft Invoicing & Server Calculation ──
  createDraftInvoice: async (data) => {
    const res = await api.post("/invoices/draft", data);
    return res.data;
  },

  updateDraftInvoice: async (id, data) => {
    const res = await api.patch(`/invoices/${id}`, data);
    return res.data;
  },

  calculateInvoice: async (id, data) => {
    const res = await api.post(`/invoices/${id}/calculate`, data);
    return res.data;
  },

  // ── 4. Approvals & Finalization (Number Locking) ──
  submitInvoiceForApproval: async (id, data) => {
    const res = await api.post(`/invoices/${id}/submit`, data);
    return res.data;
  },

  approveInvoiceVariance: async (id, data) => {
    const res = await api.post(`/invoices/${id}/approve-variance`, data);
    return res.data;
  },

  finalizeInvoice: async (id) => {
    const res = await api.post(`/invoices/${id}/finalize`);
    return res.data;
  },

  // ── 5. PDF & WhatsApp Sharing ──
  getInvoicePdf: async (id, params = {}) => {
    const res = await api.get(`/invoices/${id}/pdf`, { params });
    return res.data;
  },

  shareInvoice: async (id, data) => {
    const res = await api.post(`/invoices/${id}/share`, data);
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
};

export default invoiceApi;
