class GetMonthlyRevenue {
  constructor({ reportRepository }) {
    this.reportRepository = reportRepository;
  }

  async execute({ year, branch = null }) {
    return this.reportRepository.getMonthlyRevenue(year, branch);
  }
}

module.exports = GetMonthlyRevenue;
