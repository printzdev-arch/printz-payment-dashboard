const slaConfigurationRepository = require("../../../infrastructure/database/mongoose/repositories/sla/SlaConfigurationRepository");
const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobOrderRepository");
const jobAssignmentRepository = require("../../../infrastructure/database/mongoose/repositories/design/MongoJobAssignmentRepository");
const jobSampleRepository = require("../../../infrastructure/database/mongoose/repositories/design/MongoJobSampleRepository");
const JobWorkflowEvent = require("../../../infrastructure/database/mongoose/models/job-order/JobWorkflowEvent");
const ProductionOperation = require("../../../infrastructure/database/mongoose/models/ProductionOperation");
const QualityCheck = require("../../../infrastructure/database/mongoose/models/QualityCheck");
const JobOrder = require("../../../infrastructure/database/mongoose/models/job-order/JobOrder");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class SlaService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL_MS = 60 * 1000; // 60 seconds
  }

  /**
   * Invalidate SLA cache for a job or all jobs
   */
  invalidateCache(jobOrderId = null) {
    if (jobOrderId) {
      this.cache.delete(String(jobOrderId));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Resolve best SLA configuration for a stage with resolution hierarchy:
   * 1. stage + jobType + priority
   * 2. stage + jobType (priority = null)
   * 3. stage + priority (jobType = null)
   * 4. stage (jobType = null, priority = null)
   */
  async resolveConfiguration(stage, jobType = null, priority = null, allConfigs = null) {
    let configs = allConfigs;
    if (!configs) {
      configs = await slaConfigurationRepository.find({ isActive: true });
    }

    const stageConfigs = configs.filter((c) => c.stage === stage && c.isActive);
    if (!stageConfigs.length) return null;

    // 1. Exact match (stage + jobType + priority)
    if (jobType && priority) {
      const match1 = stageConfigs.find((c) => c.jobType === jobType && c.priority === priority);
      if (match1) return match1;
    }

    // 2. stage + jobType (priority null or wildcard)
    if (jobType) {
      const match2 = stageConfigs.find((c) => c.jobType === jobType && !c.priority);
      if (match2) return match2;
    }

    // 3. stage + priority (jobType null or wildcard)
    if (priority) {
      const match3 = stageConfigs.find((c) => !c.jobType && c.priority === priority);
      if (match3) return match3;
    }

    // 4. stage only (generic)
    const match4 = stageConfigs.find((c) => !c.jobType && !c.priority);
    if (match4) return match4;

    // Return any active configuration for this stage as fallback
    return stageConfigs[0] || null;
  }

  /**
   * Extract hold intervals from workflow events
   */
  extractHoldIntervals(workflowEvents = []) {
    const sorted = [...workflowEvents].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const holdIntervals = [];
    let holdStart = null;

    for (const evt of sorted) {
      const toStatus = evt.toStatus || evt.stage;
      const fromStatus = evt.fromStatus;

      if (toStatus === "ON_HOLD" && !holdStart) {
        holdStart = new Date(evt.createdAt);
      } else if (fromStatus === "ON_HOLD" && holdStart) {
        holdIntervals.push({ start: holdStart, end: new Date(evt.createdAt) });
        holdStart = null;
      }
    }

    if (holdStart) {
      holdIntervals.push({ start: holdStart, end: new Date() });
    }

    return holdIntervals;
  }

  /**
   * Calculate total overlap between a date range and hold intervals
   */
  calculateHoldOverlapMs(start, end, holdIntervals = []) {
    if (!start || !end || start >= end) return 0;
    const sTime = start.getTime();
    const eTime = end.getTime();

    let totalOverlapMs = 0;
    for (const interval of holdIntervals) {
      const hStart = interval.start.getTime();
      const hEnd = interval.end.getTime();

      const overlapStart = Math.max(sTime, hStart);
      const overlapEnd = Math.min(eTime, hEnd);

      if (overlapEnd > overlapStart) {
        totalOverlapMs += overlapEnd - overlapStart;
      }
    }

    return totalOverlapMs;
  }

  /**
   * Compute a single SLA segment status
   */
  computeSegment({
    stage,
    startedAt,
    endedAt = null,
    config,
    holdIntervals = [],
    defaultTargetMinutes = 1440,
    defaultWarningMinutes = 120,
    isInformational = false,
  }) {
    if (!startedAt) return null;

    const start = new Date(startedAt);
    const isClosed = Boolean(endedAt);
    const end = isClosed ? new Date(endedAt) : new Date();

    const targetMinutes = config ? Number(config.targetMinutes) : defaultTargetMinutes;
    const warningMinutes = config ? Number(config.warningMinutes) : defaultWarningMinutes;

    const holdOverlapMs = this.calculateHoldOverlapMs(start, end, holdIntervals);
    const rawElapsedMs = Math.max(0, end.getTime() - start.getTime() - holdOverlapMs);
    const elapsedMinutes = Math.round(rawElapsedMs / (60 * 1000));

    let state;
    let remainingMinutes = 0;

    if (isClosed) {
      state = elapsedMinutes <= targetMinutes ? "MET" : "BREACHED";
      remainingMinutes = Math.max(0, targetMinutes - elapsedMinutes);
    } else {
      remainingMinutes = Math.max(0, targetMinutes - elapsedMinutes);
      if (elapsedMinutes > targetMinutes) {
        state = "BREACHED";
      } else if (remainingMinutes <= warningMinutes) {
        state = "APPROACHING";
      } else {
        state = "WITHIN_SLA";
      }
    }

    return {
      stage,
      startedAt: start,
      endedAt: isClosed ? end : null,
      targetMinutes,
      elapsedMinutes,
      remainingMinutes,
      state,
      isClosed,
      isInformational,
    };
  }

  /**
   * Evaluate SLA for a job order
   */
  async evaluate(jobOrderId, useCache = true) {
    const key = String(jobOrderId);
    if (useCache && this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (Date.now() < cached.expiresAt) {
        return cached.data;
      }
    }

    const job = await jobOrderRepository.findById(jobOrderId);
    if (!job) {
      throw ErrorHelper.notFound("Job Order not found");
    }

    const [allConfigs, workflowEvents, assignments, samples, operations, qcs] = await Promise.all([
      slaConfigurationRepository.find({ isActive: true }),
      JobWorkflowEvent.find({ jobOrderId }).sort({ createdAt: 1 }).lean(),
      jobAssignmentRepository.find({ jobOrderId, assignmentType: "DESIGNER" }),
      jobSampleRepository.find({ jobOrderId }),
      ProductionOperation.find({ jobOrderId }).sort({ sequenceNo: 1 }).lean(),
      QualityCheck.find({ jobOrderId }).sort({ checkedAt: -1 }).lean(),
    ]);

    const holdIntervals = this.extractHoldIntervals(workflowEvents);
    const jobType = job.jobType || null;
    const priority = job.priority || "NORMAL";

    const segments = [];

    // 1. DESIGN_ACCEPTANCE (assignedAt -> acceptedAt)
    const activeOrAcceptedAssignment = assignments.find(
      (a) => a.acceptedAt || a.currentAssignment || a.status === "ACTIVE" || a.status === "COMPLETED"
    ) || assignments[0];

    if (activeOrAcceptedAssignment && activeOrAcceptedAssignment.assignedAt) {
      const config = await this.resolveConfiguration("DESIGN_ACCEPTANCE", jobType, priority, allConfigs);
      const seg = this.computeSegment({
        stage: "DESIGN_ACCEPTANCE",
        startedAt: activeOrAcceptedAssignment.assignedAt,
        endedAt: activeOrAcceptedAssignment.acceptedAt,
        config,
        holdIntervals,
        defaultTargetMinutes: 120,
        defaultWarningMinutes: 30,
      });
      if (seg) segments.push(seg);
    }

    // 2. DESIGN_START (acceptedAt -> DESIGN_IN_PROGRESS event)
    if (activeOrAcceptedAssignment && activeOrAcceptedAssignment.acceptedAt) {
      const designStartEvent = workflowEvents.find(
        (e) => e.stage === "DESIGN_IN_PROGRESS" || e.toStage === "DESIGN_IN_PROGRESS"
      );
      const config = await this.resolveConfiguration("DESIGN_START", jobType, priority, allConfigs);
      const seg = this.computeSegment({
        stage: "DESIGN_START",
        startedAt: activeOrAcceptedAssignment.acceptedAt,
        endedAt: designStartEvent ? designStartEvent.createdAt : null,
        config,
        holdIntervals,
        defaultTargetMinutes: 60,
        defaultWarningMinutes: 15,
      });
      if (seg) segments.push(seg);
    }

    // 3. SAMPLE_SUBMISSION (design start -> first sample submittedAt)
    const designStartEvent = workflowEvents.find(
      (e) => e.stage === "DESIGN_IN_PROGRESS" || e.toStage === "DESIGN_IN_PROGRESS"
    );
    const firstSample = samples
      .filter((s) => s.submittedAt)
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())[0];

    if (designStartEvent || (activeOrAcceptedAssignment && activeOrAcceptedAssignment.acceptedAt)) {
      const startTime = designStartEvent?.createdAt || activeOrAcceptedAssignment?.acceptedAt;
      const config = await this.resolveConfiguration("SAMPLE_SUBMISSION", jobType, priority, allConfigs);
      const seg = this.computeSegment({
        stage: "SAMPLE_SUBMISSION",
        startedAt: startTime,
        endedAt: firstSample ? firstSample.submittedAt : null,
        config,
        holdIntervals,
        defaultTargetMinutes: 480,
        defaultWarningMinutes: 60,
      });
      if (seg) segments.push(seg);
    }

    // 4. REVISION_TURNAROUND (revision event -> next sample submittedAt)
    const revisionEvents = workflowEvents.filter(
      (e) => e.stage === "REVISION" || e.toStage === "REVISION"
    );
    for (const revEvt of revisionEvents) {
      const revTime = new Date(revEvt.createdAt).getTime();
      const nextSample = samples.find(
        (s) => s.submittedAt && new Date(s.submittedAt).getTime() > revTime
      );
      const config = await this.resolveConfiguration("REVISION_TURNAROUND", jobType, priority, allConfigs);
      const seg = this.computeSegment({
        stage: "REVISION_TURNAROUND",
        startedAt: revEvt.createdAt,
        endedAt: nextSample ? nextSample.submittedAt : null,
        config,
        holdIntervals,
        defaultTargetMinutes: 240,
        defaultWarningMinutes: 30,
      });
      if (seg) segments.push(seg);
    }

    // 5. CUSTOMER_APPROVAL (sample submittedAt -> sample approvedAt) [Informational]
    const approvedSample = samples.find((s) => s.status === "APPROVED" && s.approvedAt);
    if (firstSample && firstSample.submittedAt) {
      const config = await this.resolveConfiguration("CUSTOMER_APPROVAL", jobType, priority, allConfigs);
      const seg = this.computeSegment({
        stage: "CUSTOMER_APPROVAL",
        startedAt: firstSample.submittedAt,
        endedAt: approvedSample ? approvedSample.approvedAt : null,
        config,
        holdIntervals,
        defaultTargetMinutes: 1440,
        defaultWarningMinutes: 180,
        isInformational: true,
      });
      if (seg) segments.push(seg);
    }

    // 6. DESIGN_COMPLETION (assignedAt -> sample approvedAt)
    if (activeOrAcceptedAssignment && activeOrAcceptedAssignment.assignedAt) {
      const config = await this.resolveConfiguration("DESIGN_COMPLETION", jobType, priority, allConfigs);
      const seg = this.computeSegment({
        stage: "DESIGN_COMPLETION",
        startedAt: activeOrAcceptedAssignment.assignedAt,
        endedAt: approvedSample ? approvedSample.approvedAt : null,
        config,
        holdIntervals,
        defaultTargetMinutes: 1440,
        defaultWarningMinutes: 120,
      });
      if (seg) segments.push(seg);
    }

    // 7. Production Operations: PRINTING, FINISHING, PACKING
    for (const op of operations) {
      let stageCode = null;
      const code = (op.operationCode || "").toUpperCase();
      if (code.includes("PRINT")) stageCode = "PRINTING";
      else if (code.includes("PACK")) stageCode = "PACKING";
      else if (code.includes("LAM") || code.includes("CUT") || code.includes("BIND") || code.includes("FINISH")) {
        stageCode = "FINISHING";
      }

      if (stageCode && op.startAt) {
        const config = await this.resolveConfiguration(stageCode, jobType, priority, allConfigs);
        const seg = this.computeSegment({
          stage: stageCode,
          startedAt: op.startAt,
          endedAt: op.status === "COMPLETED" && op.endAt ? op.endAt : null,
          config,
          holdIntervals,
          defaultTargetMinutes: 480,
          defaultWarningMinutes: 60,
        });
        if (seg) segments.push(seg);
      }
    }

    // 8. QC (QC pending -> QualityCheck.checkedAt)
    const passedQc = qcs.find((q) => q.result === "PASS" || q.checkedAt);
    const qcStartEvent = workflowEvents.find((e) => e.stage === "QC" || e.toStage === "QC");
    if (qcStartEvent || passedQc) {
      const startTime = qcStartEvent?.createdAt || (operations.length ? operations[operations.length - 1].endAt : null) || job.createdAt;
      const config = await this.resolveConfiguration("QC", jobType, priority, allConfigs);
      const seg = this.computeSegment({
        stage: "QC",
        startedAt: startTime,
        endedAt: passedQc ? passedQc.checkedAt : null,
        config,
        holdIntervals,
        defaultTargetMinutes: 120,
        defaultWarningMinutes: 30,
      });
      if (seg) segments.push(seg);
    }

    // 9. OVERALL (orderDate -> stage READY / completionDate)
    const readyEvent = workflowEvents.find(
      (e) => e.stage === "READY" || e.toStage === "READY" || e.toStatus === "READY" || e.toStatus === "DELIVERED"
    );
    const isJobReady = ["READY", "DELIVERED"].includes(job.status) || Boolean(job.completionDate) || Boolean(readyEvent);
    const orderDate = job.orderDate ? new Date(job.orderDate) : new Date(job.createdAt);
    const completionDate = job.completionDate ? new Date(job.completionDate) : readyEvent ? new Date(readyEvent.createdAt) : null;

    let overallTargetMinutes = 2880; // default 48h
    let overallWarningMinutes = 240;

    let overallConfig = null;
    if (job.slaConfigurationId) {
      overallConfig = allConfigs.find((c) => String(c._id) === String(job.slaConfigurationId));
    }
    if (!overallConfig) {
      overallConfig = await this.resolveConfiguration("OVERALL", jobType, priority, allConfigs);
    }

    if (overallConfig) {
      overallTargetMinutes = Number(overallConfig.targetMinutes);
      overallWarningMinutes = Number(overallConfig.warningMinutes);
    } else if (job.dueDate) {
      const due = new Date(job.dueDate).getTime();
      const ord = orderDate.getTime();
      if (due > ord) {
        overallTargetMinutes = Math.round((due - ord) / (60 * 1000));
      }
    }

    const overallSeg = this.computeSegment({
      stage: "OVERALL",
      startedAt: orderDate,
      endedAt: isJobReady ? completionDate || new Date() : null,
      config: overallConfig || { targetMinutes: overallTargetMinutes, warningMinutes: overallWarningMinutes },
      holdIntervals,
      defaultTargetMinutes: overallTargetMinutes,
      defaultWarningMinutes: overallWarningMinutes,
    });

    const result = {
      jobOrderId: job._id,
      jobNo: job.jobNo,
      segments,
      overall: overallSeg,
    };

    // Cache for 60 seconds
    this.cache.set(key, {
      data: result,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return result;
  }

  /**
   * Get SLA Summary counts
   */
  async getSummary(filters = {}) {
    const jobQuery = {};
    if (filters.branchId) jobQuery.branchId = filters.branchId;
    if (filters.from || filters.to) {
      jobQuery.orderDate = {};
      if (filters.from) jobQuery.orderDate.$gte = new Date(filters.from);
      if (filters.to) jobQuery.orderDate.$lte = new Date(filters.to);
    }

    const jobs = await JobOrder.find(jobQuery).select("_id status").lean();

    const counts = {
      WITHIN_SLA: 0,
      APPROACHING: 0,
      BREACHED: 0,
      MET: 0,
    };

    for (const job of jobs) {
      try {
        const evalResult = await this.evaluate(job._id);
        const targetSegments = filters.stage
          ? evalResult.segments.filter((s) => s.stage === filters.stage)
          : evalResult.segments;

        for (const seg of targetSegments) {
          if (counts[seg.state] !== undefined) {
            counts[seg.state]++;
          }
        }
      } catch (err) {
        // Skip on evaluation error
      }
    }

    return counts;
  }

  /**
   * Get open At-Risk SLA segments (APPROACHING or BREACHED)
   */
  async getAtRisk(filters = {}) {
    const jobQuery = {
      status: { $nin: ["DELIVERED", "CANCELLED"] },
    };
    if (filters.branchId) jobQuery.branchId = filters.branchId;
    if (filters.designerId) jobQuery.designerId = filters.designerId;

    const openJobs = await JobOrder.find(jobQuery)
      .populate("designerId", "name email employeeCode")
      .lean();

    const atRiskList = [];

    for (const job of openJobs) {
      try {
        const evalResult = await this.evaluate(job._id);
        for (const seg of evalResult.segments) {
          if (!seg.isClosed && ["APPROACHING", "BREACHED"].includes(seg.state)) {
            if (filters.stage && seg.stage !== filters.stage) continue;

            atRiskList.push({
              jobOrderId: job._id,
              jobNo: job.jobNo,
              customerName: job.customerSnapshot?.name || "Customer",
              designer: job.designerId || null,
              priority: job.priority,
              currentStage: job.currentStage,
              segment: seg,
              remainingMinutes: seg.remainingMinutes,
              state: seg.state,
            });
          }
        }
      } catch (err) {
        // Skip on eval failure
      }
    }

    // Sort by most urgent first (lowest remainingMinutes or breached with largest negative)
    return atRiskList.sort((a, b) => a.remainingMinutes - b.remainingMinutes);
  }
}

module.exports = new SlaService();
