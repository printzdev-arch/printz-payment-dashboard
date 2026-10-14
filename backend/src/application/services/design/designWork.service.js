const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobOrderRepository");
const jobAssignmentRepository = require("../../../infrastructure/database/mongoose/repositories/design/MongoJobAssignmentRepository");
const JobWorkflowService = require("../job-order/jobWorkflow.service");
const ProductionStateService = require("../production/productionState.service");
const { emitJobEvent } = require("../../../shared/events/job-order/jobEvents.emitter");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DesignWorkService {
  static async getActiveAssignment(jobId, user) {
    const assignment = await jobAssignmentRepository.findOne({
      jobOrderId: jobId,
      assignmentType: "DESIGNER",
      currentAssignment: true,
      status: "ACTIVE",
    });

    if (!assignment) {
      throw ErrorHelper.notFound("No active designer assignment found for this Job Order.");
    }

    const assignedId = String(assignment.employeeId?._id || assignment.employeeId);
    const isPrivileged = ["admin", "superadmin", "SUPER_ADMIN", "manager", "branch_manager", "BRANCH_MANAGER", "store_manager"].includes(user.role);
    if (!isPrivileged && assignedId !== String(user._id)) {
      throw ErrorHelper.forbidden("This job is not assigned to you.");
    }

    return assignment;
  }

  /**
   * Designer accepts assigned job.
   */
  static async accept(jobId, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const assignment = await this.getActiveAssignment(jobId, user);
    if (!assignment.acceptedAt) {
      assignment.acceptedAt = new Date();
      await assignment.save();
    }

    // Advance job stage to DESIGN_IN_PROGRESS so status updates from Assigned to In Progress / Accepted
    try {
      await JobWorkflowService.transition(jobId, "DESIGN_IN_PROGRESS", {
        actorId: user._id,
        user,
      });
    } catch (err) {
      await jobOrderRepository.findOneAndUpdate(
        { _id: jobId },
        { $set: { currentStage: "DESIGN_IN_PROGRESS", status: "DESIGN" } }
      );
    }

    await ProductionStateService.logAudit({
      action: "UPDATE",
      resource: "JobAssignment",
      resourceId: assignment._id,
      user,
      details: { accepted: true },
    });

    emitJobEvent("design.accepted", { jobId: String(jobId), employeeId: String(assignment.employeeId) });

    return assignment;
  }

  /**
   * Designer rejects assigned job (before acceptance).
   */
  static async reject(jobId, rejectionReason = "Designer rejected", user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const assignment = await this.getActiveAssignment(jobId, user);
    if (assignment.acceptedAt) {
      throw ErrorHelper.conflict("An accepted assignment cannot be rejected; it can only be changed by reassign.");
    }

    const now = new Date();
    assignment.status = "REJECTED";
    assignment.rejectedAt = now;
    assignment.releasedAt = now;
    assignment.currentAssignment = false;
    assignment.rejectionReason = rejectionReason;
    await assignment.save();

    await JobWorkflowService.transition(jobId, "DESIGN_QUEUE", {
      actorId: user._id,
      reason: rejectionReason,
      patch: { designerId: null, assignedAt: null },
      user,
    });

    await ProductionStateService.logAudit({
      action: "REJECT",
      resource: "JobAssignment",
      resourceId: assignment._id,
      user,
      details: { reason: rejectionReason },
    });

    emitJobEvent("design.rejected", {
      jobId: String(jobId),
      employeeId: String(assignment.employeeId),
      reason: rejectionReason,
    });

    return { jobId: String(jobId), status: "REQUEUED" };
  }

  /**
   * Designer starts design work: moves stage to DESIGN_IN_PROGRESS.
   */
  static async start(jobId, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const assignment = await this.getActiveAssignment(jobId, user);
    if (!assignment.acceptedAt) {
      throw ErrorHelper.conflict("Please accept the assignment first before starting work.");
    }

    const updated = await JobWorkflowService.transition(jobId, "DESIGN_IN_PROGRESS", {
      actorId: user._id,
      user,
    });

    emitJobEvent("design.started", { jobId: String(jobId) });
    return updated;
  }

  /**
   * List jobs assigned to current designer or target designer (or all designers if privileged/requested).
   */
  static async myJobs(user, state = null, targetDesignerId = null) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const mongoose = require("mongoose");
    const match = {
      assignmentType: "DESIGNER",
      status: "ACTIVE",
      currentAssignment: true,
    };

    if (targetDesignerId && targetDesignerId !== "all") {
      match.employeeId = mongoose.Types.ObjectId.isValid(targetDesignerId)
        ? new mongoose.Types.ObjectId(targetDesignerId)
        : targetDesignerId;
    } else if (!targetDesignerId) {
      const isPrivileged = [
        "admin", "superadmin", "SUPER_ADMIN", "manager", "branch_manager", "BRANCH_MANAGER", "store_manager"
      ].includes(user.role);
      if (!isPrivileged) {
        match.employeeId = user._id;
      }
    }

    if (state === "PENDING") match.acceptedAt = null;
    if (state === "ACCEPTED") match.acceptedAt = { $ne: null };

    return jobAssignmentRepository.aggregate([
      { $match: match },
      { $lookup: { from: "jobOrders", localField: "jobOrderId", foreignField: "_id", as: "job" } },
      { $unwind: "$job" },
      { $lookup: { from: "users", localField: "employeeId", foreignField: "_id", as: "designerUser" } },
      { $unwind: { path: "$designerUser", preserveNullAndEmptyArrays: true } },
      { $sort: { "job.dueDate": 1, assignedAt: 1 } },
    ]);
  }
}

module.exports = DesignWorkService;
