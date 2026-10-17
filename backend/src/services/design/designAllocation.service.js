const jobOrderRepository = require("../../models/job-order/JobOrder");
const jobAssignmentRepository = require("../../models/design/JobAssignment");
const DesignAllocationLock = require("../../models/design/DesignAllocationLock");
const User = require("../../models/auth/User");
const JobWorkflowService = require("../job-order/jobWorkflow.service");
const ProductionStateService = require("../production/productionState.service");
const { emitJobEvent } = require("../../utils/events/job-order/jobEvents.emitter");
const ErrorHelper = require("../../utils/ApiError");

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
    const Employee = require("../../models/auth/Employee");
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

        if (u && (u.role === "designer" || (emp.department && emp.department.toLowerCase().includes("design")))) {
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
    const JobAssignment = require("../../models/design/JobAssignment");
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
    return {
      jobId: String(job._id),
      assigned: true,
      employeeId: String(pickId),
      assignedDesignerId: pickId,
      designerName,
      assignment,
    };
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
    if (typeof method === "object" && method !== null && !employeeId && !user) {
      user = employeeId;
      employeeId = method.employeeId;
      method = method.method || "ROUND_ROBIN";
    } else if (method && method !== "ROUND_ROBIN" && method !== "MANUAL") {
      // Called as assign(jobId, designerId, user)
      user = employeeId;
      employeeId = method;
      method = "MANUAL";
    }

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

    const mongoose = require("mongoose");
    let employee = await User.findByIdFlexible(employeeId);
    if (!employee && mongoose.Types.ObjectId.isValid(employeeId)) {
      employee = await User.findById(new mongoose.Types.ObjectId(employeeId));
    }
    if (!employee) {
      const Employee = require("../../models/auth/Employee");
      let empDoc = null;
      if (mongoose.Types.ObjectId.isValid(employeeId)) {
        empDoc = await Employee.findById(new mongoose.Types.ObjectId(employeeId));
      }
      if (!empDoc) {
        empDoc = await Employee.findOne({
          $or: [
            { employeeCode: String(employeeId) },
            { email: String(employeeId).toLowerCase() },
            { name: String(employeeId) },
          ],
        });
      }
      if (empDoc) {
        employee = (await User.findByIdFlexible(empDoc._id)) || (await User.findByIdFlexible(empDoc.email)) || {
          _id: empDoc._id,
          name: empDoc.name,
        };
      }
    }
    if (!employee) {
      employee = await User.findOne({
        $or: [
          { email: String(employeeId).toLowerCase() },
          { name: String(employeeId) },
          { username: String(employeeId).toLowerCase() },
        ],
      });
    }
    if (!employee) throw ErrorHelper.notFound(`Employee not found with ID: ${employeeId}`);

    const assignment = await this.createAssignment(job, employee._id, "MANUAL", user?._id);
    let designerName = employee?.name || "";
    return {
      jobId: String(job._id),
      assigned: true,
      employeeId: String(employee._id),
      assignedDesignerId: employee._id,
      designerName,
      assignment,
    };
  }

  /**
   * Reassign designer on an active job.
   */
  static async reassign(jobId, target = "ROUND_ROBIN", reason = "Reassigned", user = null) {
    if (typeof reason === "object" && reason !== null && !user) {
      user = reason;
      reason = "Reassigned";
    }

    await this.lock();
    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    const current = await jobAssignmentRepository.findOne({
      jobOrderId: job._id,
      assignmentType: "DESIGNER",
      currentAssignment: true,
      status: "ACTIVE",
    });

    const previousAssignments = await jobAssignmentRepository.find({
      jobOrderId: job._id,
      assignmentType: "DESIGNER",
    }).sort({ createdAt: -1 });

    const excludeIds = [];
    if (current?.employeeId) excludeIds.push(current.employeeId);
    if (!current && previousAssignments.length > 0) {
      for (const pa of previousAssignments) {
        if (pa.status === "REJECTED" && pa.employeeId) {
          excludeIds.push(pa.employeeId);
        }
      }
    }

    let nextId = null;
    let employeeName = "";
    if (target === "ROUND_ROBIN") {
      const candidates = await this.evaluate(job._id, job.branchId);
      const last = await this.lastRoundRobin();
      nextId = this.pick(candidates, last?.employeeId?._id || last?.employeeId, excludeIds);
      if (!nextId) {
        throw ErrorHelper.conflict("NO_ELIGIBLE_DESIGNER: No other eligible designer available for rotation.");
      }
      try {
        const pickedUser = await User.findById(nextId).lean();
        employeeName = pickedUser?.name || "";
      } catch (_) {}
    } else {
      if (current && String(target) === String(current.employeeId)) {
        throw ErrorHelper.badRequest("Job is already assigned to this designer.");
      }
      let employee = (await User.findByIdFlexible?.(target)) || (await User.findById(target));
      if (!employee) {
        const Employee = require("../../models/auth/Employee");
        const empDoc = await Employee.findById(target);
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
          $or: [{ email: target }, { name: target }, { username: target }],
        });
      }
      if (!employee) throw ErrorHelper.notFound(`Target designer not found with ID: ${target}`);
      nextId = employee._id;
      employeeName = employee.name || "";
    }

    if (current) {
      current.status = "REASSIGNED";
      current.releasedAt = new Date();
      current.currentAssignment = false;
      await current.save();
    }

    const newAssignment = await this.createAssignment(job, nextId, "REASSIGN", user?._id, reason);

    emitJobEvent("design.reassigned", {
      jobId: String(job._id),
      from: current ? String(current.employeeId) : null,
      to: String(nextId),
      reason,
    });

    return {
      jobId: String(job._id),
      assigned: true,
      employeeId: String(nextId),
      assignedDesignerId: nextId,
      designerName: employeeName,
      assignment: newAssignment,
    };
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
        designStatus: "PENDING_DESIGNER_APPROVAL",
        designRejectionReason: "",
      },
    };

    if (job.currentStage === "DESIGN_ASSIGNED") {
      await JobWorkflowService.touch(job._id, ctx);
    } else {
      await JobWorkflowService.transition(job._id, "DESIGN_ASSIGNED", ctx);
    }

    job.designerId = employeeId;
    if (designerName) job.designerName = designerName;
    job.designStatus = "PENDING_DESIGNER_APPROVAL";
    job.designRejectionReason = "";
    await job.save();

    await jobOrderRepository.findOneAndUpdate(
      { _id: job._id },
      {
        $set: {
          designerId: employeeId,
          designerName,
          assignedAt: now,
          designStatus: "PENDING_DESIGNER_APPROVAL",
          designRejectionReason: "",
        },
      }
    );

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
    return jobAssignmentRepository.find({ jobOrderId: jobId })
      .populate("employeeId", "name username email code role")
      .populate("assignedBy", "name username email")
      .sort({ createdAt: -1 });
  }

  static async recentAssignments(limit = 10) {
    const JobAssignment = require("../../models/design/JobAssignment");
    return JobAssignment.find({ assignmentType: "DESIGNER" })
      .sort({ assignedAt: -1, createdAt: -1 })
      .limit(Number(limit) || 10)
      .populate("employeeId", "name username email code role")
      .populate("jobOrderId", "jobNo title customerName customerSnapshot currentStage priority items");
  }

  static async rejectedAssignments(limit = 50) {
    const JobAssignment = require("../../models/design/JobAssignment");
    const assignments = await JobAssignment.find({
      assignmentType: "DESIGNER",
      status: "REJECTED",
    })
      .sort({ rejectedAt: -1, createdAt: -1 })
      .limit(Number(limit) || 50)
      .populate("employeeId", "name username email code role")
      .populate({
        path: "jobOrderId",
        select: "jobNo title customerName customerSnapshot currentStage stage priority items designerId designerName designStatus designRejectionReason dueDate remarks customerRequirements specs",
        populate: {
          path: "designerId",
          select: "name email username role",
        },
      });

    const rejectedJobs = await jobOrderRepository.find({
      $or: [
        { designStatus: "REJECTED" },
        { designRejectionReason: { $exists: true, $nin: ["", null] } },
      ],
    })
      .populate("designerId", "name email username role")
      .sort({ updatedAt: -1 });

    const seenJobIds = new Set();
    const result = [];

    for (const a of assignments) {
      if (!a.jobOrderId) continue;
      const jId = String(a.jobOrderId._id || a.jobOrderId);
      seenJobIds.add(jId);

      const job = a.jobOrderId;
      const currentDesigner = job.designerId?.name || job.designerName || null;
      const isPending = !currentDesigner || currentDesigner === "- Unassigned" || job.currentStage === "DESIGN_QUEUE";

      result.push({
        _id: String(a._id),
        assignmentId: String(a._id),
        jobId: jId,
        jobNo: job.jobNo || `JO-${jId.slice(-6)}`,
        customerName: job.customerName || job.customerSnapshot?.name || "Direct Customer",
        jobItem: job.title || job.items?.[0]?.itemName || "Custom Print Order",
        priority: (job.priority || "NORMAL").toUpperCase(),
        rejectedBy: a.employeeId?.name || a.employeeId?.username || "Designer",
        rejectedByEmail: a.employeeId?.email || "",
        rejectionReason: a.rejectionReason || job.designRejectionReason || "No reason specified",
        rejectedAt: a.rejectedAt || a.updatedAt || a.createdAt,
        currentDesigner: currentDesigner,
        currentStage: job.currentStage || "DESIGN_QUEUE",
        isPendingReallocation: isPending,
        status: isPending ? "Pending Reallocation" : "Assigned",
        jobOrder: job,
      });
    }

    for (const j of rejectedJobs) {
      const jId = String(j._id);
      if (seenJobIds.has(jId)) continue;
      seenJobIds.add(jId);

      const currentDesigner = j.designerId?.name || j.designerName || null;
      const isPending = !currentDesigner || currentDesigner === "- Unassigned" || j.currentStage === "DESIGN_QUEUE";

      result.push({
        _id: `job-rej-${jId}`,
        assignmentId: null,
        jobId: jId,
        jobNo: j.jobNo || `JO-${jId.slice(-6)}`,
        customerName: j.customerName || j.customerSnapshot?.name || "Direct Customer",
        jobItem: j.title || j.items?.[0]?.itemName || "Custom Print Order",
        priority: (j.priority || "NORMAL").toUpperCase(),
        rejectedBy: "Designer",
        rejectedByEmail: "",
        rejectionReason: j.designRejectionReason || "No reason specified",
        rejectedAt: j.updatedAt || j.createdAt,
        currentDesigner: currentDesigner,
        currentStage: j.currentStage || "DESIGN_QUEUE",
        isPendingReallocation: isPending,
        status: isPending ? "Pending Reallocation" : "Assigned",
        jobOrder: j,
      });
    }

    return result.sort((a, b) => new Date(b.rejectedAt) - new Date(a.rejectedAt));
  }

  static async queue(filters = {}) {
    let query = {};
    if (filters && filters.stage && filters.stage !== "all") {
      if (filters.stage === "completed") {
        query = {
          $or: [
            { currentStage: { $in: ["PRODUCTION_PLANNING", "COMPLETED"] } },
            { designStatus: "COMPLETED" },
          ],
        };
      } else {
        query.currentStage = filters.stage;
      }
    } else {
      query = {
        $or: [
          { currentStage: { $in: ["DESIGN_QUEUE", "DESIGN_ASSIGNED", "DESIGN_IN_PROGRESS", "SAMPLE_APPROVAL", "REVISION", "CUSTOMER_PROOF", "PRODUCTION_PLANNING", "COMPLETED"] } },
          { designStatus: { $in: ["UNASSIGNED", "PENDING_DESIGNER_APPROVAL", "IN_PROGRESS", "REJECTED", "PENDING_SAMPLE_APPROVAL", "COMPLETED", "REJECTED_SAMPLE", "STARTED_REVISION", "REVISION", "ASSIGNED"] } },
        ],
      };
    }
    if (filters && filters.branchId) {
      query.branchId = filters.branchId;
    }
    const list = await jobOrderRepository.find(query)
      .populate("designerId", "name email username role")
      .populate("branchId", "name code");
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
    const User = require("../../models/auth/User");
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
    const User = require("../../models/auth/User");
    const update = {};
    if (data.maxLoad !== undefined) update.maxLoad = Number(data.maxLoad);
    if (data.isActive !== undefined) update.isActive = Boolean(data.isActive);
    if (data.name) update.name = data.name;

    const updated = await User.findByIdAndUpdate(id, { $set: update }, { new: true });
    return updated;
  }

  static async updateGlobalMaxLoad(maxLoad) {
    const User = require("../../models/auth/User");
    const limit = Number(maxLoad) || 5;
    await User.updateMany(
      { role: "designer" },
      { $set: { maxLoad: limit } }
    );
    return { success: true, maxLoad: limit };
  }
}

module.exports = DesignAllocationService;
