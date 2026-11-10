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

const getOperatorById = asyncHandler(async (req, res) => {
  const data = await ProductionResourceService.getOperatorById(req.params.id, req.query, req.user);
  return ResponseHelper.ok(res, "Operator details retrieved successfully", data);
});

const createOperator = asyncHandler(async (req, res) => {
  const data = await ProductionResourceService.createOperator(req.body, req.user);
  return ResponseHelper.created ? ResponseHelper.created(res, "Operator added successfully", data) : ResponseHelper.ok(res, "Operator added successfully", data);
});

const updateOperator = asyncHandler(async (req, res) => {
  const data = await ProductionResourceService.updateOperator(req.params.id, req.body, req.user);
  return ResponseHelper.ok(res, "Operator updated successfully", data);
});

const getStocks = asyncHandler(async (req, res) => {
  const data = await ProductionResourceService.getStocks(req.query, req.user);
  return ResponseHelper.ok(res, "Stock items retrieved successfully", data);
});

module.exports = {
  createOperator,
  updateOperator,
  getStocks,
  getMachines,
  getMachineById,
  getOperators,
  getOperatorById,
};