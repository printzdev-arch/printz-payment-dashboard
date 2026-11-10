const asyncHandler = require("../../../utils/helpers/asyncHandler");
const ResponseHelper = require("../../../utils/helpers/ApiResponseHelper");
const JobInvoiceService = require("../services/jobInvoice.service");

/**
 * Job Invoicing Controller
 */
const createInvoice = asyncHandler(async (req, res) => {
  const invoice = await JobInvoiceService.invoice(req.params.id, req.user);
  return ResponseHelper.created(res, invoice, "Invoice generated successfully for Job Order");
});

const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await JobInvoiceService.getInvoice(req.params.id, req.user);
  return ResponseHelper.ok(res, "Invoice retrieved successfully", invoice);
});

module.exports = {
  createInvoice,
  getInvoice,
};
