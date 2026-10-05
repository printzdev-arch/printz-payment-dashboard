/**
 * ITotalAmountReadingRepository Interface / Contract
 */
class ITotalAmountReadingRepository {
  async findAll(filters) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findByBranchAndDate(branchName, date) { throw new Error("Method not implemented"); }
  async save(readingData) { throw new Error("Method not implemented"); }
  async update(id, updateData) { throw new Error("Method not implemented"); }
  async delete(id) { throw new Error("Method not implemented"); }
}

module.exports = ITotalAmountReadingRepository;
