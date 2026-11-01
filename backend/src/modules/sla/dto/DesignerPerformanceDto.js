class DesignerPerformanceDto {
  static toResponse(item) {
    if (!item) return null;
    return {
      designerId: item.designerId ? item.designerId.toString() : null,
      employeeCode: item.employeeCode || "",
      name: item.name || "",
      completedJobs: Number(item.completedJobs || 0),
      pendingJobs: Number(item.pendingJobs || 0),
      avgCompletionMinutes: Math.round(Number(item.avgCompletionMinutes || 0)),
      slaAchievementPct: (Number(item.slaAchievementPct || 0)).toFixed(1),
      slaBreaches: Number(item.slaBreaches || 0),
      avgRating: (Number(item.avgRating || 0)).toFixed(1),
      ratingCount: Number(item.ratingCount || 0),
      revisions: Number(item.revisions || 0),
      reprintRelatedJobs: Number(item.reprintRelatedJobs || 0),
      rejectedAssignments: Number(item.rejectedAssignments || 0),
    };
  }

  static toResponseList(items = []) {
    return items.map((i) => this.toResponse(i));
  }

  static toTrendResponse(trendItems = []) {
    return trendItems.map((item) => ({
      period: item.period,
      completedJobs: Number(item.completedJobs || 0),
      avgCompletionMinutes: Math.round(Number(item.avgCompletionMinutes || 0)),
      slaAchievementPct: Number((Number(item.slaAchievementPct || 0)).toFixed(1)),
      avgRating: Number((Number(item.avgRating || 0)).toFixed(1)),
      revisions: Number(item.revisions || 0),
    }));
  }
}

module.exports = DesignerPerformanceDto;
