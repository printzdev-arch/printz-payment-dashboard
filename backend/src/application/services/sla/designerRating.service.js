const designerRatingRepository = require("../../../infrastructure/database/mongoose/repositories/sla/DesignerRatingRepository");
const jobOrderRepository = require("../../../infrastructure/database/mongoose/repositories/job-order/MongoJobOrderRepository");
const jobAssignmentRepository = require("../../../infrastructure/database/mongoose/repositories/design/MongoJobAssignmentRepository");
const MongoProductionStateRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoProductionStateRepository");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DesignerRatingService {
  /**
   * Create a new designer rating for a job order
   */
  async create(jobOrderId, { rating, comments = "", ratingSource = "CUSTOMER" }, user) {
    if (!jobOrderId) {
      throw ErrorHelper.badRequest("jobOrderId is required");
    }

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5 || !Number.isInteger(numRating)) {
      throw ErrorHelper.badRequest("Rating must be an integer between 1 and 5");
    }

    const validSources = ["CUSTOMER", "MANAGER", "ADMIN"];
    if (!validSources.includes(ratingSource)) {
      throw ErrorHelper.badRequest(`ratingSource must be one of: ${validSources.join(", ")}`);
    }

    const job = await jobOrderRepository.findById(jobOrderId);
    if (!job) {
      throw ErrorHelper.notFound("Job Order not found");
    }

    // Job must be READY or DELIVERED
    const validStatuses = ["READY", "DELIVERED"];
    if (!validStatuses.includes(job.status)) {
      throw ErrorHelper.badRequest(
        `Designer ratings can only be submitted for completed jobs in READY or DELIVERED status (current: ${job.status})`
      );
    }

    // Resolve designerId from accepted assignment (do not trust user body)
    const assignments = await jobAssignmentRepository.find({
      jobOrderId,
      assignmentType: "DESIGNER",
    });

    const acceptedAssignment = assignments.find(
      (a) => a.acceptedAt || a.status === "COMPLETED" || (a.status === "ACTIVE" && a.currentAssignment)
    );

    const designerId =
      job.designerId?._id ||
      job.designerId ||
      acceptedAssignment?.employeeId?._id ||
      acceptedAssignment?.employeeId;

    if (!designerId) {
      throw ErrorHelper.badRequest("No accepted designer found for this job order");
    }

    // Prevent duplicate rating for the same job, designer, and source
    const existing = await designerRatingRepository.findOne({
      jobOrderId,
      designerId,
      ratingSource,
    });

    if (existing) {
      const err = new Error(
        `DUPLICATE: A rating from source '${ratingSource}' already exists for this job order and designer`
      );
      err.status = 409;
      err.statusCode = 409;
      throw err;
    }

    const ratingDoc = await designerRatingRepository.create({
      jobOrderId,
      designerId,
      rating: numRating,
      ratingSource,
      comments: comments ? comments.trim() : "",
      ratedBy: user?._id || user?.id || designerId,
      ratedAt: new Date(),
    });

    // Audit log
    await MongoProductionStateRepository.createAuditLog({
      action: "RATING_CREATE",
      resource: "DESIGNER_RATING",
      resourceId: ratingDoc._id,
      userId: user?._id || user?.id || null,
      userName: user?.name || "Customer",
      userRole: user?.role || "",
      branchId: job.branchId || null,
      details: {
        jobOrderId,
        designerId,
        rating: numRating,
        ratingSource,
        timestamp: new Date(),
      },
    });

    return ratingDoc;
  }

  /**
   * List ratings with filters
   */
  async list(filters = {}, user = null) {
    const query = {};

    // If designer is requesting and not admin/manager, enforce SELF
    if (user && user.role === "designer") {
      query.designerId = user._id || user.id;
    } else if (filters.designerId) {
      query.designerId = filters.designerId;
    }

    if (filters.from || filters.to) {
      query.ratedAt = {};
      if (filters.from) query.ratedAt.$gte = new Date(filters.from);
      if (filters.to) query.ratedAt.$lte = new Date(filters.to);
    }

    return designerRatingRepository.find(query);
  }
}

module.exports = new DesignerRatingService();
