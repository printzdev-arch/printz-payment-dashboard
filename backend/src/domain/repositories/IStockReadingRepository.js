/**
 * IStockReadingRepository Interface / Contract
 */
class IStockReadingRepository {
  async findAll(filters) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findByBranchAndDate(branchName, date) { throw new Error("Method not implemented"); }
  async save(readingData) { throw new Error("Method not implemented"); }
  async delete(id) { throw new Error("Method not implemented"); }
}

module.exports = IStockReadingRepository;
