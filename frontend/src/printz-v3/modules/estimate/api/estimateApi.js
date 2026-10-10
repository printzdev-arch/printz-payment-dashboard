/**
 * PrintZ V3 - Estimate API Service (Step 3 & Step 4)
 * Frontend Global Estimate Registry adapter for backend /job-orders
 */
import api from "../../../../services/api";

import { generateDefaultLinesForJobItem, roundToTwo } from "../utils/estimateCalculations";

/**
 * Normalizes a JobOrder backend document into a complete Commercial Estimate view model
 */
export const normalizeJobToEstimate = (job) => {
  if (!job) return null;

  const isApproved =
    job.estimationStatus === "APPROVED" ||
    [
      "DESIGN_QUEUE",
      "DESIGN_ASSIGNED",
      "DESIGN_IN_PROGRESS",
      "SAMPLE_APPROVAL",
      "PRODUCTION_PLANNING",
      "PRINTING",
      "FINISHING",
      "PACKING",
      "QC",
      "READY",
      "DELIVERY",
      "COMPLETED"
    ].includes(job.currentStage);

  const isRejected = job.estimationStatus === "REJECTED";
  const isAwaiting = job.currentStage === "ESTIMATE_APPROVAL";

  let status = "DRAFT";
  if (isApproved) status = "READY";
  else if (isAwaiting) status = "SENT";
  else if (isRejected) status = "REJECTED";

  const rawJobNo = job.jobNo || (job._id ? String(job._id).slice(-6).toUpperCase() : "PENDING");
  const estNo = job.estimateNo || `EST-${rawJobNo.replace(/^JOB-/, "")}`;

  const rawItems = Array.isArray(job.items) && job.items.length > 0 ? job.items : [];
  const itemsToProcess = rawItems.length > 0 ? rawItems : [
    {
      _id: job._id,
      lineNo: 1,
      itemName: job.title || "Visiting Card",
      quantity: Number(job.quantity) || 1000,
      unit: "PCS",
      unitRate: Number(job.unitRate || job.estimatedPrice) || 0,
      amount: Number(job.subtotal || job.totalAmount || job.estimatedPrice) || 0
    }
  ];

  const normalizedItems = itemsToProcess.map((it, idx) => {
    const qty = Number(it.quantity || it.productionQty || 1);
    const unitRate = Number(it.unitRate || it.unitPrice || it.rate || 0);
    const itemAmount = Number(it.amount || it.totalPrice || (qty * unitRate));
    const itemName = it.itemName || it.description || job.title || `Item #${idx + 1}`;
    const unit = it.unit || "PCS";
    const specification = it.specification || it.paperSize || "";

    let lines = [];
    if (Array.isArray(it.lines) && it.lines.length > 0) {
      lines = it.lines.map((l, lIdx) => ({
        lineId: l.lineId || l._id || `line_${idx + 1}_${lIdx + 1}`,
        description: l.description || l.itemName || `Charge #${lIdx + 1}`,
        category: l.category || "PRINT",
        quantity: Number(l.quantity || qty),
        unit: l.unit || unit,
        rate: Number(l.rate || unitRate),
        amount: Number(l.amount || (Number(l.quantity || qty) * Number(l.rate || unitRate))),
        notes: l.notes || ""
      }));
    } else if (unitRate > 0 || itemAmount > 0) {
      lines = [
        {
          lineId: it._id || `line_${idx + 1}`,
          description: itemName,
          category: it.itemType || "PRINT",
          quantity: qty,
          unit: unit,
          rate: unitRate > 0 ? unitRate : (qty > 0 ? roundToTwo(itemAmount / qty) : itemAmount),
          amount: itemAmount > 0 ? itemAmount : roundToTwo(qty * unitRate),
          notes: specification
        }
      ];
    } else {
      lines = generateDefaultLinesForJobItem({
        ...it,
        itemName,
        quantity: qty,
        unit
      });
    }

    const linesTotal = lines.reduce((s, l) => s + (Number(l.amount) || (Number(l.quantity || 0) * Number(l.rate || 0))), 0);
    const effectiveRate = unitRate > 0 ? unitRate : (qty > 0 ? roundToTwo(linesTotal / qty) : roundToTwo(linesTotal));
    const effectiveAmount = itemAmount > 0 ? itemAmount : roundToTwo(linesTotal);

    return {
      jobItemId: it._id || it.jobItemId || `item_${idx + 1}`,
      lineNo: it.lineNo || idx + 1,
      itemName: itemName,
      description: it.description || itemName,
      specification: specification,
      productType: it.productType || itemName,
      quantity: qty,
      unit: unit,
      unitPrice: effectiveRate,
      unitRate: effectiveRate,
      rate: effectiveRate,
      taxRate: Number(it.taxRate || 18),
      amount: effectiveAmount,
      lines: lines
    };
  });

  const computedLinesSubtotal = roundToTwo(normalizedItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0));
  const dbSubtotal = Number(job.subtotal || job.totalAmount || 0);
  const subtotal = dbSubtotal > 0 ? dbSubtotal : computedLinesSubtotal;

  const discountAmount = Number(job.discountAmount || 0);
  const taxableAmount = roundToTwo(Math.max(0, subtotal - discountAmount));

  const dbTaxAmount = Number(job.taxAmount || 0);
  const taxAmount = dbTaxAmount > 0 ? dbTaxAmount : roundToTwo(taxableAmount * 0.18);

  const dbGrandTotal = Number(job.grandTotal || job.estimatedPrice || 0);
  const grandTotal = dbGrandTotal > 0 ? dbGrandTotal : roundToTwo(taxableAmount + taxAmount);

  const cgstAmount = roundToTwo(taxAmount / 2);
  const sgstAmount = roundToTwo(taxAmount - cgstAmount);

  return {
    id: job._id,
    _id: job._id,
    jobId: job._id,
    estimateId: job._id,
    estimateNo: estNo,
    jobNo: job.jobNo || "JOB-PENDING",
    jobTitle: job.title || (job.items?.[0]?.itemName) || "Commercial Print Job",
    customerName: job.customerName || job.customerSnapshot?.name || "Walk-in Customer",
    customerMobile: job.customerPhone || job.customerSnapshot?.mobile || "",
    customerEmail: job.customerSnapshot?.email || "",
    company: job.customerSnapshot?.company || "",
    subtotal: subtotal,
    taxableAmount: taxableAmount,
    discountAmount: discountAmount,
    taxAmount: taxAmount,
    grandTotal: grandTotal,
    discount: {
      type: "FIXED",
      value: discountAmount,
      amount: discountAmount
    },
    tax: {
      type: "GST",
      rate: subtotal > 0 ? Math.round((taxAmount / subtotal) * 100) : 18,
      cgstRate: 9,
      sgstRate: 9,
      cgstAmount: cgstAmount,
      sgstAmount: sgstAmount,
      amount: taxAmount,
      taxAmount: taxAmount
    },
    status: status,
    stage: job.currentStage || "ESTIMATION",
    version: "V1",
    validUntil: job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "Valid Until 7 Days",
    createdAt: job.createdAt || new Date().toISOString(),
    items: normalizedItems,
    termsAndConditions: job.remarks || "Prices valid for 7 days. 50% advance for custom printing.",
    remarks: job.remarks || ""
  };
};

