/**
 * API 03 - Inventory & Ledger DTOs
 */

const InventoryDto = require("../InventoryDto");
const StockDto = require("../StockDto");

module.exports = {
  ...InventoryDto,
  ...StockDto,
};
