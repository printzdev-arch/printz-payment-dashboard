class JobWorkflowEvent {
  constructor({
    id = null,
    jobOrderId,
    stage,
    fromStage = null,
    fromStatus = null,
    toStatus,
    actorId = null,
    assignedTo = null,
    notes = "",
    reason = "",
    relatedSampleId = null,
    relatedReprintId = null,
    createdAt = new Date(),
  }) {
    this.id = id;
    this.jobOrderId = jobOrderId;
    this.stage = stage;
    this.fromStage = fromStage;
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
    this.actorId = actorId;
    this.assignedTo = assignedTo;
    this.notes = notes;
    this.reason = reason;
    this.relatedSampleId = relatedSampleId;
    this.relatedReprintId = relatedReprintId;
    this.createdAt = createdAt;
  }
}

module.exports = JobWorkflowEvent;
