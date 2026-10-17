const AuditLog = require("../common/AuditLog");
const JobWorkflowEvent = require("../job-order/JobWorkflowEvent");
const JobApproval = require("../job-order/JobApproval");
const Notification = require("../common/Notification");
const JobOrder = require("../job-order/JobOrder");

class ProductionState {
  static async createAuditLog(data) {
    return AuditLog.create(data);
  }

  static async createWorkflowEvent(data) {
    return JobWorkflowEvent.create(data);
  }

  static async createJobApproval(data) {
    return JobApproval.create(data);
  }

  static async createNotification(data) {
    return Notification.create(data);
  }

  static async updateJobStage(jobOrderId, newStage, newStatus = null) {
    if (!jobOrderId) return null;
    const update = { stage: newStage };
    if (newStatus) update.status = newStatus;
    return JobOrder.findByIdAndUpdate(jobOrderId, { $set: update }, { new: true });
  }
}

module.exports = ProductionState;