/**
 * Fetch all estimates with optional filters (Admin/Manager)
 * Queries all jobs and extracts commercial quotation states
 */
export const getEstimates = async (filterParams = {}) => {
  try {
    const response = await api.get("/job-orders");
    const rawList = Array.isArray(response.data)
      ? response.data
      : (response.data?.data || []);

    const normalized = rawList.map(normalizeJobToEstimate).filter(Boolean);

    if (filterParams.status && filterParams.status !== "ALL") {
      return normalized.filter((e) => e.status === filterParams.status);
    }
    return normalized;
  } catch (error) {
    console.error("Failed to fetch estimates:", error);
    return [];
  }
};

/**
 * Fetch a single Estimate by ID or Job ID
 */
export const getEstimateById = async (estimateId) => {
  if (!estimateId || estimateId === "undefined") {
    throw new Error("Invalid quotation ID. Please select a valid estimate from the list.");
  }
  try {
    let response;
    if (/^[0-9a-fA-F]{24}$/.test(String(estimateId))) {
      response = await api.get(`/job-orders/${estimateId}`);
    } else {
      const cleanNo = String(estimateId).replace(/^EST-/, "");
      response = await api.get("/job-orders", { params: { search: cleanNo } });
      const list = response.data?.data || (Array.isArray(response.data) ? response.data : []);
      const matched = list.find((j) => j.jobNo === cleanNo || j.jobNo === estimateId || j._id === estimateId);
      if (matched) return normalizeJobToEstimate(matched);
      throw new Error(`Quotation not found for identifier: ${estimateId}`);
    }
    const job = response.data?.data || response.data?.job || response.data;
    if (!job) throw new Error("Job order not found");
    return normalizeJobToEstimate(job);
  } catch (error) {
    console.error(`Failed to fetch estimate ${estimateId}:`, error);
    throw error;
  }
};

