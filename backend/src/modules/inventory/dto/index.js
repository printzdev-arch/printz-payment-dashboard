/**
 * API 03 - Inventory & Ledger DTOs
 */

const InventoryDto = require("./InventoryDto");
const StockDto = require("../../stocks/dto/StockDto");

module.exports = {
  ...InventoryDto,
  ...StockDto,
};
