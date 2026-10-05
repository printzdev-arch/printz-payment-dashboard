const GetStockItems = require("../../application/use-cases/stocks/GetStockItems");
const GetStockItemById = require("../../application/use-cases/stocks/GetStockItemById");
const SaveStockItem = require("../../application/use-cases/stocks/SaveStockItem");
const UpdateStockItem = require("../../application/use-cases/stocks/UpdateStockItem");
const DeleteStockItem = require("../../application/use-cases/stocks/DeleteStockItem");
const GetStockReadings = require("../../application/use-cases/stocks/GetStockReadings");
const GetStockReadingById = require("../../application/use-cases/stocks/GetStockReadingById");
const SaveStockReading = require("../../application/use-cases/stocks/SaveStockReading");
const UpdateStockReading = require("../../application/use-cases/stocks/UpdateStockReading");
const DeleteStockReading = require("../../application/use-cases/stocks/DeleteStockReading");
const {
  SaveStockItemDto,
  UpdateStockItemDto,
  StockItemResponseDto,
  SaveStockReadingDto,
  UpdateStockReadingDto,
  StockReadingResponseDto,
} = require("../../application/dto");

const stockRepository = require("../../infrastructure/database/mongoose/repositories/MongoStockRepository");
const stockReadingRepository = require("../../infrastructure/database/mongoose/repositories/MongoStockReadingRepository");
const { asyncHandler, ResponseHelper } = require("../../shared");

const getStockItemsUseCase = new GetStockItems({ stockRepository });
const getStockItemByIdUseCase = new GetStockItemById({ stockRepository });
const saveStockItemUseCase = new SaveStockItem({ stockRepository });
const updateStockItemUseCase = new UpdateStockItem({ stockRepository });
const deleteStockItemUseCase = new DeleteStockItem({ stockRepository });

const getStockReadingsUseCase = new GetStockReadings({ stockReadingRepository });
const getStockReadingByIdUseCase = new GetStockReadingById({ stockReadingRepository });
const saveStockReadingUseCase = new SaveStockReading({ stockReadingRepository });
const updateStockReadingUseCase = new UpdateStockReading({ stockReadingRepository });
const deleteStockReadingUseCase = new DeleteStockReading({ stockReadingRepository });

// Stock items inventory
const getStockItems = asyncHandler(async (req, res) => {
  const items = await getStockItemsUseCase.execute(req.query);
  return ResponseHelper.success(
    res,
    StockItemResponseDto.fromEntities(items),
    "Stock items retrieved successfully"
  );
});

const getStockItemById = asyncHandler(async (req, res) => {
  const item = await getStockItemByIdUseCase.execute(req.params.id);
  return ResponseHelper.success(
    res,
    StockItemResponseDto.fromEntity(item),
    "Stock item retrieved successfully"
  );
});

const saveStockItem = asyncHandler(async (req, res) => {
  const stockItemDto = SaveStockItemDto.fromRequest(req);
  const { item, isNew } = await saveStockItemUseCase.execute(stockItemDto);
  if (isNew) {
    return ResponseHelper.created(
      res,
      StockItemResponseDto.fromEntity(item),
      "Stock item created"
    );
  }
  return ResponseHelper.success(
    res,
    StockItemResponseDto.fromEntity(item),
    "Stock item updated"
  );
});

const updateStockItem = asyncHandler(async (req, res) => {
  const updateDto = UpdateStockItemDto.fromRequest(req);
  const item = await updateStockItemUseCase.execute(req.params.id, updateDto);
  return ResponseHelper.success(
    res,
    StockItemResponseDto.fromEntity(item),
    "Stock item updated successfully"
  );
});

const deleteStockItem = asyncHandler(async (req, res) => {
  await deleteStockItemUseCase.execute(req.params.id);
  return ResponseHelper.success(res, null, "Stock item deleted successfully");
});

// Daily stock readings
const getStockReadings = asyncHandler(async (req, res) => {
  const readings = await getStockReadingsUseCase.execute(req.query);
  return ResponseHelper.success(
    res,
    StockReadingResponseDto.fromEntities(readings),
    "Stock readings retrieved successfully"
  );
});

const getStockReadingById = asyncHandler(async (req, res) => {
  const reading = await getStockReadingByIdUseCase.execute(req.params.id);
  return ResponseHelper.success(
    res,
    StockReadingResponseDto.fromEntity(reading),
    "Stock reading retrieved successfully"
  );
});

const saveStockReading = asyncHandler(async (req, res) => {
  const stockReadingDto = SaveStockReadingDto.fromRequest(req);
  const { reading, isNew } = await saveStockReadingUseCase.execute(stockReadingDto);
  if (isNew) {
    return ResponseHelper.created(
      res,
      StockReadingResponseDto.fromEntity(reading),
      "Stock reading saved successfully"
    );
  }
  return ResponseHelper.success(
    res,
    StockReadingResponseDto.fromEntity(reading),
    "Stock reading updated successfully"
  );
});

const updateStockReading = asyncHandler(async (req, res) => {
  const updateDto = UpdateStockReadingDto.fromRequest(req);
  const reading = await updateStockReadingUseCase.execute(req.params.id, updateDto);
  return ResponseHelper.success(
    res,
    StockReadingResponseDto.fromEntity(reading),
    "Stock reading updated successfully"
  );
});

const deleteStockReading = asyncHandler(async (req, res) => {
  await deleteStockReadingUseCase.execute(req.params.id);
  return ResponseHelper.success(res, null, "Stock reading deleted successfully");
});

module.exports = {
  getStockItems,
  getStockItemById,
  saveStockItem,
  updateStockItem,
  deleteStockItem,
  getStockReadings,
  getStockReadingById,
  saveStockReading,
  updateStockReading,
  deleteStockReading,
};


