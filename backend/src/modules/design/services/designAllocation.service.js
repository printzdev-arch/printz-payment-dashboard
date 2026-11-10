const crypto = require("crypto");
const mongoose = require("mongoose");
const jobOrderRepository = require("../../job-orders/models/JobOrder");
const jobAssignmentRepository = require("../models/JobAssignment");
const DesignAllocationLock = require("../models/DesignAllocationLock");
const User = require("../../auth/models/User");
const JobWorkflowService = require("../../job-orders/services/jobWorkflow.service");
const ProductionStateService = require("../../production/services/productionState.service");
const { emitJobEvent } = require("../../job-orders/services/jobEvents.emitter");
const { getFlowType, FLOW_TYPES } = require("../../job-orders/models/jobFlows");
const { startOfISTDay, endOfISTDay } = require("../../../utils/helpers/dateUtils");
const DesignHelper = require("./DesignHelper");
const ErrorHelper = require("../../../utils/errors/ApiError");

/**
 * The sample-design pool of the branches: these six designers take the design work of every branch.
 * Manufacturing-unit designers are a separate pool and live in the manufacturing module (sale-orders / mfg).
 */
const BRANCH_DESIGNERS = [
  { name: "Ali Hassan", email: "ali.hassan@printz.com", employeeCode: "EMP-001" },
  { name: "Siti Rahman", email: "siti.rahman@printz.com", employeeCode: "EMP-002" },
  { name: "Kumar Anil", email: "kumar.anil@printz.com", employeeCode: "EMP-003" },
  { name: "John Lee", email: "john.lee@printz.com", employeeCode: "EMP-004" },
  { name: "Nur Aisyah", email: "nur.aisyah@printz.com", employeeCode: "EMP-005" },
  { name: "Guna", email: "guna@gmail.com", employeeCode: "EMP-006" },
];
const BRANCH_DESIGNER_EMAILS = BRANCH_DESIGNERS.map((d) => d.email.toLowerCase());
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The six seeded designers keep their fixed rotation order; designers added later follow, oldest first. */
const orderDesigners = (users) => {
  const rank = (u) => {
    const i = BRANCH_DESIGNER_EMAILS.indexOf(String(u.email || "").toLowerCase());
    return i === -1 ? BRANCH_DESIGNER_EMAILS.length : i;
  };
  return [...users].sort((a, b) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });
};
const DEFAULT_MAX_LOAD = 5;
const MAX_LOAD_LIMIT = 50;

// Stages in which a job is the design team's responsibility
const DESIGN_STAGES = ["DESIGN_QUEUE", "DESIGN_ASSIGNED", "DESIGN_IN_PROGRESS", "SAMPLE_APPROVAL", "REVISION"];
// A designer can be put on a job only while it waits in the queue (or before the designer accepted it)
const ASSIGNABLE_STAGES = ["DESIGN_QUEUE", "DESIGN_ASSIGNED"];
// A job already being designed can be handed to another designer
const REASSIGNABLE_STAGES = ["DESIGN_ASSIGNED", "DESIGN_IN_PROGRESS", "REVISION"];

const LOCK_NAME = "DESIGNER_RR";
const LOCK_TTL_MS = 15000;
const LOCK_WAIT_MS = 10000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const asObjectId = (id) => (mongoose.Types.ObjectId.isValid(String(id)) ? new mongoose.Types.ObjectId(String(id)) : id);
const idOf = (v) => String(v?._id || v || "");

// Allocations run one after another inside this process; the database lock covers several server processes
let localChain = Promise.resolve();

