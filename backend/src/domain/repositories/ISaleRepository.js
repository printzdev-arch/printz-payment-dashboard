/**
 * ISaleRepository Interface / Contract
 */
class ISaleRepository {
  async findAll(filters) {
    throw new Error("Method not implemented");
  }
  async findById(id) {
    throw new Error("Method not implemented");
  }
  async findByInvoiceNo(invoiceNo) {
    throw new Error("Method not implemented");
  }
  async create(saleData) {
    throw new Error("Method not implemented");
  }
}

module.exports = ISaleRepository;
