const asyncHandler = require("../../utils/asyncHandler");
const ResponseHelper = require("../../utils/ResponseHelper");
const CustomerPortalService = require("../../services/customerPortal/customerPortal.service");

const getCustomerEstimate = asyncHandler(async (req, res) => {
  const estimate = await CustomerPortalService.getEstimate(req.params.id);
  return ResponseHelper.ok(res, "Customer estimate retrieved successfully", estimate);
});

const acceptCustomerEstimate = asyncHandler(async (req, res) => {
  const estimate = await CustomerPortalService.acceptEstimate(req.params.id, req.body, req.user);
  return ResponseHelper.ok(res, "Estimate approved successfully", estimate);
});

const rejectCustomerEstimate = asyncHandler(async (req, res) => {
  const estimate = await CustomerPortalService.rejectEstimate(req.params.id, req.body, req.user);
  return ResponseHelper.ok(res, "Estimate revision requested", estimate);
});

const getCustomerDesignApprovals = asyncHandler(async (req, res) => {
  const result = await CustomerPortalService.getDesignApprovals(req.query);
  return ResponseHelper.ok(res, "Customer design approvals retrieved", result);
});

const approveCustomerDesign = asyncHandler(async (req, res) => {
  const result = await CustomerPortalService.approveDesign(req.params.id, req.body, req.user);
  return ResponseHelper.ok(res, "Customer proof approved successfully", result);
});

module.exports = {
  getCustomerEstimate,
  acceptCustomerEstimate,
  rejectCustomerEstimate,
  getCustomerDesignApprovals,
  approveCustomerDesign,
};
