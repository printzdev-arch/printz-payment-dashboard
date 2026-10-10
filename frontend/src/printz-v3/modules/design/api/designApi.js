/**
 * PrintZ V3 - Design API Layer (Step 5)
 * Aligned with Backend Endpoints: /design/queue, /design/pool, /design/jobs/:id/assign, /design/my-jobs
 */
import api from "../../../../services/api";

/**
 * Fetch all design queue assignments for branch/manager
 */
/**
 * Fetch all design queue assignments for branch/manager
 */
export async function getDesignQueue(params = {}) {
  try {
    let queueItems = [];
    // Sanitize query params so we never send literal "ALL" or bogus keys to backend
    const sanitizedParams = {};
    if (params.priority && params.priority !== "ALL") sanitizedParams.priority = params.priority;
    if (params.search && params.search.trim()) sanitizedParams.search = params.search.trim();

    try {
      const res = await api.get("/design/queue", { params: sanitizedParams });
      const d = res.data;
      if (Array.isArray(d)) queueItems = d;
      else if (Array.isArray(d?.data)) queueItems = d.data;
      else if (Array.isArray(d?.assignments)) queueItems = d.assignments;
    } catch (e) {
      console.warn("Queue endpoint error:", e);
    }

    // Also fetch all jobs in design stages from /job-orders
    try {
      const jobsRes = await api.get("/job-orders", {
        params: { limit: 100 }
      });
      const rawJobs = jobsRes.data?.data || (Array.isArray(jobsRes.data) ? jobsRes.data : []);
      const designStages = [
        "DESIGN_QUEUE",
        "DESIGN_ASSIGNED",
        "DESIGN_IN_PROGRESS",
        "CUSTOMER_PROOFING",
        "SAMPLE_APPROVAL",
        "REVISION"
      ];

      const designJobs = rawJobs.filter((j) => {
        const stage = (j.currentStage || j.stage || "").toUpperCase();
        const status = (j.status || "").toUpperCase();
        return designStages.includes(stage) || status === "DESIGN";
      });

      const seenIds = new Set(queueItems.map((q) => String(q._id || q.id || q.jobOrderId)));
      for (const dj of designJobs) {
        const djId = String(dj._id || dj.id);
        if (!seenIds.has(djId)) {
          seenIds.add(djId);
          queueItems.push(dj);
        }
      }
    } catch (jobsErr) {
      console.warn("Could not fetch job orders for design queue:", jobsErr);
    }

    return queueItems.map((j) => {
      const stage = (j.currentStage || j.stage || "").toUpperCase();
      const designerObj = typeof j.designerId === "object" ? j.designerId : null;
      const designerName = designerObj?.name || j.designerName || j.assignedDesignerName || (j.designerId ? "Assigned Designer" : "");
      
      let status = "UNASSIGNED";
      if (stage === "DESIGN_QUEUE") status = "PENDING_ASSIGNMENT";
      else if (stage === "DESIGN_ASSIGNED" || j.designerId) status = "ASSIGNED";
      else if (stage === "DESIGN_IN_PROGRESS") status = "IN_PROGRESS";
      else if (stage === "CUSTOMER_PROOFING" || stage === "SAMPLE_APPROVAL") status = "PROOF_PENDING";
      else if (stage === "REVISION") status = "REVISION";
      else if (j.status) status = j.status;

      const firstItem = j.items?.[0] || {};
      const jobNo = j.jobNo || "JOB-PENDING";

      return {
        id: j._id || j.id,
        _id: j._id || j.id,
        assignmentNo: j.assignmentNo || `DES-${jobNo.replace(/^JO-/, "")}`,
        jobOrderId: j._id || j.jobOrderId,
        jobNo,
        customerName: j.customerName || j.customerSnapshot?.name || "Walk-in Customer",
        customerMobile: j.customerPhone || j.customerSnapshot?.mobile || "",
        itemName: firstItem.itemName || j.title || "Custom Artwork",
        productType: firstItem.productType || firstItem.itemName || j.title || "Custom Artwork",
        quantity: Number(firstItem.quantity || j.quantity || 1),
        unit: firstItem.unit || j.unit || "PCS",
        status,
        priority: j.priority || "NORMAL",
        designerId: (designerObj?._id || j.designerId) || null,
        designerName: designerName || null,
        assignedDesignerName: designerName || null,
        assignedDesignerCode: designerName ? designerName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "GD",
        dueDate: j.dueDate,
        createdAt: j.createdAt,
        slaUrgency: j.slaUrgency || "1h 40m",
        requirementSnapshot: {
          paperType: firstItem.paperType || firstItem.specification || "300 GSM Art Card",
          size: firstItem.paperSize || "Standard",
          quantity: Number(firstItem.quantity || j.quantity || 1),
          unit: firstItem.unit || j.unit || "PCS",
          customerNotes: j.remarks || j.customerRequirements || ""
        },
        ...j
      };
    });
  } catch (err) {
    console.error("Failed to fetch design queue:", err);
    return [];
  }
}

