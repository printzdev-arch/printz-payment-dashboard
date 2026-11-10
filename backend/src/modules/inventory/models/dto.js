/**
 * API 03 - Inventory & Ledger DTOs
 */

const InventoryDto = require("./InventoryDto");
const StockDto = require("../../stocks/models/StockDto");

module.exports = {
  ...InventoryDto,
  ...StockDto,
};
