const asyncHandler = require("../../../shared/asyncHandler");
const ResponseHelper = require("../../../shared/response/ResponseHelper");
const ReprintService = require("../../../application/services/production/reprint.service");

/**
 * Reprint Requests Controller
 */
const getReprintRequests = asyncHandler(async (req, res) => {
  const { items, total, page, limit } = await ReprintService.findAll(req.query);
  return ResponseHelper.paginated(
    res,
    items,
    total,
    page,
    limit,
    "Reprint requests retrieved successfully"
  );
});

const getReprintRequestById = asyncHandler(async (req, res) => {
  const data = await ReprintService.findById(req.params.id);
  return ResponseHelper.ok(res, "Reprint request details retrieved", data);
});

const createReprintRequest = asyncHandler(async (req, res) => {
  const request = await ReprintService.createRequest(
    req.params.id,
    req.body,
    req.user
  );
  return ResponseHelper.created(res, request, "Reprint request submitted successfully");
});

const approveReprintRequest = asyncHandler(async (req, res) => {
  const approved = await ReprintService.approve(req.params.id, req.body || {}, req.user);
  return ResponseHelper.ok(
    res,
    "Reprint request approved and production cycle reopened",
    approved
  );
});

const rejectReprintRequest = asyncHandler(async (req, res) => {
  const rejected = await ReprintService.reject(
    req.params.id,
    req.body.comments || req.body.reason,
    req.user
  );
  return ResponseHelper.ok(res, "Reprint request rejected", rejected);
});

module.exports = {
  getReprintRequests,
  getReprintRequestById,
  createReprintRequest,
  approveReprintRequest,
  rejectReprintRequest,
};
