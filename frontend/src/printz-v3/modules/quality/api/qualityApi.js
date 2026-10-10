/**
 * PrintZ V3 - Quality Control & Rework/Reprint API Service (Step 10)
 * Aligned with Backend Endpoints: /quality-checks, /production-queue, /reprint-requests
 */
import api from "../../../../services/api";

/**
 * Fetch QC Queue of production orders ready for inspection
 * Aligned with backend GET /quality-checks/pending (fallback: /production-queue?stage=QC)
 */
export async function getQcQueue(params = {}) {
  try {
    let rawItems = [];
    try {
      const res = await api.get("/quality-checks/pending");
      const data = res.data?.data || res.data;
      if (Array.isArray(data) && data.length > 0) rawItems = data;
      else if (Array.isArray(data)) rawItems = data;
    } catch (err) {
      console.warn("Could not fetch /quality-checks/pending:", err);
    }

    // Also fetch production orders with status QC
    if (rawItems.length === 0) {
      try {
        const poRes = await api.get("/production-orders", { params: { status: "QC", limit: 100 } });
        const poData = poRes.data?.data || (Array.isArray(poRes.data) ? poRes.data : []);
        if (poData.length > 0) rawItems = poData;
      } catch (poErr) {
        console.warn("Could not fetch /production-orders?status=QC:", poErr);
      }
    }

    // Also fetch job orders in QC stage if still empty
    if (rawItems.length === 0) {
      try {
        const jobRes = await api.get("/job-orders", { params: { currentStage: "QC", limit: 100 } });
        const jobData = jobRes.data?.data || (Array.isArray(jobRes.data) ? jobRes.data : []);
        rawItems = jobData.map((j) => ({
          _id: j._id,
          productionNo: `PO-${j.jobNo ? j.jobNo.replace(/^JO-/, "") : String(j._id).slice(-6).toUpperCase()}`,
          jobNo: j.jobNo,
          customerName: j.customerName || j.customerSnapshot?.name || "Customer",
          customerMobile: j.customerPhone || j.customerSnapshot?.mobile || "",
          productName: j.items?.[0]?.itemName || j.title || "Print Product",
          plannedQty: j.quantity || 1000,
          status: "QC",
          qcStatus: "PENDING",
          priority: j.priority || "NORMAL",
          jobOrderId: j
        }));
      } catch (jErr) {
        console.warn("Could not fetch /job-orders in QC stage:", jErr);
      }
    }

    const seenIds = new Set();
    const normalized = [];

    for (const order of rawItems) {
      const idKey = String(order._id || order.id || order.productionNo);
      if (seenIds.has(idKey)) continue;
      seenIds.add(idKey);

      const job = order.jobOrderId && typeof order.jobOrderId === "object" ? order.jobOrderId : {};
      const firstItem = job.items?.[0] || order.items?.[0] || {};
      const status = order.status || "QC";
      const qcStatus = order.qcStatus || (status === "QC" ? "PENDING" : status === "COMPLETED" ? "PASSED" : "PENDING");

      normalized.push({
        id: order._id || order.id || order.productionOrderId,
        productionOrderId: order._id || order.id || order.productionOrderId,
        productionNo: order.productionNo || `PO-${String(order._id).slice(-6).toUpperCase()}`,
        jobNo: order.jobNo || job.jobNo || "JOB-REF",
        customerName: order.customerName || job.customerName || job.customerSnapshot?.name || "Customer",
        customerCode: order.customerCode || job.customerCode || "CUST",
        customerMobile: order.customerMobile || job.customerPhone || job.customerSnapshot?.mobile || "",
        productName: order.productName || firstItem.itemName || job.title || "Print Job",
        producedQty: Number(order.actualQty || order.producedQty || order.plannedQty || 1000),
        plannedQty: Number(order.plannedQty || 1000),
        status,
        priority: order.priority || job.priority || "NORMAL",
        completedAt: order.actualEnd || order.updatedAt,
        qcStatus,
        currentCycleNo: order.currentCycleNo || 0,
        ...order
      });
    }

    let filtered = normalized;
    if (params.status && params.status !== "ALL") {
      filtered = filtered.filter((i) => i.qcStatus === params.status);
    }
    if (params.priority && params.priority !== "ALL") {
      filtered = filtered.filter((i) => (i.priority || "NORMAL").toUpperCase() === params.priority.toUpperCase());
    }
    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter((i) =>
        (i.productionNo && i.productionNo.toLowerCase().includes(q)) ||
        (i.jobNo && i.jobNo.toLowerCase().includes(q)) ||
        (i.customerName && i.customerName.toLowerCase().includes(q)) ||
        (i.productName && i.productName.toLowerCase().includes(q))
      );
    }

    return {
      items: filtered,
      metrics: {
        total: normalized.length,
        pendingQc: normalized.filter((i) => !i.qcStatus || i.qcStatus === "PENDING").length,
        passed: normalized.filter((i) => i.qcStatus === "PASSED").length,
        reworkIssues: normalized.filter((i) => i.qcStatus === "REWORK_REQUESTED" || i.qcStatus === "ISSUE_DETECTED").length,
        reprintIssues: normalized.filter((i) => i.qcStatus === "REPRINT_REQUESTED").length
      }
    };
  } catch (error) {
    console.error("Error fetching QC queue:", error);
    return {
      items: [],
      metrics: { total: 0, pendingQc: 0, passed: 0, reworkIssues: 0, reprintIssues: 0 }
    };
  }
}

