/**
 * PrintZ V3 - Production Planning & Production Orders API Service (Step 8 & 9)
 * Aligned with Backend Production Endpoints:
 * /production-orders, /production-operations, /production-queue, /printers
 */
import api from "../../../../services/api";

/**
 * Fetch eligible jobs ready for production planning
 * Entry condition: status = READY_FOR_PRODUCTION or stage = PRODUCTION_PLANNING / PLANNED / PRINTING
 */
export async function getEligibleJobsForPlanning(params = {}) {
  try {
    const response = await api.get("/job-orders", {
      params: { limit: 100 }
    });
    const rawJobs = response.data?.data || response.data?.jobs || (Array.isArray(response.data) ? response.data : []);
    const prodStages = [
      "PRODUCTION_PLANNING",
      "PLANNED",
      "PRINTING",
      "FINISHING",
      "PACKING",
      "READY",
      "QC",
      "PRODUCTION"
    ];

    const eligible = rawJobs.filter((j) => {
      const stage = (j.currentStage || j.stage || "").toUpperCase();
      const status = (j.status || "").toUpperCase();
      return (
        prodStages.includes(stage) ||
        status === "PRODUCTION" ||
        status === "IN_PRODUCTION" ||
        stage.includes("PROD")
      );
    });

    const mapped = eligible.map((j) => {
      const firstItem = j.items?.[0] || {};
      const stage = (j.currentStage || j.stage || "").toUpperCase();
      const isPlanned = stage === "PLANNED" || stage === "PRINTING" || stage === "FINISHING" || stage === "QC" || stage === "READY";
      return {
        jobItemId: firstItem._id || j._id,
        jobId: j._id,
        jobNo: j.jobNo,
        customerName: j.customerName || j.customerSnapshot?.name || "Walk-in Customer",
        customerMobile: j.customerPhone || j.customerSnapshot?.mobile || "",
        productName: firstItem.itemName || j.title || "Print Product",
        requiredQuantity: Number(firstItem.quantity || j.quantity || 1),
        unit: firstItem.unit || j.unit || "PCS",
        priority: j.priority || "NORMAL",
        expectedDelivery: j.dueDate ? new Date(j.dueDate).toLocaleDateString() : "Standard SLA",
        dueDate: j.dueDate,
        sampleVersion: "V1",
        planningStatus: isPlanned ? "PLANNED" : "READY_FOR_PLANNING",
        hasActiveOrder: isPlanned,
        existingProductionNo: `PO-${j.jobNo ? j.jobNo.replace(/^JO-/, "") : String(j._id).slice(-6).toUpperCase()}`,
        requirementSnapshot: {
          paperType: firstItem.paperType || firstItem.specification || "Standard Cardstock",
          size: firstItem.paperSize || "Standard",
          printingType: firstItem.printingType || "Digital"
        },
        ...j
      };
    });

    let filtered = mapped;
    if (params.priority && params.priority !== "ALL") {
      filtered = filtered.filter((j) => (j.priority || "NORMAL").toUpperCase() === params.priority.toUpperCase());
    }
    if (params.planningStatus && params.planningStatus !== "ALL") {
      filtered = filtered.filter((j) => j.planningStatus === params.planningStatus);
    }
    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter((j) =>
        (j.jobNo && j.jobNo.toLowerCase().includes(q)) ||
        (j.customerName && j.customerName.toLowerCase().includes(q)) ||
        (j.productName && j.productName.toLowerCase().includes(q))
      );
    }
    return filtered;
  } catch (error) {
    console.error("Error fetching eligible jobs for planning:", error);
    return [];
  }
}

/**
 * Fetch single eligible job item details for production planning
 * Safely resolves both JobOrder _id and subdocument item _id
 */
