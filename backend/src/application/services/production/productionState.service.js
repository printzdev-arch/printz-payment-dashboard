const productionStateRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionStateRepository");

class ProductionStateService {
  /**
   * Log an audit event
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
      console.error("Audit log error:", err.message);
    }
  }

  /**
   * Dispatch a workflow event
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
      console.error("Workflow event dispatch error:", err.message);
    }
  }

  /**
   * Create an in-app notification
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
      console.error("Notification creation error:", err.message);
    }
  }

  /**
   * Update Job stage and status safely
   */
  static async updateJobStage(jobOrderId, newStage, newStatus = null) {
    if (!jobOrderId) return null;
    return productionStateRepository.updateJobStage(jobOrderId, newStage, newStatus);
  }
}

module.exports = ProductionStateService;
