const JobWorkflowEvent = require("../../job-orders/models/JobWorkflowEvent");
const JobApproval = require("../../job-orders/models/JobApproval");
const Notification = require("../../notifications/models/Notification");
const JobOrder = require("../../job-orders/models/JobOrder");

class ProductionState {
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
    const update = { stage: newStage, currentStage: newStage };
    if (newStatus) update.status = newStatus;
    return JobOrder.findByIdAndUpdate(jobOrderId, { $set: update }, { new: true });
  }
}

module.exports = ProductionState;