/**
 * Fetch single Production Order details for Quality Inspection
 */
export async function getQcProductionOrderDetails(orderId) {
  try {
    const response = await api.get(`/production-orders/${orderId}`);
    const po = response.data?.data || response.data?.productionOrder || response.data;
    const job = po.jobOrderId && typeof po.jobOrderId === "object" ? po.jobOrderId : {};
    const firstItem = job.items?.[0] || {};
    
    const normalizedPo = {
      id: po._id || po.id,
      productionOrderId: po._id || po.id,
      productionNo: po.productionNo || `PO-${String(po._id).slice(-6).toUpperCase()}`,
      jobNo: po.jobNo || job.jobNo || "JOB-REF",
      customerName: po.customerName || job.customerName || job.customerSnapshot?.name || "Customer",
      customerMobile: po.customerMobile || job.customerPhone || job.customerSnapshot?.mobile || "",
      productName: po.productName || firstItem.itemName || job.title || "Print Product",
      producedQty: Number(po.actualQty || po.goodQty || po.plannedQty || 1000),
      plannedQty: Number(po.plannedQty || 1000),
      status: po.status || "QC",
      priority: po.priority || job.priority || "NORMAL",
      operations: po.operations || [],
      ...po
    };

    const [checklistTemplate, defectCatalogue, qcHistory] = await Promise.all([
      getQcChecklistTemplate().catch(() => []),
      getDefectCatalogue().catch(() => []),
      (po.qualityChecks && Array.isArray(po.qualityChecks) && po.qualityChecks.length > 0)
        ? Promise.resolve(po.qualityChecks)
        : getQcHistory(orderId).catch(() => [])
    ]);

    return {
      productionOrder: normalizedPo,
      checklistTemplate,
      defectCatalogue,
      qcHistory
    };
  } catch (error) {
    console.error(`Error fetching QC details for order ${orderId}:`, error);
    throw error;
  }
}

/**
 * Submit Quality Check Inspection (PASS or ISSUE -> REWORK/REPRINT)
 */
export async function submitQualityCheck(orderId, qcData) {
  try {
    const response = await api.post("/quality-checks", {
      productionOrderId: orderId,
      ...qcData
    });
    return response.data;
  } catch (error) {
    console.error("Error submitting quality check:", error);
    throw error;
  }
}

/**
 * Fetch QC Checklists Template (Built-in standard 4-point template)
 */