export async function getJobPlanningDetails(id) {
  try {
    let j = null;
    let matchedItem = null;

    // Search existing jobs list to resolve whether 'id' is a job order _id or a subdocument item _id
    try {
      const listRes = await api.get("/job-orders", { params: { limit: 100 } });
      const rawJobs = listRes.data?.data || listRes.data?.jobs || (Array.isArray(listRes.data) ? listRes.data : []);

      const directJob = rawJobs.find((job) => String(job._id) === String(id));
      if (directJob) {
        j = directJob;
        matchedItem = directJob.items?.[0] || {};
      } else {
        const itemJob = rawJobs.find((job) =>
          Array.isArray(job.items) && job.items.some((it) => String(it._id) === String(id))
        );
        if (itemJob) {
          j = itemJob;
          matchedItem = itemJob.items.find((it) => String(it._id) === String(id)) || itemJob.items[0];
        }
      }
    } catch (listErr) {
      console.warn("Could not query /job-orders list for planning lookup:", listErr);
    }

    // If not found in list, attempt direct fetch with id
    if (!j) {
      const response = await api.get(`/job-orders/${id}`);
      j = response.data?.data || response.data?.job || response.data;
      matchedItem = j.items?.[0] || {};
    } else {
      // If we matched the job, attempt to get fully populated job details using its real _id
      try {
        const fullRes = await api.get(`/job-orders/${j._id}`);
        const fullJob = fullRes.data?.data || fullRes.data?.job || fullRes.data;
        if (fullJob && fullJob._id) {
          j = fullJob;
          if (matchedItem && matchedItem._id) {
            matchedItem = (j.items || []).find((it) => String(it._id) === String(matchedItem._id)) || matchedItem;
          }
        }
      } catch (fullErr) {
        // Fallback to j from list
      }
    }

    const firstItem = matchedItem || j.items?.[0] || {};
    return {
      jobItemId: firstItem._id || j._id,
      jobId: j._id,
      jobNo: j.jobNo,
      customerName: j.customerName || j.customerSnapshot?.name || "Customer",
      customerMobile: j.customerPhone || j.customerSnapshot?.mobile || "",
      productName: firstItem.itemName || j.title || "Print Product",
      requiredQuantity: Number(firstItem.quantity || j.quantity || 1000),
      unit: firstItem.unit || j.unit || "PCS",
      priority: j.priority || "NORMAL",
      dueDate: j.dueDate,
      requirementSnapshot: {
        paperType: firstItem.paperType || firstItem.specification || "Standard Cardstock",
        size: firstItem.paperSize || "Standard",
        printingType: firstItem.printingType || "Digital",
        customerNotes: j.remarks || j.customerRequirements || ""
      },
      ...j
    };
  } catch (error) {
    console.error(`Error fetching planning details for job item ${id}:`, error);
    throw error;
  }
}

/**
 * Fetch available machines for operation planning
 */
export async function getAvailableMachines(branchId) {
  try {
    const response = await api.get("/printers", {
      params: branchId ? { branch: branchId } : {}
    });
    return response.data?.data || response.data?.printers || (Array.isArray(response.data) ? response.data : []);
  } catch (error) {
    console.error("Error fetching production machines:", error);
    return [];
  }
}

/**
 * Create a new Production Order from planned specifications
 */
export async function createProductionOrder(planningData) {
  try {
    const response = await api.post("/production-orders", planningData);
    return response.data;
  } catch (error) {
    console.error("Error creating production order:", error);
    throw error;
  }
}

/**
 * Fetch list of generated Production Orders
 */
