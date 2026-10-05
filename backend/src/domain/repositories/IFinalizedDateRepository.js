/**
 * IFinalizedDateRepository Interface / Contract
 */
class IFinalizedDateRepository {
  async findAll(filters) { throw new Error("Method not implemented"); }
  async findByBranchAndDate(branchName, date) { throw new Error("Method not implemented"); }
  async finalize(branchName, date, data) { throw new Error("Method not implemented"); }
}

module.exports = IFinalizedDateRepository;