export async function getQcChecklistTemplate() {
  return [
    { id: "qc-1", item: "Color Registration & Fidelity", name: "Color Registration & Fidelity", category: "Visual" },
    { id: "qc-2", item: "Dimension & Bleed Accuracy", name: "Dimension & Bleed Accuracy", category: "Measurement" },
    { id: "qc-3", item: "Finishing & Cut Edge Cleanliness", name: "Finishing & Cut Edge Cleanliness", category: "Finishing" },
    { id: "qc-4", item: "Packaging & Count Verification", name: "Packaging & Count Verification", category: "Packaging" }
  ];
}

/**
 * Fetch Defect Catalogue (Built-in standard defect classification)
 */
export async function getDefectCatalogue() {
  return [
    { code: "DEF-01", name: "Misalignment / Color Shift" },
    { code: "DEF-02", name: "Ink Smudge / Ghosting" },
    { code: "DEF-03", name: "Incorrect Cut / Dimension Error" },
    { code: "DEF-04", name: "Substrate Scratches / Wrinkles" }
  ];
}

/**
 * Fetch all Reprint Requests
 */
export async function getReprintRequests(params = {}) {
  try {
    const queryParams = {};
    if (params.status && params.status !== "ALL") queryParams.status = params.status;
    const response = await api.get("/reprint-requests", { params: queryParams });
    const d = response.data;
    const rawList = Array.isArray(d)
      ? d
      : (Array.isArray(d?.data) ? d.data : (Array.isArray(d?.reprintRequests) ? d.reprintRequests : []));
    return rawList.map((rp) => {
      const parentOrder = rp.productionOrderId && typeof rp.productionOrderId === "object" ? rp.productionOrderId : {};
      const parentJob = rp.jobOrderId && typeof rp.jobOrderId === "object" ? rp.jobOrderId : (parentOrder.jobOrderId && typeof parentOrder.jobOrderId === "object" ? parentOrder.jobOrderId : {});
      return {
        id: rp._id || rp.id,
        reprintNo: rp.reprintNo || `RP-${String(rp._id).slice(-6).toUpperCase()}`,
        productionNo: rp.productionNo || parentOrder.productionNo || "PO-REF",
        jobNo: rp.jobNo || parentJob.jobNo || parentOrder.jobNo || "JOB-REF",
        customerName: rp.customerName || parentJob.customerName || parentJob.customerSnapshot?.name || "Customer",
        quantity: Number(rp.quantity || rp.reprintQuantity || 1),
        sourceStage: rp.sourceStage || "QC",
        restartFromOperationName: rp.restartFromOperationCode || "PRINTING",
        requestedBy: rp.requestedBy?.name || rp.requesterName || "QC Inspector",
        status: rp.status || "REQUESTED",
        ...rp
      };
    });
  } catch (error) {
    console.error("Error fetching reprint requests:", error);
    return [];
  }
}

/**
 * Fetch single Reprint Request
 */
export async function getReprintRequestById(requestId) {
  try {
    const response = await api.get(`/reprint-requests/${requestId}`);
    return response.data?.reprintRequest || response.data?.data || response.data;
  } catch (error) {
    console.error(`Error fetching reprint request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Approve Reprint Request
 */
export async function approveReprintRequest(requestId, data = {}) {
  try {
    const response = await api.post(`/reprint-requests/${requestId}/approve`, data);
    return response.data;
  } catch (error) {
    console.error(`Error approving reprint request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Reject Reprint Request
 */
export async function rejectReprintRequest(requestId, data = {}) {
  try {
    const response = await api.post(`/reprint-requests/${requestId}/reject`, data);
    return response.data;
  } catch (error) {
    console.error(`Error rejecting reprint request ${requestId}:`, error);
    throw error;
  }
}

/**
 * Fetch QC & Cycle History for a Production Order
 */
export async function getQcHistory(orderId) {
  try {
    const response = await api.get("/quality-checks", {
      params: { productionOrderId: orderId, limit: 100 }
    });
    const d = response.data?.data || response.data?.items || (Array.isArray(response.data) ? response.data : []);
    return Array.isArray(d) ? d : [];
  } catch (error) {
    console.warn(`Could not fetch QC history for order ${orderId}:`, error);
    return [];
  }
}
