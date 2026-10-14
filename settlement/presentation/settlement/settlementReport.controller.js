const CollectionReportService = require("../../../application/services/settlement/collectionReport.service");
const SettlementSlaReportService = require("../../../application/services/settlement/settlementSlaReport.service");
const PaymentDto = require("../../../application/dto/payment/PaymentDto");
const ResponseHelper = require("../../../shared/response/ResponseHelper");
const asyncHandler = require("../../../shared/asyncHandler");

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

  static getSlaReport = asyncHandler(async (req, res) => {
    const result = await SettlementSlaReportService.getSlaReport(req.query, req.user, req.authz);
    return ResponseHelper.ok(res, "SLA turnaround report retrieved successfully", result);
  });

  static getJobSla = asyncHandler(async (req, res) => {
    const result = await SettlementSlaReportService.getJobSla(req.params.id, req.user, req.authz);
    return ResponseHelper.ok(res, "Job order SLA evaluation retrieved successfully", result);
  });
}

module.exports = SettlementReportController;
