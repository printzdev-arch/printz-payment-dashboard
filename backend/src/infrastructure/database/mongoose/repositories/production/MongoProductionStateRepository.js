const AuditLog = require("../../models/AuditLog");
const JobWorkflowEvent = require("../../models/JobWorkflowEvent");
const JobApproval = require("../../models/JobApproval");
const Notification = require("../../models/Notification");
const JobOrder = require("../../models/JobOrder");

class MongoProductionStateRepository {
  async createAuditLog(data) {
    return AuditLog.create(data);
  }

  async createWorkflowEvent(data) {
    return JobWorkflowEvent.create(data);
  }

  async createJobApproval(data) {
    return JobApproval.create(data);
  }

  async createNotification(data) {
    return Notification.create(data);
  }

  async updateJobStage(jobOrderId, newStage, newStatus = null) {
    if (!jobOrderId) return null;
    const update = { stage: newStage };
    if (newStatus) update.status = newStatus;
    return JobOrder.findByIdAndUpdate(jobOrderId, { $set: update }, { new: true });
  }
}

module.exports = new MongoProductionStateRepository();
