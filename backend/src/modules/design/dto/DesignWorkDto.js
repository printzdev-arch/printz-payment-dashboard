/**
 * Design Work DTOs (Module 07)
 */

class RejectAssignmentDto {
  constructor(data = {}) {
    this.rejectionReason = data.rejectionReason || data.reason || "Rejected by designer";
  }
}

class MyJobsQueryDto {
  constructor(query = {}) {
    this.state = query.state || null; // PENDING, ACCEPTED
  }
}

module.exports = {
  RejectAssignmentDto,
  MyJobsQueryDto,
};
