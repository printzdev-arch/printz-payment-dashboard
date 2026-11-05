const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const jobOrderRepository = require("../../job-orders/models/JobOrder");
const jobApprovalRepository = require("../../job-orders/models/JobApproval");
const jobSampleRepository = require("../models/JobSample");
const jobAssignmentRepository = require("../models/JobAssignment");
const DesignApprovalToken = require("../models/DesignApprovalToken");
const WhatsAppService = require("../../../utils/integrations/WhatsAppService");
const JobWorkflowService = require("../../job-orders/services/jobWorkflow.service");
const ProductionStateService = require("../../production/services/productionState.service");
const { emitJobEvent } = require("../../job-orders/events/jobEvents.emitter");
const ErrorHelper = require("../../../utils/ApiError");
const DesignHelper = require("../helpers/DesignHelper");

function sanitizeProofFile(fileUrl, prefix = "proof") {
  if (!fileUrl || typeof fileUrl !== "string" || !fileUrl.startsWith("data:")) {
    return fileUrl || "";
  }
  try {
    const match = fileUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return fileUrl;
    const ext = match[1].split("/")[1] || "png";
    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploadDir = path.resolve(process.cwd(), "uploads", "proofs");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(match[2], "base64"));
    return `/uploads/proofs/${filename}`;
  } catch (err) {
    console.error("Error persisting base64 sample proof:", err);
    return fileUrl;
  }
}

class DesignSampleService {
  /**
   * Who may upload, edit and submit proofs for a job: its own designer, or a manager of the branch.
   */
  static assertCanWorkOnProof(job, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");
    if (DesignHelper.isManagerOrAdmin(user)) {
      DesignHelper.assertBranchAccess(job, user);
      return;
    }
    const assigned = job.designerId ? String(job.designerId._id || job.designerId) : "";
    const empId = user.employeeId ? String(user.employeeId) : null;
    if (assigned && (assigned === String(user._id) || (empId && assigned === empId))) return;
    throw ErrorHelper.forbidden("This job is not assigned to you.");
  }

  /**
   * Who may decide on a proof (approve it, or send it back for changes):
   *  - a manager or admin of the branch, who records the decision (always allowed);
   *  - the customer through their own approval link, unless the customer is a walk-in: a walk-in customer
   *    has no link and approves in person, so only the manager can approve their proof.
   * The designer who made the proof can never approve it.
   */
  static async assertCanDecide(job, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");
    if (user.isCustomerApproval) {
      if (await DesignHelper.isWalkInCustomer(job)) {
        throw ErrorHelper.forbidden("A walk-in customer approves the proof in person: only the branch manager can approve it.");
      }
      return;
    }
    if (!DesignHelper.isManagerOrAdmin(user)) {
      throw ErrorHelper.forbidden("Only a manager can approve or return a design proof.");
    }
    DesignHelper.assertBranchAccess(job, user);
  }

