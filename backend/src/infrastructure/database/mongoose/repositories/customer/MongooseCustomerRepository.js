const Customer = require("../../models/customer/Customer");
const ICustomerRepository = require("../../../../../domain/repositories/customer/ICustomerRepository");

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeDigits(phone) {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[^\d]/g, "").trim();
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}

class MongooseCustomerRepository extends ICustomerRepository {
  async findById(id) {
    return Customer.findById(id).lean();
  }

  async findByCode(customerCode) {
    return Customer.findOne({ customerCode: String(customerCode).trim().toUpperCase() }).lean();
  }

  async findByMobile(mobile) {
    const raw = String(mobile || "").trim();
    if (!raw) return null;
    const digits = normalizeDigits(raw);

    const conditions = [{ mobile: raw }, { phone: raw }];
    if (digits) {
      conditions.push({ mobile: digits }, { phone: digits });
      conditions.push({ mobile: `+91${digits}` }, { phone: `+91${digits}` });
    }

    return Customer.findOne({ $or: conditions }).lean();
  }

  async findByEmail(email) {
    if (!email || typeof email !== "string") return null;
    return Customer.findOne({ email: email.trim().toLowerCase() }).lean();
  }

  async addVisitedBranch(customerId, branchId) {
    if (!customerId || !branchId) return null;
    return Customer.findByIdAndUpdate(
      customerId,
      { $addToSet: { visitedBranches: branchId } },
      { new: true }
    ).lean();
  }

  async findAll(filters = {}, pagination = { page: 1, limit: 20 }) {
    const conditions = [];

    if (filters.customerType) {
      conditions.push({ customerType: filters.customerType });
    }

    if (filters.isActive !== undefined) {
      conditions.push({ isActive: filters.isActive === "true" || filters.isActive === true });
    }

    // Explicit branch filter if caller specifically asked for it
    if (filters.branchId) {
      conditions.push({
        $or: [
          { branchId: filters.branchId },
          { visitedBranches: filters.branchId },
        ],
      });
    }

    if (filters.q) {
      const escaped = escapeRegex(filters.q.trim());
      const regex = new RegExp(escaped, "i");
      const orConditions = [
        { name: regex },
        { mobile: regex },
        { phone: regex },
        { customerCode: regex },
        { email: regex },
        { gstin: regex },
        { company: regex },
        { companyName: regex },
      ];

      const digits = normalizeDigits(filters.q);
      if (digits.length >= 4) {
        orConditions.push({ mobile: new RegExp(escapeRegex(digits), "i") });
        orConditions.push({ phone: new RegExp(escapeRegex(digits), "i") });
      }

      conditions.push({ $or: orConditions });
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};

    const page = Math.max(1, Number(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(pagination.limit) || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Customer.countDocuments(query),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Search active customers across all branches (centralized customer master).
   * Returns safe fields required for Job Cart and Job Order creation.
   * Excludes sensitive internal financial data.
   */
  async search(searchTerm, limit = 10, options = {}) {
    const term = String(searchTerm || "").trim();
    if (!term) return [];

    const escaped = escapeRegex(term);
    const regex = new RegExp(escaped, "i");

    const orConditions = [
      { name: regex },
      { email: regex },
      { customerCode: regex },
      { company: regex },
      { companyName: regex },
      { mobile: regex },
      { phone: regex },
      { gstin: regex },
    ];

    const digits = normalizeDigits(term);
    if (digits.length >= 4) {
      orConditions.push({ mobile: new RegExp(escapeRegex(digits), "i") });
      orConditions.push({ phone: new RegExp(escapeRegex(digits), "i") });
    }

    const conditions = [{ isActive: true }, { $or: orConditions }];

    // If caller explicitly provides a filterBranchId option
    if (options && typeof options === "object" && options.filterBranchId) {
      conditions.push({
        $or: [
          { branchId: options.filterBranchId },
          { visitedBranches: options.filterBranchId },
        ],
      });
    }

    const query = { $and: conditions };

    return Customer.find(query)
      .select(
        "_id customerCode name mobile phone email company companyName gstin address customerType branchId primaryBranchId visitedBranches isActive createdAt"
      )
      .limit(Number(limit) || 10)
      .lean();
  }

  async create(customerData) {
    const customer = new Customer(customerData);
    return customer.save();
  }

  async update(id, customerData) {
    return Customer.findByIdAndUpdate(id, { $set: customerData }, { new: true, runValidators: true }).lean();
  }

  async delete(id) {
    return Customer.findByIdAndDelete(id).lean();
  }
}

module.exports = new MongooseCustomerRepository();

