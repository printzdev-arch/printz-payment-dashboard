const customerRepository = require("../../../infrastructure/database/mongoose/repositories/customer/MongooseCustomerRepository");
const CustomerMatchingService = require("./customerMatching.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const { CreateCustomerDto, UpdateCustomerDto } = require("../../dto/customer/CustomerDto");
const { emitCustomerEvent } = require("../../../shared/events/customer/customerEvents.emitter");

class CustomerService {
  constructor(repository = customerRepository) {
    this.repository = repository;
  }

  _checkBranchAccess(branchId, authContext = {}, action = "access") {
    if (!branchId || !authContext || authContext.isSuperAdmin) return;
    const authorized = authContext.authorizedBranchIds || [];
    if (authorized.length > 0 && !authorized.includes(String(branchId))) {
      throw ErrorHelper.forbidden(`Access denied: You are not authorized to ${action} customers for branch '${branchId}'.`);
    }
  }

  async getCustomers(filters = {}, pagination = {}, authContext = {}) {
    if (filters.branchId && authContext && !authContext.isSuperAdmin) {
      this._checkBranchAccess(filters.branchId, authContext, "view");
    }
    return this.repository.findAll(filters, pagination);
  }

  async searchCustomers(query = "", limit = 10, authContext = {}) {
    if (!authContext || (!authContext.user && !authContext.isSuperAdmin)) {
      throw ErrorHelper.unauthorized("Authentication required to search customers.");
    }
    // Global search across all branches (centralized customer master)
    return this.repository.search(query, Number(limit) || 10);
  }

  async getCustomerById(id, authContext = {}) {
    if (!id) {
      throw ErrorHelper.badRequest("Customer ID is required");
    }

    if (!authContext || (!authContext.user && !authContext.isSuperAdmin)) {
      throw ErrorHelper.unauthorized("Authentication required to view customer.");
    }

    const customer = await this.repository.findById(id);
    if (!customer) {
      throw ErrorHelper.notFound(`Customer with ID ${id} not found`);
    }

    // Customer records are global across branches. Any authorized employee can view the shared profile.
    return customer;
  }

  async createCustomer(data, authContext = {}) {
    const dto = new CreateCustomerDto(data);

    if (!dto.name || !dto.name.trim()) {
      throw ErrorHelper.badRequest("Customer name is required");
    }

    if (!dto.mobile || !dto.mobile.trim()) {
      throw ErrorHelper.badRequest("Customer mobile is required");
    }

    // Enforce branch authorization if explicitly specified
    if (dto.branchId) {
      this._checkBranchAccess(dto.branchId, authContext, "create");
    } else if (authContext.user?.branchId) {
      dto.branchId = authContext.user.branchId;
    }

    // Centralized customer matching: check for existing customer before creating
    const matchResult = await CustomerMatchingService.matchOrCreateCustomer(dto, {
      branchId: dto.branchId,
    });

    return matchResult.customer;
  }

  async updateCustomer(id, data, authContext = {}) {
    const existing = await this.getCustomerById(id, authContext);
    const dto = new UpdateCustomerDto(data);

    if (dto.branchId && String(dto.branchId) !== String(existing.branchId)) {
      this._checkBranchAccess(dto.branchId, authContext, "assign");
    }

    const updated = await this.repository.update(id, dto);
    emitCustomerEvent("updated", updated);
    return updated;
  }

  async deactivateCustomer(id, authContext = {}) {
    await this.getCustomerById(id, authContext);
    const updated = await this.repository.update(id, { isActive: false });
    emitCustomerEvent("updated", updated);
    return updated;
  }

  async activateCustomer(id, authContext = {}) {
    await this.getCustomerById(id, authContext);
    const updated = await this.repository.update(id, { isActive: true });
    emitCustomerEvent("updated", updated);
    return updated;
  }

  async deleteCustomer(id, authContext = {}) {
    await this.getCustomerById(id, authContext);
    const deleted = await this.repository.delete(id);
    emitCustomerEvent("deleted", { id });
    return deleted;
  }
}

module.exports = new CustomerService();