  /**
   * Upload sample artwork draft.
   */
  static async uploadSample(jobId, sampleData = {}, user) {
    if (!user) throw ErrorHelper.unauthorized("Authentication required.");

    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    this.assertCanWorkOnProof(job, user);

    if (!["DESIGN_IN_PROGRESS", "REVISION"].includes(job.currentStage)) {
      throw ErrorHelper.conflict(`Cannot upload a sample at stage '${job.currentStage}'. Expected DESIGN_IN_PROGRESS or REVISION.`);
    }

    const last = await jobSampleRepository.findOne({ jobOrderId: job._id }).sort({ versionNo: -1 });
    const draft = await jobSampleRepository.findOne({ jobOrderId: job._id, status: "DRAFT" });
    if (draft) {
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
      fileUrl: sanitizeProofFile(sampleData.fileUrl || ""),
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

    const sampleJob = await jobOrderRepository.findById(jobId);
    if (!sampleJob) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);
    this.assertCanWorkOnProof(sampleJob, user);

    const sample = await jobSampleRepository.findById(sampleId);
    if (!sample || String(sample.jobOrderId) !== String(jobId)) {
      throw ErrorHelper.notFound(`Job Sample not found with ID: ${sampleId}`);
    }

    if (sample.status !== "DRAFT") {
      throw ErrorHelper.conflict("Only DRAFT samples can be edited.");
    }

    if (sampleData.comments !== undefined) sample.comments = sampleData.comments;
    if (sampleData.fileUrl !== undefined) sample.fileUrl = sanitizeProofFile(sampleData.fileUrl);
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

    this.assertCanWorkOnProof(job, user);

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

    // A walk-in customer has no approval link: the branch manager approves the proof in person
    const walkIn = await DesignHelper.isWalkInCustomer(job);

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
    const expiryHours = parseInt(process.env.APPROVAL_TOKEN_EXPIRY_HOURS || "48", 10);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

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
      approvalUrl: `${baseUrl}/design-approvals`, // Store base URL path only; rawToken is never stored in DB
      whatsappStatus: "PENDING",
    });

    // ── Dispatch via WhatsApp Notification Provider ──
    const phoneToNotify = sample.customerPhone || job.customerPhone;
    if (!walkIn && phoneToNotify && submitData.shareViaWhatsapp !== false) {
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
      if (walkIn) tokenDoc.status = "REVOKED";
      await tokenDoc.save();
    }

    const patch = {
      designStatus: "PENDING_SAMPLE_APPROVAL",
      designProofUrl: sample.fileUrl || "",
      isRevisionStarted: false,
      revisionStartedAt: null,
    };

    try {
      await JobWorkflowService.transition(job._id, "SAMPLE_APPROVAL", {
        actorId: user._id,
        relatedSampleId: sample._id,
        user,
        patch,
      });
    } catch {
      await jobOrderRepository.findOneAndUpdate(
        { _id: job._id },
        {
          $set: {
            currentStage: "SAMPLE_APPROVAL",
            stage: "SAMPLE_APPROVAL",
            ...patch,
          },
        }
      );
    }

    await jobOrderRepository.findOneAndUpdate(
      { _id: job._id },
      { $set: patch }
    );

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
    resultObj.approvalToken = walkIn ? null : {
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
   * List all samples across all jobs for manager sample review & approval.
   */
  static async listAllSamples(limit = 50, user = null) {
    // Only jobs that need design, only the user's own branch (a designer: only their own jobs)
    const jobFilter = { jobType: /design/i };
    const branchId = DesignHelper.scopeBranchId(user);
    if (branchId) jobFilter.branchId = new mongoose.Types.ObjectId(branchId);
    if (DesignHelper.isDesigner(user)) jobFilter.designerId = user._id;
    const visibleJobIds = await jobOrderRepository.find(jobFilter).distinct("_id");

    const samples = await jobSampleRepository.find({ jobOrderId: { $in: visibleJobIds } })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 200))
      .populate("submittedBy", "name username email role")
      .populate("approvedBy", "name username email role")
      .populate({
        path: "jobOrderId",
        select: "jobNo jobType specs title customerId customerName customerSnapshot currentStage stage priority items designerId designerName designStatus remarks customerRequirements dueDate designProofUrl",
        populate: {
          path: "designerId",
          select: "name email username role",
        },
      });

    const proofJobs = await jobOrderRepository.find({
      ...jobFilter,
      $or: [
        { currentStage: { $in: ["SAMPLE_APPROVAL", "CUSTOMER_PROOF", "REVISION", "COMPLETED", "PRODUCTION_PLANNING"] } },
        { stage: { $in: ["SAMPLE_APPROVAL", "CUSTOMER_PROOF", "REVISION", "COMPLETED", "PRODUCTION_PLANNING"] } },
        { designProofUrl: { $exists: true, $nin: ["", null] } },
      ],
    })
      .populate("designerId", "name email username role")
      .sort({ updatedAt: -1 })
      .limit(200);

    const seenJobIds = new Set();
    const result = [];

    for (const s of samples) {
      if (!s.jobOrderId) continue;
      const jId = String(s.jobOrderId._id || s.jobOrderId);
      seenJobIds.add(jId);

      const job = s.jobOrderId;
      result.push({
        _id: String(s._id),
        sampleId: String(s._id),
        jobId: jId,
        jobNo: job.jobNo || `JO-${jId.slice(-6)}`,
        jobType: job.jobType || job.specs?.jobType || "",
        customerName: job.customerName || job.customerSnapshot?.name || "Direct Customer",
        jobItem: job.title || job.items?.[0]?.itemName || "Custom Print Order",
        designerName: job.designerId?.name || job.designerName || s.submittedBy?.name || "Assigned Designer",
        designerEmail: job.designerId?.email || s.submittedBy?.email || "",
        versionNo: s.versionNo || 1,
        revisionNo: s.revisionNo || 0,
        fileUrl: s.fileUrl || job.designProofUrl || null,
        comments: s.comments || "",
        status: s.status, // "DRAFT" | "SUBMITTED" | "APPROVED" | "REVISION_REQUIRED"
        customerFeedback: s.customerFeedback || job.customerFeedback || (s.status === "APPROVED" ? `Approved by Customer (${job.customerName || "Customer"})` : ""),
        revisionReason: s.revisionReason || "",
        submittedAt: s.submittedAt || s.createdAt,
        approvedAt: s.approvedAt || null,
        approvedBy: s.approvedBy?.name || null,
        currentStage: job.currentStage || "SAMPLE_APPROVAL",
        priority: job.priority || "NORMAL",
        jobOrder: job,
      });
    }

    for (const pj of proofJobs) {
      const jId = String(pj._id);
      if (seenJobIds.has(jId)) continue;
      seenJobIds.add(jId);

      const isCompleted = ["COMPLETED", "PRODUCTION_PLANNING"].includes(pj.currentStage);
      const isRevision = pj.currentStage === "REVISION";

      result.push({
        _id: `proof-${jId}`,
        sampleId: null,
        jobId: jId,
        jobNo: pj.jobNo || `JO-${jId.slice(-6)}`,
        jobType: pj.jobType || pj.specs?.jobType || "",
        customerName: pj.customerName || pj.customerSnapshot?.name || "Direct Customer",
        jobItem: pj.title || pj.items?.[0]?.itemName || "Custom Print Order",
        designerName: pj.designerId?.name || pj.designerName || "Assigned Designer",
        designerEmail: pj.designerId?.email || "",
        versionNo: 1,
        revisionNo: 0,
        fileUrl: pj.designProofUrl || null,
        comments: pj.remarks || "Sample design submitted for proof approval",
        status: isCompleted ? "APPROVED" : isRevision ? "REVISION_REQUIRED" : "SUBMITTED",
        customerFeedback: isCompleted ? `Approved by Customer (${pj.customerName})` : "",
        revisionReason: isRevision ? (pj.designRejectionReason || "Revision requested") : "",
        submittedAt: pj.updatedAt || pj.createdAt,
        approvedAt: isCompleted ? pj.updatedAt : null,
        approvedBy: isCompleted ? (pj.customerName || "Customer") : null,
        currentStage: pj.currentStage,
        priority: pj.priority || "NORMAL",
        jobOrder: pj,
      });
    }

    // Mark proofs of walk-in customers: those are approved in person by the manager
    const walkProbe = await DesignHelper.markWalkIn(result.map((r) => ({ customerId: r.jobOrder?.customerId })));
    result.forEach((r, i) => {
      r.isWalkInCustomer = walkProbe[i].isWalkInCustomer;
    });

    return result.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  /**
   * Reject sample design and send back for revision.
   */
  static async rejectSampleDesign(jobId, data = {}, user = null) {
    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    await this.assertCanDecide(job, user);
    if (job.currentStage !== "SAMPLE_APPROVAL") {
      throw ErrorHelper.conflict("A proof can be returned for changes only while it is waiting for approval.");
    }

    const now = new Date();
    const reason = data.reason || data.revisionReason || "Sample design returned for revision";

    let samples = await jobSampleRepository.findByJobOrderId(job._id);
    let latestSample = samples && samples.length > 0 ? samples[samples.length - 1] : null;

    if (latestSample) {
      latestSample.status = "REVISION_REQUIRED";
      latestSample.revisionReason = reason;
      latestSample.customerFeedback = data.notes || data.feedback || "";
      await latestSample.save();
    }

    await jobApprovalRepository.updateMany(
      { jobOrderId: job._id, status: "PENDING" },
      {
        $set: {
          status: "REJECTED",
          decisionAt: now,
          decisionBy: user?._id || null,
          decidedBy: user?._id || null,
          rejectionReason: reason,
          comments: data.notes || "",
        },
      }
    );

    const patch = {
      currentStage: "REVISION",
      stage: "REVISION",
      designStatus: "REJECTED_SAMPLE",
      designRejectionReason: reason,
      rejectedSampleUrl: latestSample?.fileUrl || job.designProofUrl || "",
      sampleRejectedAt: now,
      isRevisionStarted: false,
      revisionStartedAt: null,
    };

    await JobWorkflowService.transition(job._id, "REVISION", {
      actorId: user?._id,
      relatedSampleId: latestSample?._id,
      reason,
      user,
      patch,
    });

    await jobOrderRepository.findOneAndUpdate(
      { _id: job._id },
      { $set: patch }
    );

    return { jobId: String(job._id), status: "REVISION", designStatus: "REJECTED_SAMPLE", reason };
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

    await this.assertCanDecide(job, user);

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

      // Transition job stage -> READY (Design Only: ready for invoice & balance collection) or PRODUCTION_PLANNING (Print & Design)
      const jobTypeStr = String(job.jobType || job.specs?.jobType || "").toUpperCase();
      const isDesignOnly =
        jobTypeStr.includes("DESIGN") &&
        !jobTypeStr.includes("PRINT");

      if (isDesignOnly) {
        // Flow 2 (Design Only): Once design sample gets approved, transition to READY for balance invoicing
        try {
          await JobWorkflowService.transition(job._id, "READY", {
            actorId: user._id,
            relatedSampleId: sample._id,
            notes: decisionData.customerFeedback || "Sample approved - Design approved. Ready for invoice & remaining balance collection.",
            user,
            patch: {
              currentStage: "READY",
              stage: "READY",
              designStatus: "COMPLETED",
              status: "READY",
              approvedSampleId: sample._id,
              approvedVersionNo: sample.versionNo,
            },
          });
        } catch (transErr) {
          await jobOrderRepository.findOneAndUpdate(
            { _id: job._id },
            {
              $set: {
                currentStage: "READY",
                stage: "READY",
                designStatus: "COMPLETED",
                status: "READY",
                approvedSampleId: sample._id,
                approvedVersionNo: sample.versionNo,
              },
            }
          );
        }

        try {
          const mongoose = require("mongoose");
          const ProductionOrder = mongoose.models.ProductionOrder || mongoose.model("ProductionOrder");
          if (ProductionOrder) {
            await ProductionOrder.deleteMany({ jobOrderId: job._id });
          }
        } catch (e) {}

        // Auto-create or refresh draft invoice so it immediately appears in the Pending Invoicing Queue to collect remaining balance
        try {
          const InvoiceService = require("../../invoices/services/invoice.service");
          await InvoiceService.createDraft({ jobOrderId: job._id, regenerate: true }, user);
          // Paid in full with the invoice: nothing left to collect, so the order is complete
          await InvoiceService.completeDesignOnlyIfSettled(job._id, user);
        } catch (invErr) {
          console.warn("[DesignSample] Auto invoice update notice:", invErr.message);
        }
      } else {
        // Flow 3 (Print & Design): Standard pipeline -> proceed to PRODUCTION_PLANNING
        await JobWorkflowService.transition(job._id, "PRODUCTION_PLANNING", {
          actorId: user._id,
          relatedSampleId: sample._id,
          notes: decisionData.customerFeedback || "Sample approved",
          user,
          patch: {
            designStatus: "COMPLETED",
            approvedSampleId: sample._id,
            approvedVersionNo: sample.versionNo,
          },
        });

        // Auto-create Production Order so it immediately appears in Production floor & orders list
        try {
          const ProductionPlanningService = require("../../production/services/productionPlanning.service");
          await ProductionPlanningService.createUnassignedOrder(job._id, user);
        } catch (planErr) {
          // Non-blocking if already planned
        }
      }

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

      const revisionPatch = {
        currentStage: "REVISION",
        stage: "REVISION",
        designStatus: "REJECTED_SAMPLE",
        designRejectionReason: sample.customerFeedback || sample.revisionReason,
        rejectedSampleUrl: sample.fileUrl || job.designProofUrl || "",
        sampleRejectedAt: now,
        isRevisionStarted: false,
        revisionStartedAt: null,
      };

      try {
        await JobWorkflowService.transition(job._id, "REVISION", {
          actorId: user._id,
          relatedSampleId: sample._id,
          reason: sample.revisionReason,
          user,
          patch: revisionPatch,
        });
      } catch {
        await jobOrderRepository.findOneAndUpdate(
          { _id: job._id },
          { $set: revisionPatch }
        );
      }

      await jobOrderRepository.findOneAndUpdate(
        { _id: job._id },
        { $set: revisionPatch }
      );

      emitJobEvent("sample.revisionRequired", {
        jobId: String(job._id),
        sampleId: String(sample._id),
        reason: sample.revisionReason,
      });
    }

    return sample;
  }

  /**
   * Directly approve artwork proof and send Job Order to Production Planning.
   */
  static async approveDesign(jobId, data = {}, user = null) {
    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);

    // Only a manager (or the customer's own link) approves; the designer who made the proof cannot
    await this.assertCanDecide(job, user);
    if (job.currentStage !== "SAMPLE_APPROVAL") {
      throw ErrorHelper.conflict(
        `The design can be approved only while the proof is waiting for approval (this job is at '${job.currentStage}').`
      );
    }

    const now = new Date();
    const customerName = data.customerName || job.customerName || job.customerSnapshot?.name || "Customer";
    const effectiveFeedback = data.customerFeedback
      || (data.isCustomerApproval || data.customerApproved || data.customerName
          ? `Approved by Customer (${customerName})`
          : (user?.name ? `Approved by Manager (${user.name})` : "Approved by Manager"));

    // 1. If any sample exists, approve it
    let samples = await jobSampleRepository.findByJobOrderId(job._id);
    let latestSample = samples && samples.length > 0 ? samples[samples.length - 1] : null;
    if (latestSample) {
      latestSample.status = "APPROVED";
      latestSample.approvedAt = now;
      if (user?._id) latestSample.approvedBy = user._id;
      latestSample.customerFeedback = effectiveFeedback;
      await latestSample.save();
    } else {
      throw ErrorHelper.conflict("No design proof has been submitted for this job order yet.");
    }

    // 2. Mark any pending approvals as APPROVED
    await jobApprovalRepository.updateMany(
      { jobOrderId: job._id, status: "PENDING" },
      {
        $set: {
          status: "APPROVED",
          decisionAt: now,
          decisionBy: user?._id || null,
          decidedBy: user?._id || null,
          comments: effectiveFeedback,
        },
      }
    );

    // 3. Close current active designer assignment as COMPLETED
    await jobAssignmentRepository.updateMany(
      { jobOrderId: job._id, assignmentType: "DESIGNER", currentAssignment: true },
      { status: "COMPLETED", releasedAt: now, currentAssignment: false }
    );

    const jobTypeStr = String(job.jobType || job.specs?.jobType || "").toUpperCase();
    const isDesignOnly = jobTypeStr.includes("DESIGN") && !jobTypeStr.includes("PRINT");

    let createdOrders = [];

    if (isDesignOnly) {
      // Flow 2 (Design Only): Once design sample is approved, transition to READY for balance invoicing
      try {
        await JobWorkflowService.transition(job._id, "READY", {
          actorId: user?._id,
          relatedSampleId: latestSample?._id,
          notes: data.notes || effectiveFeedback || "Sample approved - Design approved. Ready for invoice & remaining balance collection.",
          patch: {
            currentStage: "READY",
            stage: "READY",
            status: "READY",
            designStatus: "COMPLETED",
            customerFeedback: effectiveFeedback,
            customerApprovalName: customerName,
            approvedSampleId: latestSample?._id,
            approvedVersionNo: latestSample?.versionNo || 1,
          },
          user,
        });
      } catch (transErr) {
        await jobOrderRepository.findOneAndUpdate(
          { _id: job._id },
          {
            $set: {
              currentStage: "READY",
              stage: "READY",
              status: "READY",
              designStatus: "COMPLETED",
              customerFeedback: effectiveFeedback,
              customerApprovalName: customerName,
              approvedSampleId: latestSample?._id,
              approvedVersionNo: latestSample?.versionNo || 1,
            },
          }
        );
      }

      // Explicitly guarantee designStatus and READY stage on JobOrder
      await jobOrderRepository.findOneAndUpdate(
        { _id: job._id },
        {
          $set: {
            currentStage: "READY",
            stage: "READY",
            status: "READY",
            designStatus: "COMPLETED",
          },
        }
      );

      // Auto-create or refresh draft invoice so it immediately appears in the Pending Invoicing Queue to collect remaining balance
      try {
        const InvoiceService = require("../../invoices/services/invoice.service");
        await InvoiceService.createDraft({ jobOrderId: job._id, regenerate: true }, user);
        // Paid in full with the invoice: nothing left to collect, so the order is complete
        await InvoiceService.completeDesignOnlyIfSettled(job._id, user);
      } catch (invErr) {
        console.warn("[DesignSample] Auto invoice update notice:", invErr.message);
      }

      // Clean up any accidentally created production orders for Design Only jobs
      try {
        const mongoose = require("mongoose");
        const ProductionOrder = mongoose.models.ProductionOrder || mongoose.model("ProductionOrder");
        if (ProductionOrder) {
          await ProductionOrder.deleteMany({ jobOrderId: job._id });
        }
      } catch (poCleanupErr) {
        // ignore
      }
    } else {
      // Flow 3 (Print & Design): Transition Job Order to PRODUCTION_PLANNING if not already there and mark designStatus COMPLETED
      try {
        await JobWorkflowService.transition(job._id, "PRODUCTION_PLANNING", {
          actorId: user?._id,
          relatedSampleId: latestSample?._id,
          notes: data.notes || effectiveFeedback,
          patch: {
            designStatus: "COMPLETED",
            completionDate: now,
            customerFeedback: effectiveFeedback,
            customerApprovalName: customerName,
          },
          user,
        });
      } catch (transErr) {
        await jobOrderRepository.findOneAndUpdate(
          { _id: job._id },
          {
            $set: {
              currentStage: "PRODUCTION_PLANNING",
              stage: "PRODUCTION_PLANNING",
              status: "PRODUCTION",
              designStatus: "COMPLETED",
              completionDate: now,
              customerFeedback: effectiveFeedback,
              customerApprovalName: customerName,
            },
          }
        );
      }

      // Explicitly guarantee designStatus is COMPLETED on JobOrder
      await jobOrderRepository.findOneAndUpdate(
        { _id: job._id },
        { $set: { designStatus: "COMPLETED" } }
      );

      // Ensure Production Order exists on the production floor
      try {
        const ProductionPlanningService = require("../../production/services/productionPlanning.service");
        createdOrders = await ProductionPlanningService.createUnassignedOrder(job._id, user);
        if (data.planNow && createdOrders && createdOrders.length > 0) {
          createdOrders = await ProductionPlanningService.planProduction(job._id, {}, user);
        }
      } catch (poErr) {
        console.warn("Could not auto-create production order:", poErr);
      }
    }

    await ProductionStateService.logAudit({
      action: "SAMPLE_APPROVAL",
      resource: "JobSample",
      resourceId: latestSample?._id || job._id,
      user,
      branchId: job.branchId,
      details: { decision: "APPROVED", comments: data.customerFeedback || "Artwork approved by customer" },
    });

    emitJobEvent("sample.approved", {
      jobId: String(job._id),
      sampleId: latestSample ? String(latestSample._id) : null,
      fileId: String(latestSample?.fileId || latestSample?.fileUrl || ""),
      customerComments: data.customerFeedback || null,
    });

    emitJobEvent("job.stage.changed", {
      jobId: String(job._id),
      fromStage: job.currentStage,
      toStage: isDesignOnly ? "READY" : "PRODUCTION_PLANNING",
      status: isDesignOnly ? "READY" : "PRODUCTION",
      branchId: String(job.branchId),
    });

    const freshJob = await jobOrderRepository.findById(job._id);
    const balanceDue = Number(freshJob?.balanceDue != null ? freshJob.balanceDue : (job.balanceDue || 0));

    return {
      success: true,
      message: isDesignOnly
        ? `Customer approved artwork! Balance in Invoice: ₹${balanceDue.toFixed(2)} — please collect remaining balance in Invoice.`
        : "Customer approved artwork! Proceeding to Production.",
      jobId: String(job._id),
      jobNo: job.jobNo,
      isDesignOnly,
      balanceDue,
      stage: isDesignOnly ? "READY" : "PRODUCTION_PLANNING",
      status: isDesignOnly ? "READY" : "PRODUCTION",
      productionOrders: createdOrders,
    };
  }

  /**
   * Directly submit sample artwork proof for review, generating WhatsApp token and moving to SAMPLE_APPROVAL.
   */
  static async submitProofDirect(jobId, data = {}, user = null) {
    const job = await jobOrderRepository.findById(jobId);
    if (!job) throw ErrorHelper.notFound(`Job Order not found with ID: ${jobId}`);
    this.assertCanWorkOnProof(job, user);

    if (!["DESIGN_IN_PROGRESS", "REVISION"].includes(job.currentStage)) {
      throw ErrorHelper.conflict(
        `A proof can be submitted only while the design is in progress (this job is at '${job.currentStage}').`
      );
    }

    const fileUrl = sanitizeProofFile(data.fileUrl || job.designProofUrl || "");
    if (!fileUrl) {
      throw ErrorHelper.badRequest("Attach the proof file before submitting it for approval.");
    }
    const comments = data.notes || data.comments || "Artwork proof submitted for review";

    let draft = await jobSampleRepository.findOne({ jobOrderId: job._id, status: "DRAFT" });
    const last = await jobSampleRepository.findOne({ jobOrderId: job._id }).sort({ versionNo: -1 });
    const versionNo = draft ? draft.versionNo : (last ? last.versionNo + 1 : 1);

    let sample;
    if (draft) {
      draft.fileUrl = fileUrl;
      draft.comments = comments;
      draft.status = "SUBMITTED";
      draft.submittedAt = new Date();
      draft.submittedBy = user._id;
      draft.customerPhone = data.customerPhone || job.customerPhone || "";
      sample = await draft.save();
    } else {
      sample = await jobSampleRepository.create({
        jobOrderId: job._id,
        versionNo,
        revisionNo: 0,
        fileUrl,
        comments,
        status: "SUBMITTED",
        submittedAt: new Date(),
        submittedBy: user._id,
        customerPhone: data.customerPhone || job.customerPhone || "",
      });
    }

    await jobApprovalRepository.create({
      approvalNo: `APP-SMP-${job.jobNo || job._id}-V${versionNo}`,
      jobOrderId: job._id,
      approvalType: "SAMPLE",
      versionNo,
      status: "PENDING",
      requestedFrom: job.customerId,
      requestedBy: user._id,
    });

    // A walk-in customer has no approval link: the branch manager approves the proof in person
    const walkIn = await DesignHelper.isWalkInCustomer(job);
    let rawToken = null;
    let approvalUrl = null;
    let whatsappStatus = "DISABLED";

    if (!walkIn) {
      rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      await DesignApprovalToken.updateMany(
        { jobOrderId: job._id, status: "ACTIVE" },
        { $set: { status: "SUPERSEDED" } }
      );
      const baseUrl = WhatsAppService.approvalBaseUrl ? WhatsAppService.approvalBaseUrl.replace(/\/+$/, "") : "http://localhost:3000";
      approvalUrl = `${baseUrl}/design-approvals/${rawToken}`;
      const expiryHours = parseInt(process.env.APPROVAL_TOKEN_EXPIRY_HOURS || "48", 10);
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

      const tokenDoc = await DesignApprovalToken.create({
        jobOrderId: job._id,
        sampleId: sample._id,
        versionNo,
        tokenHash,
        tokenPrefix: rawToken.slice(0, 8),
        customerPhone: sample.customerPhone || job.customerPhone || "",
        customerName: job.customerName || job.customerSnapshot?.name || "",
        expiresAt,
        status: "ACTIVE",
        approvalUrl: `${baseUrl}/design-approvals`,
        whatsappStatus: "PENDING",
      });

      const phoneToNotify = sample.customerPhone || job.customerPhone;
      if (phoneToNotify) {
        try {
          const waRes = await WhatsAppService.sendDesignApprovalMessage({
            to: phoneToNotify,
            customerName: job.customerName || job.customerSnapshot?.name || "Customer",
            jobNo: job.jobNo || String(job._id),
            versionNo,
            approvalUrl,
            sampleComments: comments,
          });
          tokenDoc.whatsappStatus = waRes.status || (waRes.success ? "SENT" : "FAILED");
          tokenDoc.whatsappSentAt = waRes.delivered || waRes.simulated ? new Date() : null;
          tokenDoc.whatsappError = waRes.error || null;
        } catch (waErr) {
          console.warn("[DesignSampleService] WhatsApp send warning:", waErr.message);
          tokenDoc.whatsappStatus = "FAILED";
          tokenDoc.whatsappError = waErr.message;
        }
      } else {
        tokenDoc.whatsappStatus = "DISABLED";
      }
      await tokenDoc.save();
      whatsappStatus = tokenDoc.whatsappStatus;
    }

    await JobWorkflowService.transition(job._id, "SAMPLE_APPROVAL", {
      actorId: user._id,
      relatedSampleId: sample._id,
      user,
      patch: {
        designStatus: "PENDING_SAMPLE_APPROVAL",
        designProofUrl: fileUrl,
        isRevisionStarted: false,
        revisionStartedAt: null,
      },
    });

    emitJobEvent("sample.submitted", {
      jobId: String(job._id),
      sampleId: String(sample._id),
      versionNo,
      approvalUrl,
      whatsappStatus,
    });

    return {
      success: true,
      jobId: String(job._id),
      sampleId: String(sample._id),
      versionNo,
      approvalUrl,
      token: rawToken,
      walkIn,
      sample,
    };
  }
}

module.exports = DesignSampleService;
