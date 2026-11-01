const asyncHandler = require("../../../utils/asyncHandler");
const ResponseHelper = require("../../../utils/ResponseHelper");
const ProductionResourceService = require("../services/productionResource.service");

/**
 * Production Resources Controller (machines and operators)
 */
const getMachines = asyncHandler(async (req, res) => {
  const data = await ProductionResourceService.getMachines(req.query, req.user);
  return ResponseHelper.ok(res, "Machines retrieved successfully", data);
});

const getMachineById = asyncHandler(async (req, res) => {
  const data = await ProductionResourceService.getMachineById(req.params.id, req.query, req.user);
  return ResponseHelper.ok(res, "Machine details retrieved successfully", data);
});

const getOperators = asyncHandler(async (req, res) => {
  const data = await ProductionResourceService.getOperators(req.query, req.user);
  return ResponseHelper.ok(res, "Operators retrieved successfully", data);
});

const getOperatorById = asyncHandler(async (req, res) => {
  const data = await ProductionResourceService.getOperatorById(req.params.id, req.query, req.user);
  return ResponseHelper.ok(res, "Operator details retrieved successfully", data);
});

module.exports = {
  getMachines,
  getMachineById,
  getOperators,
  getOperatorById,
};