/**
 * Fetch single design assignment by ID or Job ID
 */
export async function getDesignAssignment(id) {
  try {
    const res = await api.get(`/job-orders/${id}`);
    return res.data?.data || res.data;
  } catch (err) {
    console.error(`Failed to fetch design assignment ${id}:`, err);
    throw err?.response?.data || err;
  }
}

/**
 * Fetch active designer pool with workload, SLA & availability
 */
export async function getDesignerPool(branchId = "") {
  try {
    const res = await api.get("/design/pool", {
      params: branchId ? { branchId } : {}
    });
    return res.data?.data || (Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    console.error("Failed to fetch designer pool:", err);
    return [];
  }
}

/**
 * Manager assigns a designer to a design assignment / job
 */
export async function assignDesigner(id, payload = {}) {
  try {
    const res = await api.post(`/design/jobs/${id}/assign`, payload);
    return res.data;
  } catch (err) {
    console.error(`Failed to assign designer for ${id}:`, err);
    throw err?.response?.data || err;
  }
}

/**
 * Auto-allocate / Round-robin allocate multiple selected assignments
 */
export async function autoAllocateDesigners(assignmentIds = []) {
  try {
    const res = await api.post("/design/queue/auto-assign", { assignmentIds });
    return res.data;
  } catch (err) {
    console.error("Failed to auto-allocate designers:", err);
    throw err?.response?.data || err;
  }
}

/**
 * Designer starts work on an assigned job
 */
export async function startDesign(id) {
  try {
    const res = await api.post(`/design/jobs/${id}/start`, {});
    return res.data;
  } catch (err) {
    console.error(`Failed to start design for ${id}:`, err);
    throw err?.response?.data || err;
  }
}

/**
 * Upload working design file / artwork asset
 */
export async function uploadDesignFile(id, filePayload) {
  try {
    const res = await api.post(`/job-orders/${id}/attachments`, filePayload);
    return res.data;
  } catch (err) {
    console.error(`Failed to upload design file for ${id}:`, err);
    throw err?.response?.data || err;
  }
}

/**
 * Submit design sample / proof for customer review
 */
export async function submitDesignProof(id, proofPayload) {
  try {
    const res = await api.post(`/job-orders/${id}/samples`, proofPayload);
    return res.data;
  } catch (err) {
    console.error(`Failed to submit design proof for ${id}:`, err);
    throw err?.response?.data || err;
  }
}

/**
 * Designer requests reassignment / rejects assignment back to queue
 */
export async function requestReassignment(id, payload = {}) {
  try {
    const res = await api.post(`/design/jobs/${id}/reject`, payload);
    return res.data;
  } catch (err) {
    console.error(`Failed to request reassignment for ${id}:`, err);
    throw err?.response?.data || err;
  }
}

/**
 * Fetch Designer Personal Workspace Jobs
 */
export async function getDesignerMyJobs(params = {}) {
  try {
    const res = await api.get("/design/my-jobs", { params });
    const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
    if (list.length > 0) return list;
    const allQueue = await getDesignQueue();
    return allQueue.filter((j) => j.status === "ASSIGNED" || j.status === "IN_PROGRESS" || j.status === "PROOF_PENDING");
  } catch (err) {
    console.error("Failed to fetch designer personal jobs, falling back to queue:", err);
    try {
      const allQueue = await getDesignQueue();
      return allQueue.filter((j) => j.status === "ASSIGNED" || j.status === "IN_PROGRESS" || j.status === "PROOF_PENDING");
    } catch (e) {
      return [];
    }
  }
}

/**
 * Start Design Work alias
 */
export const startDesignWork = startDesign;
