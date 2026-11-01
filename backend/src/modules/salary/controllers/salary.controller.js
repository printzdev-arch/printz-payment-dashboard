const service = require("../services/salary.service");
const { isSalaryProcessingEnabled } = require("../../../middleware/salaryProcessingGuard.middleware");
const { ApiError, asyncHandler, ResponseHelper } = require("../../../utils");

const userId = (req) => (req.user?._id || req.user?.id || null);
const idString = (value) => String(value && value._id ? value._id : value || "");
function isGlobal(req) {
  return Boolean(req.authz?.isSuperAdmin || (req.authz?.scopes || []).includes("ALL"));
}
function authorizedBranches(req) {
  return (req.authz?.authorizedBranchIds || req.authz?.userBranchIds || []).map(idString).filter(Boolean);
}
function assertBranch(req, branchId) {
  if (isGlobal(req)) return;
  const allowed = authorizedBranches(req);
  if (!branchId || !allowed.includes(idString(branchId))) {
    throw ApiError.forbidden("Access denied: You are not authorized for this salary branch.");
  }
}
function scopedFilters(req) {
  const filters = { ...req.query };
  if (!isGlobal(req)) {
    const allowed = authorizedBranches(req);
    if (filters.branchId) assertBranch(req, filters.branchId);
    else if (allowed.length === 1) filters.branchId = allowed[0];
    else {
      throw ApiError.forbidden("Please provide a branchId within your authorized branches.");
    }
  }
  return filters;
}

const reqContext = (req) => ({
  ipAddress: req.ip || req.headers?.["x-forwarded-for"] || req.connection?.remoteAddress || null,
  userAgent: req.headers ? req.headers["user-agent"] : null,
});

exports.listRuns = asyncHandler(async (req, res) =>
  ResponseHelper.cleanOk(res, "Salary runs retrieved.", await service.listRuns(scopedFilters(req))));
exports.createRun = asyncHandler(async (req, res) => {
  assertBranch(req, req.body.branchId);
  return ResponseHelper.cleanCreated(res, "Salary run created.", await service.createRun(req.body, userId(req), reqContext(req)));
});
exports.getRunAudit = asyncHandler(async (req, res) => {
  const existing = await service.getRun(req.params.id);
  assertBranch(req, existing.branchId);
  return ResponseHelper.cleanOk(res, "Salary run audit trail retrieved.", await service.listRunAudit(req.params.id));
});
exports.getProcessingStatus = asyncHandler(async (req, res) =>
  ResponseHelper.cleanOk(res, "Salary processing status retrieved.", { enabled: isSalaryProcessingEnabled() }));
exports.getRun = asyncHandler(async (req, res) => {
  const result = await service.getRun(req.params.id);
  assertBranch(req, result.branchId);
  return ResponseHelper.cleanOk(res, "Salary run retrieved.", result);
});
exports.calculateRun = asyncHandler(async (req, res) => {
  const existing = await service.getRun(req.params.id);
  assertBranch(req, existing.branchId);
  return ResponseHelper.cleanOk(res, "Salary run calculated.", await service.calculateRun(req.params.id, userId(req), reqContext(req)));
});
exports.approveRun = asyncHandler(async (req, res) => {
  const existing = await service.getRun(req.params.id);
  assertBranch(req, existing.branchId);
  return ResponseHelper.cleanOk(res, "Salary run approved.", await service.transitionRun(req.params.id, "approve", userId(req), reqContext(req)));
});
exports.payRun = asyncHandler(async (req, res) => {
  const existing = await service.getRun(req.params.id);
  assertBranch(req, existing.branchId);
  return ResponseHelper.cleanOk(res, "Salary run marked paid.", await service.transitionRun(req.params.id, "pay", userId(req), reqContext(req)));
});
exports.lockRun = asyncHandler(async (req, res) => {
  const existing = await service.getRun(req.params.id);
  assertBranch(req, existing.branchId);
  return ResponseHelper.cleanOk(res, "Salary run locked.", await service.transitionRun(req.params.id, "lock", userId(req), reqContext(req)));
});
exports.listRecords = asyncHandler(async (req, res) =>
  ResponseHelper.cleanOk(res, "Salary records retrieved.", await service.listRecords(scopedFilters(req))));
exports.listEntries = exports.listRecords;
exports.listComponents = asyncHandler(async (req, res) =>
  ResponseHelper.cleanOk(res, "Salary components retrieved.", await service.listComponents(scopedFilters(req))));
