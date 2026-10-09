const inventoryItemRepository = require("../../../infrastructure/database/mongoose/repositories/inventory/InventoryItemRepository");
const inventoryBalanceRepository = require("../../../infrastructure/database/mongoose/repositories/inventory/InventoryBalanceRepository");
const AuditHelper = require("../../../shared/utils/common/AuditHelper");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class InventoryItemService {
  constructor(itemRepo = inventoryItemRepository, balanceRepo = inventoryBalanceRepository) {
    this.itemRepo = itemRepo;
    this.balanceRepo = balanceRepo;
  }

  async getItems(filters = {}, pagination = {}) {
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

    return this.itemRepo.findAll(query, pagination);
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

    AuditHelper.log({
      actorId: authContext.user?._id || authContext.user?.id,
      action: "CREATE",
      entityType: "INVENTORY_ITEM",
      entityId: item._id,
      after: item,
    }).catch((err) => console.warn("[InventoryItemService] Audit error:", err.message));

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

    AuditHelper.log({
      actorId: authContext.user?._id || authContext.user?.id,
      action: "UPDATE",
      entityType: "INVENTORY_ITEM",
      entityId: id,
      before: existing,
      after: updated,
    }).catch((err) => console.warn("[InventoryItemService] Audit error:", err.message));

    return updated;
  }

  async deactivateItem(id, authContext = {}) {
    const existing = await this.itemRepo.findById(id);
    if (!existing) {
      throw ErrorHelper.notFound("Inventory item not found");
    }

    const updated = await this.itemRepo.setActive(id, false);

    AuditHelper.log({
      actorId: authContext.user?._id || authContext.user?.id,
      action: "DEACTIVATE",
      entityType: "INVENTORY_ITEM",
      entityId: id,
      before: { isActive: true },
      after: { isActive: false },
    }).catch((err) => console.warn("[InventoryItemService] Audit error:", err.message));

    return updated;
  }

  async activateItem(id, authContext = {}) {
    const existing = await this.itemRepo.findById(id);
    if (!existing) {
      throw ErrorHelper.notFound("Inventory item not found");
    }

    const updated = await this.itemRepo.setActive(id, true);

    AuditHelper.log({
      actorId: authContext.user?._id || authContext.user?.id,
      action: "ACTIVATE",
      entityType: "INVENTORY_ITEM",
      entityId: id,
      before: { isActive: false },
      after: { isActive: true },
    }).catch((err) => console.warn("[InventoryItemService] Audit error:", err.message));

    return updated;
  }
}

module.exports = new InventoryItemService();
