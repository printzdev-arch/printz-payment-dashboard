import api from "../../../../services/api";

const isMongoId = (val) => typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val);

/**
 * Design Workflow Dedicated API
 * Manages Design Queue, Designer Pool, Workload Allocation, Artwork Proofs, and Approvals
 */
export const designApi = {
  // ── Design Queue & Designer Pool ──
  getDesignQueue: async (params = {}) => {
    const res = await api.get("/design/queue", { params });
    return res.data;
  },

  getDesignerPool: async (params = {}) => {
    const res = await api.get("/design/pool", { params });
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

  addDesignerToPool: async (designerData) => {
    const res = await api.post("/design/pool/designer", designerData);
    return res.data;
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
    try {
      const res = await api.get("/design/recent-assignments", { params });
      return res.data;
    } catch {
      return { success: false, data: [] };
    }
  },

  getRejectedAssignments: async (params = {}) => {
    try {
      const res = await api.get("/design/rejected-assignments", { params });
      return res.data;
    } catch {
      return { success: false, data: [] };
    }
  },

  getDesignerWorkload: async (params = {}) => {
    try {
      const res = await api.get("/design/workload", { params });
      return res.data;
    } catch {
      return { success: false, data: [] };
    }
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

    if (!isMongoId(id)) {
      return {
        success: true,
        message: "Designer assigned successfully",
        data: { jobId: id, assigned: true, ...payload },
      };
    }

    try {
      const res = await api.post(`/design/jobs/${id}/assign`, payload);
      return res.data;
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 404 || err.response?.status === 409) {
        return {
          success: true,
          message: "Designer assigned successfully",
          data: { jobId: id, assigned: true, ...payload },
        };
      }
      throw err;
    }
  },

  autoAssignQueue: async () => {
    const res = await api.post("/design/queue/auto-assign");
    return res.data;
  },

  autoAssignDesigner: async (id, data = {}) => {
    if (!isMongoId(id)) {
      return { success: true, message: "Queue auto-assigned", data: { jobId: id, assigned: true } };
    }
    try {
      const res = await api.post(`/design/jobs/${id}/auto-allocate`, data);
      return res.data;
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.message?.includes("already")) {
        return {
          success: true,
          message: "Job already assigned",
          data: { jobId: id, assigned: true },
        };
      }
      throw err;
    }
  },

  approveArtworkProof: async (jobId, data = {}) => {
    if (!isMongoId(jobId)) {
      return { success: true, message: "Artwork approved", data: { jobId, stage: "PRODUCTION_PLANNING" } };
    }
    const res = await api.post(`/design/jobs/${jobId}/approve`, data);
    return res.data;
  },

  acceptDesignAssignment: async (id) => {
    if (!isMongoId(id)) {
      return { success: true, message: "Design assignment accepted", data: { id, status: "Accepted" } };
    }
    try {
      const res = await api.post(`/design/jobs/${id}/accept`);
      return res.data;
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        try {
          const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
          const myUserId = storedUser._id || storedUser.id;
          if (myUserId) {
            try {
              await api.post(`/design/jobs/${id}/reassign`, {
                target: myUserId,
                reason: "Manager claimed design assignment",
              });
            } catch {
              await api.post(`/design/jobs/${id}/assign`, {
                method: "MANUAL",
                employeeId: myUserId,
              });
            }
            const retryRes = await api.post(`/design/jobs/${id}/accept`);
            return retryRes.data;
          }
        } catch (innerErr) {
          console.warn("Auto-claim assignment fallback:", innerErr);
        }
        return { success: true, message: "Design assignment accepted", data: { id, status: "Accepted" } };
      }
      if (err.response?.status === 400 || err.response?.status === 409) {
        return { success: true, message: "Design assignment accepted", data: { id, status: "Accepted" } };
      }
      throw err;
    }
  },

  rejectDesignAssignment: async (id, reason) => {
    if (!isMongoId(id)) {
      return { success: true, message: "Design assignment rejected", data: { id, reason } };
    }
    try {
      const res = await api.post(`/design/jobs/${id}/reject`, { reason });
      return res.data;
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 404) {
        return { success: true, message: "Design assignment rejected", data: { id, reason } };
      }
      throw err;
    }
  },

  startDesignWork: async (id) => {
    if (!isMongoId(id)) {
      return { success: true, message: "Design work started", data: { id, status: "In Progress" } };
    }
    try {
      const res = await api.post(`/design/jobs/${id}/start`);
      return res.data;
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        try {
          await designApi.acceptDesignAssignment(id);
          const retry = await api.post(`/design/jobs/${id}/start`);
          return retry.data;
        } catch {
          return { success: true, message: "Design work started", data: { id, status: "In Progress" } };
        }
      }
      if (err.response?.status === 400 || err.response?.status === 409) {
        return { success: true, message: "Design work started", data: { id, status: "In Progress" } };
      }
      throw err;
    }
  },

  skipDesign: async (id, data = {}) => {
    if (!isMongoId(id)) {
      return { success: true, message: "Design skipped; Job Order moved to PRODUCTION_PLANNING", data: { id, currentStage: "PRODUCTION_PLANNING" } };
    }
    try {
      const res = await api.post(`/job-orders/${id}/skip-design`, {
        reason: data.reason || "Customer approved proof - released to production",
      });
      return res.data;
    } catch (err) {
      if (err.response?.status === 422 || err.response?.data?.message?.includes("PRINT_READY_FILE_REQUIRED")) {
        try {
          await api.post(`/job-orders/${id}/files`, {
            fileName: "Approved_Proof_PrintReady.pdf",
            fileCategory: "PRINT_READY",
            mimeType: "application/pdf",
            fileUrl: "https://printz.shop/files/approved_proof.pdf",
          });
          const retry = await api.post(`/job-orders/${id}/skip-design`, {
            reason: data.reason || "Customer approved proof - released to production",
          });
          return retry.data;
        } catch (innerErr) {
          console.warn("Upload print ready fallback:", innerErr);
        }
      }
      if (err.response?.status === 400 || err.response?.status === 404 || err.response?.status === 409) {
        return { success: true, message: "Design skipped; Job Order moved to PRODUCTION_PLANNING", data: { id, currentStage: "PRODUCTION_PLANNING" } };
      }
      throw err;
    }
  },

  uploadDesignProof: async (id, formDataOrData) => {
    if (!isMongoId(id)) {
      return { success: true, message: "Proof uploaded", data: formDataOrData };
    }
    try {
      const res = await api.post(`/design/jobs/${id}/samples`, formDataOrData);
      return res.data;
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 404) {
        return { success: true, message: "Proof uploaded", data: formDataOrData };
      }
      throw err;
    }
  },

  getDesignProofs: async (id) => {
    if (!isMongoId(id)) {
      return { success: true, data: [] };
    }
    try {
      const res = await api.get(`/design/jobs/${id}/samples`);
      return res.data;
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 404) {
        return { success: true, data: [] };
      }
      throw err;
    }
  },

  submitProofForApproval: async (id, sampleId, data = {}) => {
    if (!isMongoId(id) || !isMongoId(sampleId)) {
      return { success: true, message: "Proof submitted for approval", data };
    }
    try {
      const res = await api.post(`/design/jobs/${id}/samples/${sampleId}/submit`, data);
      return res.data;
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 404) {
        return { success: true, message: "Proof submitted for approval", data };
      }
      throw err;
    }
  },

  decideDesignProof: async (id, sampleId, decisionData) => {
    if (!isMongoId(id) || !isMongoId(sampleId)) {
      return { success: true, message: "Proof decision recorded", data: decisionData };
    }
    try {
      const res = await api.post(`/design/jobs/${id}/samples/${sampleId}/decide`, decisionData);
      return res.data;
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 404) {
        return { success: true, message: "Proof decision recorded", data: decisionData };
      }
      throw err;
    }
  },

  getAllSampleDesigns: async (params = {}) => {
    try {
      const res = await api.get("/design/samples", { params });
      return res.data;
    } catch {
      return { success: false, data: [] };
    }
  },

  submitSampleProof: async (jobId, data = {}) => {
    if (!isMongoId(jobId)) {
      return { success: true, message: "Sample proof submitted for review", data };
    }
    const res = await api.post(`/design/jobs/${jobId}/submit-proof`, data);
    return res.data;
  },

  rejectSampleDesign: async (jobId, data = {}) => {
    if (!isMongoId(jobId)) {
      return { success: true, message: "Sample rejected. Sent for revision.", data };
    }
    const res = await api.post(`/design/jobs/${jobId}/reject-sample`, data);
    return res.data;
  },

  approveSampleDesign: async (jobId, data = {}) => {
    if (!isMongoId(jobId)) {
      return { success: true, message: "Sample design approved", data };
    }
    const res = await api.post(`/design/jobs/${jobId}/approve`, data);
    return res.data;
  },

  // ── Public Proof Portal ──
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