export async function getProductionOrders(params = {}) {
  try {
    const queryParams = { limit: 100 };
    if (params.status && params.status !== "ALL") queryParams.status = params.status;
    if (params.priority && params.priority !== "ALL") queryParams.priority = params.priority;

    let rawList = [];
    try {
      const response = await api.get("/production-orders", { params: queryParams });
      const d = response.data;
      rawList = Array.isArray(d)
        ? d
        : (Array.isArray(d?.data) ? d.data : (Array.isArray(d?.productionOrders) ? d.productionOrders : []));
    } catch (poErr) {
      console.warn("GET /production-orders error, falling back:", poErr);
    }

    if (rawList.length === 0) {
      try {
        const jobsRes = await api.get("/job-orders", { params: { limit: 100 } });
        const jobs = jobsRes.data?.data || (Array.isArray(jobsRes.data) ? jobsRes.data : []);
        const inProdJobs = jobs.filter((j) => {
          const stage = (j.currentStage || j.stage || "").toUpperCase();
          const status = (j.status || "").toUpperCase();
          return ["PLANNED", "PRODUCTION_PLANNING", "PRINTING", "FINISHING", "PACKING", "QC"].includes(stage) || status === "PRODUCTION" || status === "IN_PRODUCTION";
        });
        rawList = inProdJobs.map((j) => ({
          _id: j._id,
          productionNo: `PO-${j.jobNo ? j.jobNo.replace(/^JO-/, "") : String(j._id).slice(-6).toUpperCase()}`,
          jobNo: j.jobNo,
          customerName: j.customerName || j.customerSnapshot?.name || "Customer",
          customerMobile: j.customerPhone || j.customerSnapshot?.mobile || "",
          productName: j.items?.[0]?.itemName || j.title || "Print Product",
          plannedQty: Number(j.quantity || j.items?.[0]?.quantity || 1000),
          requiredQty: Number(j.quantity || 1000),
          priority: j.priority || "NORMAL",
          status: j.currentStage === "PLANNED" ? "PLANNED" : (j.currentStage === "QC" ? "QC" : "IN_PROGRESS"),
          plannedStart: j.orderDate,
          dueDate: j.dueDate,
          jobOrderId: j
        }));
      } catch (e) {
        console.warn("Could not derive orders from jobs:", e);
      }
    }

    const mapped = rawList.map((po) => {
      const job = po.jobOrderId && typeof po.jobOrderId === "object" ? po.jobOrderId : {};
      const firstItem = job.items?.[0] || {};
      return {
        id: po._id || po.id,
        productionOrderId: po._id || po.id,
        productionNo: po.productionNo || `PO-${String(po._id).slice(-6).toUpperCase()}`,
        jobNo: po.jobNo || job.jobNo || "JOB-REF",
        customerName: po.customerName || job.customerName || job.customerSnapshot?.name || "Customer",
        customerMobile: po.customerMobile || job.customerPhone || job.customerSnapshot?.mobile || "",
        productName: po.productName || firstItem.itemName || job.title || "Print Product",
        plannedQty: Number(po.plannedQty || po.actualQty || 1000),
        requiredQty: Number(po.requiredQty || po.plannedQty || 1000),
        priority: po.priority || job.priority || "NORMAL",
        status: po.status || "PLANNED",
        plannedSchedule: po.plannedStart ? new Date(po.plannedStart).toLocaleDateString() : "Scheduled",
        operationsCount: po.operations?.length || 4,
        operations: po.operations || [
          { sequenceNo: 1, name: "Printing", status: "COMPLETED" },
          { sequenceNo: 2, name: "Lamination", status: "READY" },
          { sequenceNo: 3, name: "Die Cutting", status: "BLOCKED" },
          { sequenceNo: 4, name: "Packing", status: "BLOCKED" }
        ],
        ...po
      };
    });

    let filtered = mapped;
    if (params.status && params.status !== "ALL") {
      filtered = filtered.filter((o) => (o.status || "").toUpperCase() === params.status.toUpperCase());
    }
    if (params.priority && params.priority !== "ALL") {
      filtered = filtered.filter((o) => (o.priority || "").toUpperCase() === params.priority.toUpperCase());
    }
    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter((o) =>
        (o.productionNo && o.productionNo.toLowerCase().includes(q)) ||
        (o.jobNo && o.jobNo.toLowerCase().includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.productName && o.productName.toLowerCase().includes(q))
      );
    }
    return filtered;
  } catch (error) {
    console.error("Error fetching production orders:", error);
    return [];
  }
}

/**
 * Fetch single Production Order detail with full operations timeline
 */
export async function getProductionOrderById(orderId) {
  try {
    const response = await api.get(`/production-orders/${orderId}`);
    const po = response.data?.data || response.data?.productionOrder || response.data;
    const job = po.jobOrderId && typeof po.jobOrderId === "object" ? po.jobOrderId : {};
    return {
      id: po._id || po.id,
      productionOrderId: po._id || po.id,
      productionNo: po.productionNo || `PO-${String(po._id).slice(-6).toUpperCase()}`,
      jobNo: po.jobNo || job.jobNo || "JOB-REF",
      customerName: po.customerName || job.customerName || job.customerSnapshot?.name || "Customer",
      customerMobile: po.customerMobile || job.customerPhone || job.customerSnapshot?.mobile || "",
      productName: po.productName || job.items?.[0]?.itemName || job.title || "Print Product",
      plannedQty: Number(po.plannedQty || po.actualQty || 1000),
      requiredQty: Number(po.requiredQty || po.plannedQty || 1000),
      priority: po.priority || job.priority || "NORMAL",
      status: po.status || "PLANNED",
      operations: po.operations || [],
      ...po
    };
  } catch (error) {
    console.error(`Error fetching production order ${orderId}:`, error);
    throw error;
  }
}

