const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const DesignApprovalToken = require("../../../infrastructure/database/mongoose/models/design/DesignApprovalToken");
const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobOrderRepository");
const jobSampleRepository = require("../../../infrastructure/database/mongoose/repositories/design/MongoJobSampleRepository");
const Notification = require("../../../infrastructure/database/mongoose/models/Notification");
const DesignSampleService = require("../design/designSample.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const { emitJobEvent } = require("../../../shared/events/job-order/jobEvents.emitter");

class PublicDesignApprovalService {
  /**
   * Compute SHA256 hash of a raw token
   */
  static hashToken(rawToken) {
    if (!rawToken || typeof rawToken !== "string") {
      throw ErrorHelper.badRequest("Approval token is required.");
    }
    return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
  }

  /**
   * Validate token and retrieve associated job and sample
   */
  static async validateToken(rawToken) {
    const tokenHash = this.hashToken(rawToken);

    const tokenDoc = await DesignApprovalToken.findOne({ tokenHash });
    if (!tokenDoc) {
      throw ErrorHelper.notFound("Invalid or unrecognized approval token.");
    }

    if (tokenDoc.status === "REVOKED") {
      throw ErrorHelper.forbidden("This approval link has been revoked. Please contact support.");
    }

    if (tokenDoc.status === "SUPERSEDED") {
      throw ErrorHelper.conflict("This design sample has been superseded by a newer version.");
    }

    const now = new Date();
    if (tokenDoc.status === "EXPIRED" || tokenDoc.expiresAt < now) {
      if (tokenDoc.status !== "EXPIRED") {
        tokenDoc.status = "EXPIRED";
        await tokenDoc.save();
      }
      const err = ErrorHelper.badRequest("This design approval link has expired. Please request a new sample link.");
      err.statusCode = 410; // Gone
      throw err;
    }

    const [job, sample] = await Promise.all([
      jobOrderRepository.findById(tokenDoc.jobOrderId),
      jobSampleRepository.findById(tokenDoc.sampleId),
    ]);

    if (!job) {
      throw ErrorHelper.notFound("The associated job order could not be found.");
    }

    if (!sample) {
      throw ErrorHelper.notFound("The associated design sample could not be found.");
    }

    return { tokenDoc, job, sample };
  }

  /**
   * Get safe preview information for the public approval screen
   */
  static async getPreview(rawToken) {
    const { tokenDoc, job, sample } = await this.validateToken(rawToken);

    // Mask customer name for privacy (e.g. "John D***")
    const rawName = job.customerName || "Valued Customer";
    const nameParts = rawName.split(" ");
    const maskedName =
      nameParts.length > 1
        ? `${nameParts[0]} ${nameParts[1][0]}***`
        : `${rawName.slice(0, 3)}***`;

    return {
      jobNo: job.jobNo,
      jobTitle: job.title,
      jobType: job.jobType,
      versionNo: sample.versionNo,
      revisionNo: sample.revisionNo,
      designerComments: sample.comments || "",
      artworkUrl: sample.fileUrl || `/api/v1/public/design-approvals/${rawToken}/artwork`,
      status: tokenDoc.status,
      decision: tokenDoc.decision,
      decidedAt: tokenDoc.decidedAt,
      expiresAt: tokenDoc.expiresAt,
      customerName: maskedName,
      isPendingDecision: tokenDoc.status === "ACTIVE" && job.currentStage === "SAMPLE_APPROVAL",
    };
  }

  /**
   * Get file path or buffer for artwork file
   */
  static async getArtworkFile(rawToken) {
    const { sample } = await this.validateToken(rawToken);

    if (sample.fileUrl && fs.existsSync(sample.fileUrl)) {
      return {
        filePath: sample.fileUrl,
        mimeType: "image/png",
      };
    }

    // Check uploads directory for relative path
    const uploadRoot = path.resolve(process.cwd(), "uploads");
    if (sample.fileUrl) {
      const candidate = path.join(uploadRoot, path.basename(sample.fileUrl));
      if (fs.existsSync(candidate)) {
        return {
          filePath: candidate,
          mimeType: "image/png",
        };
      }
    }

    throw ErrorHelper.notFound("Artwork file preview is not available on this server.");
  }

  /**
   * Process customer decision (APPROVED or REVISION_REQUIRED)
   */
  static async processDecision(rawToken, decisionDto, clientMeta = {}) {
    const decision = String(decisionDto.decision || "").trim().toUpperCase();
    if (!["APPROVED", "REVISION_REQUIRED"].includes(decision)) {
      throw ErrorHelper.badRequest("Decision must be either 'APPROVED' or 'REVISION_REQUIRED'.");
    }

    const feedback = String(decisionDto.feedback || "").trim();
    if (decision === "REVISION_REQUIRED" && !feedback) {
      throw ErrorHelper.badRequest("Please provide comments or feedback explaining what revisions are required.");
    }

    const tokenHash = this.hashToken(rawToken);
    const now = new Date();

    // 1. Atomic lock: Update only if ACTIVE and unexpired
    const updatedToken = await DesignApprovalToken.findOneAndUpdate(
      {
        tokenHash,
        status: "ACTIVE",
        expiresAt: { $gt: now },
      },
      {
        $set: {
          status: "USED",
          decision,
          decidedAt: now,
          customerFeedback: feedback,
          ipAddress: clientMeta.ip || null,
          userAgent: clientMeta.userAgent || null,
        },
      },
      { new: true }
    );

    if (!updatedToken) {
      // Investigate why atomic lock failed
      const existing = await DesignApprovalToken.findOne({ tokenHash });
      if (!existing) {
        throw ErrorHelper.notFound("Invalid or unrecognized approval token.");
      }
      if (existing.status === "USED") {
        throw ErrorHelper.conflict(`This design sample has already been decided (${existing.decision || "DECIDED"}).`);
      }
      if (existing.status === "SUPERSEDED") {
        throw ErrorHelper.conflict("This design sample has been superseded by a newer version.");
      }
      if (existing.status === "REVOKED") {
        throw ErrorHelper.forbidden("This approval link has been revoked.");
      }
      if (existing.expiresAt <= now) {
        const err = ErrorHelper.badRequest("This approval link has expired.");
        err.statusCode = 410;
        throw err;
      }
      throw ErrorHelper.conflict("Unable to process decision due to concurrent submission.");
    }

    // 2. Fetch associated job and sample
    const [job, sample] = await Promise.all([
      jobOrderRepository.findById(updatedToken.jobOrderId),
      jobSampleRepository.findById(updatedToken.sampleId),
    ]);

    if (!job || !sample) {
      throw ErrorHelper.notFound("Job Order or Sample associated with this token not found.");
    }

    // 3. Construct Customer Actor context for audit & state machine
    const customerActor = {
      _id: job.customerId || updatedToken._id,
      name: job.customerName || "Customer (WhatsApp Approval Link)",
      role: "customer",
      isCustomerApproval: true,
    };

    // 4. Delegate to existing single source of truth: DesignSampleService.decide
    await DesignSampleService.decide(
      job._id,
      sample._id,
      {
        decision,
        customerFeedback: feedback,
        reason: feedback,
      },
      customerActor
    );

    // 5. Create Staff In-App Notification
    const notifTitle =
      decision === "APPROVED"
        ? `Design Approved: Job #${job.jobNo}`
        : `Revision Requested: Job #${job.jobNo}`;
    const notifMessage =
      decision === "APPROVED"
        ? `Customer approved sample v${sample.versionNo}. Job moved to Production Planning.`
        : `Customer requested revisions on sample v${sample.versionNo}: "${feedback}"`;

    await Notification.create({
      branchId: job.branchId,
      userId: job.designerId || null,
      role: "designer",
      title: notifTitle,
      message: notifMessage,
      type: decision === "APPROVED" ? "SUCCESS" : "WARNING",
      entityType: "JOB_ORDER",
      entityId: job._id,
    });

    emitJobEvent("sample.customerDecision", {
      jobId: String(job._id),
      jobNo: job.jobNo,
      sampleId: String(sample._id),
      versionNo: sample.versionNo,
      decision,
      feedback,
      via: "WHATSAPP_LINK",
    });

    return {
      jobNo: job.jobNo,
      versionNo: sample.versionNo,
      decision,
      feedback,
      decidedAt: now,
      nextStage: decision === "APPROVED" ? "PRODUCTION_PLANNING" : "REVISION",
      message:
        decision === "APPROVED"
          ? "Thank you! Your design has been approved and moved to production planning."
          : "Thank you! Your feedback has been sent to the designer. An updated sample will be shared shortly.",
    };
  }
}

module.exports = PublicDesignApprovalService;
