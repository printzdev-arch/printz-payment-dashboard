/**
 * IPaymentRepository Interface / Contract
 */
class IPaymentRepository {
  async findAll(filters) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async create(paymentData) { throw new Error("Method not implemented"); }
  async update(id, paymentData) { throw new Error("Method not implemented"); }
  async delete(id) { throw new Error("Method not implemented"); }
}

module.exports = IPaymentRepository;
