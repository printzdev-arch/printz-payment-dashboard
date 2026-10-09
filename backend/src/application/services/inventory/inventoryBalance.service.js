const mongoose = require("mongoose");
const inventoryBalanceRepository = require("../../../infrastructure/database/mongoose/repositories/inventory/InventoryBalanceRepository");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class InventoryBalanceService {
  constructor(balanceRepo = inventoryBalanceRepository) {
    this.balanceRepo = balanceRepo;
  }

  _applyScopeConstraint(baseQuery = {}, authContext = {}) {
    const query = { ...baseQuery };
    if (authContext.isSuperAdmin) {
      return query;
    }

    const scopes = authContext.scopes || [];
    if (scopes.includes("ALL")) {
      return query;
    }

    const authorizedBranches = (authContext.authorizedBranchIds || authContext.authorizedBranches || [])
      .map((b) => (b._id ? b._id.toString() : b.toString()))
      .filter(Boolean);

    if (scopes.includes("BRANCH")) {
      if (authorizedBranches.length > 0) {
        if (query.branchId) {
          const requestedBranch = query.branchId.toString();
          if (!authorizedBranches.includes(requestedBranch)) {
            query.branchId = new mongoose.Types.ObjectId("000000000000000000000000"); // Fail closed
          } else {
            query.branchId = new mongoose.Types.ObjectId(requestedBranch);
          }
        } else {
          query.branchId = { $in: authorizedBranches.map((b) => new mongoose.Types.ObjectId(b)) };
        }
      } else {
        query.branchId = new mongoose.Types.ObjectId("000000000000000000000000"); // Fail closed
      }
      return query;
    }

    query.branchId = new mongoose.Types.ObjectId("000000000000000000000000");
    return query;
  }

  async getBalances(filters = {}, pagination = {}, authContext = {}) {
    let matchQuery = {};
    if (filters.branchId) {
      matchQuery.branchId = mongoose.Types.ObjectId.isValid(filters.branchId)
        ? new mongoose.Types.ObjectId(filters.branchId)
        : filters.branchId;
    }

    matchQuery = this._applyScopeConstraint(matchQuery, authContext);

    return this.balanceRepo.findWithItemDetails(matchQuery, {
      page: pagination.page || 1,
      limit: pagination.limit || 50,
      category: filters.category || null,
      lowStock: filters.lowStock === "true" || filters.lowStock === true,
      search: filters.q || null,
    });
  }

  async searchPosBalances(params = {}, pagination = {}, authContext = {}) {
    let matchQuery = {};
    if (params.branchId) {
      matchQuery.branchId = mongoose.Types.ObjectId.isValid(params.branchId)
        ? new mongoose.Types.ObjectId(params.branchId)
        : params.branchId;
    }

    matchQuery = this._applyScopeConstraint(matchQuery, authContext);

    const result = await this.balanceRepo.findWithItemDetails(matchQuery, {
      page: pagination.page || 1,
      limit: pagination.limit || 50,
      search: params.q || null,
      activeOnly: true,
    });

    // Return streamlined fields for POS
    const posRecords = (result.records || []).map((rec) => ({
      itemId: rec.itemId,
      itemCode: rec.itemCode,
      name: rec.name,
      unit: rec.unit,
      quantity: rec.quantity,
      saleRate: rec.saleRate,
      taxRate: rec.taxRate,
      branchId: rec.branchId,
    }));

    return {
      records: posRecords,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  async getWarehouseBalances(params = {}, pagination = {}, authContext = {}) {
    let matchQuery = {};
    if (params.branchId) {
      matchQuery.branchId = mongoose.Types.ObjectId.isValid(params.branchId)
        ? new mongoose.Types.ObjectId(params.branchId)
        : params.branchId;
    }

    matchQuery = this._applyScopeConstraint(matchQuery, authContext);

    return this.balanceRepo.findWithItemDetails(matchQuery, {
      page: pagination.page || 1,
      limit: pagination.limit || 50,
      search: params.q || null,
      warehouseOnly: true,
    });
  }

  async getLowStock(filters = {}, pagination = {}, authContext = {}) {
    let targetBranchIds = [];

    const isSuperAdmin = Boolean(
      authContext.isSuperAdmin ||
      authContext.user?.role === "admin" ||
      authContext.user?.role === "SUPER_ADMIN" ||
      (authContext.scopes || []).includes("ALL")
    );

    const authorizedBranches = (authContext.authorizedBranchIds || authContext.authorizedBranches || [])
      .map((b) => (b && b._id ? b._id.toString() : (b ? b.toString() : "")))
      .filter(Boolean);

    if (filters.branchId) {
      const reqBranch = filters.branchId.toString();
      if (!isSuperAdmin) {
        if (!authorizedBranches.includes(reqBranch)) {
          // Fail closed for unauthorized branch request
          return {
            records: [],
            total: 0,
            page: Number(pagination.page || 1),
            limit: Number(pagination.limit || 50),
            totalPages: 0,
          };
        }
      }
      targetBranchIds = [reqBranch];
    } else {
      if (!isSuperAdmin) {
        if (authorizedBranches.length === 0) {
          return {
            records: [],
            total: 0,
            page: Number(pagination.page || 1),
            limit: Number(pagination.limit || 50),
            totalPages: 0,
          };
        }
        targetBranchIds = authorizedBranches;
      }
    }

    return this.balanceRepo.findLowStock({
      branchIds: targetBranchIds,
      category: filters.category || null,
      search: filters.q || null,
      page: pagination.page || 1,
      limit: pagination.limit || 50,
    });
  }
}

module.exports = new InventoryBalanceService();

