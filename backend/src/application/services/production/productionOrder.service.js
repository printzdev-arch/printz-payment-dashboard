const productionOrderRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionOrderRepository");
const productionOperationRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionOperationRepository");
const qualityCheckRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoQualityCheckRepository");
const ProductionStateService = require("./productionState.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class ProductionOrderService {
  /**
   * Find production orders with filters and pagination
   */
  static async findAll(query = {}) {
    const { items, total, page, limit } = await productionOrderRepository.findAll(query);

    // Attach current active operation info for each order
    const orderIds = items.map((i) => i._id);
    const operations = await productionOperationRepository.findByProductionOrders(orderIds);

    const operationsByOrder = {};
    operations.forEach((op) => {
      const parentIdStr = op.productionOrderId ? op.productionOrderId.toString() : "";
      if (!operationsByOrder[parentIdStr]) {
        operationsByOrder[parentIdStr] = [];
      }
      operationsByOrder[parentIdStr].push(op);
    });

    const enrichedItems = items.map((item) => ({
      ...item,
      operations: operationsByOrder[item._id.toString()] || [],
    }));

    return { items: enrichedItems, total, page, limit };
  }

  /**
   * Find production order by ID with full details
   */
  static async findById(id) {
    const order = await productionOrderRepository.findByIdWithDetails(id);

    if (!order) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${id}`);
    }

    const [operations, qualityChecks] = await Promise.all([
      productionOperationRepository.findByProductionOrder(order._id),
      qualityCheckRepository.findByProductionOrder(order._id),
    ]);

    return {
      ...order,
      operations,
      qualityChecks,
    };
  }

  /**
   * Update production order details
   */
  static async update(id, updateData, user = null) {
    const order = await productionOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${id}`);
    }

    const allowedFields = ["plannedStart", "machineId", "assignedEmployeeIds", "priority", "notes"];
    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        order[field] = updateData[field];
      }
    });

    await productionOrderRepository.save(order);

    await ProductionStateService.logAudit({
      action: "JOB_UPDATE",
      resource: "ProductionOrder",
      resourceId: order._id,
      user,
      branchId: order.branchId,
      details: { updateData },
    });

    return order;
  }

  /**
   * Hold production order
   */
  static async hold(id, reason = "", user = null) {
    const order = await productionOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${id}`);
    }

    if (order.status === "COMPLETED" || order.status === "CANCELLED") {
      throw ErrorHelper.badRequest(`Cannot hold a ${order.status} production order.`);
    }

    order.status = "ON_HOLD";
    order.holdReason = reason;
    await productionOrderRepository.save(order);

    await ProductionStateService.logAudit({
      action: "HOLD",
      resource: "ProductionOrder",
      resourceId: order._id,
      user,
      branchId: order.branchId,
      details: { reason },
    });

    await ProductionStateService.createNotification({
      role: "production",
      branchId: order.branchId,
      title: "Production Order On Hold",
      message: `Production Order ${order.productionNo} has been placed ON HOLD. Reason: ${reason}`,
      entityType: "PRODUCTION",
      entityId: order._id,
    });

    return order;
  }

  /**
   * Resume production order from hold
   */
  static async resume(id, user = null) {
    const order = await productionOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${id}`);
    }

    if (order.status !== "ON_HOLD") {
      throw ErrorHelper.badRequest("Only ON_HOLD production orders can be resumed.");
    }

    // Check if any operations have started to determine PLANNED vs IN_PROGRESS
    const runningOrCompleted = await productionOperationRepository.findOne({
      productionOrderId: order._id,
      status: { $in: ["RUNNING", "COMPLETED"] },
    });

    order.status = runningOrCompleted ? "IN_PROGRESS" : "PLANNED";
    order.holdReason = null;
    await productionOrderRepository.save(order);

    await ProductionStateService.logAudit({
      action: "RESUME",
      resource: "ProductionOrder",
      resourceId: order._id,
      user,
      branchId: order.branchId,
      details: { resumedStatus: order.status },
    });

    return order;
  }

  /**
   * Cancel production order
   */
  static async cancel(id, reason = "", user = null) {
    const order = await productionOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${id}`);
    }

    if (order.status === "COMPLETED") {
      throw ErrorHelper.badRequest("Cannot cancel an already COMPLETED production order.");
    }

    order.status = "CANCELLED";
    order.cancelReason = reason;
    await productionOrderRepository.save(order);

    // Cancel pending operations
    await productionOperationRepository.updateMany(
      { productionOrderId: order._id, status: { $in: ["PENDING", "RUNNING"] } },
      { $set: { status: "SKIPPED", remarks: `Cancelled: ${reason}` } }
    );

    await ProductionStateService.logAudit({
      action: "CANCEL",
      resource: "ProductionOrder",
      resourceId: order._id,
      user,
      branchId: order.branchId,
      details: { reason },
    });

    return order;
  }

  /**
   * Reorder or update pending finishing operations
   */
  static async updateOperations(id, operationsData = [], user = null) {
    const order = await productionOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Production Order not found with ID: ${id}`);
    }

    // Only allow modification of PENDING operations
    for (const opUpdate of operationsData) {
      if (opUpdate._id) {
        await productionOperationRepository.findOneAndUpdate(
          { _id: opUpdate._id, productionOrderId: order._id, status: "PENDING" },
          {
            $set: {
              sequenceNo: opUpdate.sequenceNo,
              operationCode: opUpdate.operationCode,
              remarks: opUpdate.remarks,
              machineId: opUpdate.machineId,
            },
          }
        );
      }
    }

    return productionOperationRepository.findByProductionOrder(order._id);
  }
}

module.exports = ProductionOrderService;
