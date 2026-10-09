const mongoose = require("mongoose");
const purchaseReceiptRepository = require("../../../infrastructure/database/mongoose/repositories/inventory/PurchaseReceiptRepository");
const inventoryService = require("./inventory.service");
const numberSequenceService = require("../common/numberSequence.service");
const AuditHelper = require("../../../shared/utils/common/AuditHelper");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class PurchaseReceiptService {
  constructor(
    receiptRepo = purchaseReceiptRepository,
    invService = inventoryService,
    seqService = numberSequenceService
  ) {
    this.receiptRepo = receiptRepo;
    this.invService = invService;
    this.seqService = seqService;
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

  async getReceipts(filters = {}, pagination = {}, authContext = {}) {
    let query = {};
    if (filters.branchId) query.branchId = filters.branchId;
    if (filters.status) query.status = String(filters.status).trim().toUpperCase();

    if (filters.from || filters.to) {
      query.receivedDate = {};
      if (filters.from) query.receivedDate.$gte = new Date(filters.from);
      if (filters.to) query.receivedDate.$lte = new Date(filters.to);
    }

    query = this._applyScopeConstraint(query, authContext);
    return this.receiptRepo.findAll(query, pagination);
  }

  async getReceiptById(id, authContext = {}) {
    const receipt = await this.receiptRepo.findById(id);
    if (!receipt) {
      throw ErrorHelper.notFound("Purchase receipt not found");
    }

    // Branch scoping
    if (!authContext.isSuperAdmin && !(authContext.scopes || []).includes("ALL")) {
      const authorizedBranches = (authContext.authorizedBranchIds || authContext.authorizedBranches || [])
        .map((b) => (b._id ? b._id.toString() : b.toString()))
        .filter(Boolean);

      const recBranch = receipt.branchId?._id ? receipt.branchId._id.toString() : receipt.branchId?.toString();
      if (!recBranch || !authorizedBranches.includes(recBranch)) {
        throw ErrorHelper.forbidden("Access denied to this purchase receipt");
      }
    }

    return receipt;
  }

  async createDraft(data, authContext = {}) {
    const { branchId, supplierName, supplierInvoiceNo, receivedDate, items, remarks } = data;
    if (!branchId || !supplierName || !Array.isArray(items) || items.length === 0) {
      throw ErrorHelper.badRequest("branchId, supplierName, and items array are required");
    }

    const receiptNo = await this.seqService.generateBusinessNumber("PURCHASE_RECEIPT", {
      prefix: "PR",
    });

    const parsedItems = items.map((item) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.purchaseRate) || 0;
      return {
        itemId: item.itemId,
        quantity: qty,
        purchaseRate: rate,
        amount: Number(item.amount) || qty * rate,
      };
    });

    const totalAmount = parsedItems.reduce((sum, item) => sum + item.amount, 0);
    const createdBy = authContext.user?._id || authContext.user?.id;

    const receipt = await this.receiptRepo.create({
      receiptNo,
      branchId,
      supplierName: String(supplierName).trim(),
      supplierInvoiceNo: supplierInvoiceNo ? String(supplierInvoiceNo).trim() : null,
      receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
      items: parsedItems,
      totalAmount,
      status: "DRAFT",
      remarks: remarks || null,
      createdBy,
    });

    AuditHelper.log({
      actorId: createdBy,
      action: "CREATE_PURCHASE_DRAFT",
      entityType: "PURCHASE_RECEIPT",
      entityId: receipt._id,
      after: receipt,
      branchId,
    }).catch((err) => console.warn("[PurchaseReceiptService] Audit error:", err.message));

    return receipt;
  }

  async updateDraft(id, data, authContext = {}) {
    const existing = await this.receiptRepo.findById(id);
    if (!existing) {
      throw ErrorHelper.notFound("Purchase receipt not found");
    }
    if (existing.status !== "DRAFT") {
      throw ErrorHelper.badRequest(`Cannot update receipt in '${existing.status}' status. Only DRAFT receipts can be edited.`);
    }

    const updatePayload = {};
    if (data.supplierName !== undefined) updatePayload.supplierName = String(data.supplierName).trim();
    if (data.supplierInvoiceNo !== undefined) updatePayload.supplierInvoiceNo = data.supplierInvoiceNo ? String(data.supplierInvoiceNo).trim() : null;
    if (data.receivedDate !== undefined) updatePayload.receivedDate = new Date(data.receivedDate);
    if (data.remarks !== undefined) updatePayload.remarks = data.remarks;

    if (Array.isArray(data.items) && data.items.length > 0) {
      updatePayload.items = data.items.map((item) => {
        const qty = Number(item.quantity) || 0;
        const rate = Number(item.purchaseRate) || 0;
        return {
          itemId: item.itemId,
          quantity: qty,
          purchaseRate: rate,
          amount: Number(item.amount) || qty * rate,
        };
      });
      updatePayload.totalAmount = updatePayload.items.reduce((sum, item) => sum + item.amount, 0);
    }

    const updated = await this.receiptRepo.update(id, updatePayload);

    AuditHelper.log({
      actorId: authContext.user?._id || authContext.user?.id,
      action: "UPDATE_PURCHASE_DRAFT",
      entityType: "PURCHASE_RECEIPT",
      entityId: id,
      before: existing,
      after: updated,
    }).catch((err) => console.warn("[PurchaseReceiptService] Audit error:", err.message));

    return updated;
  }

  async postReceipt(id, authContext = {}) {
    const existing = await this.receiptRepo.findById(id);
    if (!existing) {
      throw ErrorHelper.notFound("Purchase receipt not found");
    }
    if (existing.status === "POSTED") {
      throw ErrorHelper.badRequest("Purchase receipt is already POSTED");
    }
    if (existing.status === "CANCELLED") {
      throw ErrorHelper.badRequest("Cannot post a CANCELLED purchase receipt");
    }

    const performedBy = authContext.user?._id || authContext.user?.id;
    const branchId = existing.branchId?._id || existing.branchId;

    // Process all items in MongoDB transaction
    const isReplicaSet = Boolean(mongoose.connection.client?.topology?.description?.servers?.size > 1);
    let session = null;
    if (isReplicaSet) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      // 1. Mark status as POSTED
      const updatedReceipt = await this.receiptRepo.updateStatus(id, "POSTED", session);

      // 2. Post PURCHASE transactions for every line item
      for (const item of existing.items) {
        const itemId = item.itemId?._id || item.itemId;
        await this.invService.post({
          itemId,
          branchId,
          type: "PURCHASE",
          quantity: item.quantity,
          referenceType: "PURCHASE",
          referenceId: id,
          performedBy,
          transactionDate: existing.receivedDate,
          notes: `Purchase Receipt ${existing.receiptNo} from ${existing.supplierName}`,
          session,
        });
      }

      if (session) {
        await session.commitTransaction();
      }

      AuditHelper.log({
        actorId: performedBy,
        action: "POST_PURCHASE_RECEIPT",
        entityType: "PURCHASE_RECEIPT",
        entityId: id,
        after: updatedReceipt,
        branchId,
      }).catch((err) => console.warn("[PurchaseReceiptService] Audit error:", err.message));

      return updatedReceipt;
    } catch (err) {
      if (session) {
        await session.abortTransaction();
      }
      throw err;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  async cancelReceipt(id, authContext = {}) {
    const existing = await this.receiptRepo.findById(id);
    if (!existing) {
      throw ErrorHelper.notFound("Purchase receipt not found");
    }
    if (existing.status === "CANCELLED") {
      throw ErrorHelper.badRequest("Purchase receipt is already CANCELLED");
    }

    const performedBy = authContext.user?._id || authContext.user?.id;
    const branchId = existing.branchId?._id || existing.branchId;

    if (existing.status === "DRAFT") {
      return this.receiptRepo.updateStatus(id, "CANCELLED");
    }

    // If POSTED -> Cancel and create reversal ADJUSTMENT transactions
    const isReplicaSet = Boolean(mongoose.connection.client?.topology?.description?.servers?.size > 1);
    let session = null;
    if (isReplicaSet) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    try {
      const updatedReceipt = await this.receiptRepo.updateStatus(id, "CANCELLED", session);

      // Create reversal ADJUSTMENT transactions
      for (const item of existing.items) {
        const itemId = item.itemId?._id || item.itemId;
        await this.invService.post({
          itemId,
          branchId,
          type: "ADJUSTMENT",
          quantity: -item.quantity, // Reversal negative delta
          referenceType: "PURCHASE",
          referenceId: id,
          performedBy,
          notes: `Reversal for Cancelled Purchase Receipt ${existing.receiptNo}`,
          session,
        });
      }

      if (session) {
        await session.commitTransaction();
      }

      AuditHelper.log({
        actorId: performedBy,
        action: "CANCEL_PURCHASE_RECEIPT",
        entityType: "PURCHASE_RECEIPT",
        entityId: id,
        after: updatedReceipt,
        branchId,
      }).catch((err) => console.warn("[PurchaseReceiptService] Audit error:", err.message));

      return updatedReceipt;
    } catch (err) {
      if (session) {
        await session.abortTransaction();
      }
      throw err;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }
}

module.exports = new PurchaseReceiptService();
