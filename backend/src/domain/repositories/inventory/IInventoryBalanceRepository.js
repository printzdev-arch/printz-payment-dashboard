/**
 * IInventoryBalanceRepository Interface / Contract
 */
class IInventoryBalanceRepository {
  async findAll(query, options) { throw new Error("Method not implemented"); }
  async findByItemAndBranch(itemId, branchId, session) { throw new Error("Method not implemented"); }
  async incrementBalance(itemId, branchId, quantityChange, session) { throw new Error("Method not implemented"); }
  async findWithItemDetails(query, options) { throw new Error("Method not implemented"); }
}

module.exports = IInventoryBalanceRepository;
