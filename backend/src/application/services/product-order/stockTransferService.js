const mongoose = require("mongoose");
const stockTransferRepository = require("../../../infrastructure/database/mongoose/repositories/product-order/StockTransferRepository");
const productOrderRepository = require("../../../infrastructure/database/mongoose/repositories/product-order/ProductOrderRepository");
const productOrderItemRepository = require("../../../infrastructure/database/mongoose/repositories/product-order/ProductOrderItemRepository");
const inventoryItemRepository = require("../../../infrastructure/database/mongoose/repositories/inventory/InventoryItemRepository");
const inventoryService = require("../inventory/inventory.service");
const AuditHelper = require("../../../shared/utils/common/AuditHelper");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const { ORDER_STATUS, TRANSFER_STATUS } = require("../../../shared/constants/productOrderConstants");

function toPlain(doc) {
  if (!doc) return null;
  if (typeof doc.toObject === "function") return doc.toObject();
  return { ...doc };
}

class StockTransferService {
  constructor(
    transferRepo = stockTransferRepository,
    orderRepo = productOrderRepository,
    itemRepo = productOrderItemRepository,
    invItemRepo = inventoryItemRepository,
    invService = inventoryService
  ) {
    this.transferRepo = transferRepo;
    this.orderRepo = orderRepo;
    this.itemRepo = itemRepo;
    this.invItemRepo = invItemRepo;
    this.invService = invService;
  }

  _applyScopeConstraint(baseQuery = {}, authContext = {}) {
    const query = { ...baseQuery };
    if (authContext.isSuperAdmin) return query;

    const scopes = authContext.scopes || [];
    if (scopes.includes("ALL")) return query;

    const authorizedBranches = (authContext.authorizedBranchIds || authContext.authorizedBranches || [])
      .map((b) => (b._id ? b._id.toString() : b.toString()))
      .filter(Boolean);

    if (scopes.includes("BRANCH")) {
      if (authorizedBranches.length > 0) {
        const branchIds = authorizedBranches.map((b) => new mongoose.Types.ObjectId(b));
        query.$or = [{ fromBranchId: { $in: branchIds } }, { toBranchId: { $in: branchIds } }];
      } else {
        query.toBranchId = new mongoose.Types.ObjectId("000000000000000000000000");
      }
      return query;
    }

    query.toBranchId = new mongoose.Types.ObjectId("000000000000000000000000");
    return query;
  }

  _checkBranchAuthorization(branchId, authContext = {}) {
    if (authContext.isSuperAdmin) return true;
    const scopes = authContext.scopes || [];
    if (scopes.includes("ALL")) return true;

    const authorizedBranches = (authContext.authorizedBranchIds || authContext.authorizedBranches || [])
      .map((b) => (b._id ? b._id.toString() : b.toString()))
      .filter(Boolean);

    const target = branchId ? (branchId._id ? branchId._id.toString() : branchId.toString()) : "";
    if (!target || !authorizedBranches.includes(target)) {
      throw ErrorHelper.forbidden("Access denied: You are not authorized for this branch");
    }
    return true;
  }

  /**
   * Get single stock transfer by ID.
   */
  async getTransferById(id, authContext = {}) {
    const transfer = await this.transferRepo.findById(id);
    if (!transfer) {
      throw ErrorHelper.notFound("Stock transfer not found");
    }

    const fromId = transfer.fromBranchId?._id ? transfer.fromBranchId._id.toString() : transfer.fromBranchId?.toString();
    const toId = transfer.toBranchId?._id ? transfer.toBranchId._id.toString() : transfer.toBranchId?.toString();

    // Must have access to either fromBranch or toBranch
    if (!authContext.isSuperAdmin && !(authContext.scopes || []).includes("ALL")) {
      const authorizedBranches = (authContext.authorizedBranchIds || authContext.authorizedBranches || [])
        .map((b) => (b._id ? b._id.toString() : b.toString()))
        .filter(Boolean);

      if (!authorizedBranches.includes(fromId) && !authorizedBranches.includes(toId)) {
        throw ErrorHelper.forbidden("Access denied: You are not authorized for this stock transfer");
      }
    }

    return toPlain(transfer);
  }

