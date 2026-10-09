const mongoose = require("mongoose");
const inventoryItemRepository = require("../../../infrastructure/database/mongoose/repositories/inventory/InventoryItemRepository");
const inventoryBalanceRepository = require("../../../infrastructure/database/mongoose/repositories/inventory/InventoryBalanceRepository");
const inventoryTransactionRepository = require("../../../infrastructure/database/mongoose/repositories/inventory/InventoryTransactionRepository");
const numberSequenceService = require("../common/numberSequence.service");
const AuditHelper = require("../../../shared/utils/common/AuditHelper");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

const POSITIVE_TYPES = new Set(["OPENING", "PURCHASE", "RETURN", "TRANSFER_IN"]);
const NEGATIVE_TYPES = new Set(["SALE", "ISSUE", "TRANSFER_OUT", "JOB_CONSUMPTION"]);

class InventoryService {
  constructor(
    itemRepo = inventoryItemRepository,
    balanceRepo = inventoryBalanceRepository,
    txnRepo = inventoryTransactionRepository,
    seqService = numberSequenceService
  ) {
    this.itemRepo = itemRepo;
    this.balanceRepo = balanceRepo;
    this.txnRepo = txnRepo;
    this.seqService = seqService;
  }

  /**
   * Central Inventory Engine: Posts an immutable ledger transaction and updates balance atomically.
   *
   * @param {Object} params
   * @param {string|ObjectId} params.itemId - Target InventoryItem ID
   * @param {string|ObjectId} params.branchId - Target Branch ID
   * @param {string} params.type - OPENING, PURCHASE, SALE, ISSUE, RETURN, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT, JOB_CONSUMPTION
   * @param {number|string} params.quantity - Quantity (sign enforced by transaction type rules)
   * @param {string} [params.consumptionType] - PRINTING_ASSET, PAPER, INK_TONER, OTHER_CONSUMABLE
   * @param {string} [params.referenceType] - SALE, JOB, PURCHASE, TRANSFER, ADJUSTMENT
   * @param {string|ObjectId} [params.referenceId] - Reference document ID
   * @param {string|ObjectId} params.performedBy - User ID executing the transaction
   * @param {Date} [params.transactionDate=new Date()]
   * @param {string} [params.notes]
   * @param {ClientSession} [params.session] - Existing mongoose transaction session
   */
  async post({
    itemId,
    branchId,
    type,
    quantity,
    consumptionType = null,
    referenceType = null,
    referenceId = null,
    performedBy,
    transactionDate = new Date(),
    notes = null,
    session = null,
  }) {
    if (!itemId || !branchId || !type || quantity === undefined || quantity === null || !performedBy) {
      throw ErrorHelper.badRequest("itemId, branchId, type, quantity, and performedBy are required");
    }

    const typeUpper = String(type).trim().toUpperCase();

    // 1. Validate item exists and is active
    const item = await this.itemRepo.findById(itemId);
    if (!item) {
      throw ErrorHelper.notFound(`Inventory item '${itemId}' not found`);
    }
    if (!item.isActive && typeUpper !== "OPENING") {
      throw ErrorHelper.badRequest(`Inventory item '${item.itemCode}' is inactive`);
    }

    // 2. Sign enforcement rule (Server-side validation)
    let rawQty = Number(quantity);
    if (isNaN(rawQty) || rawQty === 0) {
      throw ErrorHelper.badRequest("Quantity must be a non-zero number");
    }

    let deltaQty = rawQty;
    if (POSITIVE_TYPES.has(typeUpper)) {
      deltaQty = Math.abs(rawQty); // Enforce positive
    } else if (NEGATIVE_TYPES.has(typeUpper)) {
      deltaQty = -Math.abs(rawQty); // Enforce negative
    } else if (typeUpper === "ADJUSTMENT") {
      deltaQty = rawQty; // Positive or negative as specified
    } else {
      throw ErrorHelper.badRequest(`Unsupported transaction type '${type}'`);
    }

    // 3. Negative Stock Prevention & Balance Check
    const currentBalanceDoc = await this.balanceRepo.findByItemAndBranch(itemId, branchId, session);
    const currentQty = currentBalanceDoc ? Number(currentBalanceDoc.quantity) : 0;

    if (deltaQty < 0 && currentQty + deltaQty < 0) {
      const err = new Error("Insufficient stock for this operation");
      err.statusCode = 422;
      err.code = "INSUFFICIENT_STOCK";
      err.data = {
        itemId: item._id,
        itemCode: item.itemCode,
        name: item.name,
        branchId,
        required: Math.abs(deltaQty),
        available: currentQty,
      };
      throw err;
    }

    // Execute with existing session or manage standalone
    const executeOperations = async (activeSession) => {
      // Generate transaction number (e.g. TXN-00001)
      const transactionNo = await this.seqService.generateBusinessNumber("INVENTORY_TRANSACTION", {
        prefix: "TXN",
      });

      // Update balance via $inc
      const updatedBalance = await this.balanceRepo.incrementBalance(
        itemId,
        branchId,
        deltaQty,
        activeSession
      );

      // Create immutable ledger record
      const transactionRecord = await this.txnRepo.create(
        {
          transactionNo,
          itemId,
          branchId,
          type: typeUpper,
          consumptionType,
          quantity: deltaQty,
          referenceType,
          referenceId,
          performedBy,
          transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
          notes,
          createdAt: new Date(),
        },
        activeSession
      );

      return {
        transaction: transactionRecord,
        newBalance: updatedBalance ? Number(updatedBalance.quantity) : currentQty + deltaQty,
      };
    };

    let result;
    if (session) {
      result = await executeOperations(session);
    } else {
      const isReplicaSet = Boolean(mongoose.connection.client?.topology?.description?.servers?.size > 1);
      if (isReplicaSet) {
        const localSession = await mongoose.startSession();
        try {
          localSession.startTransaction();
          result = await executeOperations(localSession);
          await localSession.commitTransaction();
        } catch (err) {
          await localSession.abortTransaction();
          throw err;
        } finally {
          localSession.endSession();
        }
      } else {
        result = await executeOperations(null);
      }
    }

    // Async Audit Logging (non-blocking)
    AuditHelper.log({
      actorId: performedBy,
      action: `INVENTORY_${typeUpper}`,
      entityType: "INVENTORY_ITEM",
      entityId: itemId,
      before: { quantity: currentQty },
      after: { quantity: result.newBalance, delta: deltaQty, transactionNo: result.transaction.transactionNo },
      branchId,
    }).catch((err) => console.warn("[InventoryService] Audit log failed:", err.message));

    return result;
  }
}

module.exports = new InventoryService();