exports.createComponent = asyncHandler(async (req, res) => {
  assertBranch(req, req.body.branchId);
  return ResponseHelper.cleanCreated(res, "Salary component created.", await service.createComponent(req.body, userId(req)));
});
exports.listStructures = asyncHandler(async (req, res) => {
  const result = await service.listStructures(scopedFilters(req));
  return ResponseHelper.cleanOk(res, "Employee salary structures retrieved.", result, result.meta);
});
exports.createStructure = asyncHandler(async (req, res) => {
  assertBranch(req, req.body.branchId);
  return ResponseHelper.cleanCreated(res, "Employee salary structure created.", await service.createStructure(req.body, userId(req)));
});
exports.listAdjustments = asyncHandler(async (req, res) => {
  const result = await service.listAdjustments(scopedFilters(req));
  return ResponseHelper.cleanOk(res, "Salary adjustments retrieved.", result, result.meta);
});
exports.createAdjustment = asyncHandler(async (req, res) => {
  assertBranch(req, req.body.branchId);
  return ResponseHelper.cleanCreated(res, "Salary adjustment created.", await service.createAdjustment(req.body, userId(req)));
});
exports.cancelAdjustment = asyncHandler(async (req, res) => {
  const existing = await service.getAdjustmentById(req.params.id);
  if (!existing) throw ApiError.notFound("Salary adjustment not found.");
  assertBranch(req, existing.branchId);

  const cancelled = await service.cancelAdjustment(req.params.id, userId(req), {
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"]
  });

  return ResponseHelper.cleanOk(res, "Salary adjustment cancelled.", cancelled);
});
exports.listLoans = asyncHandler(async (req, res) => {
  const result = await service.listLoans(scopedFilters(req));
  return ResponseHelper.cleanOk(res, "Employee loans retrieved.", result, result.meta);
});
exports.createLoan = asyncHandler(async (req, res) => {
  assertBranch(req, req.body.branchId);
  return ResponseHelper.cleanCreated(res, "Employee loan created.", await service.createLoan(req.body, userId(req)));
});
exports.skipLoanMonth = asyncHandler(async (req, res) => {
  const loan = await service.getLoanById(req.params.id);
  if (!loan) throw ApiError.notFound("Employee loan not found.");
  assertBranch(req, loan.branchId);
  return ResponseHelper.cleanOk(res, "Loan EMI skipped for the month.", await service.skipLoanMonth(req.params.id, req.body, userId(req), reqContext(req)));
});
exports.unskipLoanMonth = asyncHandler(async (req, res) => {
  const loan = await service.getLoanById(req.params.id);
  if (!loan) throw ApiError.notFound("Employee loan not found.");
  assertBranch(req, loan.branchId);
  return ResponseHelper.cleanOk(res, "Loan EMI skip removed.", await service.unskipLoanMonth(req.params.id, req.body, userId(req), reqContext(req)));
});
exports.listRepayments = asyncHandler(async (req, res) => {
  const result = await service.listRepayments(scopedFilters(req));
  return ResponseHelper.cleanOk(res, "Loan repayments retrieved.", result, result.meta);
});
exports.createRepayment = asyncHandler(async (req, res) => {
  const loan = await service.getLoanById(req.body.employeeLoanId);
  if (!loan) throw ApiError.notFound("Employee loan not found.");

  // Authoritative branch authorization based on the loan's branch
  assertBranch(req, loan.branchId);

  // If branchId is supplied in request, verify it matches loan branch
  if (req.body.branchId && idString(req.body.branchId) !== idString(loan.branchId)) {
    throw ApiError.validation("Provided branchId does not match the loan branch.");
  }

  // If employeeId is supplied in request, verify it matches loan employee
  if (req.body.employeeId && idString(req.body.employeeId) !== idString(loan.employeeId)) {
    throw ApiError.validation("Provided employeeId does not match the loan employee.");
  }

  const authContext = {
    isGlobal: isGlobal(req),
    authorizedBranchIds: authorizedBranches(req)
  };

  return ResponseHelper.cleanCreated(
    res,
    "Loan repayment recorded.",
    await service.recordRepayment(
      { ...req.body, branchId: loan.branchId, employeeId: loan.employeeId },
      userId(req),
      authContext
    )
  );
});

