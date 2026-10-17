const stockService = require("../../services/common/stock.service");
const {
  SaveStockItemDto,
  UpdateStockItemDto,
  StockItemResponseDto,
  SaveStockReadingDto,
  UpdateStockReadingDto,
  StockReadingResponseDto,
} = require("../../utils/dto");
const { asyncHandler, ResponseHelper } = require("../../utils");

// Stock items inventory
const getStockItems = asyncHandler(async (req, res) => {
  const items = await stockService.getStockItems(req.query);
  return ResponseHelper.success(
    res,
    StockItemResponseDto.fromEntities(items),
    "Stock items retrieved successfully"
  );
});

const getStockItemById = asyncHandler(async (req, res) => {
  const item = await stockService.getStockItemById(req.params.id);
  return ResponseHelper.success(
    res,
    StockItemResponseDto.fromEntity(item),
    "Stock item retrieved successfully"
  );
});

const saveStockItem = asyncHandler(async (req, res) => {
  const stockItemDto = SaveStockItemDto.fromRequest(req);
  const { item, isNew } = await stockService.saveStockItem(stockItemDto);
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
  const item = await stockService.updateStockItem(req.params.id, updateDto);
  return ResponseHelper.success(
    res,
    StockItemResponseDto.fromEntity(item),
    "Stock item updated successfully"
  );
});

const deleteStockItem = asyncHandler(async (req, res) => {
  await stockService.deleteStockItem(req.params.id);
  return ResponseHelper.success(res, null, "Stock item deleted successfully");
});

// Daily stock readings
const getStockReadings = asyncHandler(async (req, res) => {
  const readings = await stockService.getStockReadings(req.query);
  return ResponseHelper.success(
    res,
    StockReadingResponseDto.fromEntities(readings),
    "Stock readings retrieved successfully"
  );
});

const getStockReadingById = asyncHandler(async (req, res) => {
  const reading = await stockService.getStockReadingById(req.params.id);
  return ResponseHelper.success(
    res,
    StockReadingResponseDto.fromEntity(reading),
    "Stock reading retrieved successfully"
  );
});

const saveStockReading = asyncHandler(async (req, res) => {
  const readingDto = SaveStockReadingDto.fromRequest(req);
  const { reading, isNew } = await stockService.saveStockReading(readingDto);
  if (isNew) {
    return ResponseHelper.created(
      res,
      StockReadingResponseDto.fromEntity(reading),
      "Stock reading created successfully"
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
  const reading = await stockService.updateStockReading(req.params.id, updateDto);
  return ResponseHelper.success(
    res,
    StockReadingResponseDto.fromEntity(reading),
    "Stock reading updated successfully"
  );
});

const deleteStockReading = asyncHandler(async (req, res) => {
  await stockService.deleteStockReading(req.params.id);
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
