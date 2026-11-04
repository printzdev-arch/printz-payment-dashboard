import api from "../../../../services/api";

/**
 * Design Workflow Dedicated API
 * Manages the Design Queue, the designer pool, workload, artwork proofs and approvals.
 *
 * Every call returns the server's real answer: when the server refuses (not your job, wrong stage, not a
 * manager...) the error is thrown so the screen can show the server's message instead of a made-up success.
 */
export const designApi = {
  // ── Design Queue & Designer Pool ──
  getDesignQueue: async (params = {}) => {
    const res = await api.get("/design/queue", { params, timeout: 60000 });
    return res.data;
  },

  getDesignerPool: async (params = {}) => {
    const res = await api.get("/design/pool", { params, timeout: 60000 });
    const payload = res.data?.data || res.data || {};
    const designersList = Array.isArray(payload?.designers)
      ? payload.designers
      : Array.isArray(payload)
      ? payload
      : [];
    return {
      success: true,
      data: designersList,
      designers: designersList,
      nextDesigner: payload?.nextDesigner || null,
      lastAssigned: payload?.lastAssigned || null,
      raw: payload,
    };
  },

  updateDesignerInPool: async (id, data) => {
    const res = await api.patch(`/design/pool/designer/${id}`, data);
    return res.data;
  },

  updateGlobalMaxLoad: async (maxLoad) => {
    const res = await api.patch("/design/settings/max-load", { maxLoad });
    return res.data;
  },

  getMyDesignJobs: async (params = {}) => {
    const res = await api.get("/design/my-jobs", { params });
    return res.data;
  },

  getRecentDesignAssignments: async (params = {}) => {
    const res = await api.get("/design/recent-assignments", { params });
    return res.data;
  },

  getRejectedAssignments: async (params = {}) => {
    const res = await api.get("/design/rejected-assignments", { params });
    return res.data;
  },

  getDesignerWorkload: async (params = {}) => {
    const res = await api.get("/design/workload", { params });
    return res.data;
  },

  // ── Assignment & Allocation Actions ──
  assignDesigner: async (id, data = {}) => {
    const empId = data.employeeId || data.designerId;
    const method = data.method || (empId ? "MANUAL" : "ROUND_ROBIN");
    const payload = {
      method,
      ...(empId ? { employeeId: empId, designerId: empId } : {}),
      ...data,
    };
    const res = await api.post(`/design/jobs/${id}/assign`, payload);
    return res.data;
  },

  autoAssignQueue: async () => {
    const res = await api.post("/design/queue/auto-assign");
    return res.data;
  },

  autoAssignDesigner: async (id, data = {}) => {
    const res = await api.post(`/design/jobs/${id}/auto-allocate`, data);
    return res.data;
  },

  reassignDesigner: async (id, data = {}) => {
    const res = await api.post(`/design/jobs/${id}/reassign`, data);
    return res.data;
  },

  approveArtworkProof: async (jobId, data = {}) => {
    const res = await api.post(`/design/jobs/${jobId}/approve`, data);
    return res.data;
  },

  acceptDesignAssignment: async (id) => {
    const res = await api.post(`/design/jobs/${id}/accept`);
    return res.data;
  },

  rejectDesignAssignment: async (id, reason) => {
    const res = await api.post(`/design/jobs/${id}/reject`, { reason });
    return res.data;
  },

  startDesignWork: async (id) => {
    const res = await api.post(`/design/jobs/${id}/start`);
    return res.data;
  },

  uploadDesignProof: async (id, formDataOrData) => {
    const res = await api.post(`/design/jobs/${id}/samples`, formDataOrData);
    return res.data;
  },

  getDesignProofs: async (id) => {
    const res = await api.get(`/design/jobs/${id}/samples`);
    return res.data;
  },

  submitProofForApproval: async (id, sampleId, data = {}) => {
    const res = await api.post(`/design/jobs/${id}/samples/${sampleId}/submit`, data);
    return res.data;
  },

  decideDesignProof: async (id, sampleId, decisionData) => {
    const res = await api.post(`/design/jobs/${id}/samples/${sampleId}/decide`, decisionData);
    return res.data;
  },

  getAllSampleDesigns: async (params = {}) => {
    const res = await api.get("/design/samples", { params });
    return res.data;
  },

  submitSampleProof: async (jobId, data = {}) => {
    const res = await api.post(`/design/jobs/${jobId}/submit-proof`, data);
    return res.data;
  },

  rejectSampleDesign: async (jobId, data = {}) => {
    const res = await api.post(`/design/jobs/${jobId}/reject-sample`, data);
    return res.data;
  },

  approveSampleDesign: async (jobId, data = {}) => {
    const res = await api.post(`/design/jobs/${jobId}/approve`, data);
    return res.data;
  },

  // ── Public Proof Portal (registered customers only; a walk-in customer approves in person) ──
  getPublicDesignProof: async (token) => {
    const res = await api.get(`/public/design-approvals/${token}`);
    return res.data;
  },

  submitPublicProofDecision: async (token, decisionData) => {
    const res = await api.post(`/public/design-approvals/${token}/decision`, decisionData);
    return res.data;
  },

  submitDesignerRating: async (jobId, ratingData) => {
    const res = await api.post(`/job-orders/${jobId}/designer-ratings`, ratingData);
    return res.data;
  },

  // ── General helpers ──
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

export default designApi;