  /**
   * List stock transfers with filters and branch scoping.
   */
  async getTransfers(filters = {}, pagination = {}, authContext = {}) {
    let query = {};
    if (filters.fromBranchId) query.fromBranchId = filters.fromBranchId;
    if (filters.toBranchId) query.toBranchId = filters.toBranchId;
    if (filters.status) query.status = String(filters.status).trim().toUpperCase();
    if (filters.productOrderId) query.productOrderId = filters.productOrderId;

    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) query.createdAt.$gte = new Date(filters.from);
      if (filters.to) query.createdAt.$lte = new Date(filters.to);
    }
    if (filters.q) {
      const regex = new RegExp(String(filters.q).trim(), "i");
      query.$or = [{ transferNo: regex }, { remarks: regex }];
    }

    query = this._applyScopeConstraint(query, authContext);
    return this.transferRepo.findAll(query, pagination);
  }

  /**
   * Dispatch Stock Transfer from Warehouse:
   * Deducts inventory from Warehouse via InventoryService.post({ type: 'TRANSFER_OUT' }).
   * Updates StockTransfer and ProductOrder status to DISPATCHED.
   */
  async dispatchTransfer(id, data = {}, authContext = {}) {
    const transfer = await this.transferRepo.findById(id);
    if (!transfer) {
      throw ErrorHelper.notFound("Stock transfer not found");
    }

    if (transfer.status !== TRANSFER_STATUS.APPROVED) {
      throw ErrorHelper.conflict(
        `Transfer must be in APPROVED status to dispatch. Current status: '${transfer.status}'`
      );
    }

    const fromBranchId = transfer.fromBranchId?._id || transfer.fromBranchId;
    const performedBy = authContext.user?._id || authContext.user?.id;

    // Optional override of dispatched quantities per item
    const dispatchMap = new Map();
    const dispatchedItemsList = data.dispatchedItems || data.items;
    if (Array.isArray(dispatchedItemsList) && dispatchedItemsList.length > 0) {
      for (const it of dispatchedItemsList) {
        dispatchMap.set(String(it.itemId?._id || it.itemId), Number(it.dispatchedQty));
      }
    }

    const updatedTransferItems = [];
    for (const line of transfer.items) {
      const itemKey = String(line.itemId?._id || line.itemId);
      const approved = Number(line.approvedQty || line.requestedQty);
      let dispatched = dispatchMap.has(itemKey) ? dispatchMap.get(itemKey) : approved;

      if (dispatched > approved) {
        throw ErrorHelper.badRequest(
          `Dispatched quantity (${dispatched}) cannot exceed approved quantity (${approved}) for item '${line.itemId?.name || itemKey}'`
        );
      }
      if (dispatched <= 0) {
        throw ErrorHelper.badRequest("Dispatched quantity must be greater than zero");
      }

      updatedTransferItems.push({
        itemId: line.itemId?._id || line.itemId,
        requestedQty: line.requestedQty,
        approvedQty: line.approvedQty,
        dispatchedQty: dispatched,
        receivedQty: 0,
        unit: line.unit || "PCS",
        remarks: line.remarks || null,
      });
    }

    let updatedProductOrder = null;
    const executeDispatch = async (session) => {
      const generatedTxns = [];

      // Post TRANSFER_OUT for each item from Warehouse
      for (const tItem of updatedTransferItems) {
        const postRes = await this.invService.post({
          itemId: tItem.itemId,
          branchId: fromBranchId,
          type: "TRANSFER_OUT",
          quantity: -Number(tItem.dispatchedQty),
          referenceType: "TRANSFER",
          referenceId: transfer._id,
          performedBy,
          notes: `Stock Transfer Dispatch ${transfer.transferNo} to branch`,
          session,
        });
        generatedTxns.push(postRes.transaction);
      }

      // Update Stock Transfer document
      const updatedTransfer = await this.transferRepo.update(
        transfer._id,
        {
          status: TRANSFER_STATUS.DISPATCHED,
          items: updatedTransferItems,
          dispatchedBy: performedBy,
          dispatchedAt: new Date(),
          remarks: data.remarks || transfer.remarks,
        },
        session
      );

      // Update Product Order document & items
      if (transfer.productOrderId) {
        const pOrderId = transfer.productOrderId?._id || transfer.productOrderId;
        updatedProductOrder = await this.orderRepo.update(
          pOrderId,
          {
            status: ORDER_STATUS.DISPATCHED,
            dispatchedBy: performedBy,
            dispatchedAt: new Date(),
          },
          session
        );

        // Update product order items dispatchedQty
        const orderItems = await this.itemRepo.findByOrderId(pOrderId, session);
        for (const oItem of orderItems) {
          const match = updatedTransferItems.find(
            (x) => String(x.itemId) === String(oItem.itemId?._id || oItem.itemId)
          );
          if (match) {
            await this.itemRepo.updateItemQuantities(
              oItem._id,
              { dispatchedQty: match.dispatchedQty },
              session
            );
          }
        }
      }

      return {
        transfer: updatedTransfer,
        transactions: generatedTxns,
      };
    };

    let result;
    const isReplicaSet = Boolean(mongoose.connection.client?.topology?.description?.servers?.size > 1);
    if (isReplicaSet) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          result = await executeDispatch(session);
        });
      } finally {
        await session.endSession();
      }
    } else {
      result = await executeDispatch(null);
    }

    try {
      await AuditHelper.log({
        actorId: performedBy,
        action: "STOCK_TRANSFER",
        entityType: "STOCK_TRANSFER",
        entityId: transfer._id,
        branchId: fromBranchId,
        before: { status: TRANSFER_STATUS.APPROVED },
        after: {
          status: TRANSFER_STATUS.DISPATCHED,
          transferNo: transfer.transferNo,
          itemCount: updatedTransferItems.length,
        },
      });
    } catch (e) {
      console.warn("Audit error on dispatch:", e.message);
    }

    return {
      stockTransfer: toPlain(result.transfer),
      productOrder: updatedProductOrder ? toPlain(updatedProductOrder) : null,
      ...toPlain(result.transfer),
      inventoryTransactions: result.transactions,
    };
  }

  /**
   * Receive Stock Transfer at Requesting Branch:
   * Increments inventory at Destination Branch via InventoryService.post({ type: 'TRANSFER_IN' }).
   * Detects shortages, flags audit, and marks StockTransfer = RECEIVED & ProductOrder = DELIVERED.
   */
  async receiveTransfer(id, data = {}, authContext = {}) {
    const transfer = await this.transferRepo.findById(id);
    if (!transfer) {
      throw ErrorHelper.notFound("Stock transfer not found");
    }

    if (transfer.status !== TRANSFER_STATUS.DISPATCHED) {
      throw ErrorHelper.conflict(
        `Transfer must be in DISPATCHED status to receive. Current status: '${transfer.status}'`
      );
    }

    const toBranchId = transfer.toBranchId?._id || transfer.toBranchId;
    this._checkBranchAuthorization(toBranchId, authContext);

    const performedBy = authContext.user?._id || authContext.user?.id;

    // Optional override of received quantities per item
    const receiveMap = new Map();
    const receivedItemsList = data.receivedItems || data.items;
    if (Array.isArray(receivedItemsList) && receivedItemsList.length > 0) {
      for (const it of receivedItemsList) {
        receiveMap.set(String(it.itemId?._id || it.itemId), Number(it.receivedQty));
      }
    }

    let hasShortage = false;
    const shortageDetails = [];
    const updatedTransferItems = [];

    for (const line of transfer.items) {
      const itemKey = String(line.itemId?._id || line.itemId);
      const dispatched = Number(line.dispatchedQty);
      let received = receiveMap.has(itemKey) ? receiveMap.get(itemKey) : dispatched;

      if (received > dispatched) {
        throw ErrorHelper.badRequest(
          `Received quantity (${received}) cannot exceed dispatched quantity (${dispatched}) for item '${line.itemId?.name || itemKey}'`
        );
      }
      if (received < 0) {
        throw ErrorHelper.badRequest("Received quantity cannot be negative");
      }

      if (received < dispatched) {
        hasShortage = true;
        shortageDetails.push({
          itemId: line.itemId?._id || line.itemId,
          itemName: line.itemId?.name || itemKey,
          dispatched,
          received,
          shortage: dispatched - received,
        });
      }

      updatedTransferItems.push({
        itemId: line.itemId?._id || line.itemId,
        requestedQty: line.requestedQty,
        approvedQty: line.approvedQty,
        dispatchedQty: line.dispatchedQty,
        receivedQty: received,
        unit: line.unit || "PCS",
        remarks: line.remarks || null,
      });
    }

    const shortageRemarks = hasShortage
      ? `Shortage detected: ${shortageDetails.map((s) => `${s.itemName} (-${s.shortage})`).join(", ")}`
      : "";

    const combinedRemarks = [transfer.remarks, data.remarks, shortageRemarks]
      .filter(Boolean)
      .join(" | ");

    let updatedProductOrder = null;
    const executeReceive = async (session) => {
      const generatedTxns = [];

      // Post TRANSFER_IN for each item to Destination Branch
      for (const tItem of updatedTransferItems) {
        if (tItem.receivedQty > 0) {
          const postRes = await this.invService.post({
            itemId: tItem.itemId,
            branchId: toBranchId,
            type: "TRANSFER_IN",
            quantity: Number(tItem.receivedQty),
            referenceType: "TRANSFER",
            referenceId: transfer._id,
            performedBy,
            notes: `Stock Transfer Receipt ${transfer.transferNo} at branch`,
            session,
          });
          generatedTxns.push(postRes.transaction);
        }
      }

      // Update Stock Transfer document
      const updatedTransfer = await this.transferRepo.update(
        transfer._id,
        {
          status: TRANSFER_STATUS.RECEIVED,
          items: updatedTransferItems,
          receivedBy: performedBy,
          receivedAt: new Date(),
          remarks: combinedRemarks,
        },
        session
      );

      // Update Product Order document & items
      if (transfer.productOrderId) {
        const pOrderId = transfer.productOrderId?._id || transfer.productOrderId;
        updatedProductOrder = await this.orderRepo.update(
          pOrderId,
          {
            status: ORDER_STATUS.DELIVERED,
            receivedBy: performedBy,
            receivedAt: new Date(),
            remarks: combinedRemarks,
          },
          session
        );

        // Update product order items receivedQty
        const orderItems = await this.itemRepo.findByOrderId(pOrderId, session);
        for (const oItem of orderItems) {
          const match = updatedTransferItems.find(
            (x) => String(x.itemId) === String(oItem.itemId?._id || oItem.itemId)
          );
          if (match) {
            await this.itemRepo.updateItemQuantities(
              oItem._id,
              { receivedQty: match.receivedQty },
              session
            );
          }
        }
      }

      return {
        transfer: updatedTransfer,
        transactions: generatedTxns,
      };
    };

    let result;
    const isReplicaSet = Boolean(mongoose.connection.client?.topology?.description?.servers?.size > 1);
    if (isReplicaSet) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          result = await executeReceive(session);
        });
      } finally {
        await session.endSession();
      }
    } else {
      result = await executeReceive(null);
    }

    try {
      await AuditHelper.log({
        actorId: performedBy,
        action: "STOCK_TRANSFER",
        entityType: "STOCK_TRANSFER",
        entityId: transfer._id,
        branchId: toBranchId,
        before: { status: TRANSFER_STATUS.DISPATCHED },
        after: {
          status: TRANSFER_STATUS.RECEIVED,
          transferNo: transfer.transferNo,
          hasShortage,
          shortageDetails: hasShortage ? shortageDetails : undefined,
        },
      });
    } catch (e) {
      console.warn("Audit error on receive:", e.message);
    }

    return {
      stockTransfer: toPlain(result.transfer),
      productOrder: updatedProductOrder ? toPlain(updatedProductOrder) : null,
      ...toPlain(result.transfer),
      hasShortage,
      shortageDetails: hasShortage ? shortageDetails : [],
      inventoryTransactions: result.transactions,
    };
  }

  /**
   * Cancel Stock Transfer (only if APPROVED and before dispatch).
   */
  async cancelTransfer(id, data = {}, authContext = {}) {
    const transfer = await this.transferRepo.findById(id);
    if (!transfer) {
      throw ErrorHelper.notFound("Stock transfer not found");
    }

    if (transfer.status !== TRANSFER_STATUS.APPROVED) {
      throw ErrorHelper.conflict(`Cannot cancel transfer in status '${transfer.status}'`);
    }

    const performedBy = authContext.user?._id || authContext.user?.id;
    const updatedTransfer = await this.transferRepo.update(transfer._id, {
      status: TRANSFER_STATUS.CANCELLED,
      remarks: data.reason || data.remarks || "Transfer cancelled",
    });

    try {
      await AuditHelper.log({
        actorId: performedBy,
        action: "STATUS_CHANGE",
        entityType: "STOCK_TRANSFER",
        entityId: transfer._id,
        branchId: transfer.fromBranchId?._id || transfer.fromBranchId,
        before: { status: TRANSFER_STATUS.APPROVED },
        after: { status: TRANSFER_STATUS.CANCELLED },
      });
    } catch (e) {
      console.warn("Audit error on transfer cancel:", e.message);
    }

    return toPlain(updatedTransfer);
  }
}

module.exports = new StockTransferService();
