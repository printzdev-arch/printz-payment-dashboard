const productionOperationRepository = require("../../models/production/ProductionOperation");
const productionOrderRepository = require("../../models/production/ProductionOrder");

class ProductionQueueService {
  /**
   * Get production operations queue.
   * Only returns operations that are ready to run:
   * 1. Status is PENDING or RUNNING
   * 2. The Production Order is not ON_HOLD or CANCELLED
   * 3. All prior operations in sequence (sequenceNo < current) are COMPLETED or SKIPPED
   */
  static async getQueue(filters = {}, user = null) {
    const { operationCode, branchId, mine, search, page = 1, limit = 50 } = filters;

    // First get active production orders
    const activeOrders = await productionOrderRepository.findActiveOrders(branchId);

    if (!activeOrders || activeOrders.length === 0) {
      return { items: [], total: 0, page: Number(page), limit: Number(limit) };
    }

    const activeOrderMap = {};
    activeOrders.forEach((o) => {
      activeOrderMap[o._id.toString()] = o;
    });

    const activeOrderIds = Object.keys(activeOrderMap);

    // Fetch all operations for these orders to check sequential readiness
    const allOps = await productionOperationRepository.findByProductionOrders(activeOrderIds);

    // Group by productionOrderId
    const opsByOrder = {};
    allOps.forEach((op) => {
      const orderIdStr = op.productionOrderId ? op.productionOrderId.toString() : "";
      if (!opsByOrder[orderIdStr]) opsByOrder[orderIdStr] = [];
      opsByOrder[orderIdStr].push(op);
    });

    // Filter available operations according to strict sequential rules
    const queueOperations = [];

    for (const [orderIdStr, ops] of Object.entries(opsByOrder)) {
      const sorted = ops.sort((a, b) => a.sequenceNo - b.sequenceNo);
      const parentOrder = activeOrderMap[orderIdStr];

      for (const op of sorted) {
        const prevOps = sorted.filter((p) => p.sequenceNo < op.sequenceNo);
        const allPrevCompleted = prevOps.every((p) => p.status === "COMPLETED" || p.status === "SKIPPED");

        let availabilityStatus = op.status;
        if (parentOrder?.status === "ON_HOLD") {
          availabilityStatus = "ON_HOLD";
        } else if (op.status === "RUNNING") {
          availabilityStatus = "RUNNING";
        } else if (op.status === "COMPLETED") {
          availabilityStatus = "COMPLETED";
        } else if (op.status === "FAILED") {
          availabilityStatus = "FAILED";
        } else if (op.status === "PENDING") {
          availabilityStatus = allPrevCompleted ? "READY" : "BLOCKED";
        }

        let match = true;
        if (operationCode && op.operationCode !== operationCode.toUpperCase().trim()) {
          match = false;
        }
        if (mine && user && String(op.assignedEmployeeId?._id || op.assignedEmployeeId) !== String(user._id)) {
          match = false;
        }

        if (match) {
          queueOperations.push({
            ...op,
            operationId: String(op._id),
            id: String(op._id),
            productionOrderId: String(parentOrder?._id || op.productionOrderId),
            productionNo: parentOrder?.productionNo || "",
            jobOrderId: String(parentOrder?.jobOrderId?._id || parentOrder?.jobOrderId || op.jobOrderId),
            jobNo: parentOrder?.jobOrderId?.jobNo || parentOrder?.jobNo || "",
            branchId: parentOrder?.branchId || op.branchId,
            customerName: parentOrder?.customerName || parentOrder?.jobOrderId?.customerName || "Customer",
            customerMobile: parentOrder?.customerMobile || parentOrder?.jobOrderId?.customerPhone || "",
            operationName: op.operationName,
            operationCode: op.operationCode,
            sequenceNo: op.sequenceNo,
            availabilityStatus,
            status: op.status,
            plannedQty: op.plannedQty || parentOrder?.plannedQty,
            isAvailable: availabilityStatus === "READY",
            productionOrder: parentOrder,
            jobOrder: parentOrder?.jobOrderId,
          });
        }
      }
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginated = queueOperations.slice(startIndex, startIndex + Number(limit));

    return {
      items: paginated,
      queue: paginated,
      total: queueOperations.length,
      page: Number(page),
      limit: Number(limit),
    };
  }

  /**
   * Get queue counts grouped by operation code + QC_PENDING count
   */
  static async getQueueCounts(branchId = null) {
    const queueData = await this.getQueue({ branchId, limit: 10000 });
    const counts = {};

    queueData.items.forEach((item) => {
      const code = item.operationCode || "OTHER";
      counts[code] = (counts[code] || 0) + 1;
    });

    // Also count QC pending production orders
    const qcQuery = { status: "QC" };
    if (branchId) qcQuery.branchId = branchId;
    const qcCount = await productionOrderRepository.countDocuments(qcQuery);

    counts.QC_PENDING = qcCount;

    return counts;
  }
}

module.exports = ProductionQueueService;
