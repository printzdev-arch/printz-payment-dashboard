const saleReceiptService = require("../../../application/services/pos/saleReceipt.service");
const { asyncHandler, ResponseHelper } = require("../../../shared");

function extractAuthContext(req) {
  return {
    user: req.user,
    scopes: req.authz?.scopes || [],
    authorizedBranchIds: req.authz?.authorizedBranches || req.authorizedBranchIds || [],
    isSuperAdmin: req.authz?.isSuperAdmin || req.user?.role === "admin" || req.user?.role === "SUPER_ADMIN",
    idempotencyKey: req.headers["idempotency-key"] || req.headers["x-idempotency-key"] || null,
  };
}

const calculate = asyncHandler(async (req, res) => {
  const authContext = extractAuthContext(req);
  const result = await saleReceiptService.calculate(req.body, authContext);
  return ResponseHelper.success(res, result, "Sale calculation computed successfully");
});

const createDraft = asyncHandler(async (req, res) => {
  const authContext = extractAuthContext(req);
  const result = await saleReceiptService.createDraft(req.body, authContext);
  return ResponseHelper.success(res, result, "Draft sale receipt created successfully", 201);
});

const updateDraftItems = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { items } = req.body;
  const authContext = extractAuthContext(req);
  const result = await saleReceiptService.updateDraftItems(id, items, authContext);
  return ResponseHelper.success(res, result, "Draft sale receipt items updated successfully");
});

const updateDraft = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await saleReceiptService.updateDraft(id, req.body, authContext);
  return ResponseHelper.success(res, result, "Draft sale receipt updated successfully");
});

const completeSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await saleReceiptService.completeSale(id, req.body, authContext);
  return ResponseHelper.success(res, result, "Sale completed and inventory posted successfully", 200);
});

const checkout = asyncHandler(async (req, res) => {
  const authContext = extractAuthContext(req);
  const result = await saleReceiptService.checkout(req.body, authContext);
  const statusCode = result.idempotentReplay ? 200 : 201;
  return ResponseHelper.success(res, result, "POS checkout completed and inventory posted successfully", statusCode);
});

const voidSale = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await saleReceiptService.voidSale(id, req.body, authContext);
  return ResponseHelper.success(res, result, "Sale receipt voided and inventory returned successfully");
});

const recordPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await saleReceiptService.recordPayment(id, req.body, authContext);
  return ResponseHelper.success(res, result, "Payment settlement recorded successfully");
});

const deleteDraft = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await saleReceiptService.deleteDraft(id, authContext);
  return ResponseHelper.success(res, result, "Draft sale receipt deleted successfully");
});

const getReceiptById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await saleReceiptService.getReceiptById(id, authContext);
  return ResponseHelper.success(res, result, "Sale receipt retrieved successfully");
});

const getReceipts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    branchId,
    status,
    paymentStatus,
    paymentMode,
    customerId,
    createdBy,
    from,
    to,
    q,
  } = req.query;

  const filters = {
    branchId,
    status,
    paymentStatus,
    paymentMode,
    customerId,
    createdBy,
    from,
    to,
    q,
  };

  const pagination = { page: Number(page), limit: Number(limit) };
  const authContext = extractAuthContext(req);

  const result = await saleReceiptService.getReceipts(filters, pagination, authContext);
  return ResponseHelper.success(res, result, "Sale receipts retrieved successfully");
});

const printReceipt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { template = "a4" } = req.query;
  const authContext = extractAuthContext(req);
  const result = await saleReceiptService.printReceipt(id, template, authContext);
  return ResponseHelper.success(res, result, "Print template rendered successfully");
});

const shareReceipt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await saleReceiptService.shareReceipt(id, req.body, authContext);
  return ResponseHelper.success(res, result, "Sale receipt queued for sharing", 202);
});

const exportReceipt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { format = "pdf" } = req.query;
  const authContext = extractAuthContext(req);
  const result = await saleReceiptService.exportReceipt(id, format, authContext);
  return ResponseHelper.success(res, result, "Sale receipt export generated successfully");
});

module.exports = {
  calculate,
  createDraft,
  updateDraftItems,
  updateDraft,
  completeSale,
  checkout,
  voidSale,
  recordPayment,
  deleteDraft,
  getReceiptById,
  getReceipts,
  printReceipt,
  shareReceipt,
  exportReceipt,
};
