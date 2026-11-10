const mongoose = require("mongoose");
const jobOrderRepository = require("../../job-orders/models/JobOrder");
const jobAssignmentRepository = require("../models/JobAssignment");
const JobWorkflowService = require("../../job-orders/services/jobWorkflow.service");
const ProductionStateService = require("../../production/services/productionState.service");
const { emitJobEvent } = require("../../job-orders/services/jobEvents.emitter");
const DesignHelper = require("./DesignHelper");
const ErrorHelper = require("../../../utils/errors/ApiError");

const sameUser = (assignedId, user) => {
  const empId = user?.employeeId ? String(user.employeeId) : null;
  return assignedId === String(user?._id) || (empId && assignedId === empId);
};

class DesignWorkService {
  /**
   * The current assignment of the job, if the user may act on it: the assigned designer, or a manager / admin
   * of the job's branch.
   */
  static async getActiveAssignment(jobId, user, { designerOnly = false } = {}) {
    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

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
    const isAssigned = sameUser(assignedId, user);

    if (isAssigned) return assignment;
    if (!designerOnly && DesignHelper.isManagerOrAdmin(user)) {
      DesignHelper.assertBranchAccess(job, user);
      return assignment;
    }
    throw ErrorHelper.forbidden("This job is not assigned to you.");
  }

  /**
   * Designer accepts assigned job.
   */
  static async accept(jobId, arg2, arg3) {
    const user = (arg3 && arg3._id) ? arg3 : (arg2 && arg2._id) ? arg2 : null;
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const assignment = await this.getActiveAssignment(jobId, user);
    if (!assignment.acceptedAt) {
      assignment.acceptedAt = new Date();
      await assignment.save();
    }

    const job = await jobOrderRepository.findById(jobId);
    if (String(job.currentStage).toUpperCase() === "DESIGN_ASSIGNED") {
      await JobWorkflowService.transition(jobId, "DESIGN_IN_PROGRESS", {
        actorId: user._id,
        user,
        patch: { designStatus: "IN_PROGRESS" },
      });
    } else if (!["DESIGN_IN_PROGRESS", "REVISION"].includes(String(job.currentStage).toUpperCase())) {
      throw ErrorHelper.conflict(`This job order is at stage '${job.currentStage}' and cannot be accepted for design.`);
    }

    emitJobEvent("design.accepted", { jobId: String(jobId), employeeId: String(assignment.employeeId) });

    return assignment;
  }

  /**
   * Designer rejects assigned job (before acceptance). Only the assigned designer can reject;
   * a manager changes the designer with reassign instead.
   */
  static async reject(jobId, rejectionReason, user) {
    let cleanReason = "";
    if (typeof rejectionReason === "object" && rejectionReason !== null) {
      cleanReason = (rejectionReason.reason || rejectionReason.rejectionReason || "").trim();
    } else {
      cleanReason = (rejectionReason || "").trim();
    }
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");
    if (!cleanReason) {
      throw ErrorHelper.badRequest("Rejection reason is required.");
    }

    const assignment = await this.getActiveAssignment(jobId, user, { designerOnly: true });
    if (assignment.acceptedAt) {
      throw ErrorHelper.conflict("An accepted assignment cannot be rejected; it can only be changed by reassign.");
    }

    const now = new Date();
    await JobWorkflowService.transition(jobId, "DESIGN_QUEUE", {
      actorId: user._id,
      reason: cleanReason,
      patch: {
        designerId: null,
        designerName: "",
        assignedAt: null,
        designStatus: "REJECTED",
        designRejectionReason: cleanReason,
      },
      user,
    });

    assignment.status = "REJECTED";
    assignment.rejectedAt = now;
    assignment.releasedAt = now;
    assignment.currentAssignment = false;
    assignment.rejectionReason = cleanReason;
    await assignment.save();

    emitJobEvent("design.rejected", {
      jobId: String(jobId),
      employeeId: String(assignment.employeeId),
      reason: cleanReason,
    });

    return { jobId: String(jobId), status: "REQUEUED", rejectionReason: cleanReason };
  }

