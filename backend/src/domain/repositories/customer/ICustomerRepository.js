/**
 * Abstract Customer Repository Interface Contract
 * Clean Architecture - Domain Layer
 */
class ICustomerRepository {
  async findById(id) {
    throw new Error("Method not implemented");
  }

  async findByCode(customerCode) {
    throw new Error("Method not implemented");
  }

  async findByMobile(mobile) {
    throw new Error("Method not implemented");
  }

  async findAll(filters, pagination) {
    throw new Error("Method not implemented");
  }

  async search(query, limit) {
    throw new Error("Method not implemented");
  }

  async create(customerData) {
    throw new Error("Method not implemented");
  }

  async update(id, customerData) {
    throw new Error("Method not implemented");
  }

  async delete(id) {
    throw new Error("Method not implemented");
  }
}

module.exports = ICustomerRepository;
