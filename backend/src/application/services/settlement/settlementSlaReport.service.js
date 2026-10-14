const slaServiceInstance = require("../sla/sla.service");
const JobOrder = require("../../../infrastructure/database/mongoose/models/job-order/JobOrder");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class SettlementSlaReportService {
  static assertBranchAccess(branchId, authContext, user) {
    if (!branchId) return;
    const isSuper = Boolean(
      authContext?.isSuperAdmin ||
      user?.role === "admin" ||
      user?.role === "superadmin" ||
      user?.roleCode === "ADMIN" ||
      user?.roleCode === "SUPER_ADMIN"
    );
    if (isSuper) return;

    const branchStr = branchId ? branchId.toString() : "";
    const allowed = [
      ...(authContext?.userBranchIds || []),
      user?.branchId ? (user.branchId._id ? user.branchId._id.toString() : user.branchId.toString()) : null,
      ...(user?.branchIds || []).map((b) => (b && b._id ? b._id.toString() : (b ? b.toString() : "")))
    ].filter(Boolean).map((b) => b.toString());

    if (branchStr && allowed.length > 0 && !allowed.includes(branchStr)) {
      throw ErrorHelper.forbidden("Branch access denied: You are not authorized for this branch.");
    }
  }

  /**
   * Get SLA report across jobs.
   */
  static async getSlaReport(filters = {}, user = null, authContext = {}) {
    const query = {};

    if (filters.branchId) {
      this.assertBranchAccess(filters.branchId, authContext, user);
      query.branchId = filters.branchId;
    } else if (!authContext.isSuperAdmin && authContext.userBranchIds && authContext.userBranchIds.length > 0) {
      query.branchId = { $in: authContext.userBranchIds };
    }

    if (filters.jobOrderId) query._id = filters.jobOrderId;
    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) query.createdAt.$gte = new Date(filters.from);
      if (filters.to) query.createdAt.$lte = new Date(filters.to);
    }

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(filters.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      JobOrder.find(query)
        .populate("branchId", "name code")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      JobOrder.countDocuments(query),
    ]);

    const reportItems = [];
    for (const job of jobs) {
      try {
        const evalResult = await slaServiceInstance.evaluate(job._id, true);
        const segments = evalResult.segments || [];

        const designSeg = segments.find((s) => s.stage.includes("DESIGN"));
        const prodSeg = segments.find((s) => s.stage.includes("PRODUCTION") || s.stage.includes("PRINTING"));
        const delivSeg = segments.find((s) => s.stage.includes("DELIVERY"));

        reportItems.push({
          jobOrderId: job._id,
          jobNo: job.jobNo,
          branchId: job.branchId?._id || job.branchId,
          branchName: job.branchId?.name,
          designDuration: designSeg?.actualMinutes || null,
          productionDuration: prodSeg?.actualMinutes || null,
          deliveryDuration: delivSeg?.actualMinutes || null,
          totalTurnaroundDuration: evalResult.totalActualMinutes || null,
          slaTarget: evalResult.totalTargetMinutes || null,
          slaStatus: evalResult.overallStatus || "UNKNOWN",
          startedAt: job.createdAt,
          completedAt: job.completionDate || job.closedAt || null,
        });
      } catch (_) {
        reportItems.push({
          jobOrderId: job._id,
          jobNo: job.jobNo,
          branchId: job.branchId?._id || job.branchId,
          branchName: job.branchId?.name,
          designDuration: null,
          productionDuration: null,
          deliveryDuration: null,
          totalTurnaroundDuration: null,
          slaTarget: null,
          slaStatus: "UNKNOWN",
          startedAt: job.createdAt,
          completedAt: null,
        });
      }
    }

    return {
      items: reportItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Single Job SLA Breakdown
   */
  static async getJobSla(jobId, user = null, authContext = {}) {
    const job = await JobOrder.findById(jobId).lean();
    if (!job) throw ErrorHelper.notFound("Job Order not found with ID: " + jobId);
    this.assertBranchAccess(job.branchId, authContext, user);
    return slaServiceInstance.evaluate(job._id, false);
  }
}

module.exports = SettlementSlaReportService;
