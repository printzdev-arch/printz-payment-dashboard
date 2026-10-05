const IReportRepository = require("../../../../domain/repositories/IReportRepository");
const TotalAmountReading = require("../models/TotalAmountReading");
const PrinterReading = require("../models/PrinterReading");

class MongoReportRepository extends IReportRepository {
  async getDashboardSummary(dates = [], branchFilter = null) {
    const matchQuery = {};
    if (dates && dates.length > 0) {
      matchQuery.date = { $in: dates };
    }
    if (branchFilter && branchFilter.length > 0) {
      matchQuery.branchName = { $in: branchFilter };
    }

    const totalAmounts = await TotalAmountReading.find(matchQuery);
    const printerReadings = await PrinterReading.find(matchQuery);

    const branchAggs = {};

    totalAmounts.forEach((doc) => {
      const branch = doc.branchName || doc.branch || "Unknown";
      if (!branchAggs[branch]) {
        branchAggs[branch] = {
          branchName: branch,
          totalRevenue: 0,
          printerRevenue: 0,
          stockRevenue: 0,
          otherRevenue: 0,
          printerCopies: 0,
          printerAmount: 0,
          expenses: 0,
          cash: 0,
          online: 0,
        };
      }
      const agg = branchAggs[branch];
      agg.totalRevenue += Number(doc.totalAmount || 0);
      agg.cash += Number(doc.cash || 0);
      agg.online += Number(doc.online || 0);
      agg.expenses += Number(doc.expenses || 0);

      const rows = Array.isArray(doc.rows) ? doc.rows : [];
      rows.forEach((r) => {
        const amt = Number(r?.amount || 0);
        const type = String(r?.type || "").toLowerCase();
        if (type === "printer") agg.printerRevenue += amt;
        else if (type === "stock") agg.stockRevenue += amt;
        else agg.otherRevenue += amt;
      });
    });

    printerReadings.forEach((doc) => {
      const branch = doc.branchName || doc.branch || "Unknown";
      if (!branchAggs[branch]) {
        branchAggs[branch] = {
          branchName: branch,
          totalRevenue: 0,
          printerRevenue: 0,
          stockRevenue: 0,
          otherRevenue: 0,
          printerCopies: 0,
          printerAmount: 0,
          expenses: 0,
          cash: 0,
          online: 0,
        };
      }
      const agg = branchAggs[branch];
      agg.printerCopies += Number(doc.totalCopies || 0);
      agg.printerAmount += Number(doc.totalAmount || 0);
    });

    const result = Object.values(branchAggs);
    result.sort((a, b) => a.branchName.localeCompare(b.branchName));
    return result;
  }

  async getMonthlyRevenue(year, branch = null) {
    const match = {
      date: { $regex: `^${year}-` },
    };
    if (branch) {
      match.branchName = new RegExp(`^${branch}$`, "i");
    }

    const readings = await TotalAmountReading.find(match);
    const monthlyMap = {};

    readings.forEach((r) => {
      const month = r.date.substring(0, 7); // YYYY-MM
      if (!monthlyMap[month]) {
        monthlyMap[month] = {
          month,
          totalRevenue: 0,
          cash: 0,
          online: 0,
          count: 0,
        };
      }
      monthlyMap[month].totalRevenue += Number(r.totalAmount || 0);
      monthlyMap[month].cash += Number(r.cash || 0);
      monthlyMap[month].online += Number(r.online || 0);
      monthlyMap[month].count += 1;
    });

    return Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
  }
}

module.exports = new MongoReportRepository();
