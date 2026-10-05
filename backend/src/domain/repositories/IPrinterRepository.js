/**
 * IPrinterRepository Interface / Contract
 */
class IPrinterRepository {
  async findAll(filters) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async create(printerData) { throw new Error("Method not implemented"); }
  async update(id, printerData) { throw new Error("Method not implemented"); }
  async delete(id) { throw new Error("Method not implemented"); }
}

module.exports = IPrinterRepository;