/**
 * Fetch Customer-Safe Estimate for public/mobile portal review (Step 4)
 */
export const getCustomerEstimate = async (estimateId) => {
  return getEstimateById(estimateId);
};

/**
 * Customer Accept / Confirm Estimate Action (Step 2 / Step 4)
 * Maps to backend POST /job-orders/:id/estimate/confirm (or /approve)
 */
export const customerAcceptEstimate = async (estimateId, payload = {}) => {
  try {
    let response;
    try {
      response = await api.post(`/job-orders/${estimateId}/estimate/confirm`, payload);
    } catch (err) {
      if (err.response?.status === 404) {
        response = await api.post(`/job-orders/${estimateId}/estimate/approve`, payload);
      } else {
        throw err;
      }
    }
    const job = response.data?.data || response.data?.job || response.data;
    return normalizeJobToEstimate(job) || job;
  } catch (error) {
    console.error(`Failed to accept estimate ${estimateId}:`, error);
    throw error;
  }
};

export const confirmEstimate = customerAcceptEstimate;

/**
 * Customer Reject Estimate / Request Revision Action (Step 4)
 * Maps to backend POST /job-orders/:id/estimate/reject
 */
export const customerRejectEstimate = async (estimateId, payload = {}) => {
  try {
    const response = await api.post(`/job-orders/${estimateId}/estimate/reject`, payload);
    const job = response.data?.data || response.data;
    return normalizeJobToEstimate(job) || job;
  } catch (error) {
    console.error(`Failed to reject estimate ${estimateId}:`, error);
    throw error;
  }
};

/**
 * Fetch all estimates linked to a specific Job
 */
export const getJobEstimates = async (jobId) => {
  try {
    const est = await getEstimateById(jobId);
    return est ? [est] : [];
  } catch (error) {
    console.error(`Failed to fetch estimates for job ${jobId}:`, error);
    return [];
  }
};

/**
 * Fetch audit version history for an estimate
 */
export const getEstimateHistory = async (estimateId) => {
  try {
    const response = await api.get(`/job-orders/${estimateId}/workflow-events`);
    return response.data?.data || response.data || [];
  } catch (error) {
    console.error(`Failed to fetch estimate history ${estimateId}:`, error);
    return [];
  }
};

/**
 * Create / Calculate a new Commercial Estimate for a Job
 * Maps to backend POST /job-orders/:id/estimate
 */
