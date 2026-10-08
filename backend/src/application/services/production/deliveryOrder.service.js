const deliveryOrderRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoDeliveryOrderRepository");
const productionStateRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionStateRepository");
const ProductionStateService = require("./productionState.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DeliveryOrderService {
  /**
   * List delivery orders with filters
   */
  static async findAll(query = {}) {
    return deliveryOrderRepository.findAll(query);
  }

  /**
   * Get single delivery order by ID
   */
  static async findById(id) {
    const order = await deliveryOrderRepository.findByIdWithDetails(id);

    if (!order) {
      throw ErrorHelper.notFound(`Delivery Order not found with ID: ${id}`);
    }

    return order;
  }

  /**
   * Mark delivery order as PACKED
   */
  static async pack(id, user) {
    const order = await deliveryOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Delivery Order not found with ID: ${id}`);
    }

    if (order.status !== "READY") {
      throw ErrorHelper.badRequest(`Cannot pack a delivery order with status '${order.status}'. Expected READY.`);
    }

    order.status = "PACKED";
    order.packedAt = new Date();
    order.packedBy = user ? user._id : null;
    await order.save();

    await ProductionStateService.logAudit({
      action: "DELIVERY_PACKED",
      resource: "DeliveryOrder",
      resourceId: order._id,
      user,
      branchId: order.branchId,
      details: { deliveryNo: order.deliveryNo },
    });

    return order;
  }

  /**
   * Dispatch delivery order (OUT_FOR_DELIVERY)
   */
  static async dispatch(id, user) {
    const order = await deliveryOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Delivery Order not found with ID: ${id}`);
    }

    if (order.status !== "PACKED" && order.status !== "READY") {
      throw ErrorHelper.badRequest(`Cannot dispatch a delivery order with status '${order.status}'. Expected PACKED or READY.`);
    }

    order.status = "OUT_FOR_DELIVERY";
    order.dispatchedAt = new Date();
    order.dispatchedBy = user ? user._id : null;
    await order.save();

    await ProductionStateService.updateJobStage(order.jobOrderId, "DELIVERY");

    await ProductionStateService.logAudit({
      action: "DELIVERY_DISPATCHED",
      resource: "DeliveryOrder",
      resourceId: order._id,
      user,
      branchId: order.branchId,
      details: { deliveryNo: order.deliveryNo },
    });

    return order;
  }

  /**
   * Complete delivery (DELIVERED)
   */
  static async deliver(id, data = {}, user) {
    const order = await deliveryOrderRepository.findById(id);
    if (!order) {
      throw ErrorHelper.notFound(`Delivery Order not found with ID: ${id}`);
    }

    if (order.status === "DELIVERED") {
      throw ErrorHelper.badRequest("Delivery order has already been marked as DELIVERED.");
    }

    if (order.status === "CANCELLED") {
      throw ErrorHelper.badRequest("Cannot deliver a CANCELLED delivery order.");
    }

    const { receivedBy, remarks } = data;

    order.status = "DELIVERED";
    order.deliveredAt = new Date();
    order.deliveredBy = user ? user._id : null;
    if (receivedBy) order.receivedBy = receivedBy;
    if (remarks) order.remarks = remarks;
    await order.save();

    // Mark Job Order COMPLETED and DELIVERED
    await ProductionStateService.updateJobStage(order.jobOrderId, "COMPLETED", "DELIVERED");

    // Create Job Approval record for delivery
    await productionStateRepository.createJobApproval({
      jobOrderId: order.jobOrderId,
      approvalType: "DELIVERY",
      status: "APPROVED",
      decidedBy: user ? user._id : null,
      decidedAt: new Date(),
      remarks: `Delivered to ${receivedBy || "Customer"}. ${remarks || ""}`,
    });

    await ProductionStateService.logAudit({
      action: "DELIVERED",
      resource: "DeliveryOrder",
      resourceId: order._id,
      user,
      branchId: order.branchId,
      details: { deliveryNo: order.deliveryNo, receivedBy },
    });

    await ProductionStateService.dispatchWorkflowEvent({
      jobOrderId: order.jobOrderId,
      eventType: "delivery.delivered",
      stage: "COMPLETED",
      performedBy: user ? user._id : null,
      details: { receivedBy },
    });

    return order;
  }
}

module.exports = DeliveryOrderService;