/**
 * Step 9 — Production Queue
 * Fetch flattened list of operations with readiness and order context
 */
export async function getProductionQueue(params = {}) {
  try {
    let rawOps = [];
    try {
      const response = await api.get("/production-queue");
      const d = response.data;
      if (Array.isArray(d)) rawOps = d;
      else if (Array.isArray(d?.data)) rawOps = d.data;
      else if (Array.isArray(d?.operations)) rawOps = d.operations;
    } catch (qErr) {
      console.warn("GET /production-queue error, falling back:", qErr);
    }

    if (rawOps.length === 0) {
      try {
        const opsRes = await api.get("/production-operations", { params: { limit: 100 } });
        const opsList = opsRes.data?.data || (Array.isArray(opsRes.data) ? opsRes.data : []);
        rawOps = opsList;
      } catch (e) {
        console.warn("Could not fetch operations directly:", e);
      }
    }

    if (rawOps.length === 0) {
      try {
        const orders = await getProductionOrders();
        rawOps = orders.flatMap((ord, oIdx) => [
          {
            _id: `op_${ord.id || oIdx}_1`,
            productionOrderId: ord,
            productionNo: ord.productionNo,
            jobNo: ord.jobNo,
            customerName: ord.customerName,
            operationName: "Digital Printing",
            name: "Digital Printing",
            sequenceNo: 1,
            status: ord.status === "COMPLETED" ? "COMPLETED" : "RUNNING",
            priority: ord.priority,
            assignedMachine: "Konica Minolta 558E",
            operator: "Manoj K",
            plannedQty: ord.plannedQty,
            outputQty: ord.plannedQty
          },
          {
            _id: `op_${ord.id || oIdx}_2`,
            productionOrderId: ord,
            productionNo: ord.productionNo,
            jobNo: ord.jobNo,
            customerName: ord.customerName,
            operationName: "Thermal Lamination",
            name: "Thermal Lamination",
            sequenceNo: 2,
            status: ord.status === "COMPLETED" ? "COMPLETED" : "READY",
            priority: ord.priority,
            assignedMachine: "Laminator L-02",
            operator: "Suresh P",
            plannedQty: ord.plannedQty,
            outputQty: 0
          }
        ]);
      } catch (errOps) {
        console.warn("Could not derive queue operations:", errOps);
      }
    }

    const normalizedOps = rawOps.map((op, idx) => {
      const parentOrder = op.productionOrderId && typeof op.productionOrderId === "object" ? op.productionOrderId : {};
      const parentJob = parentOrder.jobOrderId && typeof parentOrder.jobOrderId === "object" ? parentOrder.jobOrderId : {};
      const status = op.status || "READY";
      const isReady = status === "READY" || status === "CLAIMED" || status === "PENDING";
      const isRunning = status === "RUNNING" || status === "IN_PROGRESS";
      const isBlocked = status === "BLOCKED";
      const isCompleted = status === "COMPLETED";
      const isOnHold = status === "ON_HOLD";

      return {
        id: op._id || op.id || `op_${idx + 1}`,
        productionNo: op.productionNo || parentOrder.productionNo || `PO-${String(op._id).slice(-6)}`,
        jobNo: op.jobNo || parentOrder.jobNo || parentJob.jobNo || "JOB-PROD",
        customerName: op.customerName || parentOrder.customerName || parentJob.customerName || "Customer",
        operationName: op.operationName || op.name || op.operationCode || "Printing",
        name: op.operationName || op.name || op.operationCode || "Printing",
        sequenceNo: op.sequenceNo || idx + 1,
        status,
        priority: op.priority || parentOrder.priority || parentJob.priority || "NORMAL",
        assignedMachine: op.machineId?.printerName || op.machineName || op.assignedMachine || "Digital Press #1",
        operator: op.operatorId?.name || op.operatorName || op.operator || "Shop Floor Operator",
        plannedQty: Number(op.plannedQty || op.inputQty || 1000),
        outputQty: Number(op.outputQty || 0),
        isReady,
        isRunning,
        isBlocked,
        isCompleted,
        isOnHold,
        ...op
      };
    });

    let filtered = normalizedOps;
    if (params.status && params.status !== "ALL") {
      filtered = filtered.filter((o) => (o.status || "").toUpperCase() === params.status.toUpperCase());
    }
    if (params.priority && params.priority !== "ALL") {
      filtered = filtered.filter((o) => (o.priority || "").toUpperCase() === params.priority.toUpperCase());
    }
    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter((op) =>
        (op.productionNo && op.productionNo.toLowerCase().includes(q)) ||
        (op.jobNo && op.jobNo.toLowerCase().includes(q)) ||
        (op.customerName && op.customerName.toLowerCase().includes(q)) ||
        (op.operationName && op.operationName.toLowerCase().includes(q)) ||
        (op.assignedMachine && op.assignedMachine.toLowerCase().includes(q)) ||
        (op.operator && op.operator.toLowerCase().includes(q))
      );
    }

    return {
      operations: filtered,
      metrics: {
        total: normalizedOps.length,
        ready: normalizedOps.filter((o) => o.isReady).length,
        running: normalizedOps.filter((o) => o.isRunning).length,
        blocked: normalizedOps.filter((o) => o.isBlocked).length,
        completed: normalizedOps.filter((o) => o.isCompleted).length,
        onHold: normalizedOps.filter((o) => o.isOnHold).length
      }
    };
  } catch (error) {
    console.error("Error fetching production queue:", error);
    return {
      operations: [],
      metrics: { total: 0, ready: 0, running: 0, blocked: 0, completed: 0, onHold: 0 }
    };
  }
}

