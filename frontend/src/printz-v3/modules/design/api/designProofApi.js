/**
 * PrintZ V3 - Customer Design Proof Approval API Layer (Step 6)
 * Aligned with Backend Endpoints: /job-orders/:id/samples, /job-orders/:id/samples/:sampleId/decision
 */
import api from "../../../../services/api";

/**
 * Fetch all customer pending/historical design proof approvals
 */
export async function getCustomerDesignApprovals() {
  try {
    const res = await api.get("/job-orders", {
      params: { stage: "SAMPLE_APPROVAL" }
    });
    return res.data?.data || (Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    console.error("Failed to fetch customer design approvals:", err);
    return [];
  }
}

/**
 * Fetch single customer-safe design proof for review
 */
export async function getCustomerDesignApproval(identifier) {
  try {
    // If identifier is a public token
    if (typeof identifier === "string" && identifier.length > 20 && !identifier.startsWith("job_") && !identifier.startsWith("des_")) {
      try {
        const tokenRes = await api.get(`/public/design-approvals/${identifier}`);
        return tokenRes.data?.data || tokenRes.data;
      } catch (e) {}
    }
    const res = await api.get(`/job-orders/${identifier}`);
    return res.data?.data || res.data;
  } catch (err) {
    try {
      const res = await api.get(`/customer/design-approvals/${identifier}`);
      return res.data?.data || res.data;
    } catch (e) {
      console.error(`Failed to fetch design proof approval for ${identifier}:`, err);
      throw err?.response?.data || err;
    }
  }
}

/**
 * Fetch latest/current proof details specifically
 */
export async function getCurrentProof(jobId) {
  try {
    const res = await api.get(`/job-orders/${jobId}`);
    const job = res.data?.data || res.data;
    const samples = job?.samples || [];
    return samples.length > 0 ? samples[samples.length - 1] : job;
  } catch (err) {
    console.error(`Failed to fetch current proof for ${jobId}:`, err);
    return null;
  }
}

/**
 * Customer Approves Current Design Proof
 * Maps to backend POST /job-orders/:id/samples/:sampleId/decision or /public/design-approvals/:token/decision
 */
export async function customerApproveProof(identifier, payload = {}) {
  try {
    // 1. Try public token decision if identifier looks like token
    if (typeof identifier === "string" && identifier.length > 20 && !identifier.startsWith("job_") && !identifier.startsWith("des_")) {
      try {
        const tokenRes = await api.post(`/public/design-approvals/${identifier}/decision`, {
          decision: "APPROVED",
          comments: payload.comments || payload.notes || ""
        });
        return tokenRes.data?.data || tokenRes.data;
      } catch (e) {}
    }

    const sampleId = payload.sampleId || payload.proofFileId || "current";
    try {
      const res = await api.post(`/job-orders/${identifier}/samples/${sampleId}/decision`, {
        decision: "APPROVED",
        notes: payload.comments || payload.notes || ""
      });
      return res.data;
    } catch (e) {
      const res = await api.post(`/customer/design-approvals/${identifier}/decision`, {
        decision: "APPROVED",
        comments: payload.comments || payload.notes || ""
      });
      return res.data;
    }
  } catch (err) {
    console.error(`Failed to approve design proof for ${identifier}:`, err);
    throw err?.response?.data || err;
  }
}

/**
 * Customer Requests Revision / Changes on Current Design Proof
 */
export async function customerRequestProofChanges(identifier, payload = {}) {
  try {
    if (typeof identifier === "string" && identifier.length > 20 && !identifier.startsWith("job_") && !identifier.startsWith("des_")) {
      try {
        const tokenRes = await api.post(`/public/design-approvals/${identifier}/decision`, {
          decision: "REVISION_REQUESTED",
          comments: payload.comments || payload.reason || ""
        });
        return tokenRes.data?.data || tokenRes.data;
      } catch (e) {}
    }

    const sampleId = payload.sampleId || payload.proofFileId || "current";
    try {
      const res = await api.post(`/job-orders/${identifier}/samples/${sampleId}/decision`, {
        decision: "REJECTED",
        notes: payload.comments || payload.reason || ""
      });
      return res.data;
    } catch (e) {
      const res = await api.post(`/customer/design-approvals/${identifier}/decision`, {
        decision: "REJECTED",
        comments: payload.comments || payload.reason || ""
      });
      return res.data;
    }
  } catch (err) {
    console.error(`Failed to request changes for proof ${identifier}:`, err);
    throw err?.response?.data || err;
  }
}

/**
 * Fetch complete proof version history with reviews and feedback
 */
export async function getProofHistory(jobId) {
  try {
    const res = await api.get(`/job-orders/${jobId}`);
    const job = res.data?.data || res.data;
    return job?.samples || [];
  } catch (err) {
    console.error(`Failed to fetch proof history for ${jobId}:`, err);
    return [];
  }
}

/**
 * Manager records customer decision directly
 */
export async function managerRecordCustomerDecision(jobId, payload = {}) {
  return customerApproveProof(jobId, payload);
}
