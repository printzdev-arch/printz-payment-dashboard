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
    const Employee = require("../../../infrastructure/database/mongoose/models/Employee");
    const targetBranchId = branchId ? (branchId._id || branchId) : null;
    const targetBranchStr = targetBranchId ? String(targetBranchId) : null;

    let employeeFilter = {
      isActive: true,
      employmentStatus: "ACTIVE",
    };
    let employeeCandidates = await Employee.find(employeeFilter).sort({ employeeCode: 1 }).lean();

    let designers = [];
    if (employeeCandidates && employeeCandidates.length > 0) {
      for (const emp of employeeCandidates) {
        let u = await User.findOne({
          $or: [{ employeeId: emp._id }, { email: emp.email }]
        }).lean();

        if (u) {
          const branchMatches = !targetBranchStr ||
            !emp.branchId ||
            String(emp.branchId) === targetBranchStr ||
            (u.branchId && String(u.branchId) === targetBranchStr) ||
            (Array.isArray(u.branchIds) && u.branchIds.map(String).includes(targetBranchStr));

          if (branchMatches || !targetBranchStr) {
            designers.push({
              _id: u._id,
              userId: u._id,
              employeeId: u._id,
              employeeCode: emp.employeeCode || u.employeeCode || u.email,
              name: u.name || emp.name,
              role: u.role || "designer",
              branchId: u.branchId || emp.branchId,
              isDesigner: true,
              email: u.email || emp.email,
              maxLoad: u.maxLoad || 5,
              isActive: u.isActive !== false,
            });
          }
        }
      }
    }

    // Also include active users with role: 'designer'
    const userFilter = { role: "designer", isActive: { $ne: false } };
    const userDesigners = await User.find(userFilter).sort({ name: 1 }).lean();
    for (const u of userDesigners) {
      const branchMatches = !targetBranchStr ||
        !u.branchId ||
        String(u.branchId) === targetBranchStr ||
        (Array.isArray(u.branchIds) && u.branchIds.map(String).includes(targetBranchStr)) ||
        (Array.isArray(u.branchIds) && u.branchIds.length === 0);

      if (branchMatches || !targetBranchStr) {
        designers.push({
          _id: u._id,
          userId: u._id,
          employeeId: u._id,
          employeeCode: u.employeeCode || u.email || String(u._id),
          name: u.name || u.username,
          role: u.role,
          branchId: u.branchId,
          isDesigner: true,
          email: u.email,
          maxLoad: u.maxLoad || 5,
          isActive: u.isActive !== false,
        });
      }
    }

    // If targetBranch was specified but no branch-matching designers found,
    // fallback to all active designers across the pool so jobs are never stuck unassigned
    if (designers.length === 0 && targetBranchStr) {
      for (const u of userDesigners) {
        designers.push({
          _id: u._id,
          userId: u._id,
          employeeId: u._id,
          employeeCode: u.employeeCode || u.email || String(u._id),
          name: u.name || u.username,
          role: u.role,
          branchId: u.branchId,
          isDesigner: true,
          email: u.email,
          maxLoad: u.maxLoad || 5,
          isActive: u.isActive !== false,
        });
      }
    }

    // Deduplicate designers strictly by User _id and name
    const seenIds = new Set();
    const seenNames = new Set();
    const uniqueDesigners = [];
    for (const d of designers) {
      const idKey = String(d._id);
      const nameKey = (d.name || "").trim().toLowerCase();
      if (!nameKey || seenIds.has(idKey) || seenNames.has(nameKey)) continue;
      seenIds.add(idKey);
      seenNames.add(nameKey);
      uniqueDesigners.push(d);
    }
    designers = uniqueDesigners;

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
      { $match: { assignmentType: "DESIGNER", status: "ACTIVE", currentAssignment: true } },
      { $group: { _id: "$employeeId", n: { $sum: 1 } } },
    ]);

    const openMap = new Map(openAgg.map((r) => [String(r._id), Number(r.n)]));

    const candidates = [];
    for (const d of designers) {
      const dId = String(d._id);
      const openJobs = openMap.get(dId) || 0;
      const designerLimit = Number(d.maxLoad) || 5;
      let reason = null;

      if (rejectedSet.has(dId)) {
        reason = "REJECTED_THIS_JOB";
      } else if (openJobs >= designerLimit) {
        reason = "MAX_CONCURRENT_REACHED";
      }

      candidates.push({
        _id: d._id,
        employeeId: d._id, // User._id for consistency with ref: "User"
        userId: d._id,
        employeeCode: d.employeeCode,
        name: d.name,
        email: d.email,
        maxLoad: designerLimit,
        isActive: d.isActive !== false,
        eligible: !reason,
        reason,
        openJobs,
        currentLoad: openJobs,
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
      if (c && c.eligible && !excludeSet.has(String(c.employeeId))) {
        return c.employeeId;
      }
    }

    return eligibleCands[0].employeeId;
  }

  static async lastRoundRobin() {
    const JobAssignment = require("../../../infrastructure/database/mongoose/models/design/JobAssignment");
    const assignments = await JobAssignment.find({
      assignmentType: "DESIGNER",
      assignmentMethod: "ROUND_ROBIN",
    })
      .sort({ createdAt: -1 })
      .limit(1);
    return assignments[0] || null;
  }

  /**
   * Automatically allocate designer from queue.
   */
  static async autoAllocate(jobId) {
    await this.lock();

    const job = await jobOrderRepository.findById(jobId);
    if (!job) {
      return { jobId: String(jobId), assigned: false, reason: "NOT_FOUND" };
    }
    if (job.currentStage !== "DESIGN_QUEUE" && job.currentStage !== "DESIGN_ASSIGNED") {
      job.currentStage = "DESIGN_QUEUE";
      await job.save();
    }

    const candidates = await this.evaluate(job._id, job.branchId);
    const last = await this.lastRoundRobin();
    const pickId = this.pick(candidates, last?.employeeId?._id || last?.employeeId);

    if (!pickId) {
      emitJobEvent("design.noEligibleDesigner", { jobId: String(job._id), jobNo: job.jobNo });
      return { jobId: String(job._id), assigned: false, reason: "NO_ELIGIBLE_DESIGNER" };
    }

    const assignment = await this.createAssignment(job, pickId, "ROUND_ROBIN", null);
    let designerName = "";
    try {
      const designerUser = await User.findById(pickId).lean();
      designerName = designerUser?.name || "";
    } catch (_) {}
    return { jobId: String(job._id), assigned: true, employeeId: String(pickId), designerName, assignment };
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

    if (job.currentStage !== "DESIGN_QUEUE" && job.currentStage !== "DESIGN_ASSIGNED") {
      job.currentStage = "DESIGN_QUEUE";
      await job.save();
    }

    let employee = (await User.findByIdFlexible?.(employeeId)) || (await User.findById(employeeId));
    if (!employee) {
      const Employee = require("../../../infrastructure/database/mongoose/models/Employee");
      const empDoc = await Employee.findById(employeeId);
      if (empDoc) {
        employee = (await User.findOne({
          $or: [
            { employeeId: empDoc._id },
            { employeeId: String(empDoc._id) },
            { email: empDoc.email },
          ],
        })) || { _id: empDoc._id, name: empDoc.name };
      }
    }
    if (!employee) {
      employee = await User.findOne({
        $or: [{ email: employeeId }, { name: employeeId }, { username: employeeId }],
      });
    }
    if (!employee) throw ErrorHelper.notFound(`Employee not found with ID: ${employeeId}`);

    const assignment = await this.createAssignment(job, employee._id, "MANUAL", user?._id);
    let designerName = employee?.name || "";
    return { jobId: String(job._id), assigned: true, employeeId: String(employee._id), designerName, assignment };
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
    // Release any previous active designer assignments for this job
    await jobAssignmentRepository.updateMany(
      { jobOrderId: job._id, assignmentType: "DESIGNER", currentAssignment: true },
      { $set: { currentAssignment: false, status: "REPLACED", releasedAt: new Date() } }
    );

    const lastSeq = await jobAssignmentRepository.findOne({ jobOrderId: job._id });
    const now = new Date();

    const assignment = await jobAssignmentRepository.create({
      jobOrderId: job._id,
      employeeId,
      assignmentType: "DESIGNER",
      assignmentMethod: method,
      sequenceNo: lastSeq ? (lastSeq.sequenceNo || 0) + 1 : 1,
      assignedBy,
      assignedAt: now,
      currentAssignment: true,
      status: "ACTIVE",
    });

    let designerName = "";
    try {
      const designerUser = await User.findById(employeeId).lean();
      designerName = designerUser?.name || "";
    } catch (_) {}

    const ctx = {
      actorId: assignedBy,
      assignedTo: employeeId,
      reason,
      patch: {
        designerId: employeeId,
        designerName: designerName,
        assignedAt: now,
      },
    };

    if (job.currentStage === "DESIGN_ASSIGNED") {
      await JobWorkflowService.touch(job._id, ctx);
    } else {
      await JobWorkflowService.transition(job._id, "DESIGN_ASSIGNED", ctx);
    }

    job.designerId = employeeId;
    if (designerName) job.designerName = designerName;

    await ProductionStateService.logAudit({
      action: "ASSIGN",
      resource: "JobOrder",
      resourceId: job._id,
      user: assignedBy ? { _id: assignedBy } : null,
      branchId: job.branchId,
      details: { employeeId, designerName, method, sequenceNo: assignment.sequenceNo },
    });

    emitJobEvent("design.assigned", {
      jobId: String(job._id),
      jobNo: job.jobNo,
      employeeId: String(employeeId),
      designerName,
      method,
    });

    return assignment;
  }

  static async history(jobId) {
    return jobAssignmentRepository.find({ jobOrderId: jobId });
  }

  static async recentAssignments(limit = 10) {
    const JobAssignment = require("../../../infrastructure/database/mongoose/models/design/JobAssignment");
    return JobAssignment.find({ assignmentType: "DESIGNER" })
      .sort({ assignedAt: -1, createdAt: -1 })
      .limit(Number(limit) || 10)
      .populate("employeeId", "name username email code role")
      .populate("jobOrderId", "jobNo title customerName customerSnapshot currentStage priority items");
  }

  static async queue(filters = {}) {
    const designStages = [
      "DESIGN_QUEUE",
      "DESIGN_ASSIGNED",
      "DESIGN_IN_PROGRESS",
      "SAMPLE_APPROVAL",
      "REVISION",
      "CUSTOMER_PROOF",
    ];
    const query = { currentStage: { $in: designStages } };
    if (filters && filters.stage && filters.stage !== "all") {
      query.currentStage = filters.stage;
    }
    if (filters && filters.branchId) {
      query.branchId = filters.branchId;
    }
    const list = await jobOrderRepository.find(query);
    return (list || []).sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
    );
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

  static async addDesigner(data = {}) {
    const User = require("../../../infrastructure/database/mongoose/models/User");
    const name = (data.name || "").trim();
    if (!name) throw new Error("Designer name is required");

    const email = data.email || `${name.toLowerCase().replace(/ /g, ".")}@printz.com`;
    const username = name.toLowerCase().replace(/ /g, "_");
    const maxLoad = Number(data.maxLoad) || 5;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        username,
        email,
        password: "TempPassword123!",
        role: "designer",
        maxLoad,
        isActive: true,
      });
    } else {
      user.name = name;
      user.role = "designer";
      user.maxLoad = maxLoad;
      user.isActive = true;
      await user.save();
    }
    return user;
  }

  static async updateDesigner(id, data = {}) {
    const User = require("../../../infrastructure/database/mongoose/models/User");
    const update = {};
    if (data.maxLoad !== undefined) update.maxLoad = Number(data.maxLoad);
    if (data.isActive !== undefined) update.isActive = Boolean(data.isActive);
    if (data.name) update.name = data.name;

    const updated = await User.findByIdAndUpdate(id, { $set: update }, { new: true });
    return updated;
  }

  static async updateGlobalMaxLoad(maxLoad) {
    const User = require("../../../infrastructure/database/mongoose/models/User");
    const limit = Number(maxLoad) || 5;
    await User.updateMany(
      { role: "designer" },
      { $set: { maxLoad: limit } }
    );
    return { success: true, maxLoad: limit };
  }
}

module.exports = DesignAllocationService;
