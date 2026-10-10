const crypto = require("crypto");
const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobOrderRepository");
const jobApprovalRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobApprovalRepository");
const jobSampleRepository = require("../../../infrastructure/database/mongoose/repositories/design/MongoJobSampleRepository");
const jobAssignmentRepository = require("../../../infrastructure/database/mongoose/repositories/design/MongoJobAssignmentRepository");
const DesignApprovalToken = require("../../../infrastructure/database/mongoose/models/design/DesignApprovalToken");
const WhatsAppService = require("../../../infrastructure/whatsapp/WhatsAppService");
const JobWorkflowService = require("../job-order/jobWorkflow.service");
const ProductionStateService = require("../production/productionState.service");
const { emitJobEvent } = require("../../../shared/events/job-order/jobEvents.emitter");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DesignSampleService {
  /**
   * Upload sample artwork draft.
   */
  static async uploadSample(jobId, sampleData = {}, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    if (!["DESIGN_IN_PROGRESS", "REVISION"].includes(job.currentStage)) {
      throw ErrorHelper.conflict(`Cannot upload a sample at stage '${job.currentStage}'. Expected DESIGN_IN_PROGRESS or REVISION.`);
    }

    const last = await jobSampleRepository.findOne({ jobOrderId: job._id });
    if (last && last.status === "DRAFT") {
      throw ErrorHelper.conflict("A DRAFT sample already exists; please edit or submit it before creating a new one.");
    }

    const revisionCount = await jobSampleRepository.countDocuments({
      jobOrderId: job._id,
      status: "REVISION_REQUIRED",
    });

    const versionNo = last ? last.versionNo + 1 : 1;

    const sample = await jobSampleRepository.create({
      jobOrderId: job._id,
      jobItemId: sampleData.jobItemId || null,
      versionNo,
      revisionNo: revisionCount,
      fileId: sampleData.fileId || null,
      fileUrl: sampleData.fileUrl || "",
      comments: sampleData.comments || "",
      status: "DRAFT",
    });

    await ProductionStateService.logAudit({
      action: "SAMPLE_UPLOAD",
      resource: "JobSample",
      resourceId: sample._id,
      user,
      branchId: job.branchId,
      details: { versionNo, revisionNo: revisionCount },
    });

    return sample;
  }

  /**
   * Edit existing draft sample.
   */
  static async patchSample(jobId, sampleId, sampleData = {}, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const sample = await jobSampleRepository.findById(sampleId);
    if (!sample || String(sample.jobOrderId) !== String(jobId)) {
      throw ErrorHelper.notFound(`Job Sample not found with ID: ${sampleId}`);
    }

    if (sample.status !== "DRAFT") {
      throw ErrorHelper.conflict("Only DRAFT samples can be edited.");
    }

    if (sampleData.comments !== undefined) sample.comments = sampleData.comments;
    if (sampleData.fileUrl !== undefined) sample.fileUrl = sampleData.fileUrl;
    if (sampleData.fileId !== undefined) sample.fileId = sampleData.fileId;

    await sample.save();
    return sample;
  }

  /**
   * Submit sample for customer / manager approval.
   */
  static async submitSample(jobId, sampleId, submitData = {}, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    const sample = await jobSampleRepository.findById(sampleId);
    if (!sample || String(sample.jobOrderId) !== String(jobId)) {
      throw ErrorHelper.notFound(`Job Sample not found with ID: ${sampleId}`);
    }

    if (sample.status !== "DRAFT") {
      throw ErrorHelper.conflict("Sample has already been submitted.");
    }

    const now = new Date();
    sample.status = "SUBMITTED";
    sample.submittedAt = now;
    sample.submittedBy = user._id;
    sample.customerPhone = submitData.customerPhone || job.customerPhone || "";
    await sample.save();

    const approvalNo = `APP-SMP-${job.jobNo || job._id}-V${sample.versionNo}`;

    await jobApprovalRepository.create({
      approvalNo,
      jobOrderId: job._id,
      approvalType: "SAMPLE",
      versionNo: sample.versionNo,
      status: "PENDING",
      requestedFrom: job.customerId,
      requestedBy: user._id,
    });

    // ── Generate Cryptographic Approval Token ──
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Invalidate any older active tokens for this job order
    await DesignApprovalToken.updateMany(
      { jobOrderId: job._id, status: "ACTIVE" },
      { $set: { status: "SUPERSEDED" } }
    );

    const baseUrl = WhatsAppService.approvalBaseUrl.replace(/\/+$/, "");
    const approvalUrl = `${baseUrl}/design-approvals/${rawToken}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day expiry

    const tokenDoc = await DesignApprovalToken.create({
      jobOrderId: job._id,
      sampleId: sample._id,
      versionNo: sample.versionNo,
      tokenHash,
      tokenPrefix: rawToken.slice(0, 8),
      customerPhone: sample.customerPhone || job.customerPhone || "",
      customerName: job.customerName || job.customerSnapshot?.name || "",
      expiresAt,
      status: "ACTIVE",
      approvalUrl,
      whatsappStatus: "PENDING",
    });

    // ── Dispatch via WhatsApp Notification Provider ──
    const phoneToNotify = sample.customerPhone || job.customerPhone;
    if (phoneToNotify && submitData.shareViaWhatsapp !== false) {
      try {
        const waRes = await WhatsAppService.sendDesignApprovalMessage({
          to: phoneToNotify,
          customerName: job.customerName || job.customerSnapshot?.name || "Customer",
          jobNo: job.jobNo || String(job._id),
          versionNo: sample.versionNo,
          approvalUrl,
          sampleComments: sample.comments,
        });

        tokenDoc.whatsappStatus = waRes.status || (waRes.success ? "SENT" : "FAILED");
        tokenDoc.whatsappMessageId = waRes.messageId || null;
        tokenDoc.whatsappSentAt = waRes.delivered || waRes.simulated ? new Date() : null;
        tokenDoc.whatsappError = waRes.error || null;
        await tokenDoc.save();
      } catch (waErr) {
        console.warn("[DesignSampleService] WhatsApp notification failed:", waErr.message);
        tokenDoc.whatsappStatus = "FAILED";
        tokenDoc.whatsappError = waErr.message;
        await tokenDoc.save();
      }
    } else {
      tokenDoc.whatsappStatus = "DISABLED";
      await tokenDoc.save();
    }

    await JobWorkflowService.transition(job._id, "SAMPLE_APPROVAL", {
      actorId: user._id,
      relatedSampleId: sample._id,
      user,
    });

    emitJobEvent("sample.submitted", {
      jobId: String(job._id),
      sampleId: String(sample._id),
      versionNo: sample.versionNo,
      customerPhone: sample.customerPhone,
      shareViaWhatsapp: Boolean(submitData.shareViaWhatsapp),
      approvalUrl,
      whatsappStatus: tokenDoc.whatsappStatus,
    });

    // Attach transient approval link and token details for response
    const resultObj = sample.toObject ? sample.toObject() : { ...sample };
    resultObj.approvalToken = {
      token: rawToken,
      tokenPrefix: tokenDoc.tokenPrefix,
      approvalUrl,
      expiresAt,
      whatsappStatus: tokenDoc.whatsappStatus,
      whatsappError: tokenDoc.whatsappError,
    };

    return resultObj;
  }


  /**
   * List all samples for a job with approval records.
   */
  static async listSamples(jobId) {
    const [samples, approvals] = await Promise.all([
      jobSampleRepository.findByJobOrderId(jobId),
      jobApprovalRepository.findByJobOrderId(jobId, "SAMPLE"),
    ]);

    const approvalByVersion = new Map(approvals.map((a) => [a.versionNo, a]));

    return samples.map((s) => {
      const sObj = s.toObject ? s.toObject() : { ...s };
      return {
        ...sObj,
        approval: approvalByVersion.get(s.versionNo) || null,
      };
    });
  }

  /**
   * Record decision on sample: APPROVED -> PRODUCTION_PLANNING, REVISION_REQUIRED -> REVISION.
   */
  static async decide(jobId, sampleId, decisionData = {}, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    const sample = await jobSampleRepository.findById(sampleId);
    if (!sample || String(sample.jobOrderId) !== String(jobId)) {
      throw ErrorHelper.notFound(`Job Sample not found with ID: ${sampleId}`);
    }

    if (sample.status !== "SUBMITTED" || job.currentStage !== "SAMPLE_APPROVAL") {
      throw ErrorHelper.conflict("Sample is not currently awaiting a decision in SAMPLE_APPROVAL stage.");
    }

    const approval = await jobApprovalRepository.findOne({
      jobOrderId: job._id,
      approvalType: "SAMPLE",
      versionNo: sample.versionNo,
      status: "PENDING",
    });

    const now = new Date();
    const decision = (decisionData.decision || "APPROVED").toUpperCase().trim();

    if (decision === "APPROVED") {
      sample.status = "APPROVED";
      sample.approvedAt = now;
      sample.approvedBy = user._id;
      sample.customerFeedback = decisionData.customerFeedback || "";
      await sample.save();

      if (approval) {
        approval.status = "APPROVED";
        approval.decisionAt = now;
        approval.decisionBy = user._id;
        approval.decidedBy = user._id;
        approval.comments = decisionData.customerFeedback || "";
        await approval.save();
      }

      // Close current designer assignment as COMPLETED
      await jobAssignmentRepository.updateMany(
        { jobOrderId: job._id, assignmentType: "DESIGNER", currentAssignment: true },
        { status: "COMPLETED", releasedAt: now, currentAssignment: false }
      );

      // Transition job stage -> PRODUCTION_PLANNING
      await JobWorkflowService.transition(job._id, "PRODUCTION_PLANNING", {
        actorId: user._id,
        relatedSampleId: sample._id,
        notes: decisionData.customerFeedback || "Sample approved",
        user,
      });

      await ProductionStateService.logAudit({
        action: "SAMPLE_APPROVAL",
        resource: "JobSample",
        resourceId: sample._id,
        user,
        branchId: job.branchId,
        details: { decision: "APPROVED", comments: decisionData.customerFeedback },
      });

      // Emits sample.approved so Production and Notification modules can react
      emitJobEvent("sample.approved", {
        jobId: String(job._id),
        sampleId: String(sample._id),
        fileId: String(sample.fileId || sample.fileUrl),
        customerComments: decisionData.customerFeedback || null,
      });
    } else {
      // REVISION_REQUIRED
      sample.status = "REVISION_REQUIRED";
      sample.customerFeedback = decisionData.customerFeedback || "";
      sample.revisionReason = decisionData.revisionReason || decisionData.reason || "Customer requested revisions";
      await sample.save();

      if (approval) {
        approval.status = "REJECTED";
        approval.decisionAt = now;
        approval.decisionBy = user._id;
        approval.decidedBy = user._id;
        approval.rejectionReason = sample.revisionReason;
        approval.comments = sample.customerFeedback;
        await approval.save();
      }

      await JobWorkflowService.transition(job._id, "REVISION", {
        actorId: user._id,
        relatedSampleId: sample._id,
        reason: sample.revisionReason,
        user,
      });

      emitJobEvent("sample.revisionRequired", {
        jobId: String(job._id),
        sampleId: String(sample._id),
        reason: sample.revisionReason,
      });
    }

    return sample;
  }
}

module.exports = DesignSampleService;
