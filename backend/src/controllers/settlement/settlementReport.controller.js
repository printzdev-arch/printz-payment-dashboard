const CollectionReportService = require("../../services/settlement/collectionReport.service");
const SettlementSlaReportService = require("../../services/settlement/settlementSlaReport.service");
const PaymentDto = require("../../utils/dto/payment/PaymentDto");
const ResponseHelper = require("../../utils/ResponseHelper");
const asyncHandler = require("../../utils/asyncHandler");

class SettlementReportController {
  static getOutstandingInvoices = asyncHandler(async (req, res) => {
    const result = await CollectionReportService.getOutstandingInvoices(req.query, req.user, req.authz);
    return ResponseHelper.ok(res, "Outstanding invoices retrieved successfully", result);
  });

  static getCollectionSummary = asyncHandler(async (req, res) => {
    const result = await CollectionReportService.getCollectionSummary(req.query, req.user, req.authz);
    return ResponseHelper.ok(res, "Collection summary report retrieved successfully", {
      ...result,
      items: PaymentDto.toResponseList(result.items),
    });
  });

  static createReminder = asyncHandler(async (req, res) => {
    const result = await CollectionReportService.createReminder(req.params.id, req.body, req.user, req.authz);
    return ResponseHelper.created(res, result, "Invoice payment reminder scheduled successfully");
  });

  static getReminders = asyncHandler(async (req, res) => {
    const result = await CollectionReportService.getReminders(req.params.id, req.user, req.authz);
    return ResponseHelper.ok(res, "Invoice reminder history retrieved successfully", result);
  });

  static getInvoiceAgingReport = asyncHandler(async (req, res) => {
    const result = await CollectionReportService.getOutstandingInvoices(req.query, req.user, req.authz);
    const buckets = { current: 0, days30: 0, days60: 0, days90Plus: 0 };
    result.items.forEach((inv) => {
      const days = inv.daysOverdue || 0;
      if (days <= 0) buckets.current += inv.balanceDue;
      else if (days <= 30) buckets.days30 += inv.balanceDue;
      else if (days <= 60) buckets.days60 += inv.balanceDue;
      else buckets.days90Plus += inv.balanceDue;
    });
    return ResponseHelper.ok(res, "Invoice aging report retrieved successfully", {
      ...result,
      agingBuckets: buckets,
    });
  });

  static getSlaReport = asyncHandler(async (req, res) => {
    const result = await SettlementSlaReportService.getSlaReport(req.query, req.user, req.authz);
    return ResponseHelper.ok(res, "SLA turnaround report retrieved successfully", result);
  });

  static getTurnaroundSlaReport = asyncHandler(async (req, res) => {
    const result = await SettlementSlaReportService.getSlaReport(req.query, req.user, req.authz);
    return ResponseHelper.ok(res, "SLA turnaround report retrieved successfully", result);
  });

  static getJobSla = asyncHandler(async (req, res) => {
    const result = await SettlementSlaReportService.getJobSla(req.params.id, req.user, req.authz);
    return ResponseHelper.ok(res, "Job order SLA evaluation retrieved successfully", result);
  });
}

module.exports = SettlementReportController;
