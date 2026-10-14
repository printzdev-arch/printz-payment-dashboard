class IInvoiceRepository {
  async create(invoiceData) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findByInvoiceNumber(invoiceNumber) { throw new Error("Method not implemented"); }
  async findByJobOrderId(jobOrderId) { throw new Error("Method not implemented"); }
  async findAll(filter, pagination) { throw new Error("Method not implemented"); }
  async updateById(id, updateData) { throw new Error("Method not implemented"); }
  async count(filter) { throw new Error("Method not implemented"); }
}

module.exports = IInvoiceRepository;
