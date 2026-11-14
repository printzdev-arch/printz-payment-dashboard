const asyncHandler = require("../../../utils/helpers/asyncHandler");
const ResponseHelper = require("../../../utils/helpers/ApiResponseHelper");
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

const getStocks = asyncHandler(async (req, res) => {
  const data = await ProductionResourceService.getStocks(req.query, req.user);
  return ResponseHelper.ok(res, "Stock items retrieved successfully", data);
});

module.exports = {
  getStocks,
  getMachines,
  getMachineById,
  getOperators,
};