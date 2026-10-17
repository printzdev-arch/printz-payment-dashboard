const jobOrderRepository = require("../../models/job-order/JobOrder");
const jobAssignmentRepository = require("../../models/design/JobAssignment");
const JobWorkflowService = require("../job-order/jobWorkflow.service");
const ProductionStateService = require("../production/productionState.service");
const { emitJobEvent } = require("../../utils/events/job-order/jobEvents.emitter");
const ErrorHelper = require("../../utils/ApiError");

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
  static async accept(jobId, arg2, arg3) {
    const user = (arg3 && arg3._id) ? arg3 : (arg2 && arg2._id) ? arg2 : null;
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
        patch: {
          designStatus: "IN_PROGRESS",
        },
      });
    } catch (err) {
      await jobOrderRepository.findOneAndUpdate(
        { _id: jobId },
        { $set: { currentStage: "DESIGN_IN_PROGRESS", status: "DESIGN", designStatus: "IN_PROGRESS" } }
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

    const assignment = await this.getActiveAssignment(jobId, user);
    if (assignment.acceptedAt) {
      throw ErrorHelper.conflict("An accepted assignment cannot be rejected; it can only be changed by reassign.");
    }

    const now = new Date();
    assignment.status = "REJECTED";
    assignment.rejectedAt = now;
    assignment.releasedAt = now;
    assignment.currentAssignment = false;
    assignment.rejectionReason = cleanReason;
    await assignment.save();

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

    // Explicitly guarantee JobOrder fields are cleared & rejection reason persisted
    await jobOrderRepository.findOneAndUpdate(
      { _id: jobId },
      {
        $set: {
          designerId: null,
          designerName: "",
          assignedAt: null,
          designStatus: "REJECTED",
          designRejectionReason: cleanReason,
        },
      }
    );

    await ProductionStateService.logAudit({
      action: "REJECT",
      resource: "JobAssignment",
      resourceId: assignment._id,
      user,
      details: { reason: cleanReason },
    });

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

    const isRevision = Boolean(
      job && (
        job.designStatus === "REJECTED_SAMPLE" ||
        job.designStatus === "STARTED_REVISION" ||
        job.designStatus === "REVISION" ||
        job.currentStage === "REVISION" ||
        job.stage === "REVISION"
      )
    );

    if (isRevision) {
      // Validate authorization: must be assigned designer or manager/admin
      const isPrivileged = ["admin", "superadmin", "SUPER_ADMIN", "manager", "branch_manager", "BRANCH_MANAGER", "store_manager"].includes(user.role);
      const assignedId = job.designerId ? String(job.designerId._id || job.designerId) : "";
      const isAssigned = assignedId && assignedId === String(user._id);
      if (!isPrivileged && !isAssigned) {
        throw ErrorHelper.forbidden("Unauthorized: Revision can only be started by the assigned designer.");
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

      const updated = await jobOrderRepository.findOneAndUpdate(
        { _id: jobId },
        { $set: patch },
        { new: true }
      );

      await ProductionStateService.logAudit({
        action: "START_REVISION",
        resource: "JobOrder",
        resourceId: job._id,
        user,
        details: { startedAt: now, designer: user.name || user.email },
      });

      emitJobEvent("design.started", { jobId: String(jobId), isRevision: true });
      return updated || job;
    }

    // Normal job start (first-time work from PENDING_DESIGNER_APPROVAL or ASSIGNED)
    try {
      const assignment = await this.getActiveAssignment(jobId, user);
      if (assignment && !assignment.acceptedAt) {
        assignment.acceptedAt = new Date();
        await assignment.save();
      }
    } catch {
      // Direct assignment or revision job without active acceptance lock
    }

    const patch = {
      designStatus: "IN_PROGRESS",
    };

    let updated;
    try {
      updated = await JobWorkflowService.transition(jobId, "DESIGN_IN_PROGRESS", {
        actorId: user._id,
        user,
        patch,
      });
    } catch {
      updated = await jobOrderRepository.findOneAndUpdate(
        { _id: jobId },
        {
          $set: {
            currentStage: "DESIGN_IN_PROGRESS",
            stage: "DESIGN_IN_PROGRESS",
            ...patch,
          },
        },
        { new: true }
      );
    }

    // Explicitly guarantee fields are saved on JobOrder
    await jobOrderRepository.findOneAndUpdate(
      { _id: jobId },
      { $set: patch }
    );

    emitJobEvent("design.started", { jobId: String(jobId), isRevision: false });
    return updated || job;
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
