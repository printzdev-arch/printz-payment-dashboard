const mongoose = require("mongoose");
const productOrderRepository = require("../../../infrastructure/database/mongoose/repositories/product-order/ProductOrderRepository");
const productOrderItemRepository = require("../../../infrastructure/database/mongoose/repositories/product-order/ProductOrderItemRepository");
const stockTransferRepository = require("../../../infrastructure/database/mongoose/repositories/product-order/StockTransferRepository");
const inventoryItemRepository = require("../../../infrastructure/database/mongoose/repositories/inventory/InventoryItemRepository");
const Branch = require("../../../infrastructure/database/mongoose/models/Branch");
const approvalRepository = require("../../../infrastructure/database/mongoose/repositories/common/ApprovalRepository");
const ApprovalHelper = require("../../../shared/utils/common/ApprovalHelper");
const numberSequenceService = require("../common/numberSequence.service");
const AuditHelper = require("../../../shared/utils/common/AuditHelper");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const { ORDER_STATUS, TRANSFER_STATUS } = require("../../../shared/constants/productOrderConstants");

function toPlain(doc) {
  if (!doc) return null;
  if (typeof doc.toObject === "function") return doc.toObject();
  return { ...doc };
}

class ProductOrderService {
  constructor(
    orderRepo = productOrderRepository,
    itemRepo = productOrderItemRepository,
    transferRepo = stockTransferRepository,
    invItemRepo = inventoryItemRepository,
    seqService = numberSequenceService
  ) {
    this.orderRepo = orderRepo;
    this.itemRepo = itemRepo;
    this.transferRepo = transferRepo;
    this.invItemRepo = invItemRepo;
    this.seqService = seqService;
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
        if (query.requestingBranchId) {
          const reqBranch = query.requestingBranchId.toString();
          if (!authorizedBranches.includes(reqBranch)) {
            query.requestingBranchId = new mongoose.Types.ObjectId("000000000000000000000000"); // Fail closed
          }
        } else {
          query.requestingBranchId = { $in: authorizedBranches.map((b) => new mongoose.Types.ObjectId(b)) };
        }
      } else {
        query.requestingBranchId = new mongoose.Types.ObjectId("000000000000000000000000");
      }
      return query;
    }

    query.requestingBranchId = new mongoose.Types.ObjectId("000000000000000000000000");
    return query;
  }

  _checkBranchAuthorization(targetBranchId, authContext = {}) {
    if (authContext.isSuperAdmin) return true;
    const scopes = authContext.scopes || [];
    if (scopes.includes("ALL")) return true;

    const authorizedBranches = (authContext.authorizedBranchIds || authContext.authorizedBranches || [])
      .map((b) => (b._id ? b._id.toString() : b.toString()))
      .filter(Boolean);

    const target = targetBranchId ? (targetBranchId._id ? targetBranchId._id.toString() : targetBranchId.toString()) : "";
    if (!target || !authorizedBranches.includes(target)) {
      throw ErrorHelper.forbidden("Access denied: You are not authorized for this branch");
    }
    return true;
  }

  async _getWarehouseBranch() {
    let warehouse = await Branch.findOne({ branchType: "warehouse" });
    if (!warehouse) {
      warehouse = await Branch.findOne({ name: /warehouse/i });
    }
    if (!warehouse) {
      warehouse = await Branch.findOne({});
    }
    return warehouse;
  }

  /**
   * Create DRAFT product order.
   */
  async createDraft(data, authContext = {}) {
    const { requestingBranchId, items = [], remarks } = data;

    if (!requestingBranchId) {
      throw ErrorHelper.badRequest("requestingBranchId is required");
    }
    this._checkBranchAuthorization(requestingBranchId, authContext);

    if (!Array.isArray(items) || items.length === 0) {
      throw ErrorHelper.badRequest("At least one line item is required");
    }

    // Validate items
    const parsedItems = [];
    for (const line of items) {
      if (!line.itemId || !line.requestedQty || Number(line.requestedQty) <= 0) {
        throw ErrorHelper.badRequest("Valid itemId and positive requestedQty are required for all items");
      }

      const invItem = await this.invItemRepo.findById(line.itemId);
      if (!invItem) {
        throw ErrorHelper.notFound(`Inventory item '${line.itemId}' not found`);
      }
      if (!invItem.isActive) {
        throw ErrorHelper.badRequest(`Inventory item '${invItem.itemCode}' is inactive`);
      }

      parsedItems.push({
        itemId: invItem._id,
        requestedQty: Number(line.requestedQty),
        approvedQty: 0,
        dispatchedQty: 0,
        receivedQty: 0,
        unit: line.unit || invItem.unit || "PCS",
        remarks: line.remarks || null,
      });
    }

    const orderNo = await this.seqService.generateBusinessNumber("PRODUCT_ORDER", {
      prefix: "PO",
    });

    const performedBy = authContext.user?._id || authContext.user?.id;

    const orderData = {
      orderNo,
      requestingBranchId,
      requestedBy: performedBy,
      status: ORDER_STATUS.DRAFT,
      remarks: remarks || null,
    };

    const order = await this.orderRepo.create(orderData);

    const itemsWithOrderId = parsedItems.map((it) => ({
      ...it,
      orderId: order._id,
    }));

    const createdItems = await this.itemRepo.createMany(itemsWithOrderId);

    try {
      await AuditHelper.log({
        actorId: performedBy,
        action: "CREATE",
        entityType: "PRODUCT_ORDER",
        entityId: order._id,
        branchId: requestingBranchId,
        after: { orderNo, status: ORDER_STATUS.DRAFT, itemCount: createdItems.length },
      });
    } catch (e) {
      console.warn("Audit error on order create:", e.message);
    }

    return {
      ...toPlain(order),
      items: createdItems,
    };
  }

  /**
   * Update DRAFT items.
   */
  async updateDraftItems(id, items, authContext = {}) {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw ErrorHelper.notFound("Product order not found");
    }
    this._checkBranchAuthorization(order.requestingBranchId, authContext);

    if (order.status !== ORDER_STATUS.DRAFT) {
      throw ErrorHelper.conflict(`Only DRAFT orders can be modified. Current status: '${order.status}'`);
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw ErrorHelper.badRequest("At least one line item is required");
    }

    const parsedItems = [];
    for (const line of items) {
      if (!line.itemId || !line.requestedQty || Number(line.requestedQty) <= 0) {
        throw ErrorHelper.badRequest("Valid itemId and positive requestedQty are required for all items");
      }

      const invItem = await this.invItemRepo.findById(line.itemId);
      if (!invItem) {
        throw ErrorHelper.notFound(`Inventory item '${line.itemId}' not found`);
      }

      parsedItems.push({
        orderId: order._id,
        itemId: invItem._id,
        requestedQty: Number(line.requestedQty),
        approvedQty: 0,
        dispatchedQty: 0,
        receivedQty: 0,
        unit: line.unit || invItem.unit || "PCS",
        remarks: line.remarks || null,
      });
    }

    await this.itemRepo.deleteByOrderId(order._id);
    const createdItems = await this.itemRepo.createMany(parsedItems);

    return {
      ...toPlain(order),
      items: createdItems,
    };
  }

  /**
   * Update DRAFT header details.
   */
  async updateDraft(id, updateData, authContext = {}) {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw ErrorHelper.notFound("Product order not found");
    }
    this._checkBranchAuthorization(order.requestingBranchId, authContext);

    if (order.status !== ORDER_STATUS.DRAFT) {
      throw ErrorHelper.conflict(`Only DRAFT orders can be modified. Current status: '${order.status}'`);
    }

    const allowedUpdates = {};
    if (updateData.remarks !== undefined) allowedUpdates.remarks = updateData.remarks;

    const updated = await this.orderRepo.update(order._id, allowedUpdates);
    const items = await this.itemRepo.findByOrderId(order._id);

    return {
      ...toPlain(updated),
      items,
    };
  }

  /**
   * Submit Product Order (DRAFT -> SUBMITTED) and create Approval workflow entry.
   */
  async submitOrder(id, data = {}, authContext = {}) {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw ErrorHelper.notFound("Product order not found");
    }
    this._checkBranchAuthorization(order.requestingBranchId, authContext);

    if (order.status !== ORDER_STATUS.DRAFT) {
      throw ErrorHelper.conflict(`Order cannot be submitted. Current status: '${order.status}'`);
    }

    const items = await this.itemRepo.findByOrderId(order._id);
    if (!items || items.length === 0) {
      throw ErrorHelper.badRequest("Cannot submit an order without line items");
    }

    const performedBy = authContext.user?._id || authContext.user?.id;
    const branchId = order.requestingBranchId?._id || order.requestingBranchId;

    const executeSubmit = async (session) => {
      const updatedOrder = await this.orderRepo.update(
        order._id,
        {
          status: ORDER_STATUS.SUBMITTED,
          remarks: data.remarks || order.remarks,
        },
        session
      );

      // Create Approval workflow record
      const approval = await ApprovalHelper.requestApproval({
        referenceType: "PRODUCT_ORDER",
        referenceId: order._id,
        requestedBy: performedBy,
        branchId,
        comments: `Branch stock request ${order.orderNo}: ${items.length} line items`,
      });

      return {
        order: updatedOrder,
        approval,
      };
    };

    let result;
    const isReplicaSet = Boolean(mongoose.connection.client?.topology?.description?.servers?.size > 1);
    if (isReplicaSet) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          result = await executeSubmit(session);
        });
      } finally {
        await session.endSession();
      }
    } else {
      result = await executeSubmit(null);
    }

    try {
      await AuditHelper.log({
        actorId: performedBy,
        action: "STATUS_CHANGE",
        entityType: "PRODUCT_ORDER",
        entityId: order._id,
        branchId,
        before: { status: ORDER_STATUS.DRAFT },
        after: { status: ORDER_STATUS.SUBMITTED, approvalNo: result.approval?.approvalNo },
      });
    } catch (e) {
      console.warn("Audit error on order submit:", e.message);
    }

    return {
      ...toPlain(result.order),
      items,
      approval: result.approval,
    };
  }

  /**
   * Cancel Product Order (DRAFT / SUBMITTED -> CANCELLED).
   */
  async cancelOrder(id, data = {}, authContext = {}) {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw ErrorHelper.notFound("Product order not found");
    }
    this._checkBranchAuthorization(order.requestingBranchId, authContext);

    if (order.status !== ORDER_STATUS.DRAFT && order.status !== ORDER_STATUS.SUBMITTED) {
      throw ErrorHelper.conflict(`Cannot cancel order in status '${order.status}'`);
    }

    const performedBy = authContext.user?._id || authContext.user?.id;
    const branchId = order.requestingBranchId?._id || order.requestingBranchId;

    const updatedOrder = await this.orderRepo.update(order._id, {
      status: ORDER_STATUS.CANCELLED,
      remarks: data.reason || data.remarks || order.remarks,
    });

    // If approval is pending, cancel it
    try {
      const pendingApproval = await approvalRepository.findByReference("PRODUCT_ORDER", order._id);
      if (pendingApproval && pendingApproval.status === "PENDING") {
        await approvalRepository.updateStatus(pendingApproval._id, {
          status: "CANCELLED",
          decidedAt: new Date(),
          comments: "Order cancelled by user",
        });
      }
    } catch (e) {
      console.warn("Approval cancel warning:", e.message);
    }

    try {
      await AuditHelper.log({
        actorId: performedBy,
        action: "STATUS_CHANGE",
        entityType: "PRODUCT_ORDER",
        entityId: order._id,
        branchId,
        before: { status: order.status },
        after: { status: ORDER_STATUS.CANCELLED },
      });
    } catch (e) {
      console.warn("Audit error on order cancel:", e.message);
    }

    const items = await this.itemRepo.findByOrderId(order._id);
    return {
      ...toPlain(updatedOrder),
      items,
    };
  }

  /**
   * List orders pending approval (status: SUBMITTED).
   */
  async getPendingApprovals(pagination = {}, authContext = {}) {
    const query = { status: ORDER_STATUS.SUBMITTED };
    const scopedQuery = this._applyScopeConstraint(query, authContext);
    return this.orderRepo.findAll(scopedQuery, pagination);
  }

  /**
   * Approve Product Order: Validates approved quantities, sets APPROVED/PARTIALLY_APPROVED,
   * automatically creates StockTransfer document, and updates linked Approval.
   */
  async approveOrder(id, data = {}, authContext = {}) {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw ErrorHelper.notFound("Product order not found");
    }

    if (order.status !== ORDER_STATUS.SUBMITTED) {
      throw ErrorHelper.conflict(`Order must be in SUBMITTED status to approve. Current status: '${order.status}'`);
    }

    const existingItems = await this.itemRepo.findByOrderId(order._id);
    if (!existingItems || existingItems.length === 0) {
      throw ErrorHelper.badRequest("Order has no line items");
    }

    const approvalItemsMap = new Map();
    const approvedItemsList = data.approvedItems || data.items;
    if (Array.isArray(approvedItemsList) && approvedItemsList.length > 0) {
      for (const it of approvedItemsList) {
        approvalItemsMap.set(String(it.itemId?._id || it.itemId), Number(it.approvedQty));
      }
    }

    let isPartial = false;
    let allZero = true;
    const transferLineItems = [];

    for (const item of existingItems) {
      const itemKey = String(item.itemId?._id || item.itemId);
      const requested = Number(item.requestedQty);
      let approved = approvalItemsMap.has(itemKey)
        ? approvalItemsMap.get(itemKey)
        : requested; // Default to full requested if not specified

      if (approved > requested) {
        throw ErrorHelper.badRequest(
          `Approved quantity (${approved}) cannot exceed requested quantity (${requested}) for item '${item.itemId?.name || itemKey}'`
        );
      }
      if (approved < 0) {
        throw ErrorHelper.badRequest("Approved quantity cannot be negative");
      }

      if (approved < requested) {
        isPartial = true;
      }
      if (approved > 0) {
        allZero = false;
      }

      transferLineItems.push({
        itemId: item.itemId?._id || item.itemId,
        requestedQty: requested,
        approvedQty: approved,
        dispatchedQty: 0,
        receivedQty: 0,
        unit: item.unit || "PCS",
        remarks: item.remarks || null,
      });
    }

    const finalStatus = allZero
      ? ORDER_STATUS.REJECTED
      : isPartial
      ? ORDER_STATUS.PARTIALLY_APPROVED
      : ORDER_STATUS.APPROVED;

    const performedBy = authContext.user?._id || authContext.user?.id;
    const warehouseBranch = data.fromBranchId
      ? (await Branch.findById(data.fromBranchId)) || (await this._getWarehouseBranch())
      : await this._getWarehouseBranch();

    if (!warehouseBranch) {
      throw ErrorHelper.badRequest("Warehouse branch not configured in system");
    }

    const executeApprove = async (session) => {
      // 1. Update line item approved quantities
      for (const tItem of transferLineItems) {
        const matchingDoc = existingItems.find(
          (x) => String(x.itemId?._id || x.itemId) === String(tItem.itemId)
        );
        if (matchingDoc) {
          await this.itemRepo.updateItemQuantities(
            matchingDoc._id,
            { approvedQty: tItem.approvedQty },
            session
          );
        }
      }

      // 2. Update Order status
      const updatedOrder = await this.orderRepo.update(
        order._id,
        {
          status: finalStatus,
          approvedBy: performedBy,
          approvedAt: new Date(),
          remarks: data.remarks || order.remarks,
        },
        session
      );

      // 3. Create Stock Transfer if approved or partially approved
      let createdTransfer = null;
      if (finalStatus !== ORDER_STATUS.REJECTED) {
        const transferNo = await this.seqService.generateBusinessNumber("STOCK_TRANSFER", {
          prefix: "ST",
        });

        createdTransfer = await this.transferRepo.create(
          {
            transferNo,
            productOrderId: order._id,
            fromBranchId: warehouseBranch._id,
            toBranchId: order.requestingBranchId?._id || order.requestingBranchId,
            status: TRANSFER_STATUS.APPROVED,
            items: transferLineItems,
            requestedBy: order.requestedBy?._id || order.requestedBy,
            approvedBy: performedBy,
            remarks: `Generated automatically from Product Order ${order.orderNo}`,
          },
          session
        );
      }

      // 4. Update linked Approval record
      const approvalDoc = await approvalRepository.findByReference("PRODUCT_ORDER", order._id);
      if (approvalDoc) {
        await approvalRepository.updateStatus(
          approvalDoc._id,
          {
            status: finalStatus === ORDER_STATUS.REJECTED ? "REJECTED" : "APPROVED",
            approverId: performedBy,
            decidedAt: new Date(),
            comments: data.remarks || `Order ${finalStatus}`,
          }
        );
      }

      return {
        order: updatedOrder,
        transfer: createdTransfer,
      };
    };

    let result;
    const isReplicaSet = Boolean(mongoose.connection.client?.topology?.description?.servers?.size > 1);
    if (isReplicaSet) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          result = await executeApprove(session);
        });
      } finally {
        await session.endSession();
      }
    } else {
      result = await executeApprove(null);
    }

    try {
      await AuditHelper.log({
        actorId: performedBy,
        action: "APPROVE",
        entityType: "PRODUCT_ORDER",
        entityId: order._id,
        branchId: order.requestingBranchId?._id || order.requestingBranchId,
        before: { status: ORDER_STATUS.SUBMITTED },
        after: {
          status: finalStatus,
          transferNo: result.transfer?.transferNo,
        },
      });
    } catch (e) {
      console.warn("Audit error on order approve:", e.message);
    }

    const updatedItems = await this.itemRepo.findByOrderId(order._id);
    return {
      productOrder: {
        ...toPlain(result.order),
        items: updatedItems,
      },
      stockTransfer: result.transfer ? toPlain(result.transfer) : null,
    };
  }

  /**
   * Reject Product Order.
   */
  async rejectOrder(id, data = {}, authContext = {}) {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw ErrorHelper.notFound("Product order not found");
    }

    if (order.status !== ORDER_STATUS.SUBMITTED) {
      throw ErrorHelper.conflict(`Order must be in SUBMITTED status to reject. Current status: '${order.status}'`);
    }

    const comments = data.comments || data.reason || data.remarks;
    if (!comments || String(comments).trim() === "") {
      throw ErrorHelper.badRequest("comments / rejection reason is mandatory");
    }

    const performedBy = authContext.user?._id || authContext.user?.id;

    const executeReject = async (session) => {
      const updatedOrder = await this.orderRepo.update(
        order._id,
        {
          status: ORDER_STATUS.REJECTED,
          approvedBy: performedBy,
          approvedAt: new Date(),
          remarks: String(comments).trim(),
        },
        session
      );

      const approvalDoc = await approvalRepository.findByReference("PRODUCT_ORDER", order._id);
      if (approvalDoc) {
        await approvalRepository.updateStatus(
          approvalDoc._id,
          {
            status: "REJECTED",
            approverId: performedBy,
            decidedAt: new Date(),
            comments: String(comments).trim(),
          }
        );
      }

      return updatedOrder;
    };

    let result;
    const isReplicaSet = Boolean(mongoose.connection.client?.topology?.description?.servers?.size > 1);
    if (isReplicaSet) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          result = await executeReject(session);
        });
      } finally {
        await session.endSession();
      }
    } else {
      result = await executeReject(null);
    }

    try {
      await AuditHelper.log({
        actorId: performedBy,
        action: "REJECT",
        entityType: "PRODUCT_ORDER",
        entityId: order._id,
        branchId: order.requestingBranchId?._id || order.requestingBranchId,
        before: { status: ORDER_STATUS.SUBMITTED },
        after: { status: ORDER_STATUS.REJECTED, comments },
      });
    } catch (e) {
      console.warn("Audit error on order reject:", e.message);
    }

    const items = await this.itemRepo.findByOrderId(order._id);
    return {
      ...toPlain(result),
      items,
    };
  }

  /**
   * Get single order by ID + items + stock transfer info.
   */
  async getOrderById(id, authContext = {}) {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw ErrorHelper.notFound("Product order not found");
    }
    this._checkBranchAuthorization(order.requestingBranchId, authContext);

    const items = await this.itemRepo.findByOrderId(order._id);
    const transfer = await this.transferRepo.findByProductOrderId(order._id);

    return {
      ...toPlain(order),
      items,
      stockTransfer: transfer ? toPlain(transfer) : null,
    };
  }

  /**
   * List product orders with filters and branch RBAC.
   */
  async getOrders(filters = {}, pagination = {}, authContext = {}) {
    let query = {};
    if (filters.requestingBranchId || filters.branchId) {
      query.requestingBranchId = filters.requestingBranchId || filters.branchId;
    }
    if (filters.status) {
      query.status = String(filters.status).trim().toUpperCase();
    }
    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) query.createdAt.$gte = new Date(filters.from);
      if (filters.to) query.createdAt.$lte = new Date(filters.to);
    }
    if (filters.q) {
      const regex = new RegExp(String(filters.q).trim(), "i");
      query.$or = [{ orderNo: regex }, { remarks: regex }];
    }

    query = this._applyScopeConstraint(query, authContext);
    return this.orderRepo.findAll(query, pagination);
  }
}

module.exports = new ProductOrderService();
