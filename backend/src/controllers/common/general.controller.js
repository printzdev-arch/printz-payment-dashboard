const generalService = require("../../services/common/general.service");
const {
  CreateCategoryDto,
  CategoryResponseDto,
  FinalizeDateDto,
  CreateSaleDto,
} = require("../../utils/dto");
const { asyncHandler, ResponseHelper } = require("../../utils");

// Categories
const getCategories = asyncHandler(async (req, res) => {
  const categories = await generalService.getCategories();
  const responseDto = CategoryResponseDto.fromEntities(categories);
  return ResponseHelper.success(res, responseDto, "Categories retrieved");
});

const createCategory = asyncHandler(async (req, res) => {
  const categoryDto = CreateCategoryDto.fromRequest(req);
  const category = await generalService.createCategory(categoryDto);
  const responseDto = CategoryResponseDto.fromEntity(category);
  return ResponseHelper.created(res, responseDto, "Category created");
});

// Finalized Dates
const getFinalizedDates = asyncHandler(async (req, res) => {
  const dates = await generalService.getFinalizedDates(req.query);
  return ResponseHelper.success(res, dates, "Finalized dates retrieved");
});

const finalizeDate = asyncHandler(async (req, res) => {
  const finalizeDto = FinalizeDateDto.fromRequest(req);
  const finalized = await generalService.finalizeDate(finalizeDto);
  return ResponseHelper.created(res, finalized, "Date finalized");
});

// Inventory Movements
const getInventoryMovements = asyncHandler(async (req, res) => {
  const movements = await generalService.getInventoryMovements(req.query);
  return ResponseHelper.success(res, movements, "Inventory movements retrieved");
});

const createInventoryMovement = asyncHandler(async (req, res) => {
  const movement = await generalService.createInventoryMovement(req.body);
  return ResponseHelper.created(res, movement, "Inventory movement recorded");
});

// Sales
const getSales = asyncHandler(async (req, res) => {
  const sales = await generalService.getSales(req.query);
  return ResponseHelper.success(res, sales, "Sales retrieved successfully");
});

const getSaleById = asyncHandler(async (req, res) => {
  const sale = await generalService.getSaleById(req.params.id);
  return ResponseHelper.success(res, sale, "Sale retrieved successfully");
});

const createSale = asyncHandler(async (req, res) => {
  const saleDto = CreateSaleDto.fromRequest(req);
  const createdSale = await generalService.createSale(saleDto);
  return ResponseHelper.created(res, createdSale, "Sale recorded successfully");
});

module.exports = {
  getCategories,
  createCategory,
  getFinalizedDates,
  finalizeDate,
  getInventoryMovements,
  createInventoryMovement,
  getSales,
  getSaleById,
  createSale,
};
