class GetDashboardSummary {
  constructor({ reportRepository }) {
    this.reportRepository = reportRepository;
  }

  async execute({ dates = [], branchFilter = null }) {
    return this.reportRepository.getDashboardSummary(dates, branchFilter);
  }
}

module.exports = GetDashboardSummary;
