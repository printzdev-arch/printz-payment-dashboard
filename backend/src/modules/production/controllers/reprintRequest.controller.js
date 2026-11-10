const asyncHandler = require("../../../utils/helpers/asyncHandler");
const ResponseHelper = require("../../../utils/helpers/ApiResponseHelper");
const ReprintService = require("../services/reprint.service");

/**
 * Reprint Requests Controller
 */
const getReprintRequests = asyncHandler(async (req, res) => {
  const { items, total, page, limit } = await ReprintService.findAll(req.query, req.user);
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
  const data = await ReprintService.findById(req.params.id, req.user);
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

// The reason is required by the service; the frontend must send it
// (rejectionReason, or the older comments / reason keys).
const rejectReprintRequest = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const rejected = await ReprintService.reject(
    req.params.id,
    body.rejectionReason || body.comments || body.reason,
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