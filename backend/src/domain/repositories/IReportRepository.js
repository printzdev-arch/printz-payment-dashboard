/**
 * IReportRepository Interface / Contract
 */
class IReportRepository {
  async getDashboardSummary(dates, branchFilter) { throw new Error("Method not implemented"); }
  async getMonthlyRevenue(year, branch) { throw new Error("Method not implemented"); }
}

module.exports = IReportRepository;
