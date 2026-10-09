const inventoryService = require("../../../application/services/inventory/inventory.service");
const inventoryBalanceRepository = require("../../../infrastructure/database/mongoose/repositories/inventory/InventoryBalanceRepository");

class InventoryHelper {
  /**
   * Helper for Sales, Jobs, Orders, Transfers to post an inventory transaction.
   *
   * @param {Object} params
   * @param {string|ObjectId} params.itemId
   * @param {string|ObjectId} params.branchId
   * @param {string} params.type - SALE, JOB_CONSUMPTION, PURCHASE, ISSUE, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT
   * @param {number} params.quantity
   * @param {string} [params.consumptionType]
   * @param {string} [params.referenceType]
   * @param {string|ObjectId} [params.referenceId]
   * @param {string|ObjectId} params.performedBy
   * @param {string} [params.notes]
   * @param {ClientSession} [params.session]
   */
  static async post(params) {
    return inventoryService.post(params);
  }

  /**
   * Get current stock quantity for an item at a specific branch.
   */
  static async getAvailableStock(itemId, branchId, session = null) {
    const balance = await inventoryBalanceRepository.findByItemAndBranch(itemId, branchId, session);
    return balance ? Number(balance.quantity) : 0;
  }
}

module.exports = InventoryHelper;
