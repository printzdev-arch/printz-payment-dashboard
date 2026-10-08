const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobOrderRepository");
const jobWorkflowEventRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobWorkflowEventRepository");
const ProductionStateService = require("../production/productionState.service");
const { STAGE_STATUS, JOB_STAGES, JOB_STATUSES } = require("../../../shared/constants/job-order/jobStages");
const { TRANSITIONS } = require("../../../shared/constants/job-order/jobTransitions");
const { emitJobEvent } = require("../../../shared/events/job-order/jobEvents.emitter");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class JobWorkflowService {
  /**
   * The authoritative way a job's stage and status may change.
   */
  static async transition(jobId, toStage, ctx = {}) {
    const job = await jobOrderRepository.findById(jobId);
    if (!job) {
      throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);
    }

    if (job.status === JOB_STATUSES.ON_HOLD || job.status === JOB_STATUSES.CANCELLED) {
      throw ErrorHelper.conflict(`Cannot transition a job that is '${job.status}'.`);
    }

    const currentStage = job.currentStage || job.stage || JOB_STAGES.ENQUIRY;
    const allowedNext = TRANSITIONS[currentStage] || [];

    if (!allowedNext.includes(toStage)) {
      throw ErrorHelper.conflict(
        `Invalid stage transition: '${currentStage}' -> '${toStage}' is not permitted.`
      );
    }

    const fromStage = currentStage;
    const fromStatus = job.status;
    const toStatus = STAGE_STATUS[toStage] || job.status;

    const patch = {
      currentStage: toStage,
      stage: toStage,
      status: toStatus,
      ...(ctx.patch || {}),
    };

    const updated = await jobOrderRepository.findOneAndUpdate(
      { _id: job._id, status: fromStatus },
      { $set: patch },
      { new: true }
    );

    if (!updated) {
      throw ErrorHelper.conflict("Concurrent update conflict: Job state was changed by another process. Please retry.");
    }

    // Write workflow event
    await jobWorkflowEventRepository.create({
      jobOrderId: job._id,
      stage: toStage,
      fromStage,
      fromStatus,
      toStatus,
      actorId: ctx.actorId || null,
      assignedTo: ctx.assignedTo || null,
      notes: ctx.notes || "",
      reason: ctx.reason || "",
      relatedSampleId: ctx.relatedSampleId || null,
      relatedReprintId: ctx.relatedReprintId || null,
      details: ctx.details || null,
    });

    // Write audit log
    await ProductionStateService.logAudit({
      action: "STATUS_CHANGE",
      resource: "JobOrder",
      resourceId: job._id,
      user: ctx.user || (ctx.actorId ? { _id: ctx.actorId } : null),
      branchId: job.branchId,
      details: {
        fromStage,
        toStage,
        fromStatus,
        toStatus,
        reason: ctx.reason,
        notes: ctx.notes,
      },
    });

    // Emit event on shared bus
    emitJobEvent("job.stage.changed", {
      jobId: String(job._id),
      fromStage,
      toStage,
      status: toStatus,
      branchId: String(job.branchId),
      designerId: updated.designerId ? String(updated.designerId) : null,
      actorId: ctx.actorId ? String(ctx.actorId) : null,
      resumed: Boolean(ctx.resumed),
    });

    return updated;
  }

  /**
   * Same-stage update that requires timeline audit logging (e.g. reassigning a designer).
   */
  static async touch(jobId, ctx = {}) {
    const job = await jobOrderRepository.findById(jobId);
    if (!job) {
      throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);
    }

    const patch = ctx.patch || {};
    const updated = await jobOrderRepository.findOneAndUpdate(
      { _id: job._id },
      { $set: patch },
      { new: true }
    );

    await jobWorkflowEventRepository.create({
      jobOrderId: job._id,
      stage: job.currentStage,
      fromStage: job.currentStage,
      fromStatus: job.status,
      toStatus: job.status,
      actorId: ctx.actorId || null,
      assignedTo: ctx.assignedTo || null,
      notes: ctx.notes || "",
      reason: ctx.reason || "",
      relatedSampleId: ctx.relatedSampleId || null,
      relatedReprintId: ctx.relatedReprintId || null,
    });

    return updated;
  }

  static async recordCreated(job, actorId = null) {
    await jobWorkflowEventRepository.create({
      jobOrderId: job._id,
      stage: job.currentStage || JOB_STAGES.ENQUIRY,
      fromStage: null,
      fromStatus: null,
      toStatus: job.status || JOB_STATUSES.DRAFT,
      actorId: actorId || job.createdBy,
      notes: "Job order created",
    });

    await ProductionStateService.logAudit({
      action: "CREATE",
      resource: "JobOrder",
      resourceId: job._id,
      user: actorId ? { _id: actorId } : null,
      branchId: job.branchId,
      details: { jobNo: job.jobNo, title: job.title },
    });
  }

  static async recordEvent(job, stage, ctx = {}) {
    await jobWorkflowEventRepository.create({
      jobOrderId: job._id,
      stage,
      fromStage: job.currentStage,
      fromStatus: job.status,
      toStatus: job.status,
      actorId: ctx.actorId || null,
      notes: ctx.notes || "",
      reason: ctx.reason || "",
      details: ctx.details || null,
    });
  }

  static async hold(jobId, reason = "", actorId = null) {
    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    if ([JOB_STATUSES.ON_HOLD, JOB_STATUSES.CANCELLED, JOB_STATUSES.DELIVERED].includes(job.status)) {
      throw ErrorHelper.conflict(`Cannot hold a job that is already in status '${job.status}'.`);
    }

    const fromStatus = job.status;
    const updated = await jobOrderRepository.findOneAndUpdate(
      { _id: job._id, status: fromStatus },
      { $set: { status: JOB_STATUSES.ON_HOLD } },
      { new: true }
    );

    await jobWorkflowEventRepository.create({
      jobOrderId: job._id,
      stage: job.currentStage,
      fromStage: job.currentStage,
      fromStatus,
      toStatus: JOB_STATUSES.ON_HOLD,
      actorId,
      reason,
      notes: "Job placed on hold",
    });

    await ProductionStateService.logAudit({
      action: "STATUS_CHANGE",
      resource: "JobOrder",
      resourceId: job._id,
      user: actorId ? { _id: actorId } : null,
      branchId: job.branchId,
      details: { before: fromStatus, after: JOB_STATUSES.ON_HOLD, reason },
    });

    emitJobEvent("job.onHold", { jobId: String(job._id), reason });
    return updated;
  }

  static async resume(jobId, actorId = null) {
    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    if (job.status !== JOB_STATUSES.ON_HOLD) {
      throw ErrorHelper.badRequest(`Job is not on hold (current status: '${job.status}').`);
    }

    const holdEvent = await jobWorkflowEventRepository.findOne({
      jobOrderId: job._id,
      toStatus: JOB_STATUSES.ON_HOLD,
    });

    const restoreStatus = (holdEvent && holdEvent.fromStatus) || STAGE_STATUS[job.currentStage] || JOB_STATUSES.DRAFT;

    const updated = await jobOrderRepository.findOneAndUpdate(
      { _id: job._id, status: JOB_STATUSES.ON_HOLD },
      { $set: { status: restoreStatus } },
      { new: true }
    );

    await jobWorkflowEventRepository.create({
      jobOrderId: job._id,
      stage: job.currentStage,
      fromStage: job.currentStage,
      fromStatus: JOB_STATUSES.ON_HOLD,
      toStatus: restoreStatus,
      actorId,
      reason: "RESUME",
      notes: "Job resumed from hold",
    });

    await ProductionStateService.logAudit({
      action: "STATUS_CHANGE",
      resource: "JobOrder",
      resourceId: job._id,
      user: actorId ? { _id: actorId } : null,
      branchId: job.branchId,
      details: { before: JOB_STATUSES.ON_HOLD, after: restoreStatus },
    });

    emitJobEvent("job.stage.changed", {
      jobId: String(job._id),
      fromStage: job.currentStage,
      toStage: job.currentStage,
      status: restoreStatus,
      branchId: String(job.branchId),
      designerId: job.designerId ? String(job.designerId) : null,
      resumed: true,
    });

    return updated;
  }

  static async cancel(jobId, reason = "", actorId = null) {
    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    if ([JOB_STATUSES.CANCELLED, JOB_STATUSES.DELIVERED].includes(job.status)) {
      throw ErrorHelper.conflict(`Cannot cancel a job with status '${job.status}'.`);
    }

    const fromStatus = job.status;
    const updated = await jobOrderRepository.findOneAndUpdate(
      { _id: job._id },
      { $set: { status: JOB_STATUSES.CANCELLED } },
      { new: true }
    );

    await jobWorkflowEventRepository.create({
      jobOrderId: job._id,
      stage: job.currentStage,
      fromStage: job.currentStage,
      fromStatus,
      toStatus: JOB_STATUSES.CANCELLED,
      actorId,
      reason,
      notes: "Job cancelled",
    });

    await ProductionStateService.logAudit({
      action: "STATUS_CHANGE",
      resource: "JobOrder",
      resourceId: job._id,
      user: actorId ? { _id: actorId } : null,
      branchId: job.branchId,
      details: { before: fromStatus, after: JOB_STATUSES.CANCELLED, reason },
    });

    emitJobEvent("job.cancelled", { jobId: String(job._id), reason });
    return updated;
  }
}

module.exports = JobWorkflowService;
