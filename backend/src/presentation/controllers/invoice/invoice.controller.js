const asyncHandler = require("../../../shared/asyncHandler");
const ResponseHelper = require("../../../shared/response/ResponseHelper");
const InvoiceService = require("../../../application/services/invoice/invoice.service");
const InvoiceDto = require("../../../application/dto/invoice/InvoiceDto");
const invoiceRepository = require("../../../infrastructure/database/mongoose/repositories/invoice/MongoInvoiceRepository");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

const getPendingEligibleJobOrders = asyncHandler(async (req, res) => {
  const result = await InvoiceService.getPendingEligibleJobOrders(req.query, req.authz);
  return ResponseHelper.ok(res, "Eligible job orders retrieved successfully", result);
});

const getJobOrderEligibility = asyncHandler(async (req, res) => {
  const result = await InvoiceService.getJobOrderEligibility(req.params.jobOrderId, req.authz);
  return ResponseHelper.ok(res, "Job order eligibility evaluated successfully", result);
});

const getInvoices = asyncHandler(async (req, res) => {
  const filter = { ...req.query };
  if (!req.authz?.isSuperAdmin && req.authz?.userBranchIds?.length > 0) {
    filter.branchIds = req.authz.userBranchIds;
  }
  const result = await invoiceRepository.findAll(filter, req.query);
  return ResponseHelper.ok(res, "Invoices retrieved successfully", InvoiceDto.toListResponse(result));
});

const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await invoiceRepository.findById(req.params.id);
  if (!invoice) throw ErrorHelper.notFound("Invoice not found.");
  InvoiceService.assertBranchAccess(invoice.branchId, req.authz);
  return ResponseHelper.ok(res, "Invoice retrieved successfully", InvoiceDto.toResponse(invoice));
});

const createDraft = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.createDraft(req.body, req.user, req.authz);
  return ResponseHelper.created(res, "Draft invoice created successfully", InvoiceDto.toResponse(invoice));
});

const updateDraft = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.updateDraft(req.params.id, req.body, req.user, req.authz);
  return ResponseHelper.ok(res, "Draft invoice updated successfully", InvoiceDto.toResponse(invoice));
});

const calculate = asyncHandler(async (req, res) => {
  const result = await InvoiceService.calculate(req.params.id, req.body, req.user, req.authz);
  return ResponseHelper.ok(res, "Invoice calculation completed successfully", result);
});

const submitForApproval = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.submitForApproval(req.params.id, req.body, req.user, req.authz);
  return ResponseHelper.ok(res, "Invoice submitted for approval successfully", InvoiceDto.toResponse(invoice));
});

const approveVariance = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.approveVariance(req.params.id, req.body, req.user, req.authz);
  return ResponseHelper.ok(res, "Invoice variance decision processed successfully", InvoiceDto.toResponse(invoice));
});

const finalize = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.finalize(req.params.id, req.user, req.authz);
  return ResponseHelper.ok(res, "Invoice finalized successfully", InvoiceDto.toResponse(invoice));
});

const getPdf = asyncHandler(async (req, res) => {
  const result = await InvoiceService.getPdf(req.params.id, req.user, req.authz);
  if (req.query.format === "raw_html") {
    res.setHeader("Content-Type", "text/html");
    return res.send(result.html);
  }
  return ResponseHelper.ok(res, "Invoice printable HTML generated successfully", result);
});

const shareInvoice = asyncHandler(async (req, res) => {
  const result = await InvoiceService.share(req.params.id, req.body, req.user, req.authz);
  return ResponseHelper.ok(res, "Invoice shared successfully", result);
});

const getAuditLogs = asyncHandler(async (req, res) => {
  const logs = await InvoiceService.getAuditLogs(req.params.id, req.authz);
  return ResponseHelper.ok(res, "Invoice audit logs retrieved successfully", logs);
});

module.exports = {
  getPendingEligibleJobOrders,
  getJobOrderEligibility,
  getInvoices,
  getInvoiceById,
  createDraft,
  updateDraft,
  calculate,
  submitForApproval,
  approveVariance,
  finalize,
  getPdf,
  shareInvoice,
  getAuditLogs,
};
