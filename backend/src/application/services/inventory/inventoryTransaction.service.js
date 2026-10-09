const mongoose = require("mongoose");
const inventoryTransactionRepository = require("../../../infrastructure/database/mongoose/repositories/inventory/InventoryTransactionRepository");
const inventoryBalanceRepository = require("../../../infrastructure/database/mongoose/repositories/inventory/InventoryBalanceRepository");
const inventoryService = require("./inventory.service");
const ApprovalHelper = require("../../../shared/utils/common/ApprovalHelper");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

// Threshold above which stock adjustments trigger an Approval workflow
const ADJUSTMENT_APPROVAL_THRESHOLD = 50; // Units

class InventoryTransactionService {
  constructor(
    txnRepo = inventoryTransactionRepository,
    balanceRepo = inventoryBalanceRepository,
    invService = inventoryService
  ) {
    this.txnRepo = txnRepo;
    this.balanceRepo = balanceRepo;
    this.invService = invService;
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
          }
        } else {
          query.branchId = { $in: authorizedBranches.map((b) => new mongoose.Types.ObjectId(b)) };
        }
      } else {
        query.branchId = new mongoose.Types.ObjectId("000000000000000000000000");
      }
      return query;
    }

    query.branchId = new mongoose.Types.ObjectId("000000000000000000000000");
    return query;
  }

  async getTransactions(filters = {}, pagination = {}, authContext = {}) {
    let query = {};
    if (filters.itemId) query.itemId = filters.itemId;
    if (filters.branchId) query.branchId = filters.branchId;
    if (filters.type) query.type = String(filters.type).trim().toUpperCase();
    if (filters.consumptionType) query.consumptionType = String(filters.consumptionType).trim().toUpperCase();
    if (filters.referenceType) query.referenceType = String(filters.referenceType).trim().toUpperCase();
    if (filters.referenceId) query.referenceId = filters.referenceId;
    if (filters.performedBy) query.performedBy = filters.performedBy;

    if (filters.from || filters.to) {
      query.transactionDate = {};
      if (filters.from) query.transactionDate.$gte = new Date(filters.from);
      if (filters.to) query.transactionDate.$lte = new Date(filters.to);
    }

    query = this._applyScopeConstraint(query, authContext);
    return this.txnRepo.findAll(query, pagination);
  }

  async getTransactionById(id, authContext = {}) {
    const txn = await this.txnRepo.findById(id);
    if (!txn) {
      throw ErrorHelper.notFound("Inventory transaction not found");
    }

    // Branch scoping check
    if (!authContext.isSuperAdmin && !(authContext.scopes || []).includes("ALL")) {
      const authorizedBranches = (authContext.authorizedBranchIds || authContext.authorizedBranches || [])
        .map((b) => (b._id ? b._id.toString() : b.toString()))
        .filter(Boolean);

      const txnBranch = txn.branchId?._id ? txn.branchId._id.toString() : txn.branchId?.toString();
      if (!txnBranch || !authorizedBranches.includes(txnBranch)) {
        throw ErrorHelper.forbidden("Access denied to this inventory transaction record");
      }
    }

    return txn;
  }

  async recordAdjustment(data, authContext = {}) {
    const { branchId, itemId, quantity, notes } = data;
    if (!branchId || !itemId || quantity === undefined || quantity === null) {
      throw ErrorHelper.badRequest("branchId, itemId, and quantity are required");
    }
    if (!notes || String(notes).trim() === "") {
      throw ErrorHelper.badRequest("notes field is required for stock adjustments");
    }

    const performedBy = authContext.user?._id || authContext.user?.id;
    const absQty = Math.abs(Number(quantity));

    // Check if threshold requires Approval
    if (absQty > ADJUSTMENT_APPROVAL_THRESHOLD) {
      const approval = await ApprovalHelper.requestApproval({
        referenceType: "STOCK_ADJUSTMENT",
        referenceId: itemId,
        requestedBy: performedBy,
        branchId,
        comments: `High volume adjustment (${quantity} units): ${notes}`,
      });

      return {
        requiresApproval: true,
        approvalNo: approval.approvalNo,
        approvalId: approval._id,
        status: approval.status,
        message: "Adjustment exceeds threshold and has been submitted for approval",
      };
    }

    return this.invService.post({
      itemId,
      branchId,
      type: "ADJUSTMENT",
      quantity: Number(quantity),
      performedBy,
      notes: String(notes).trim(),
    });
  }

  async recordIssue(data, authContext = {}) {
    const { branchId, itemId, quantity, consumptionType, notes } = data;
    if (!branchId || !itemId || !quantity) {
      throw ErrorHelper.badRequest("branchId, itemId, and quantity are required");
    }

    const performedBy = authContext.user?._id || authContext.user?.id;
    const qty = Math.abs(Number(quantity)); // Positive quantity issued -> subtracts stock

    return this.invService.post({
      itemId,
      branchId,
      type: "ISSUE",
      consumptionType: consumptionType ? String(consumptionType).trim().toUpperCase() : "OTHER_CONSUMABLE",
      quantity: -qty, // Negative quantity
      performedBy,
      notes: notes || "Internal usage issue",
    });
  }

  async recordOpeningStock(data, authContext = {}) {
    const { branchId, lines } = data;
    if (!branchId || !Array.isArray(lines) || lines.length === 0) {
      throw ErrorHelper.badRequest("branchId and lines array are required");
    }

    const performedBy = authContext.user?._id || authContext.user?.id;
    const results = [];

    for (const line of lines) {
      if (!line.itemId || !line.quantity) {
        throw ErrorHelper.badRequest("Each line must contain itemId and quantity");
      }

      // Check if balance record already exists
      const existingBalance = await this.balanceRepo.findByItemAndBranch(line.itemId, branchId);
      if (existingBalance && Number(existingBalance.quantity) > 0) {
        throw ErrorHelper.badRequest(
          `Opening stock is only allowed when no balance exists. Item '${line.itemId}' already has balance ${existingBalance.quantity}`
        );
      }

      const res = await this.invService.post({
        itemId: line.itemId,
        branchId,
        type: "OPENING",
        quantity: Math.abs(Number(line.quantity)),
        performedBy,
        notes: line.notes || "Initial opening stock setup",
      });

      results.push(res);
    }

    return {
      message: "Opening stock recorded successfully",
      processedCount: results.length,
      records: results,
    };
  }
}

module.exports = new InventoryTransactionService();
