const DesignerRating = require("../../models/sla/DesignerRating");
const JobOrder = require("../../models/job-order/JobOrder");
const User = require("../../models/auth/User");
const JobAssignment = require("../../models/design/JobAssignment");
const auditLogService = require("../common/auditLog.service");
const ErrorHelper = require("../../utils/ApiError");

class CustomerFeedbackService {
  /**
   * Submit customer feedback & rating for a completed job order.
   */
  static async submitFeedback(jobId, { rating, comments = "", feedback = "" } = {}, user = null) {
    if (!jobId) throw ErrorHelper.badRequest("jobId is required.");

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5 || !Number.isInteger(numRating)) {
      throw ErrorHelper.badRequest("Rating must be an integer between 1 and 5.");
    }

    const job = await JobOrder.findById(jobId);
    if (!job) throw ErrorHelper.notFound("Job Order not found with ID: " + jobId);

    // Allow customer feedback for jobs across delivery & settlement pipeline
    const feedbackText = (comments || feedback || "").trim();

    // Resolve designer ID from assignments or job.designerId
    let designerId = job.designerId;
    if (!designerId) {
      const assignment = await JobAssignment.findOne({
        jobOrderId: job._id,
        assignmentType: "DESIGNER",
        status: { $in: ["ACTIVE", "COMPLETED"] },
      }).lean();
      designerId = assignment?.employeeId || null;
    }

    if (!designerId) {
      // Fallback: Check any assignment
      const anyAssign = await JobAssignment.findOne({ jobOrderId: job._id }).lean();
      designerId = anyAssign?.employeeId || null;
    }

    // If still no designer assigned, assign to job createdBy or a system designer
    if (!designerId) {
      const defaultDesigner = await User.findOne({ role: "designer" }).lean();
      designerId = defaultDesigner?._id || job.createdBy || user?._id;
    }

    // Update existing feedback or create new
    const existing = await DesignerRating.findOne({
      jobOrderId: job._id,
      ratingSource: "CUSTOMER",
    });
    if (existing) {
      existing.rating = numRating;
      existing.comments = feedbackText;
      existing.ratedAt = new Date();
      await existing.save();
      return existing;
    }

    const ratingDoc = await DesignerRating.create({
      jobOrderId: job._id,
      designerId,
      rating: numRating,
      ratingSource: "CUSTOMER",
      comments: feedbackText,
      ratedBy: user?._id || job.customerId || designerId,
      ratedAt: new Date(),
    });

    await auditLogService.log({
      action: "FEEDBACK_SUBMIT",
      resource: "DesignerRating",
      resourceId: ratingDoc._id,
      userId: user?._id || null,
      userName: user?.name || "Customer",
      branchId: job.branchId,
      details: {
        jobNo: job.jobNo,
        rating: numRating,
        designerId,
        comments: (comments || "").trim(),
      },
    });

    return ratingDoc;
  }

  /**
   * Get feedback for a job.
   */
  static async getJobFeedback(jobId) {
    return DesignerRating.find({ jobOrderId: jobId })
      .populate("designerId", "name email employeeCode")
      .populate("ratedBy", "name email")
      .sort({ ratedAt: -1 })
      .lean();
  }

  /**
   * Aggregate designer ratings.
   */
  static async getDesignerRatingsSummary(filters = {}) {
    const query = {};
    if (filters.designerEmployeeId || filters.designerId) {
      query.designerId = filters.designerEmployeeId || filters.designerId;
    }
    if (filters.from || filters.to) {
      query.ratedAt = {};
      if (filters.from) query.ratedAt.$gte = new Date(filters.from);
      if (filters.to) query.ratedAt.$lte = new Date(filters.to);
    }

    const ratings = await DesignerRating.find(query)
      .populate("designerId", "name email employeeCode")
      .lean();

    const grouped = {};
    for (const r of ratings) {
      const dId = String(r.designerId?._id || r.designerId || "unknown");
      if (!grouped[dId]) {
        grouped[dId] = {
          designerId: dId,
          designerName: r.designerId?.name || "Unknown Designer",
          employeeCode: r.designerId?.employeeCode || null,
          totalRatings: 0,
          sumRating: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
      }
      grouped[dId].totalRatings += 1;
      grouped[dId].sumRating += r.rating;
      if (grouped[dId].distribution[r.rating] !== undefined) {
        grouped[dId].distribution[r.rating] += 1;
      }
    }

    const result = Object.values(grouped).map((g) => ({
      designerId: g.designerId,
      designerName: g.designerName,
      employeeCode: g.employeeCode,
      totalRatings: g.totalRatings,
      averageRating: g.totalRatings > 0 ? Math.round((g.sumRating / g.totalRatings) * 10) / 10 : 0,
      distribution: g.distribution,
    }));

    return result;
  }
}

module.exports = CustomerFeedbackService;
