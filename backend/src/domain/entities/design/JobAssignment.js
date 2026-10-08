class JobAssignment {
  constructor({
    id = null,
    jobOrderId,
    employeeId,
    assignmentType = "DESIGNER", // DESIGNER, OPERATOR, QC_INSPECTOR
    assignmentMethod = "ROUND_ROBIN", // ROUND_ROBIN, MANUAL, REASSIGN
    sequenceNo = 1,
    assignedBy = null,
    assignedAt = new Date(),
    acceptedAt = null,
    rejectedAt = null,
    rejectionReason = "",
    releasedAt = null,
    currentAssignment = true,
    status = "ACTIVE", // ACTIVE, REJECTED, REASSIGNED, COMPLETED, CANCELLED
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.jobOrderId = jobOrderId;
    this.employeeId = employeeId;
    this.assignmentType = assignmentType;
    this.assignmentMethod = assignmentMethod;
    this.sequenceNo = sequenceNo;
    this.assignedBy = assignedBy;
    this.assignedAt = assignedAt;
    this.acceptedAt = acceptedAt;
    this.rejectedAt = rejectedAt;
    this.rejectionReason = rejectionReason;
    this.releasedAt = releasedAt;
    this.currentAssignment = currentAssignment;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = JobAssignment;
