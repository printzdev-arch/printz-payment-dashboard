const mongoose = require("mongoose");
const Estimate = require("../../models/estimate/Estimate");
const JobOrder = require("../../models/job-order/JobOrder");
const { JobItem } = require("../../models/job-order/JobItem");
const JobAssignment = require("../../models/design/JobAssignment");
const User = require("../../models/auth/User");
const ErrorHelper = require("../../utils/ApiError");

class CustomerPortalService {
  /**
   * Get single estimate for customer
   */
  static async getEstimate(id) {
    let estimate = null;
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      estimate = await Estimate.findById(id).lean();
    }
    if (!estimate) {
      estimate = await Estimate.findOne({ estimateNo: String(id).toUpperCase() }).lean();
    }
    if (!estimate) {
      throw ErrorHelper.notFound(`Quotation not found with identifier: ${id}`);
    }

    return {
      ...estimate,
      id: estimate._id,
    };
  }

  /**
   * Accept an estimate
   */
  static async acceptEstimate(id, payload = {}, user = null) {
    let estimate = null;
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      estimate = await Estimate.findById(id);
    }
    if (!estimate) {
      estimate = await Estimate.findOne({ estimateNo: String(id).toUpperCase() });
    }
    if (!estimate) {
      throw ErrorHelper.notFound(`Estimate not found: ${id}`);
    }

    const now = new Date();
    estimate.status = "ACCEPTED";
    estimate.approvedAt = now;
    estimate.termsAndConditions = payload.comments || estimate.termsAndConditions;
    await estimate.save();

    // Link to Job Order
    let job = null;
    if (estimate.jobOrderId) {
      job = await JobOrder.findById(estimate.jobOrderId);
    }

    if (job) {
      job.status = "ESTIMATE_ACCEPTED";
      job.currentStage = "DESIGN_QUEUE";
      job.stage = "DESIGN_QUEUE";
      await job.save();

      // Check if JobAssignment is needed
      const items = await JobItem.find({ jobOrderId: job._id }).lean();
      const hasDesignRequired = items.some((it) => it.designRequired !== false);

      if (hasDesignRequired) {
        let existingAssign = await JobAssignment.findOne({
          jobOrderId: job._id,
          assignmentType: "DESIGNER",
          currentAssignment: true,
        });

        if (!existingAssign) {
          // Find an active designer
          let designer = await User.findOne({ role: "designer", isActive: true });
          if (!designer) {
            designer = await User.findOne({ isActive: true });
          }

          if (designer) {
            existingAssign = await JobAssignment.create({
              jobOrderId: job._id,
              employeeId: designer._id,
              assignmentType: "DESIGNER",
              assignmentMethod: "ROUND_ROBIN",
              assignedAt: now,
              status: "ACTIVE",
              currentAssignment: true,
            });
          }
        }
      }
    }

    const estObj = estimate.toObject ? estimate.toObject() : { ...estimate };
    return {
      ...estObj,
      id: estimate._id,
      status: "ACCEPTED",
    };
  }

  /**
   * Reject an estimate
   */
  static async rejectEstimate(id, payload = {}, user = null) {
    let estimate = null;
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      estimate = await Estimate.findById(id);
    }
    if (!estimate) {
      estimate = await Estimate.findOne({ estimateNo: String(id).toUpperCase() });
    }
    if (!estimate) {
      throw ErrorHelper.notFound(`Estimate not found: ${id}`);
    }

    const now = new Date();
    estimate.status = "REJECTED";
    estimate.rejectedAt = now;
    estimate.revisionNotes = payload.comments || payload.reason || "Estimate rejected by customer";
    await estimate.save();

    const estObj = estimate.toObject ? estimate.toObject() : { ...estimate };
    return {
      ...estObj,
      id: estimate._id,
      status: "REJECTED",
    };
  }

  /**
   * Get design approvals for customer portal
   */
  static async getDesignApprovals(query = {}) {
    // Query active design assignments
    const assignments = await JobAssignment.find({
      assignmentType: "DESIGNER",
      status: { $in: ["ACTIVE", "COMPLETED"] },
    })
      .populate("jobOrderId")
      .populate("employeeId", "name email phone")
      .sort({ createdAt: -1 })
      .lean();

    const approvals = assignments.map((a) => {
      const job = a.jobOrderId || {};
      return {
        id: a._id,
        _id: a._id,
        assignmentId: a._id,
        assignmentNo: `DES-${new Date().getFullYear()}-${String(a._id).slice(-5).toUpperCase()}`,
        jobId: job._id,
        jobNo: job.jobNo || "JOB-000",
        customerName: job.customerName || job.customerSnapshot?.name || "Customer",
        customerMobile: job.customerPhone || job.customerSnapshot?.mobile || "",
        title: job.title || "Print Design",
        itemName: job.title || "Print Design Item",
        status: a.status === "COMPLETED" ? "APPROVED" : "PENDING_APPROVAL",
        branchId: job.branchId,
        priority: job.priority || "NORMAL",
        designerName: a.employeeId?.name || "Senior Designer",
        createdAt: a.createdAt,
      };
    });

    // If empty, also check JobOrders in DESIGN_QUEUE / ESTIMATE_ACCEPTED
    if (approvals.length === 0) {
      const jobs = await JobOrder.find({
        status: { $in: ["ESTIMATE_ACCEPTED", "DESIGN_IN_PROGRESS", "DESIGN_QUEUE", "DRAFT"] },
      })
        .limit(10)
        .sort({ createdAt: -1 })
        .lean();

      jobs.forEach((job) => {
        approvals.push({
          id: job._id,
          _id: job._id,
          assignmentId: job._id,
          assignmentNo: `DES-${new Date().getFullYear()}-${String(job._id).slice(-5).toUpperCase()}`,
          jobId: job._id,
          jobNo: job.jobNo,
          customerName: job.customerName || job.customerSnapshot?.name || "Customer",
          customerMobile: job.customerPhone || job.customerSnapshot?.mobile || "",
          title: job.title,
          itemName: job.title,
          status: "PENDING_APPROVAL",
          branchId: job.branchId,
          priority: job.priority || "NORMAL",
          createdAt: job.createdAt,
        });
      });
    }

    return { approvals, count: approvals.length };
  }

  /**
   * Customer approves proof
   */
  static async approveDesign(id, payload = {}, user = null) {
    let assignment = null;
    if (mongoose.Types.ObjectId.isValid(String(id))) {
      assignment = await JobAssignment.findById(id);
    }

    let jobOrderId = assignment?.jobOrderId;
    if (!jobOrderId) {
      // Maybe id is jobOrderId or jobNo
      if (mongoose.Types.ObjectId.isValid(String(id))) {
        const job = await JobOrder.findById(id);
        if (job) jobOrderId = job._id;
      }
      if (!jobOrderId) {
        const job = await JobOrder.findOne({ jobNo: String(id) });
        if (job) jobOrderId = job._id;
      }
    }

    if (assignment) {
      assignment.status = "COMPLETED";
      await assignment.save();
    }

    if (jobOrderId) {
      const job = await JobOrder.findById(jobOrderId);
      if (job) {
        job.currentStage = "PRODUCTION_PLANNING";
        job.stage = "PRODUCTION_PLANNING";
        job.status = "PRODUCTION";
        await job.save();
      }
    }

    return {
      success: true,
      message: "Customer proof approved successfully; Job Order transitioned to PRODUCTION_PLANNING",
      id,
      jobOrderId,
    };
  }
}

module.exports = CustomerPortalService;