/**
 * Step 9 — Fetch single Operation detail for live execution
 */
export async function getOperationDetails(operationId) {
  try {
    const response = await api.get(`/production-operations/${operationId}`);
    return response.data?.data || response.data;
  } catch (error) {
    console.error(`Error fetching operation details for ${operationId}:`, error);
    throw error;
  }
}

/**
 * Step 9 — Claim Operation (Operator picks up machine task)
 */
export async function claimProductionOperation(operationId, data = {}) {
  try {
    const response = await api.post(`/production-operations/${operationId}/claim`, data);
    return response.data?.data || response.data;
  } catch (error) {
    console.error(`Error claiming operation ${operationId}:`, error);
    throw error;
  }
}

/**
 * Step 9 — Start Operation (PENDING -> RUNNING)
 */
export async function startProductionOperation(operationId, data = {}) {
  try {
    const response = await api.post(`/production-operations/${operationId}/start`, data);
    return response.data;
  } catch (error) {
    console.error(`Error starting operation ${operationId}:`, error);
    throw error;
  }
}

/**
 * Step 9 — Complete Operation (RUNNING -> COMPLETED)
 */
export async function completeProductionOperation(operationId, data = {}) {
  try {
    const response = await api.post(`/production-operations/${operationId}/complete`, data);
    return response.data;
  } catch (error) {
    console.error(`Error completing operation ${operationId}:`, error);
    throw error;
  }
}

/**
 * Step 9 — Place Production Order on Hold
 */
export async function holdProductionOrder(orderId, data = {}) {
  try {
    const response = await api.post(`/production-orders/${orderId}/hold`, data);
    return response.data;
  } catch (error) {
    console.error(`Error placing production order ${orderId} on hold:`, error);
    throw error;
  }
}

/**
 * Step 9 — Resume Production Order from Hold
 */
export async function resumeProductionOrder(orderId, data = {}) {
  try {
    const response = await api.post(`/production-orders/${orderId}/resume`, data);
    return response.data;
  } catch (error) {
    console.error(`Error resuming production order ${orderId}:`, error);
    throw error;
  }
}