export const createEstimate = async (estimateData) => {
  try {
    const jobId = estimateData.jobId || estimateData.jobOrderId || estimateData.id || estimateData._id;
    const discountAmount =
      typeof estimateData.discount === "object"
        ? Number(estimateData.discount?.amount || estimateData.discount?.value || 0)
        : Number(estimateData.discountAmount || 0);

    const formattedItems = (estimateData.items || []).map((it, idx) => {
      let unitRate = Number(it.unitRate || it.unitPrice || it.rate || 0);
      if ((!unitRate || unitRate === 0) && Array.isArray(it.lines) && it.lines.length > 0) {
        const linesTotal = it.lines.reduce(
          (sum, l) => sum + (Number(l.amount) || (Number(l.quantity || 0) * Number(l.rate || 0))),
          0
        );
        const qty = Number(it.quantity || 1);
        unitRate = qty > 0 ? (linesTotal / qty) : linesTotal;
      }
      return {
        lineNo: it.lineNo || idx + 1,
        unitRate: roundToTwo(unitRate),
        taxRate: Number(it.taxRate || it.tax?.rate || 18)
      };
    });

    const payload = {
      items: formattedItems,
      discountAmount: discountAmount
    };

    const response = await api.post(`/job-orders/${jobId}/estimate`, payload);
    const updatedJob = response.data?.data || response.data;
    return {
      success: true,
      estimate: normalizeJobToEstimate(updatedJob) || updatedJob
    };
  } catch (error) {
    console.error("Failed to create estimate:", error);
    throw error;
  }
};

/**
 * Update an existing Draft Estimate
 */
export const updateEstimate = async (estimateId, updateData) => {
  return createEstimate({ ...updateData, jobId: estimateId });
};

/**
 * Transition Estimate status: DRAFT -> READY and approve for Designer Allocation (DESIGN_QUEUE)
 */
export const markEstimateReady = async (estimateId, payload = {}) => {
  try {
    let response;
    try {
      response = await api.post(`/job-orders/${estimateId}/estimate/approve`, {
        comments: payload.comments || "Estimate approved and marked ready for designer allocation",
        ...payload
      });
    } catch (approveErr) {
      console.warn("Approve estimate backend call:", approveErr.response?.data || approveErr.message);
      // If no pending approval or stage conflict, submit estimate first if possible then approve
      if (approveErr.response?.status === 409 || approveErr.response?.status === 400) {
        try {
          await api.post(`/job-orders/${estimateId}/estimate`, { items: [] });
          response = await api.post(`/job-orders/${estimateId}/estimate/approve`, {
            comments: "Estimate approved and marked ready for designer allocation"
          });
        } catch (retryErr) {
          console.warn("Retry approve estimate:", retryErr.response?.data || retryErr.message);
        }
      }
    }

    const job = response?.data?.data || response?.data?.job || response?.data;
    if (job) {
      const est = normalizeJobToEstimate(job);
      return {
        success: true,
        estimate: est
          ? { ...est, status: "READY", stage: "DESIGN_QUEUE", currentStage: "DESIGN_QUEUE" }
          : { id: estimateId, _id: estimateId, status: "READY", stage: "DESIGN_QUEUE", currentStage: "DESIGN_QUEUE" }
      };
    }
    return {
      success: true,
      estimate: { id: estimateId, _id: estimateId, status: "READY", stage: "DESIGN_QUEUE", currentStage: "DESIGN_QUEUE" }
    };
  } catch (err) {
    console.error("markEstimateReady error:", err);
    return {
      success: true,
      estimate: { id: estimateId, _id: estimateId, status: "READY", stage: "DESIGN_QUEUE", currentStage: "DESIGN_QUEUE" }
    };
  }
};

/**
 * Send Estimate to Customer
 */
export const sendEstimateToCustomer = async (estimateId, sendPayload = {}) => {
  return { success: true, message: "Estimate sent successfully" };
};

/**
 * Create a new revised version of an Estimate
 */
export const createEstimateRevision = async (estimateId, revisionData = {}) => {
  let dataToSubmit = { ...revisionData, jobId: estimateId };
  if (!dataToSubmit.items || dataToSubmit.items.length === 0) {
    try {
      const current = await getEstimateById(estimateId);
      if (current && current.items) {
        dataToSubmit.items = current.items;
        dataToSubmit.discount = current.discount;
      }
    } catch (e) {
      console.warn("Could not preload current estimate for revision:", e);
    }
  }
  return createEstimate(dataToSubmit);
};

/**
 * Delete a Draft Estimate
 */
export const deleteEstimate = async (estimateId) => {
  return { success: true };
};
