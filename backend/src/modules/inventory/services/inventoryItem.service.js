const mongoose = require("mongoose");
const inventoryItemRepository = require("../models/InventoryItem");
const inventoryBalanceRepository = require("../models/InventoryBalance");
const ErrorHelper = require("../../../utils/errors/ApiError");

class InventoryItemService {
  constructor(itemRepo = inventoryItemRepository, balanceRepo = inventoryBalanceRepository) {
    this.itemRepo = itemRepo;
    this.balanceRepo = balanceRepo;
  }

  async getItems(filters = {}, pagination = {}, authContext = {}) {
    const query = {};
    if (filters.category) {
      query.category = String(filters.category).trim().toUpperCase();
    }
    if (filters.isActive !== undefined && filters.isActive !== null && filters.isActive !== "") {
      query.isActive = String(filters.isActive) === "true" || filters.isActive === true;
    }
    if (filters.q) {
      const regex = new RegExp(String(filters.q).trim(), "i");
      query.$or = [{ itemCode: regex }, { name: regex }, { hsnCode: regex }];
    }

    const result = await this.itemRepo.findAll(query, pagination);
    if (!result || !Array.isArray(result.records) || result.records.length === 0) {
      return result;
    }

    // Enrich items with current branch / overall stock balances
    try {
      const itemIds = result.records.map((r) => r._id);
      const balanceQuery = { itemId: { $in: itemIds } };

      const targetBranch =
        filters.branchId ||
        (authContext.authorizedBranchIds && authContext.authorizedBranchIds.length === 1
          ? authContext.authorizedBranchIds[0]
          : null);

      if (targetBranch) {
        balanceQuery.branchId = mongoose.Types.ObjectId.isValid(targetBranch)
          ? new mongoose.Types.ObjectId(targetBranch)
          : targetBranch;
      }

      const balances = await this.balanceRepo.find(balanceQuery).lean();
      const balanceMap = {};
      balances.forEach((b) => {
        const idStr = b.itemId?.toString();
        balanceMap[idStr] = (balanceMap[idStr] || 0) + (Number(b.quantity) || 0);
      });

      result.records = result.records.map((rec) => {
        const idStr = rec._id?.toString();
        const stock = balanceMap[idStr] !== undefined ? balanceMap[idStr] : 0;
        return {
          ...rec,
          currentStock: stock,
          quantity: stock,
        };
      });
    } catch (enrichErr) {
      console.warn("[InventoryItemService] Could not enrich stock balances:", enrichErr.message);
    }

    return result;
  }

  async getItemById(id, authContext = {}) {
    const item = await this.itemRepo.findById(id);
    if (!item) {
      throw ErrorHelper.notFound("Inventory item not found");
    }

    // Branch scoping for balances:
    const balanceQuery = { itemId: item._id };
    if (!authContext.isSuperAdmin && !(authContext.scopes || []).includes("ALL")) {
      const authorizedBranches = (authContext.authorizedBranchIds || authContext.authorizedBranches || [])
        .map((b) => (b._id ? b._id.toString() : b.toString()))
        .filter(Boolean);

      if ((authContext.scopes || []).includes("BRANCH")) {
        if (authorizedBranches.length > 0) {
          balanceQuery.branchId = { $in: authorizedBranches };
        } else {
          balanceQuery.branchId = "__NO_BRANCH_ACCESS__";
        }
      }
    }

    const balances = await this.balanceRepo.findAll(balanceQuery, { limit: 100 });

    return {
      ...item,
      balances: balances.records || [],
    };
  }

  async createItem(data, authContext = {}) {
    if (!data.itemCode || !data.name || !data.unit) {
      throw ErrorHelper.badRequest("itemCode, name, and unit are required");
    }

    const code = String(data.itemCode).trim().toUpperCase();
    const existing = await this.itemRepo.findByItemCode(code);
    if (existing) {
      const err = new Error(`Item code '${code}' already exists`);
      err.statusCode = 409;
      err.code = "DUPLICATE";
      throw err;
    }

    const item = await this.itemRepo.create({
      itemCode: code,
      name: String(data.name).trim(),
      category: data.category ? String(data.category).trim().toUpperCase() : null,
      hsnCode: data.hsnCode ? String(data.hsnCode).trim() : null,
      unit: String(data.unit).trim().toUpperCase(),
      purchaseRate: Number(data.purchaseRate) || 0,
      saleRate: Number(data.saleRate) || 0,
      taxRate: Number(data.taxRate) || 0,
      reorderLevel: Number(data.reorderLevel) || 0,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      isStockTracked: data.isStockTracked !== undefined ? Boolean(data.isStockTracked) : true,
    });

    return item;
  }

  async updateItem(id, data, authContext = {}) {
    const existing = await this.itemRepo.findById(id);
    if (!existing) {
      throw ErrorHelper.notFound("Inventory item not found");
    }

    const updatePayload = {};
    if (data.name !== undefined) updatePayload.name = String(data.name).trim();
    if (data.category !== undefined) updatePayload.category = data.category ? String(data.category).trim().toUpperCase() : null;
    if (data.hsnCode !== undefined) updatePayload.hsnCode = data.hsnCode ? String(data.hsnCode).trim() : null;
    if (data.unit !== undefined) updatePayload.unit = String(data.unit).trim().toUpperCase();
    if (data.purchaseRate !== undefined) updatePayload.purchaseRate = Number(data.purchaseRate) || 0;
    if (data.saleRate !== undefined) updatePayload.saleRate = Number(data.saleRate) || 0;
    if (data.taxRate !== undefined) updatePayload.taxRate = Number(data.taxRate) || 0;
    if (data.reorderLevel !== undefined) updatePayload.reorderLevel = Number(data.reorderLevel) || 0;
    if (data.isActive !== undefined) updatePayload.isActive = Boolean(data.isActive);
    if (data.isStockTracked !== undefined) updatePayload.isStockTracked = Boolean(data.isStockTracked);

    const updated = await this.itemRepo.update(id, updatePayload);

    return updated;
  }

  async deactivateItem(id, authContext = {}) {
    const existing = await this.itemRepo.findById(id);
    if (!existing) {
      throw ErrorHelper.notFound("Inventory item not found");
    }

    const updated = await this.itemRepo.setActive(id, false);

    return updated;
  }

  async activateItem(id, authContext = {}) {
    const existing = await this.itemRepo.findById(id);
    if (!existing) {
      throw ErrorHelper.notFound("Inventory item not found");
    }

    const updated = await this.itemRepo.setActive(id, true);

    return updated;
  }
}

module.exports = new InventoryItemService();
