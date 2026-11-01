const productionStateRepository = require("../models/ProductionState");

/**
 * Shared production helpers: audit log, workflow events, notifications,
 * job stage updates, validated status changes and progress calculation.
 * Other production services must use these instead of re-implementing them.
 */
class ProductionStateService {
  /**
   * Log an audit event. Never throws: an audit failure must not break the action.
   */
  static async logAudit({
    action,
    resource,
    resourceId,
    user,
    branchId,
    details = {},
    ipAddress = null,
  }) {
    try {
      await productionStateRepository.createAuditLog({
        action,
        resource,
        resourceId,
        userId: user ? user._id : null,
        userName: user ? user.name : "System",
        userRole: user ? user.role : "system",
        branchId,
        details,
        ipAddress,
      });
    } catch (err) {
      console.error("[ProductionState] Audit log error:", err.message);
    }
  }

  /**
   * Audit entry for any status change: who, when, previous status, new status, reason.
   */
  static async logStatusChange({
    resource,
    resourceId,
    from,
    to,
    reason = "",
    user = null,
    branchId = null,
    extra = {},
  }) {
    return this.logAudit({
      action: "STATUS_CHANGE",
      resource,
      resourceId,
      user,
      branchId,
      details: { previousStatus: from, newStatus: to, reason, ...extra },
    });
  }

  /**
   * Dispatch a workflow event. Never throws.
   */
  static async dispatchWorkflowEvent({
    jobOrderId,
    productionOrderId = null,
    operationId = null,
    eventType,
    stage = null,
    assignedTo = null,
    performedBy = null,
    details = {},
    notes = "",
  }) {
    try {
      await productionStateRepository.createWorkflowEvent({
        jobOrderId,
        productionOrderId,
        operationId,
        eventType,
        stage,
        assignedTo,
        performedBy,
        details,
        notes,
      });
    } catch (err) {
      console.error("[ProductionState] Workflow event dispatch error:", err.message);
    }
  }

  /**
   * Create an in-app notification. Never throws.
   */
  static async createNotification({
    userId = null,
    role = null,
    branchId = null,
    title,
    message,
    type = "INFO",
    entityType = "PRODUCTION",
    entityId = null,
  }) {
    try {
      await productionStateRepository.createNotification({
        userId,
        role,
        branchId,
        title,
        message,
        type,
        entityType,
        entityId,
      });
    } catch (err) {
      console.error("[ProductionState] Notification creation error:", err.message);
    }
  }

  /**
   * Create a job approval record (QC approve/reject decisions).
   */
  static async createJobApproval(data) {
    return productionStateRepository.createJobApproval(data);
  }

  /**
   * Update job stage/status. Failures are logged loudly but do not roll back
   * the production change that already succeeded.
   */
  static async updateJobStage(jobOrderId, newStage, newStatus = null) {
    if (!jobOrderId) return null;
    try {
      return await productionStateRepository.updateJobStage(jobOrderId, newStage, newStatus);
    } catch (err) {
      console.error(
        `[ProductionState] Failed to set job ${jobOrderId} stage to '${newStage}':`,
        err.message
      );
      return null;
    }
  }

  /**
   * Validated production order status change:
   *   1. checks the transition map (throws 409 when not allowed)
   *   2. appends to order.statusHistory
   *   3. saves the order
   *   4. writes an audit entry (previous status, new status, reason, user)
   *
   * Other field changes made on `order` before calling this are saved in the same write.
   */
  static async transitionOrder(order, newStatus, { reason = "", user = null } = {}) {
    const from = order.status;
    if (from === newStatus) return order;

    order.transitionTo(newStatus, { reason, userId: user ? user._id : null });
    await order.save();

    await this.logStatusChange({
      resource: "ProductionOrder",
      resourceId: order._id,
      from,
      to: newStatus,
      reason,
      user,
      branchId: order.branchId,
    });

    return order;
  }

  /**
   * Recalculate order.progressPct from its operations.
   * Counts each operation once (COMPLETED or SKIPPED = finished), so rework
   * or retried operations are never double counted.
   */
  static async updateOrderProgress(productionOrderId) {
    const ProductionOperation = require("../models/ProductionOperation");
    const ProductionOrder = require("../models/ProductionOrder");

    const ops = await ProductionOperation.find({ productionOrderId })
      .select("status")
      .lean();
    if (!ops.length) return 0;

    const finished = ops.filter((o) => o.status === "COMPLETED" || o.status === "SKIPPED").length;
    const progressPct = Math.round((finished / ops.length) * 100);

    await ProductionOrder.findByIdAndUpdate(productionOrderId, { $set: { progressPct } });
    return progressPct;
  }
}

module.exports = ProductionStateService;