class DesignAllocationService {
  /**
   * Run `fn` while holding the designer-allocation lock, so round robin and the max-load check never see
   * a half-finished allocation.
   */
  static withLock(fn) {
    const run = async () => {
      const owner = crypto.randomBytes(8).toString("hex");
      const deadline = Date.now() + LOCK_WAIT_MS;
      for (;;) {
        const now = new Date();
        try {
          const got = await DesignAllocationLock.findOneAndUpdate(
            { _id: LOCK_NAME, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }] },
            { $set: { owner, lockedUntil: new Date(now.getTime() + LOCK_TTL_MS) }, $inc: { n: 1 } },
            { upsert: true, new: true }
          );
          if (got && got.owner === owner) break;
        } catch (err) {
          // E11000: another process holds the lock (the upsert tried to create it again). Wait and retry.
          if (err && err.code !== 11000) throw err;
        }
        if (Date.now() > deadline) {
          throw ErrorHelper.conflict("The designer allocation is busy. Please try again in a moment.");
        }
        await sleep(40);
      }
      try {
        return await fn();
      } finally {
        await DesignAllocationLock.updateOne({ _id: LOCK_NAME, owner }, { $set: { owner: null, lockedUntil: null } }).catch(() => {});
      }
    };
    const result = localChain.then(run, run);
    localChain = result.catch(() => {});
    return result;
  }

  /**
   * Make sure the six branch designers have a login. Safe to run any number of times: it only creates
   * the ones that are missing. Called when the server starts, never while reading the pool.
   */
  static async ensureBranchDesigners() {
    const password = process.env.DESIGNER_DEFAULT_PASSWORD || "Password@123";
    const created = [];
    for (const d of BRANCH_DESIGNERS) {
      const email = d.email.toLowerCase();
      const existing = await User.findOne({ email }).select("_id").lean();
      if (existing) continue;
      try {
        const user = await User.create({
          name: d.name,
          email,
          username: email.split("@")[0],
          password,
          role: "designer",
          employeeCode: d.employeeCode,
          isActive: true,
          maxLoad: DEFAULT_MAX_LOAD,
        });
        created.push(user.email);
      } catch (err) {
        if (!/duplicate key|E11000/i.test(err.message || "")) throw err;
      }
    }
    return created;
  }

  /** The designers of the pool with their current load and whether they can take a job right now. */
  static async evaluate(jobId = null, { includeInactive = false } = {}) {
    // Every active designer stored in the database is part of the pool (inactive ones only when asked for, for management)
    const userFilter = includeInactive ? { role: "designer" } : { role: "designer", isActive: { $ne: false } };
    const users = orderDesigners(await User.find(userFilter).lean());

    let rejectedSet = new Set();
    if (jobId) {
      const rejectedList = await jobAssignmentRepository.find({
        jobOrderId: jobId,
        assignmentType: "DESIGNER",
        status: "REJECTED",
      });
      rejectedSet = new Set(rejectedList.map((a) => idOf(a.employeeId)));
    }

    const openAgg = await jobAssignmentRepository.aggregate([
      { $match: { assignmentType: "DESIGNER", status: "ACTIVE", currentAssignment: true } },
      { $group: { _id: "$employeeId", n: { $sum: 1 } } },
    ]);
    const openMap = new Map(openAgg.map((r) => [String(r._id), Number(r.n)]));

    return users.map((u) => {
      const dId = String(u._id);
      const openJobs = openMap.get(dId) || 0;
      const designerLimit = Number(u.maxLoad) > 0 ? Number(u.maxLoad) : DEFAULT_MAX_LOAD;
      let reason = null;
      if (u.isActive === false) reason = "INACTIVE";
      else if (rejectedSet.has(dId)) reason = "REJECTED_THIS_JOB";
      else if (openJobs >= designerLimit) reason = "MAX_CONCURRENT_REACHED";
      return {
        _id: u._id,
        employeeId: u._id,
        userId: u._id,
        employeeCode: u.employeeCode || u.email,
        name: u.name,
        email: u.email,
        mobile: u.phone || "",
        maxLoad: designerLimit,
        isActive: u.isActive !== false,
        eligible: !reason,
        reason,
        openJobs,
        currentLoad: openJobs,
      };
    });
  }

  /** Next eligible designer after the one served last (strict round robin). */
  static pick(candidates, lastAssignedId = null, excludeIds = []) {
    if (!candidates || candidates.length === 0) return null;
    const excludeSet = new Set((excludeIds || []).map((id) => String(id)));
    const usable = (c) => c.eligible && !excludeSet.has(String(c.employeeId));
    if (!candidates.some(usable)) return null;

    const lastStr = lastAssignedId ? String(lastAssignedId) : null;
    const idx = lastStr ? candidates.findIndex((c) => String(c.employeeId) === lastStr) : -1;
    for (let i = 1; i <= candidates.length; i += 1) {
      const c = candidates[(idx + i + candidates.length) % candidates.length];
      if (c && usable(c)) return c.employeeId;
    }
    return null;
  }

  static async lastRoundRobin() {
    const assignments = await jobAssignmentRepository
      .find({ assignmentType: "DESIGNER", assignmentMethod: "ROUND_ROBIN" })
      .sort({ createdAt: -1 })
      .limit(1);
    return assignments[0] || null;
  }

  /** A job can only be given to a designer from the design stages, and only if it needs design at all. */
  static checkAllocatable(job, allowedStages) {
    if (getFlowType(job) === FLOW_TYPES.PRINT_ONLY) {
      return { ok: false, reason: "PRINT_ONLY_NO_DESIGN_REQUIRED", message: "Print Only jobs have no design stage, so no designer can be assigned." };
    }
    const stage = String(job.currentStage || job.stage || "").toUpperCase();
    if (!allowedStages.includes(stage)) {
      return {
        ok: false,
        reason: "JOB_NOT_IN_DESIGN_QUEUE",
        message: `This job order is at stage '${stage}'. A designer can be assigned only while it is in the design queue.`,
      };
    }
    return { ok: true };
  }

  /** Resolve the designer to use: it must be a member of the pool (id, email, code or name). */
  static async resolvePoolDesigner(identifier) {
    const candidates = await this.evaluate();
    const key = String(identifier || "").trim().toLowerCase();
    const found = candidates.find(
      (c) =>
        String(c._id) === String(identifier) ||
        String(c.email || "").toLowerCase() === key ||
        String(c.employeeCode || "").toLowerCase() === key ||
        String(c.name || "").trim().toLowerCase() === key
    );
    if (!found) {
      throw ErrorHelper.notFound(`Designer not found in the designer pool: ${identifier}`);
    }
    return found;
  }

  /** Give the next designer in the rotation the job. */
  static async autoAllocate(jobId, user = null) {
    return this.withLock(async () => {
      const job = await jobOrderRepository.findById(jobId);
      if (!job) return { jobId: String(jobId), assigned: false, reason: "NOT_FOUND" };
      DesignHelper.assertBranchAccess(job, user);

      const check = this.checkAllocatable(job, ["DESIGN_QUEUE"]);
      if (!check.ok) return { jobId: String(job._id), assigned: false, reason: check.reason, message: check.message };

      const candidates = await this.evaluate(job._id);
      const last = await this.lastRoundRobin();
      const pickId = this.pick(candidates, last?.employeeId?._id || last?.employeeId);
      if (!pickId) {
        emitJobEvent("design.noEligibleDesigner", { jobId: String(job._id), jobNo: job.jobNo });
        return { jobId: String(job._id), assigned: false, reason: "NO_ELIGIBLE_DESIGNER" };
      }

      const assignment = await this.createAssignment(job, pickId, "ROUND_ROBIN", user?._id || null);
      const picked = candidates.find((c) => String(c._id) === String(pickId));
      return {
        jobId: String(job._id),
        assigned: true,
        employeeId: String(pickId),
        assignedDesignerId: pickId,
        designerName: picked?.name || "",
        assignment,
      };
    });
  }

  /** Auto-assign every job waiting in the design queue (the user's own branch for a manager). */
  static async autoAssignQueue(user = null) {
    const filter = { currentStage: "DESIGN_QUEUE", jobType: /design/i };
    const branchId = DesignHelper.scopeBranchId(user);
    if (branchId) filter.branchId = asObjectId(branchId);
    const queuedJobs = await jobOrderRepository.find(filter).sort({ createdAt: 1 }).limit(200).lean();

    const results = [];
    for (const j of queuedJobs) {
      results.push(await this.autoAllocate(j._id, user));
    }
    return results;
  }

  /** Assign a designer: round robin, or a chosen designer of the pool. */
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
      return this.autoAllocate(jobId, user);
    }
    if (!employeeId) {
      throw ErrorHelper.badRequest("employeeId is required for MANUAL assignment.");
    }

    return this.withLock(async () => {
      const job = await jobOrderRepository.findById(jobId);
      if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);
      DesignHelper.assertBranchAccess(job, user);

      const check = this.checkAllocatable(job, ASSIGNABLE_STAGES);
      if (!check.ok) throw ErrorHelper.conflict(check.message);

      const designer = await this.resolvePoolDesigner(employeeId);
      const assignment = await this.createAssignment(job, designer._id, "MANUAL", user?._id || null);
      return {
        jobId: String(job._id),
        assigned: true,
        employeeId: String(designer._id),
        assignedDesignerId: designer._id,
        designerName: designer.name || "",
        assignment,
      };
    });
  }

  /** Hand a job that is already with a designer to another designer. */
  static async reassign(jobId, target = "ROUND_ROBIN", reason = "Reassigned", user = null) {
    if (typeof reason === "object" && reason !== null && !user) {
      user = reason;
      reason = "Reassigned";
    }

    return this.withLock(async () => {
      const job = await jobOrderRepository.findById(jobId);
      if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);
      DesignHelper.assertBranchAccess(job, user);

      const check = this.checkAllocatable(job, REASSIGNABLE_STAGES);
      if (!check.ok) throw ErrorHelper.conflict(check.message);

      const current = await jobAssignmentRepository.findOne({
        jobOrderId: job._id,
        assignmentType: "DESIGNER",
        currentAssignment: true,
        status: "ACTIVE",
      });

      const excludeIds = [];
      if (current?.employeeId) excludeIds.push(idOf(current.employeeId));

      let nextId = null;
      let employeeName = "";
      if (target === "ROUND_ROBIN") {
        const candidates = await this.evaluate(job._id);
        const last = await this.lastRoundRobin();
        nextId = this.pick(candidates, last?.employeeId?._id || last?.employeeId, excludeIds);
        if (!nextId) {
          throw ErrorHelper.conflict("NO_ELIGIBLE_DESIGNER: No other eligible designer available for rotation.");
        }
        employeeName = candidates.find((c) => String(c._id) === String(nextId))?.name || "";
      } else {
        const designer = await this.resolvePoolDesigner(target);
        if (current && String(designer._id) === idOf(current.employeeId)) {
          throw ErrorHelper.badRequest("Job is already assigned to this designer.");
        }
        nextId = designer._id;
        employeeName = designer.name || "";
      }

      if (current) {
        current.status = "REASSIGNED";
        current.releasedAt = new Date();
        current.currentAssignment = false;
        await current.save();
      }

      const newAssignment = await this.createAssignment(job, nextId, "REASSIGN", user?._id || null, reason);

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
    });
  }

  static async createAssignment(job, employeeId, method, assignedBy = null, reason = "") {
    // Release any previous active designer assignments for this job
    await jobAssignmentRepository.updateMany(
      { jobOrderId: job._id, assignmentType: "DESIGNER", currentAssignment: true },
      { $set: { currentAssignment: false, status: "REPLACED", releasedAt: new Date() } }
    );

    const lastSeq = await jobAssignmentRepository.findOne({ jobOrderId: job._id }).sort({ sequenceNo: -1 });
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
        designerName,
        assignedAt: now,
        designStatus: "PENDING_DESIGNER_APPROVAL",
        designRejectionReason: "",
      },
    };

    try {
      if (String(job.currentStage).toUpperCase() === "DESIGN_ASSIGNED") {
        await JobWorkflowService.touch(job._id, ctx);
      } else {
        await JobWorkflowService.transition(job._id, "DESIGN_ASSIGNED", ctx);
      }
    } catch (err) {
      // Do not leave an active assignment behind for a job that could not move
      await jobAssignmentRepository.deleteOne({ _id: assignment._id });
      throw err;
    }

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

  /** Ids of the job orders a user may see (all for an admin, the own branch for a manager). */
  static async visibleJobIds(user) {
    const branchId = DesignHelper.scopeBranchId(user);
    if (!branchId) return null;
    return jobOrderRepository.find({ branchId: asObjectId(branchId) }).distinct("_id");
  }

  static async history(jobId, user = null) {
    const job = await jobOrderRepository.findById(jobId);
    if (job) DesignHelper.assertBranchAccess(job, user);
    return jobAssignmentRepository
      .find({ jobOrderId: jobId })
      .populate("employeeId", "name username email code role")
      .populate("assignedBy", "name username email")
      .sort({ createdAt: -1 });
  }

  static async recentAssignments(limit = 10, user = null) {
    const ids = await this.visibleJobIds(user);
    const filter = { assignmentType: "DESIGNER" };
    if (ids) filter.jobOrderId = { $in: ids };
    if (DesignHelper.isDesigner(user)) filter.employeeId = asObjectId(user._id);
    return jobAssignmentRepository
      .find(filter)
      .sort({ assignedAt: -1, createdAt: -1 })
      .limit(Math.min(Number(limit) || 10, 100))
      .populate("employeeId", "name username email code role")
      .populate("jobOrderId", "jobNo title customerName customerSnapshot currentStage priority items");
  }

  static async rejectedAssignments(limit = 50, user = null) {
    const cap = Math.min(Number(limit) || 50, 200);
    const ids = await this.visibleJobIds(user);
    const isDesigner = DesignHelper.isDesigner(user);
    const scope = ids ? { jobOrderId: { $in: ids } } : {};
    if (isDesigner) scope.employeeId = asObjectId(user._id);
    const jobScope = ids ? { _id: { $in: ids } } : {};

    const assignments = await jobAssignmentRepository
      .find({ assignmentType: "DESIGNER", status: "REJECTED", ...scope })
      .sort({ rejectedAt: -1, createdAt: -1 })
      .limit(cap)
      .populate("employeeId", "name username email code role")
      .populate({
        path: "jobOrderId",
        select: "jobNo jobType title customerName customerSnapshot currentStage stage priority items designerId designerName designStatus designRejectionReason dueDate remarks customerRequirements specs",
        populate: { path: "designerId", select: "name email username role" },
      });

    // Only a job still waiting for a designer after a rejection is "pending reallocation"
    const rejectedJobs = isDesigner ? [] : await jobOrderRepository
      .find({
        ...jobScope,
        currentStage: { $in: DESIGN_STAGES },
        $or: [{ designStatus: "REJECTED" }, { designRejectionReason: { $exists: true, $nin: ["", null] } }],
      })
      .populate("designerId", "name email username role")
      .sort({ updatedAt: -1 })
      .limit(cap);

    const seenJobIds = new Set();
    const result = [];

    const describe = (job) => {
      const currentDesigner = job.designerId?.name || job.designerName || null;
      const isPending = !currentDesigner || job.currentStage === "DESIGN_QUEUE";
      return { currentDesigner, isPending };
    };

    for (const a of assignments) {
      if (!a.jobOrderId) continue;
      const jId = idOf(a.jobOrderId);
      seenJobIds.add(jId);
      const job = a.jobOrderId;
      const { currentDesigner, isPending } = describe(job);
      result.push({
        _id: String(a._id),
        assignmentId: String(a._id),
        jobId: jId,
        jobNo: job.jobNo || `JO-${jId.slice(-6)}`,
        jobType: job.jobType || job.specs?.jobType || "",
        customerName: job.customerName || job.customerSnapshot?.name || "Direct Customer",
        jobItem: job.title || job.items?.[0]?.itemName || "Custom Print Order",
        priority: (job.priority || "NORMAL").toUpperCase(),
        rejectedBy: a.employeeId?.name || a.employeeId?.username || "Designer",
        rejectedByEmail: a.employeeId?.email || "",
        rejectionReason: a.rejectionReason || job.designRejectionReason || "No reason specified",
        rejectedAt: a.rejectedAt || a.updatedAt || a.createdAt,
        currentDesigner,
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
      const { currentDesigner, isPending } = describe(j);
      result.push({
        _id: `job-rej-${jId}`,
        assignmentId: null,
        jobId: jId,
        jobNo: j.jobNo || `JO-${jId.slice(-6)}`,
        jobType: j.jobType || j.specs?.jobType || "",
        customerName: j.customerName || j.customerSnapshot?.name || "Direct Customer",
        jobItem: j.title || j.items?.[0]?.itemName || "Custom Print Order",
        priority: (j.priority || "NORMAL").toUpperCase(),
        rejectedBy: "Designer",
        rejectedByEmail: "",
        rejectionReason: j.designRejectionReason || "No reason specified",
        rejectedAt: j.updatedAt || j.createdAt,
        currentDesigner,
        currentStage: j.currentStage || "DESIGN_QUEUE",
        isPendingReallocation: isPending,
        status: isPending ? "Pending Reallocation" : "Assigned",
        jobOrder: j,
      });
    }

    return result.sort((a, b) => new Date(b.rejectedAt) - new Date(a.rejectedAt)).slice(0, cap);
  }

  /**
   * The design queue: jobs in a design stage, plus recently approved designs.
   * Only jobs that need design (Design Only, Print & Design) are listed, and a manager sees only their own branch.
   */
  static async queue(filters = {}, user = null) {
    const query = { jobType: /design/i };

    const stage = filters && filters.stage && filters.stage !== "all" ? String(filters.stage) : null;
    if (stage === "completed") {
      query.designStatus = "COMPLETED";
    } else if (stage) {
      if (!DESIGN_STAGES.includes(stage)) return [];
      query.currentStage = stage;
    } else {
      query.$or = [{ currentStage: { $in: DESIGN_STAGES } }, { designStatus: "COMPLETED" }];
    }

    const branchId = DesignHelper.scopeBranchId(user, filters && filters.branchId);
    if (branchId) query.branchId = asObjectId(branchId);
    // A designer sees only the jobs given to them
    if (DesignHelper.isDesigner(user)) query.designerId = asObjectId(user._id);

    const limit = Math.min(Math.max(Number(filters && filters.limit) || 300, 1), 500);
    const page = Math.max(Number(filters && filters.page) || 1, 1);

    const list = await jobOrderRepository
      .find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("designerId", "name email username role")
      .populate("branchId", "name code")
      .lean();
    // The page needs to know which proofs are approved in person by the manager (walk-in customers)
    return DesignHelper.markWalkIn(list || []);
  }

  static async pool(user = null, { includeInactive = false } = {}) {
    const candidates = await this.evaluate(null, { includeInactive });
    const last = await this.lastRoundRobin();
    const nextId = this.pick(candidates, last?.employeeId?._id || last?.employeeId);
    return {
      lastAssigned: last?.employeeId || null,
      nextDesigner: nextId,
      designers: candidates,
    };
  }

  /**
   * Open work per designer. "Overdue" means due before today and "due today" means due during today
   * (a job due today is never counted as both).
   */
  static async workload(branchId = null, user = null) {
    const scopedBranch = DesignHelper.scopeBranchId(user, branchId);
    const startOfToday = startOfISTDay(new Date());
    const endOfToday = endOfISTDay(new Date());

    const rows = await jobAssignmentRepository.aggregate([
      { $match: { assignmentType: "DESIGNER", status: "ACTIVE", currentAssignment: true } },
      { $lookup: { from: "jobOrders", localField: "jobOrderId", foreignField: "_id", as: "job" } },
      { $unwind: "$job" },
      ...(scopedBranch ? [{ $match: { "job.branchId": asObjectId(scopedBranch) } }] : []),
      {
        $group: {
          _id: "$employeeId",
          open: { $sum: 1 },
          pendingAcceptance: { $sum: { $cond: [{ $eq: [{ $ifNull: ["$acceptedAt", null] }, null] }, 1, 0] } },
          overdue: { $sum: { $cond: [{ $and: [{ $ne: [{ $ifNull: ["$job.dueDate", null] }, null] }, { $lt: ["$job.dueDate", startOfToday] }] }, 1, 0] } },
          dueToday: { $sum: { $cond: [{ $and: [{ $gte: ["$job.dueDate", startOfToday] }, { $lte: ["$job.dueDate", endOfToday] }] }, 1, 0] } },
        },
      },
    ]);
    const byDesigner = new Map(rows.map((r) => [String(r._id), r]));

    // Every designer of the pool is listed, also the ones with nothing open
    const designers = await User.find({ role: "designer" }).select("-password").lean();
    return orderDesigners(designers)
      .map((u) => {
        const r = byDesigner.get(String(u._id)) || {};
        return {
          _id: u._id,
          open: r.open || 0,
          pendingAcceptance: r.pendingAcceptance || 0,
          overdue: r.overdue || 0,
          dueToday: r.dueToday || 0,
          employee: u,
        };
      });
  }

  /** Change a pool designer's details (name, email, mobile), work limit or availability. */
  static async updateDesigner(id, data = {}) {
    const designer = await User.findOne({ _id: asObjectId(id), role: "designer" });
    if (!designer) throw ErrorHelper.notFound("Designer not found in the designer pool.");

    if (data.maxLoad !== undefined) {
      const limit = Number(data.maxLoad);
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LOAD_LIMIT) {
        throw ErrorHelper.badRequest(`Max load must be a whole number from 1 to ${MAX_LOAD_LIMIT}.`);
      }
      designer.maxLoad = limit;
    }
    if (data.isActive !== undefined) designer.isActive = Boolean(data.isActive);

    if (data.name !== undefined) {
      const name = String(data.name || "").trim().replace(/\s+/g, " ");
      if (name.length < 2) throw ErrorHelper.badRequest("Designer name is required (at least 2 characters).");
      designer.name = name;
    }
    if (data.email !== undefined) {
      const email = String(data.email || "").trim().toLowerCase();
      if (!EMAIL_RE.test(email)) throw ErrorHelper.badRequest("Enter a valid designer email address.");
      if (email !== String(designer.email || "").toLowerCase()) {
        const clash = await User.findOne({ email, _id: { $ne: designer._id } }).select("_id").lean();
        if (clash) throw ErrorHelper.conflict("A user with this email already exists.");
        designer.email = email;
      }
    }
    if (data.mobile !== undefined || data.phone !== undefined) {
      const mobile = String(data.mobile ?? data.phone ?? "").trim();
      if (mobile && !/^[0-9+\-\s]{7,15}$/.test(mobile)) throw ErrorHelper.badRequest("Enter a valid mobile number.");
      designer.phone = mobile;
    }
    if (data.password !== undefined && String(data.password).trim() !== "") {
      const password = String(data.password).trim();
      if (password.length < 6) throw ErrorHelper.badRequest("Password must be at least 6 characters.");
      designer.password = password; // hashed by the User model on save
    }
    await designer.save();

    const { password, ...safe } = designer.toObject();
    return safe;
  }

  static async updateGlobalMaxLoad(maxLoad) {
    const limit = Number(maxLoad);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LOAD_LIMIT) {
      throw ErrorHelper.badRequest(`Max load must be a whole number from 1 to ${MAX_LOAD_LIMIT}.`);
    }
    await User.updateMany({ role: "designer" }, { $set: { maxLoad: limit } });
    return { success: true, maxLoad: limit };
  }
}

DesignAllocationService.BRANCH_DESIGNERS = BRANCH_DESIGNERS;
DesignAllocationService.DESIGN_STAGES = DESIGN_STAGES;

module.exports = DesignAllocationService;
