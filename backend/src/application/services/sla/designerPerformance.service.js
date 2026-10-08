const jobAssignmentRepository = require("../../../infrastructure/database/mongoose/repositories/design/MongoJobAssignmentRepository");
const jobSampleRepository = require("../../../infrastructure/database/mongoose/repositories/design/MongoJobSampleRepository");
const designerRatingRepository = require("../../../infrastructure/database/mongoose/repositories/sla/DesignerRatingRepository");
const ReprintRequest = require("../../../infrastructure/database/mongoose/models/ReprintRequest");
const User = require("../../../infrastructure/database/mongoose/models/User");
const SlaService = require("./sla.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DesignerPerformanceService {
  /**
   * Calculate week period string (YYYY-Www)
   */
  static getWeekString(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  }

  /**
   * Calculate month period string (YYYY-MM)
   */
  static getMonthString(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  /**
   * Compute comprehensive performance summary across designers
   */
  async getPerformance(filters = {}, user = null) {
    const userQuery = { isActive: { $ne: false } };

    if (user && user.role === "designer") {
      userQuery._id = user._id || user.id;
    } else if (filters.designerId) {
      userQuery._id = filters.designerId;
    }

    if (filters.branchId) {
      userQuery.$or = [
        { branchId: filters.branchId },
        { branchId: String(filters.branchId) },
        { role: "admin" },
        { role: "designer" },
      ];
    }

    let designers = await User.find(userQuery).select("_id name email employeeCode role").lean();
    if (!designers.length && filters.designerId) {
      designers = await User.find({ _id: filters.designerId }).select("_id name email employeeCode role").lean();
    }

    const performanceList = [];

    for (const designer of designers) {
      const designerId = designer._id;

      // 1. Assignments query
      const assignmentQuery = { employeeId: designerId, assignmentType: "DESIGNER" };
      if (filters.from || filters.to) {
        assignmentQuery.assignedAt = {};
        if (filters.from) assignmentQuery.assignedAt.$gte = new Date(filters.from);
        if (filters.to) assignmentQuery.assignedAt.$lte = new Date(filters.to);
      }

      const allAssignments = await jobAssignmentRepository.find(assignmentQuery);

      const completedAssignments = allAssignments.filter((a) => a.status === "COMPLETED");
      const activeAssignments = allAssignments.filter((a) => a.status === "ACTIVE");
      const rejectedAssignments = allAssignments.filter(
        (a) => a.status === "REJECTED" || Boolean(a.rejectedAt)
      );

      const completedJobIds = completedAssignments.map((a) => a.jobOrderId?._id || a.jobOrderId);
      const allJobIds = Array.from(
        new Set(allAssignments.map((a) => String(a.jobOrderId?._id || a.jobOrderId)))
      );

      // 2. Samples and revisions
      const samples = await jobSampleRepository.find({
        jobOrderId: { $in: allJobIds },
      });

      // Sum of max revisionNo per job
      const jobMaxRevisions = new Map();
      for (const sample of samples) {
        const jId = String(sample.jobOrderId?._id || sample.jobOrderId);
        const rev = Number(sample.revisionNo || 0);
        if (!jobMaxRevisions.has(jId) || rev > jobMaxRevisions.get(jId)) {
          jobMaxRevisions.set(jId, rev);
        }
      }
      let totalRevisions = 0;
      for (const rev of jobMaxRevisions.values()) {
        totalRevisions += rev;
      }

      // 3. Ratings
      const ratings = await designerRatingRepository.find({ designerId });
      const ratingCount = ratings.length;
      const totalRating = ratings.reduce((sum, r) => sum + Number(r.rating || 0), 0);
      const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

      // 4. SLA Segments evaluation for completed/assigned jobs
      let totalCompletionMinutes = 0;
      let completedCompletionCount = 0;
      let closedSlaSegments = 0;
      let metSlaSegments = 0;
      let slaBreaches = 0;

      for (const a of completedAssignments) {
        if (a.assignedAt && a.releasedAt) {
          const rawMins = (new Date(a.releasedAt).getTime() - new Date(a.assignedAt).getTime()) / 60000;
          if (rawMins >= 0) {
            totalCompletionMinutes += rawMins;
            completedCompletionCount++;
          }
        }
      }

      for (const jId of allJobIds) {
        try {
          const evalResult = await SlaService.evaluate(jId);
          for (const seg of evalResult.segments) {
            if (seg.stage === "CUSTOMER_APPROVAL") continue; // Exclude customer approval as per spec

            if (seg.isClosed) {
              closedSlaSegments++;
              if (seg.state === "MET") metSlaSegments++;
              if (seg.state === "BREACHED") slaBreaches++;
            } else if (seg.state === "BREACHED") {
              slaBreaches++;
            }
          }
        } catch (e) {
          // Skip on eval error
        }
      }

      const avgCompletionMinutes =
        completedCompletionCount > 0 ? totalCompletionMinutes / completedCompletionCount : 0;
      const slaAchievementPct =
        closedSlaSegments > 0 ? (metSlaSegments / closedSlaSegments) * 100 : 100;

      // 5. Reprint related jobs
      const reprintCount = await ReprintRequest.countDocuments({
        jobOrderId: { $in: allJobIds },
      });

      performanceList.push({
        designerId: designer._id,
        employeeCode: designer.employeeCode || `EMP-${String(designer._id).slice(-4).toUpperCase()}`,
        name: designer.name || "Designer",
        completedJobs: completedAssignments.length,
        pendingJobs: activeAssignments.length,
        avgCompletionMinutes,
        slaAchievementPct,
        slaBreaches,
        avgRating,
        ratingCount,
        revisions: totalRevisions,
        reprintRelatedJobs: reprintCount,
        rejectedAssignments: rejectedAssignments.length,
      });
    }

    return performanceList;
  }

  /**
   * Compute time series trend for a designer
   */
  async getPerformanceTrend(employeeId, { from, to, interval = "week" }, user = null) {
    if (user && user.role === "designer") {
      const selfId = String(user._id || user.id);
      if (String(employeeId) !== selfId) {
        throw ErrorHelper.forbidden("Designers can only view their own performance trends");
      }
    }

    if (!["week", "month"].includes(interval)) {
      throw ErrorHelper.badRequest("interval must be either 'week' or 'month'");
    }

    const assignmentQuery = {
      employeeId,
      assignmentType: "DESIGNER",
      status: "COMPLETED",
    };

    if (from || to) {
      assignmentQuery.assignedAt = {};
      if (from) assignmentQuery.assignedAt.$gte = new Date(from);
      if (to) assignmentQuery.assignedAt.$lte = new Date(to);
    }

    const assignments = await jobAssignmentRepository.find(assignmentQuery);
    const ratings = await designerRatingRepository.find({ designerId: employeeId });

    const periodMap = new Map();

    const getPeriod = (date) =>
      interval === "week"
        ? DesignerPerformanceService.getWeekString(date)
        : DesignerPerformanceService.getMonthString(date);

    for (const a of assignments) {
      const period = getPeriod(a.releasedAt || a.assignedAt || new Date());
      if (!periodMap.has(period)) {
        periodMap.set(period, {
          period,
          completedJobs: 0,
          totalCompletionMinutes: 0,
          closedSlaSegments: 0,
          metSlaSegments: 0,
          revisions: 0,
          ratings: [],
        });
      }

      const pData = periodMap.get(period);
      pData.completedJobs++;

      if (a.assignedAt && a.releasedAt) {
        const mins = (new Date(a.releasedAt).getTime() - new Date(a.assignedAt).getTime()) / 60000;
        if (mins >= 0) pData.totalCompletionMinutes += mins;
      }

      // Check revisions for this job
      const jId = String(a.jobOrderId?._id || a.jobOrderId);
      const samples = await jobSampleRepository.find({ jobOrderId: jId });
      let maxRev = 0;
      for (const s of samples) {
        if (s.revisionNo > maxRev) maxRev = s.revisionNo;
      }
      pData.revisions += maxRev;

      // SLA evaluation
      try {
        const evalResult = await SlaService.evaluate(jId);
        for (const seg of evalResult.segments) {
          if (seg.stage === "CUSTOMER_APPROVAL") continue;
          if (seg.isClosed) {
            pData.closedSlaSegments++;
            if (seg.state === "MET") pData.metSlaSegments++;
          }
        }
      } catch (err) {}
    }

    // Attach ratings to periods
    for (const r of ratings) {
      const period = getPeriod(r.ratedAt || new Date());
      if (periodMap.has(period)) {
        periodMap.get(period).ratings.push(Number(r.rating));
      }
    }

    const trendResults = [];
    const sortedPeriods = Array.from(periodMap.keys()).sort();

    for (const p of sortedPeriods) {
      const d = periodMap.get(p);
      const avgCompletionMinutes = d.completedJobs > 0 ? d.totalCompletionMinutes / d.completedJobs : 0;
      const slaAchievementPct = d.closedSlaSegments > 0 ? (d.metSlaSegments / d.closedSlaSegments) * 100 : 100;
      const avgRating =
        d.ratings.length > 0
          ? d.ratings.reduce((sum, val) => sum + val, 0) / d.ratings.length
          : 0;

      trendResults.push({
        period: d.period,
        completedJobs: d.completedJobs,
        avgCompletionMinutes,
        slaAchievementPct,
        avgRating,
        revisions: d.revisions,
      });
    }

    return trendResults;
  }
}

module.exports = new DesignerPerformanceService();
