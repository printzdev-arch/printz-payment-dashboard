const GetCategories = require("../../application/use-cases/general/GetCategories");
const CreateCategory = require("../../application/use-cases/general/CreateCategory");
const GetFinalizedDates = require("../../application/use-cases/general/GetFinalizedDates");
const FinalizeDate = require("../../application/use-cases/general/FinalizeDate");
const GetInventoryMovements = require("../../application/use-cases/general/GetInventoryMovements");
const CreateInventoryMovement = require("../../application/use-cases/general/CreateInventoryMovement");
const GetSales = require("../../application/use-cases/general/GetSales");
const GetSaleById = require("../../application/use-cases/general/GetSaleById");
const CreateSale = require("../../application/use-cases/general/CreateSale");
const {
  CreateCategoryDto,
  CategoryResponseDto,
  FinalizeDateDto,
  CreateSaleDto,
} = require("../../application/dto");

const categoryRepository = require("../../infrastructure/database/mongoose/repositories/MongoCategoryRepository");
const finalizedDateRepository = require("../../infrastructure/database/mongoose/repositories/MongoFinalizedDateRepository");
const inventoryMovementRepository = require("../../infrastructure/database/mongoose/repositories/MongoInventoryMovementRepository");
const saleRepository = require("../../infrastructure/database/mongoose/repositories/MongoSaleRepository");
const { asyncHandler, ResponseHelper } = require("../../shared");

const getCategoriesUseCase = new GetCategories({ categoryRepository });
const createCategoryUseCase = new CreateCategory({ categoryRepository });
const getFinalizedDatesUseCase = new GetFinalizedDates({ finalizedDateRepository });
const finalizeDateUseCase = new FinalizeDate({ finalizedDateRepository });
const getInventoryMovementsUseCase = new GetInventoryMovements({ inventoryMovementRepository });
const createInventoryMovementUseCase = new CreateInventoryMovement({ inventoryMovementRepository });
const getSalesUseCase = new GetSales({ saleRepository });
const getSaleByIdUseCase = new GetSaleById({ saleRepository });
const createSaleUseCase = new CreateSale({ saleRepository });

// Categories
const getCategories = asyncHandler(async (req, res) => {
  const categories = await getCategoriesUseCase.execute();
  const responseDto = CategoryResponseDto.fromEntities(categories);
  return ResponseHelper.success(res, responseDto, "Categories retrieved");
});

const createCategory = asyncHandler(async (req, res) => {
  const categoryDto = CreateCategoryDto.fromRequest(req);
  const category = await createCategoryUseCase.execute(categoryDto);
  const responseDto = CategoryResponseDto.fromEntity(category);
  return ResponseHelper.created(res, responseDto, "Category created");
});

// Finalized Dates
const getFinalizedDates = asyncHandler(async (req, res) => {
  const dates = await getFinalizedDatesUseCase.execute(req.query);
  return ResponseHelper.success(res, dates, "Finalized dates retrieved");
});

const finalizeDate = asyncHandler(async (req, res) => {
  const finalizeDto = FinalizeDateDto.fromRequest(req);
  const finalized = await finalizeDateUseCase.execute(finalizeDto);
  return ResponseHelper.created(res, finalized, "Date finalized");
});

// Inventory Movements
const getInventoryMovements = asyncHandler(async (req, res) => {
  const movements = await getInventoryMovementsUseCase.execute(req.query);
  return ResponseHelper.success(res, movements, "Inventory movements retrieved");
});

const createInventoryMovement = asyncHandler(async (req, res) => {
  const movement = await createInventoryMovementUseCase.execute(req.body);
  return ResponseHelper.created(res, movement, "Inventory movement recorded");
});

// Sales
const getSales = asyncHandler(async (req, res) => {
  const sales = await getSalesUseCase.execute(req.query);
  return ResponseHelper.success(res, sales, "Sales retrieved successfully");
});

const getSaleById = asyncHandler(async (req, res) => {
  const sale = await getSaleByIdUseCase.execute(req.params.id);
  return ResponseHelper.success(res, sale, "Sale retrieved successfully");
});

const createSale = asyncHandler(async (req, res) => {
  const saleDto = CreateSaleDto.fromRequest(req);
  const createdSale = await createSaleUseCase.execute(saleDto);
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
