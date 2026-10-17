const stockRepository = require("../../models/common/StockItem");
const stockReadingRepository = require("../../models/common/StockReading");
const ApiError = require("../../utils/ApiError");

class StockService {
  constructor(stockRepo = stockRepository, readingRepo = stockReadingRepository) {
    this.stockRepo = stockRepo;
    this.readingRepo = readingRepo;
  }

  // Stock Items
  async getStockItems(filters = {}) {
    return this.stockRepo.findAll(filters);
  }

  async getStockItemById(id) {
    const item = await this.stockRepo.findById(id);
    if (!item) {
      throw ApiError.notFound("Stock item not found");
    }
    return item;
  }

  async saveStockItem(itemData) {
    if (itemData && typeof itemData.validate === "function") {
      itemData.validate();
    }
    return this.stockRepo.save(itemData);
  }

  async updateStockItem(id, itemData) {
    if (itemData && typeof itemData.validate === "function") {
      itemData.validate();
    }
    const item = await this.stockRepo.update(id, itemData);
    if (!item) {
      throw ApiError.notFound("Stock item not found");
    }
    return item;
  }

  async deleteStockItem(id) {
    const deleted = await this.stockRepo.delete(id);
    if (!deleted) {
      throw ApiError.notFound("Stock item not found");
    }
    return { success: true };
  }

  // Stock Readings
  async getStockReadings(filters = {}) {
    return this.readingRepo.findAll(filters);
  }

  async getStockReadingById(id) {
    const reading = await this.readingRepo.findById(id);
    if (!reading) {
      throw ApiError.notFound("Stock reading not found");
    }
    return reading;
  }

  async saveStockReading(readingData) {
    if (readingData && typeof readingData.validate === "function") {
      readingData.validate();
    }
    return this.readingRepo.save(readingData);
  }

  async updateStockReading(id, readingData) {
    if (readingData && typeof readingData.validate === "function") {
      readingData.validate();
    }
    const reading = await this.readingRepo.update(id, readingData);
    if (!reading) {
      throw ApiError.notFound("Stock reading not found");
    }
    return reading;
  }

  async deleteStockReading(id) {
    const deleted = await this.readingRepo.delete(id);
    if (!deleted) {
      throw ApiError.notFound("Stock reading not found");
    }
    return { success: true };
  }
}

module.exports = new StockService();
