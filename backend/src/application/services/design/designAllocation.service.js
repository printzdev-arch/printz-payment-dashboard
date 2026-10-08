const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobOrderRepository");
const jobAssignmentRepository = require("../../../infrastructure/database/mongoose/repositories/design/MongoJobAssignmentRepository");
const DesignAllocationLock = require("../../../infrastructure/database/mongoose/models/design/DesignAllocationLock");
const User = require("../../../infrastructure/database/mongoose/models/User");
const JobWorkflowService = require("../job-order/jobWorkflow.service");
const ProductionStateService = require("../production/productionState.service");
const { emitJobEvent } = require("../../../shared/events/job-order/jobEvents.emitter");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DesignAllocationService {
  /**
   * Concurrency lock to serialize round robin allocations.
   */
  static async lock() {
    return DesignAllocationLock.findOneAndUpdate(
      { _id: "DESIGNER_RR" },
      { $inc: { n: 1 } },
      { upsert: true, new: true }
    );
  }

  /**
   * Evaluate designer pool eligibility.
   */
  static async evaluate(jobId = null, branchId = null) {
    const filter = { isActive: { $ne: false } };
    if (branchId) {
      filter.$or = [
        { branchId: branchId },
        { branchId: String(branchId) },
        { role: "admin" },
        { role: "designer" },
      ];
    }

    let designers = await User.find(filter).sort({ name: 1 }).lean();
    if (!designers || designers.length === 0) {
      designers = await User.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean();
    }

    const maxConcurrent = 5;

    let rejectedSet = new Set();
    if (jobId) {
      const rejectedList = await jobAssignmentRepository.find({
        jobOrderId: jobId,
        assignmentType: "DESIGNER",
        status: "REJECTED",
      });
      rejectedSet = new Set(rejectedList.map((a) => String(a.employeeId?._id || a.employeeId)));
    }

    const openAgg = await jobAssignmentRepository.aggregate([
      { $match: { assignmentType: "DESIGNER", status: "ACTIVE" } },
      { $group: { _id: "$employeeId", n: { $sum: 1 } } },
    ]);

    const openMap = new Map(openAgg.map((r) => [String(r._id), Number(r.n)]));

    const candidates = [];
    for (const d of designers) {
      const dId = String(d._id);
      const openJobs = openMap.get(dId) || 0;
      let reason = null;

      if (rejectedSet.has(dId)) {
        reason = "REJECTED_THIS_JOB";
      } else if (openJobs >= maxConcurrent) {
        reason = "MAX_CONCURRENT_REACHED";
      }

      candidates.push({
        employeeId: d._id,
        employeeCode: d.email || dId,
        name: d.name,
        eligible: !reason,
        reason,
        openJobs,
      });
    }

    return candidates;
  }

  /**
   * Pick next eligible candidate using strict Round Robin.
   */
  static pick(candidates, lastAssignedId = null, excludeIds = []) {
    if (!candidates || candidates.length === 0) return null;

    const excludeSet = new Set((excludeIds || []).map((id) => String(id)));
    const eligibleCands = candidates.filter((c) => c.eligible && !excludeSet.has(String(c.employeeId)));
    if (eligibleCands.length === 0) return null;

    const lastStr = lastAssignedId ? String(lastAssignedId) : null;
    const idx = lastStr ? candidates.findIndex((c) => String(c.employeeId) === lastStr) : -1;

    for (let i = 1; i <= candidates.length; i++) {
      const c = candidates[(idx + i + candidates.length) % candidates.length];
      if (c.eligible && !excludeSet.has(String(c.employeeId))) {
        return c.employeeId;
      }
    }

    return eligibleCands[0].employeeId;
  }

  static async lastRoundRobin() {
    return jobAssignmentRepository.findOne({
      assignmentType: "DESIGNER",
      assignmentMethod: "ROUND_ROBIN",
    });
  }

  /**
   * Automatically allocate designer from queue.
   */
  static async autoAllocate(jobId) {
    await this.lock();

    const job = await jobOrderRepository.findById(jobId);
    if (!job || job.currentStage !== "DESIGN_QUEUE") {
      return { jobId: String(jobId), assigned: false, reason: "NOT_IN_QUEUE" };
    }

    const candidates = await this.evaluate(job._id, job.branchId);
    const last = await this.lastRoundRobin();
    const pickId = this.pick(candidates, last?.employeeId?._id || last?.employeeId);

    if (!pickId) {
      emitJobEvent("design.noEligibleDesigner", { jobId: String(job._id), jobNo: job.jobNo });
      return { jobId: String(job._id), assigned: false, reason: "NO_ELIGIBLE_DESIGNER" };
    }

    const assignment = await this.createAssignment(job, pickId, "ROUND_ROBIN", null);
    return { jobId: String(job._id), assigned: true, employeeId: String(pickId), assignment };
  }

  /**
   * Sequentially auto-assign all jobs currently waiting in DESIGN_QUEUE.
   */
  static async autoAssignQueue() {
    const queuedJobs = await jobOrderRepository.find({
      currentStage: "DESIGN_QUEUE",
    });

    const results = [];
    for (const j of queuedJobs) {
      const res = await this.autoAllocate(j._id);
      results.push(res);
    }
    return results;
  }

  /**
   * Assign designer (Round Robin or Manual).
   */
  static async assign(jobId, method = "ROUND_ROBIN", employeeId = null, user = null) {
    if (method === "ROUND_ROBIN") {
      return this.autoAllocate(jobId);
    }

    if (!employeeId) {
      throw ErrorHelper.badRequest("employeeId is required for MANUAL assignment.");
    }

    await this.lock();
    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    if (job.currentStage !== "DESIGN_QUEUE") {
      throw ErrorHelper.conflict("Job is not in DESIGN_QUEUE. Use reassign for already assigned jobs.");
    }

    const employee = await User.findById(employeeId);
    if (!employee) throw ErrorHelper.notFound(`Employee not found with ID: ${employeeId}`);

    const assignment = await this.createAssignment(job, employee._id, "MANUAL", user?._id);
    return { jobId: String(job._id), assigned: true, employeeId: String(employee._id), assignment };
  }

  /**
   * Reassign designer on an active job.
   */
  static async reassign(jobId, target = "ROUND_ROBIN", reason = "Reassigned", user = null) {
    await this.lock();
    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    const current = await jobAssignmentRepository.findOne({
      jobOrderId: job._id,
      assignmentType: "DESIGNER",
      currentAssignment: true,
      status: "ACTIVE",
    });

    if (!current) {
      throw ErrorHelper.conflict("No active designer assignment to reassign.");
    }

    let nextId = null;
    if (target === "ROUND_ROBIN") {
      const candidates = await this.evaluate(job._id, job.branchId);
      const last = await this.lastRoundRobin();
      nextId = this.pick(candidates, last?.employeeId?._id || last?.employeeId, [current.employeeId]);
      if (!nextId) {
        throw ErrorHelper.conflict("NO_ELIGIBLE_DESIGNER: No other eligible designer available for rotation.");
      }
    } else {
      if (String(target) === String(current.employeeId)) {
        throw ErrorHelper.badRequest("Job is already assigned to this designer.");
      }
      const employee = await User.findById(target);
      if (!employee) throw ErrorHelper.notFound(`Target designer not found with ID: ${target}`);
      nextId = employee._id;
    }

    current.status = "REASSIGNED";
    current.releasedAt = new Date();
    current.currentAssignment = false;
    await current.save();

    const newAssignment = await this.createAssignment(job, nextId, "REASSIGN", user?._id, reason);

    emitJobEvent("design.reassigned", {
      jobId: String(job._id),
      from: String(current.employeeId),
      to: String(nextId),
      reason,
    });

    return { jobId: String(job._id), assigned: true, employeeId: String(nextId), assignment: newAssignment };
  }

  static async createAssignment(job, employeeId, method, assignedBy = null, reason = "") {
    const lastSeq = await jobAssignmentRepository.findOne({ jobOrderId: job._id });
    const now = new Date();

    const assignment = await jobAssignmentRepository.create({
      jobOrderId: job._id,
      employeeId,
      assignmentType: "DESIGNER",
      assignmentMethod: method,
      sequenceNo: lastSeq ? lastSeq.sequenceNo + 1 : 1,
      assignedBy,
      assignedAt: now,
      currentAssignment: true,
      status: "ACTIVE",
    });

    const ctx = {
      actorId: assignedBy,
      assignedTo: employeeId,
      reason,
      patch: { designerId: employeeId, assignedAt: now },
    };

    if (job.currentStage === "DESIGN_ASSIGNED") {
      await JobWorkflowService.touch(job._id, ctx);
    } else {
      await JobWorkflowService.transition(job._id, "DESIGN_ASSIGNED", ctx);
    }

    await ProductionStateService.logAudit({
      action: "ASSIGN",
      resource: "JobOrder",
      resourceId: job._id,
      user: assignedBy ? { _id: assignedBy } : null,
      branchId: job.branchId,
      details: { employeeId, method, sequenceNo: assignment.sequenceNo },
    });

    emitJobEvent("design.assigned", {
      jobId: String(job._id),
      jobNo: job.jobNo,
      employeeId: String(employeeId),
      method,
    });

    return assignment;
  }

  static async history(jobId) {
    return jobAssignmentRepository.find({ jobOrderId: jobId });
  }

  static async queue() {
    return jobOrderRepository.find({ currentStage: "DESIGN_QUEUE" });
  }

  static async pool(branchId = null) {
    const candidates = await this.evaluate(null, branchId);
    const last = await this.lastRoundRobin();
    const nextId = this.pick(candidates, last?.employeeId?._id || last?.employeeId);
    return {
      lastAssigned: last?.employeeId || null,
      nextDesigner: nextId,
      designers: candidates,
    };
  }

  static async workload(branchId = null, user = null) {
    const match = { assignmentType: "DESIGNER", status: "ACTIVE", currentAssignment: true };
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

    return jobAssignmentRepository.aggregate([
      { $match: match },
      { $lookup: { from: "jobOrders", localField: "jobOrderId", foreignField: "_id", as: "job" } },
      { $unwind: "$job" },
      ...(branchId ? [{ $match: { "job.branchId": branchId } }] : []),
      {
        $group: {
          _id: "$employeeId",
          open: { $sum: 1 },
          pendingAcceptance: { $sum: { $cond: [{ $eq: ["$acceptedAt", null] }, 1, 0] } },
          overdue: { $sum: { $cond: [{ $and: [{ $ne: ["$job.dueDate", null] }, { $lt: ["$job.dueDate", now] }] }, 1, 0] } },
          dueToday: { $sum: { $cond: [{ $and: [{ $gte: ["$job.dueDate", startOfDay] }, { $lte: ["$job.dueDate", endOfDay] }] }, 1, 0] } },
        },
      },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "employee" } },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
    ]);
  }
}

module.exports = DesignAllocationService;
