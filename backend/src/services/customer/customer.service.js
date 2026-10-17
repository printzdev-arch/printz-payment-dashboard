const customerRepository = require("../../models/customer/Customer");
const Customer = require("../../models/customer/Customer");
const CustomerMatchingService = require("./customerMatching.service");
const ErrorHelper = require("../../utils/ApiError");
const { CreateCustomerDto, UpdateCustomerDto } = require("../../utils/dto/customer/CustomerDto");
const { emitCustomerEvent } = require("../../utils/events/customer/customerEvents.emitter");
const numberSequenceService = require("../common/numberSequence.service");

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

    // Default branch of all customer should be manager branch
    const managerBranchId = authContext.user?.branchId || (authContext.user?.branchIds && authContext.user?.branchIds[0]) || null;
    if (!dto.branchId && managerBranchId) {
      dto.branchId = managerBranchId;
    }
    if (!dto.primaryBranchId && dto.branchId) {
      dto.primaryBranchId = dto.branchId;
    }

    // Enforce branch authorization if explicitly specified
    if (dto.branchId) {
      this._checkBranchAccess(dto.branchId, authContext, "create");
    }

    // 1. Field-specific duplicate check: Customer Name (case-insensitive)
    const trimmedName = dto.name.trim();
    const existingByName = await Customer.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, "i") },
    }).lean();
    if (existingByName) {
      throw ErrorHelper.conflict(`Customer with name '${trimmedName}' already exists. Please give a different name.`);
    }

    // 2. Field-specific duplicate check: Customer Phone Number
    const existingByPhone = await customerRepository.findByMobile(dto.mobile);
    if (existingByPhone) {
      throw ErrorHelper.conflict(`Customer with phone number '${dto.mobile}' already exists. Please give a different phone number.`);
    }

    // 3. Field-specific duplicate check: Customer Email ID
    if (dto.email && typeof dto.email === "string" && dto.email.trim()) {
      const trimmedEmail = dto.email.trim().toLowerCase();
      const existingByEmail = await customerRepository.findByEmail(trimmedEmail);
      if (existingByEmail) {
        throw ErrorHelper.conflict(`Customer with email '${dto.email.trim()}' already exists. Please give a different email.`);
      }
    }

    if (!dto.customerCode) {
      let code = null;
      let attempts = 0;
      while (!code && attempts < 10) {
        attempts++;
        try {
          const generated = await numberSequenceService.generateBusinessNumber("CUSTOMER", {
            branchId: null, // Customer codes are global across branches
          });
          const existing = await Customer.findOne({ customerCode: generated }).lean();
          if (!existing) {
            code = generated;
          }
        } catch (_) {
          break;
        }
      }
      if (!code) {
        const rand = Math.floor(10000 + Math.random() * 90000);
        code = `CUS-${rand}`;
      }
      dto.customerCode = code;
    }
    if (dto.branchId && (!dto.visitedBranches || dto.visitedBranches.length === 0)) {
      dto.visitedBranches = [dto.branchId];
    }
    dto.primaryBranchId = dto.branchId;

    const created = await this.repository.create(dto);
    emitCustomerEvent("created", created);
    const customerObj = created.toObject ? created.toObject() : { ...created };
    customerObj.isNew = true;

    return customerObj;
  }

  async updateCustomer(id, data, authContext = {}) {
    const existing = await this.getCustomerById(id, authContext);
    const dto = new UpdateCustomerDto(data);

    if (dto.branchId && String(dto.branchId) !== String(existing.branchId)) {
      this._checkBranchAccess(dto.branchId, authContext, "assign");
    }

    // 1. Field-specific duplicate check: Customer Name on update
    if (dto.name && dto.name.trim()) {
      const trimmedName = dto.name.trim();
      const dupName = await Customer.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, "i") },
      }).lean();
      if (dupName) {
        throw ErrorHelper.conflict(`Customer with name '${trimmedName}' already exists. Please give a different name.`);
      }
    }

    // 2. Field-specific duplicate check: Customer Phone Number on update
    if (dto.mobile && dto.mobile.trim()) {
      const cleanPhone = CustomerMatchingService.normalizePhone(dto.mobile);
      const conditions = [{ mobile: dto.mobile.trim() }, { phone: dto.mobile.trim() }];
      if (cleanPhone) {
        conditions.push({ mobile: cleanPhone }, { phone: cleanPhone });
        conditions.push({ mobile: `+91${cleanPhone}` }, { phone: `+91${cleanPhone}` });
      }
      const dupPhone = await Customer.findOne({
        _id: { $ne: id },
        $or: conditions,
      }).lean();
      if (dupPhone) {
        throw ErrorHelper.conflict(`Customer with phone number '${dto.mobile}' already exists. Please give a different phone number.`);
      }
    }

    // 3. Field-specific duplicate check: Customer Email on update
    if (dto.email && typeof dto.email === "string" && dto.email.trim()) {
      const trimmedEmail = dto.email.trim().toLowerCase();
      const dupEmail = await Customer.findOne({
        _id: { $ne: id },
        email: trimmedEmail,
      }).lean();
      if (dupEmail) {
        throw ErrorHelper.conflict(`Customer with email '${dto.email.trim()}' already exists. Please give a different email.`);
      }
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