  /**
   * Designer starts design work: moves stage to DESIGN_IN_PROGRESS or sets STARTED_REVISION for revisions.
   */
  static async start(jobId, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    const stage = String(job.currentStage || "").toUpperCase();
    const isRevision = Boolean(
      job.designStatus === "REJECTED_SAMPLE" ||
        job.designStatus === "STARTED_REVISION" ||
        job.designStatus === "REVISION" ||
        stage === "REVISION"
    );

    if (isRevision) {
      // Only the designer of the job (or a manager of its branch) may start the revision
      const assignedId = job.designerId ? String(job.designerId._id || job.designerId) : "";
      const isAssigned = assignedId && sameUser(assignedId, user);
      if (!isAssigned) {
        if (!DesignHelper.isManagerOrAdmin(user)) {
          throw ErrorHelper.forbidden("Unauthorized: Revision can only be started by the assigned designer.");
        }
        DesignHelper.assertBranchAccess(job, user);
      }

      // Prevent multiple simultaneous starts for the same revision
      if (job.designStatus === "STARTED_REVISION" && job.isRevisionStarted) {
        return job;
      }

      const now = new Date();
      const patch = {
        designStatus: "STARTED_REVISION",
        isRevisionStarted: true,
        revisionStartedAt: job.revisionStartedAt || now,
      };
      const updated = await jobOrderRepository.findOneAndUpdate({ _id: jobId }, { $set: patch }, { new: true });

      emitJobEvent("design.started", { jobId: String(jobId), isRevision: true });
      return updated || job;
    }

    // First-time start: only the assigned designer (or a manager of the branch), and only from the assigned stage
    const assignment = await this.getActiveAssignment(jobId, user);
    if (!assignment.acceptedAt) {
      assignment.acceptedAt = new Date();
      await assignment.save();
    }

    if (stage === "DESIGN_IN_PROGRESS") return job;
    if (stage !== "DESIGN_ASSIGNED") {
      throw ErrorHelper.conflict(`This job order is at stage '${job.currentStage}' and design work cannot be started.`);
    }

    const updated = await JobWorkflowService.transition(jobId, "DESIGN_IN_PROGRESS", {
      actorId: user._id,
      user,
      patch: { designStatus: "IN_PROGRESS" },
    });

    emitJobEvent("design.started", { jobId: String(jobId), isRevision: false });
    return updated || job;
  }

  /**
   * Jobs assigned to the current designer. Managers and admins cannot use it;
   * a designer always gets only their own jobs.
   */
  static async myJobs(user, state = null, targetDesignerId = null) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const match = {
      assignmentType: "DESIGNER",
      status: "ACTIVE",
      currentAssignment: true,
    };

    // A designer's own job list is the designer's workspace: managers and admins do not see it
    // (they run the Design Queue instead).
    if (DesignHelper.isManagerOrAdmin(user)) {
      throw ErrorHelper.forbidden("Designer job lists are only for designers. Managers use the Design Queue.");
    }
    match.employeeId = mongoose.Types.ObjectId.isValid(String(user._id)) ? new mongoose.Types.ObjectId(String(user._id)) : user._id;

    if (state === "PENDING") match.acceptedAt = null;
    if (state === "ACCEPTED") match.acceptedAt = { $ne: null };

    const branchId = null;

    return jobAssignmentRepository.aggregate([
      { $match: match },
      { $lookup: { from: "jobOrders", localField: "jobOrderId", foreignField: "_id", as: "job" } },
      { $unwind: "$job" },
      ...(branchId ? [{ $match: { "job.branchId": new mongoose.Types.ObjectId(branchId) } }] : []),
      { $lookup: { from: "users", localField: "employeeId", foreignField: "_id", as: "designerUser" } },
      { $unwind: { path: "$designerUser", preserveNullAndEmptyArrays: true } },
      { $project: { "designerUser.password": 0 } },
      { $sort: { "job.dueDate": 1, assignedAt: 1 } },
    ]);
  }
}

module.exports = DesignWorkService;
