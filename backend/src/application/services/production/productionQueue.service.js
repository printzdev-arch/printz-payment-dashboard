const productionOperationRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionOperationRepository");
const productionOrderRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionOrderRepository");

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
    const readyOperations = [];

    for (const [orderIdStr, ops] of Object.entries(opsByOrder)) {
      const sorted = ops.sort((a, b) => a.sequenceNo - b.sequenceNo);
      let previousCompleted = true;

      for (const op of sorted) {
        if (op.status === "COMPLETED" || op.status === "SKIPPED") {
          continue;
        }

        // The first non-completed/non-skipped op is the currently ready/active operation!
        if (previousCompleted && (op.status === "PENDING" || op.status === "RUNNING")) {
          const parentOrder = activeOrderMap[orderIdStr];

          let match = true;
          if (operationCode && op.operationCode !== operationCode.toUpperCase().trim()) {
            match = false;
          }
          if (mine && user && String(op.assignedEmployeeId?._id || op.assignedEmployeeId) !== String(user._id)) {
            match = false;
          }

          if (match) {
            readyOperations.push({
              ...op,
              productionOrder: parentOrder,
              jobOrder: parentOrder?.jobOrderId,
              customer: {
                name: parentOrder?.jobOrderId?.customerName || "Customer",
                phone: parentOrder?.jobOrderId?.customerPhone || "",
              },
              isAvailable: true,
            });
          }
        }

        // Once we encounter a pending/running operation, subsequent operations are blocked
        previousCompleted = false;
      }
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginated = readyOperations.slice(startIndex, startIndex + Number(limit));

    return {
      items: paginated,
      total: readyOperations.length,
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
