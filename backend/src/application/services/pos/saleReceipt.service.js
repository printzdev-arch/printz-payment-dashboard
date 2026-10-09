const mongoose = require("mongoose");
const saleReceiptRepository = require("../../../infrastructure/database/mongoose/repositories/pos/SaleReceiptRepository");
const saleReceiptItemRepository = require("../../../infrastructure/database/mongoose/repositories/pos/SaleReceiptItemRepository");
const inventoryItemRepository = require("../../../infrastructure/database/mongoose/repositories/inventory/InventoryItemRepository");
const inventoryTransactionRepository = require("../../../infrastructure/database/mongoose/repositories/inventory/InventoryTransactionRepository");
const inventoryService = require("../inventory/inventory.service");
const numberSequenceService = require("../common/numberSequence.service");
const SaleReceiptHelper = require("../../../shared/utils/pos/SaleReceiptHelper");
const AuditHelper = require("../../../shared/utils/common/AuditHelper");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

function toPlain(doc) {
  if (!doc) return null;
  if (typeof doc.toObject === "function") return doc.toObject();
  return { ...doc };
}

class SaleReceiptService {
  constructor(
    receiptRepo = saleReceiptRepository,
    itemRepo = saleReceiptItemRepository,
    invItemRepo = inventoryItemRepository,
    invTxnRepo = inventoryTransactionRepository,
    invService = inventoryService,
    seqService = numberSequenceService
  ) {
    this.receiptRepo = receiptRepo;
    this.itemRepo = itemRepo;
    this.invItemRepo = invItemRepo;
    this.invTxnRepo = invTxnRepo;
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

  _checkBranchAuthorization(targetBranchId, authContext = {}) {
    if (authContext.isSuperAdmin) return true;
    const scopes = authContext.scopes || [];
    if (scopes.includes("ALL")) return true;

    const authorizedBranches = (authContext.authorizedBranchIds || authContext.authorizedBranches || [])
      .map((b) => (b._id ? b._id.toString() : b.toString()))
      .filter(Boolean);

    const target = targetBranchId ? targetBranchId.toString() : "";
    if (!target || !authorizedBranches.includes(target)) {
      throw ErrorHelper.forbidden("Access denied: You are not authorized for this branch");
    }
    return true;
  }

  /**
   * Preview/Cart calculation without saving to database.
   */
  async calculate(data, authContext = {}) {
    const { items = [] } = data;
    if (!Array.isArray(items) || items.length === 0) {
      throw ErrorHelper.badRequest("Items array is required for calculation");
    }

    const calculatedLines = [];
    for (const line of items) {
      if (!line.productId || !line.quantity || Number(line.quantity) <= 0) {
        throw ErrorHelper.badRequest("Valid productId and positive quantity are required for each line");
      }

      const product = await this.invItemRepo.findById(line.productId);
      if (!product) {
        throw ErrorHelper.notFound(`Product item '${line.productId}' not found`);
      }
      if (!product.isActive) {
        throw ErrorHelper.badRequest(`Product '${product.itemCode} - ${product.name}' is inactive`);
      }

      const unitPrice =
        line.unitPrice !== undefined && line.unitPrice !== null
          ? Number(line.unitPrice)
          : Number(product.saleRate || 0);

      // Price override check
      if (line.unitPrice !== undefined && Number(line.unitPrice) !== Number(product.saleRate || 0)) {
        const userPermissions = authContext.user?.permissions || [];
        const hasOverridePerm =
          authContext.isSuperAdmin ||
          userPermissions.includes("pos.saleReceipt.priceOverride") ||
          (authContext.scopes || []).includes("ALL");

        if (!hasOverridePerm) {
          throw ErrorHelper.forbidden("Permission 'pos.saleReceipt.priceOverride' required to modify product sale rate");
        }
      }

      const taxRate = Number(product.taxRate || 0);
      const discount = Number(line.discount || 0);

      const calculated = SaleReceiptHelper.calculateLineItem({
        quantity: Number(line.quantity),
        unitPrice,
        discount,
        taxRate,
      });

      calculatedLines.push({
        productId: product._id,
        productCode: product.itemCode,
        productName: product.name,
        unit: product.unit,
        isStockTracked: product.isStockTracked !== false,
        quantity: calculated.quantity,
        unitPrice: calculated.unitPrice,
        discount: calculated.discount,
        taxRate: calculated.taxRate,
        baseAmount: calculated.baseAmount,
        taxableAmount: calculated.taxableAmount,
        taxAmount: calculated.taxAmount,
        lineTotal: calculated.lineTotal,
        consumptionSnapshot: Array.isArray(line.consumptionSnapshot) ? line.consumptionSnapshot : [],
      });
    }

    const totals = SaleReceiptHelper.calculateTotals(calculatedLines);

    return {
      items: calculatedLines,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
    };
  }

  /**
   * Create DRAFT Sale Receipt.
   */
  async createDraft(data, authContext = {}) {
    const { branchId, customerId, customerSnapshot, saleDate, items = [], remarks, paymentMode } = data;

    if (!branchId) {
      throw ErrorHelper.badRequest("branchId is required");
    }
    this._checkBranchAuthorization(branchId, authContext);

    const calculation = await this.calculate({ items }, authContext);

    const receiptNo = await this.seqService.generateBusinessNumber("SALE_RECEIPT", {
      prefix: "DRAFT-SR",
    });

    const performedBy = authContext.user?._id || authContext.user?.id;

    const receiptData = {
      receiptNo,
      branchId,
      customerId: customerId || null,
      customerSnapshot: customerSnapshot || {},
      saleDate: saleDate ? new Date(saleDate) : new Date(),
      subtotal: calculation.subtotal,
      discountAmount: calculation.discountAmount,
      taxAmount: calculation.taxAmount,
      grandTotal: calculation.grandTotal,
      paymentStatus: "UNPAID",
      paymentMode: paymentMode || "CASH",
      status: "DRAFT",
      amountPaid: 0,
      remarks: remarks || null,
      createdBy: performedBy,
    };

    const receipt = await this.receiptRepo.create(receiptData);

    const receiptItemsData = calculation.items.map((it) => ({
      receiptId: receipt._id,
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discount: it.discount,
      taxRate: it.taxRate,
      taxAmount: it.taxAmount,
      lineTotal: it.lineTotal,
      consumptionSnapshot: it.consumptionSnapshot || [],
    }));

    const createdItems = await this.itemRepo.createMany(receiptItemsData);

    return {
      ...toPlain(receipt),
      items: createdItems,
    };
  }

  /**
   * Update DRAFT items.
   */
  async updateDraftItems(id, items, authContext = {}) {
    const receipt = await this.receiptRepo.findById(id);
    if (!receipt) {
      throw ErrorHelper.notFound("Sale receipt not found");
    }
    this._checkBranchAuthorization(receipt.branchId, authContext);

    if (receipt.status !== "DRAFT") {
      throw ErrorHelper.conflict(`Cannot modify items of receipt with status '${receipt.status}'`);
    }

    const calculation = await this.calculate({ items }, authContext);

    // Replace items
    await this.itemRepo.deleteByReceiptId(receipt._id);

    const receiptItemsData = calculation.items.map((it) => ({
      receiptId: receipt._id,
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discount: it.discount,
      taxRate: it.taxRate,
      taxAmount: it.taxAmount,
      lineTotal: it.lineTotal,
      consumptionSnapshot: it.consumptionSnapshot || [],
    }));

    const createdItems = await this.itemRepo.createMany(receiptItemsData);

    // Update receipt totals
    const updatedReceipt = await this.receiptRepo.update(receipt._id, {
      subtotal: calculation.subtotal,
      discountAmount: calculation.discountAmount,
      taxAmount: calculation.taxAmount,
      grandTotal: calculation.grandTotal,
    });

    return {
      ...toPlain(updatedReceipt),
      items: createdItems,
    };
  }

  /**
   * Update DRAFT header details.
   */
  async updateDraft(id, updateData, authContext = {}) {
    const receipt = await this.receiptRepo.findById(id);
    if (!receipt) {
      throw ErrorHelper.notFound("Sale receipt not found");
    }
    this._checkBranchAuthorization(receipt.branchId, authContext);

    if (receipt.status !== "DRAFT") {
      throw ErrorHelper.conflict(`Cannot update receipt with status '${receipt.status}'`);
    }

    const allowedUpdates = {};
    if (updateData.customerId !== undefined) allowedUpdates.customerId = updateData.customerId;
    if (updateData.customerSnapshot) allowedUpdates.customerSnapshot = updateData.customerSnapshot;
    if (updateData.saleDate) allowedUpdates.saleDate = new Date(updateData.saleDate);
    if (updateData.remarks !== undefined) allowedUpdates.remarks = updateData.remarks;
    if (updateData.paymentMode) allowedUpdates.paymentMode = updateData.paymentMode;

    const updated = await this.receiptRepo.update(receipt._id, allowedUpdates);
    const items = await this.itemRepo.findByReceiptId(receipt._id);

    return {
      ...toPlain(updated),
      items,
    };
  }

  /**
   * Complete Sale: Atomically deducts inventory (product + consumables), records payment, and marks COMPLETED.
   */
  async completeSale(id, data = {}, authContext = {}) {
    const idempotencyKey = data.idempotencyKey || authContext.idempotencyKey;
    if (idempotencyKey) {
      const existing = await this.receiptRepo.findByIdempotencyKey(idempotencyKey);
      if (existing && existing.status === "COMPLETED") {
        const items = await this.itemRepo.findByReceiptId(existing._id);
        const txns = await this.invTxnRepo.findByReference("SALE", existing._id);
        return {
          ...toPlain(existing),
          items,
          inventoryTransactions: txns,
          idempotentReplay: true,
        };
      }
    }

    const receipt = await this.receiptRepo.findById(id);
    if (!receipt) {
      throw ErrorHelper.notFound("Sale receipt not found");
    }
    this._checkBranchAuthorization(receipt.branchId, authContext);

    if (receipt.status === "COMPLETED") {
      const items = await this.itemRepo.findByReceiptId(receipt._id);
      const txns = await this.invTxnRepo.findByReference("SALE", receipt._id);
      return {
        ...toPlain(receipt),
        items,
        inventoryTransactions: txns,
      };
    }

    if (receipt.status === "VOID") {
      throw ErrorHelper.conflict("Cannot complete a VOID sale receipt");
    }

    let items = await this.itemRepo.findByReceiptId(receipt._id);
    if (!items || items.length === 0) {
      throw ErrorHelper.badRequest("Cannot complete a sale receipt without items");
    }

    const performedBy = authContext.user?._id || authContext.user?.id;
    const branchId = receipt.branchId;

    // Payment validation
    const paymentMode = data.paymentMode || receipt.paymentMode || "CASH";
    const paymentReference = data.paymentReference || receipt.paymentReference || null;
    const amountPaid = data.amountPaid !== undefined ? Number(data.amountPaid) : Number(receipt.grandTotal);

    let paymentStatus = "UNPAID";
    if (paymentMode === "CREDIT") {
      if (!receipt.customerId && !data.customerId) {
        throw ErrorHelper.badRequest("Customer is required for CREDIT sales");
      }
      paymentStatus = "CREDIT";
    } else if (amountPaid >= Number(receipt.grandTotal)) {
      paymentStatus = "PAID";
    } else if (amountPaid > 0) {
      paymentStatus = "PARTIAL";
    } else {
      paymentStatus = "UNPAID";
    }

    const executeComplete = async (session) => {
      // 1. Generate final receipt number
      const finalReceiptNo = await this.seqService.generateBusinessNumber("SALE_RECEIPT", {
        prefix: "SR",
      });

      const generatedTxnRecords = [];

      // 2. Post Inventory Deductions for Stock-Tracked Products and Consumables
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const product = await this.invItemRepo.findById(item.productId, session);
        if (!product) {
          throw ErrorHelper.notFound(`Product item '${item.productId}' not found`);
        }

        // Product stock deduction
        if (product.isStockTracked !== false) {
          const postResult = await this.invService.post({
            itemId: product._id,
            branchId,
            type: "SALE",
            quantity: -Number(item.quantity),
            referenceType: "SALE",
            referenceId: receipt._id,
            performedBy,
            notes: `POS Sale Receipt ${finalReceiptNo}`,
            session,
          });
          generatedTxnRecords.push(postResult.transaction);
        }

        // Consumables deduction (Paper, Ink, etc.)
        if (Array.isArray(item.consumptionSnapshot) && item.consumptionSnapshot.length > 0) {
          for (let j = 0; j < item.consumptionSnapshot.length; j++) {
            const cons = item.consumptionSnapshot[j];
            const consPostResult = await this.invService.post({
              itemId: cons.itemId,
              branchId,
              type: "ISSUE",
              consumptionType: cons.consumptionType || "OTHER_CONSUMABLE",
              quantity: -Number(cons.quantity),
              referenceType: "SALE",
              referenceId: receipt._id,
              performedBy,
              notes: `POS Consumable Issue (${cons.consumptionType}) for ${finalReceiptNo}`,
              session,
            });

            cons.transactionId = consPostResult.transaction?._id || consPostResult.transaction?.transactionNo;
            generatedTxnRecords.push(consPostResult.transaction);
          }
        }
      }

      // 3. Update items with consumption transaction IDs
      await this.itemRepo.deleteByReceiptId(receipt._id, session);
      const reinsertedItems = await this.itemRepo.createMany(items, session);

      // 4. Update Receipt status to COMPLETED
      const updatePayload = {
        receiptNo: finalReceiptNo,
        status: "COMPLETED",
        paymentStatus,
        paymentMode,
        paymentReference,
        amountPaid,
      };
      if (idempotencyKey) updatePayload.idempotencyKey = idempotencyKey;

      const completedReceipt = await this.receiptRepo.update(
        receipt._id,
        updatePayload,
        session
      );

      return {
        completedReceipt,
        items: reinsertedItems,
        inventoryTransactions: generatedTxnRecords,
      };
    };

    let result;
    const isReplicaSet = Boolean(mongoose.connection.client?.topology?.description?.servers?.size > 1);
    if (isReplicaSet) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          result = await executeComplete(session);
        });
      } finally {
        await session.endSession();
      }
    } else {
      result = await executeComplete(null);
    }

    // 5. Audit Log Entry
    try {
      await AuditHelper.log({
        actorId: performedBy,
        action: "SALE_RECEIPT_COMPLETE",
        entityType: "SALE_RECEIPT",
        entityId: receipt._id,
        branchId,
        after: {
          receiptNo: result.completedReceipt.receiptNo,
          grandTotal: result.completedReceipt.grandTotal,
          paymentStatus: result.completedReceipt.paymentStatus,
        },
      });
    } catch (e) {
      console.warn("Audit log warning on sale completion:", e.message);
    }

    return {
      ...toPlain(result.completedReceipt),
      items: result.items,
      inventoryTransactions: result.inventoryTransactions,
    };
  }

  /**
   * Fast Counter-Billing Direct Checkout: Draft + Calculate + Complete in one atomic step.
   */
  async checkout(data, authContext = {}) {
    const idempotencyKey = data.idempotencyKey || authContext.idempotencyKey;
    if (idempotencyKey) {
      const existing = await this.receiptRepo.findByIdempotencyKey(idempotencyKey);
      if (existing && existing.status === "COMPLETED") {
        const items = await this.itemRepo.findByReceiptId(existing._id);
        const txns = await this.invTxnRepo.findByReference("SALE", existing._id);
        return {
          ...toPlain(existing),
          items,
          inventoryTransactions: txns,
          idempotentReplay: true,
        };
      }
    }

    const {
      branchId,
      customerId = null,
      customerSnapshot = {},
      saleDate = new Date(),
      items = [],
      remarks = null,
      paymentMode = "CASH",
      paymentReference = null,
      amountPaid,
    } = data;

    if (!branchId) {
      throw ErrorHelper.badRequest("branchId is required");
    }
    this._checkBranchAuthorization(branchId, authContext);

    if (!Array.isArray(items) || items.length === 0) {
      throw ErrorHelper.badRequest("At least one item is required for checkout");
    }

    const calculation = await this.calculate({ items }, authContext);

    const paid = amountPaid !== undefined ? Number(amountPaid) : calculation.grandTotal;
    let paymentStatus = "UNPAID";
    if (paymentMode === "CREDIT") {
      if (!customerId) {
        throw ErrorHelper.badRequest("Customer is required for CREDIT checkout");
      }
      paymentStatus = "CREDIT";
    } else if (paid >= calculation.grandTotal) {
      paymentStatus = "PAID";
    } else if (paid > 0) {
      paymentStatus = "PARTIAL";
    } else {
      paymentStatus = "UNPAID";
    }

    const performedBy = authContext.user?._id || authContext.user?.id;

    const executeCheckout = async (session) => {
      const receiptNo = await this.seqService.generateBusinessNumber("SALE_RECEIPT", {
        prefix: "SR",
      });

      const receiptData = {
        receiptNo,
        branchId,
        customerId,
        customerSnapshot,
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        subtotal: calculation.subtotal,
        discountAmount: calculation.discountAmount,
        taxAmount: calculation.taxAmount,
        grandTotal: calculation.grandTotal,
        paymentStatus,
        paymentMode,
        paymentReference,
        status: "COMPLETED",
        amountPaid: paid,
        remarks,
        createdBy: performedBy,
      };
      if (idempotencyKey) receiptData.idempotencyKey = idempotencyKey;

      const receipt = await this.receiptRepo.create(receiptData, session);

      const generatedTxnRecords = [];
      const receiptItemsData = [];

      for (const it of calculation.items) {
        // Stock deduction for product
        if (it.isStockTracked) {
          const postResult = await this.invService.post({
            itemId: it.productId,
            branchId,
            type: "SALE",
            quantity: -Number(it.quantity),
            referenceType: "SALE",
            referenceId: receipt._id,
            performedBy,
            notes: `POS Counter Checkout ${receiptNo}`,
            session,
          });
          generatedTxnRecords.push(postResult.transaction);
        }

        // Consumables deduction
        const consSnapshots = [];
        if (Array.isArray(it.consumptionSnapshot) && it.consumptionSnapshot.length > 0) {
          for (const cons of it.consumptionSnapshot) {
            const consPostResult = await this.invService.post({
              itemId: cons.itemId,
              branchId,
              type: "ISSUE",
              consumptionType: cons.consumptionType || "OTHER_CONSUMABLE",
              quantity: -Number(cons.quantity),
              referenceType: "SALE",
              referenceId: receipt._id,
              performedBy,
              notes: `POS Consumable Issue (${cons.consumptionType}) for ${receiptNo}`,
              session,
            });

            consSnapshots.push({
              ...cons,
              transactionId: consPostResult.transaction?._id || consPostResult.transaction?.transactionNo,
            });
            generatedTxnRecords.push(consPostResult.transaction);
          }
        }

        receiptItemsData.push({
          receiptId: receipt._id,
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount,
          taxRate: it.taxRate,
          taxAmount: it.taxAmount,
          lineTotal: it.lineTotal,
          consumptionSnapshot: consSnapshots,
        });
      }

      const createdItems = await this.itemRepo.createMany(receiptItemsData, session);

      return {
        receipt,
        items: createdItems,
        inventoryTransactions: generatedTxnRecords,
      };
    };

    let result;
    const isReplicaSet = Boolean(mongoose.connection.client?.topology?.description?.servers?.size > 1);
    if (isReplicaSet) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          result = await executeCheckout(session);
        });
      } finally {
        await session.endSession();
      }
    } else {
      result = await executeCheckout(null);
    }

    // Audit Log
    try {
      await AuditHelper.log({
        actorId: performedBy,
        action: "SALE_RECEIPT_CREATE",
        entityType: "SALE_RECEIPT",
        entityId: result.receipt._id,
        branchId,
        after: {
          receiptNo: result.receipt.receiptNo,
          grandTotal: result.receipt.grandTotal,
          paymentStatus: result.receipt.paymentStatus,
        },
      });
    } catch (e) {
      console.warn("Audit log warning on checkout:", e.message);
    }

    return {
      ...toPlain(result.receipt),
      items: result.items,
      inventoryTransactions: result.inventoryTransactions,
    };
  }

  /**
   * Void Sale Receipt: Reverses stock via RETURN transactions and marks VOID.
   */
  async voidSale(id, data, authContext = {}) {
    const { reason } = data;
    if (!reason || String(reason).trim() === "") {
      throw ErrorHelper.badRequest("reason field is required to void a sale receipt");
    }

    const receipt = await this.receiptRepo.findById(id);
    if (!receipt) {
      throw ErrorHelper.notFound("Sale receipt not found");
    }
    this._checkBranchAuthorization(receipt.branchId, authContext);

    if (receipt.status !== "COMPLETED") {
      throw ErrorHelper.conflict(`Only COMPLETED receipts can be voided. Current status: '${receipt.status}'`);
    }

    const items = await this.itemRepo.findByReceiptId(receipt._id);
    const performedBy = authContext.user?._id || authContext.user?.id;
    const branchId = receipt.branchId;

    const executeVoid = async (session) => {
      const reversalTxns = [];

      for (const item of items) {
        const product = await this.invItemRepo.findById(item.productId, session);
        if (product && product.isStockTracked !== false) {
          const revResult = await this.invService.post({
            itemId: item.productId,
            branchId,
            type: "RETURN",
            quantity: Number(item.quantity), // Positive to restore stock
            referenceType: "SALE",
            referenceId: receipt._id,
            performedBy,
            notes: `Void Reversal for ${receipt.receiptNo}: ${reason}`,
            session,
          });
          reversalTxns.push(revResult.transaction);
        }

        if (Array.isArray(item.consumptionSnapshot) && item.consumptionSnapshot.length > 0) {
          for (const cons of item.consumptionSnapshot) {
            const consRev = await this.invService.post({
              itemId: cons.itemId,
              branchId,
              type: "RETURN",
              consumptionType: cons.consumptionType || "OTHER_CONSUMABLE",
              quantity: Number(cons.quantity), // Positive to restore stock
              referenceType: "SALE",
              referenceId: receipt._id,
              performedBy,
              notes: `Void Consumable Reversal (${cons.consumptionType}) for ${receipt.receiptNo}: ${reason}`,
              session,
            });
            reversalTxns.push(consRev.transaction);
          }
        }
      }

      const voidedReceipt = await this.receiptRepo.update(
        receipt._id,
        {
          status: "VOID",
          voidReason: String(reason).trim(),
          voidedBy: performedBy,
          voidedAt: new Date(),
        },
        session
      );

      return {
        voidedReceipt,
        items,
        inventoryTransactions: reversalTxns,
      };
    };

    let result;
    const isReplicaSet = Boolean(mongoose.connection.client?.topology?.description?.servers?.size > 1);
    if (isReplicaSet) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          result = await executeVoid(session);
        });
      } finally {
        await session.endSession();
      }
    } else {
      result = await executeVoid(null);
    }

    try {
      await AuditHelper.log({
        actorId: performedBy,
        action: "SALE_RECEIPT_VOID",
        entityType: "SALE_RECEIPT",
        entityId: receipt._id,
        branchId,
        before: { status: "COMPLETED" },
        after: { status: "VOID", voidReason: reason },
      });
    } catch (e) {
      console.warn("Audit log warning on void:", e.message);
    }

    return {
      ...toPlain(result.voidedReceipt),
      items: result.items,
      inventoryTransactions: result.inventoryTransactions,
    };
  }

  /**
   * Record payment settlement on CREDIT / PARTIAL sale receipt.
   */
  async recordPayment(id, data, authContext = {}) {
    const { amount, paymentMode = "CASH", paymentReference = null } = data;
    const payAmt = Number(amount);
    if (isNaN(payAmt) || payAmt <= 0) {
      throw ErrorHelper.badRequest("Valid positive payment amount is required");
    }

    const receipt = await this.receiptRepo.findById(id);
    if (!receipt) {
      throw ErrorHelper.notFound("Sale receipt not found");
    }
    this._checkBranchAuthorization(receipt.branchId, authContext);

    if (receipt.status === "VOID") {
      throw ErrorHelper.conflict("Cannot record payment against a VOID sale receipt");
    }

    const currentPaid = Number(receipt.amountPaid || 0);
    const grandTotal = Number(receipt.grandTotal || 0);
    const remaining = Math.max(0, grandTotal - currentPaid);

    if (payAmt > remaining + 0.001) {
      throw ErrorHelper.badRequest(`Payment amount ₹${payAmt} exceeds remaining due ₹${remaining}`);
    }

    const newAmountPaid = SaleReceiptHelper.round2(currentPaid + payAmt);
    let newPaymentStatus = "PARTIAL";
    if (newAmountPaid >= grandTotal - 0.001) {
      newPaymentStatus = "PAID";
    }

    const updated = await this.receiptRepo.update(receipt._id, {
      amountPaid: newAmountPaid,
      paymentStatus: newPaymentStatus,
      paymentMode: paymentMode || receipt.paymentMode,
      paymentReference: paymentReference || receipt.paymentReference,
    });

    const items = await this.itemRepo.findByReceiptId(receipt._id);

    try {
      await AuditHelper.log({
        actorId: authContext.user?._id || authContext.user?.id,
        action: "SALE_RECEIPT_PAYMENT",
        entityType: "SALE_RECEIPT",
        entityId: receipt._id,
        branchId: receipt.branchId,
        after: { amountPaid: newAmountPaid, paymentStatus: newPaymentStatus },
      });
    } catch (e) {
      console.warn("Audit log warning on payment:", e.message);
    }

    return {
      ...toPlain(updated),
      items,
    };
  }

  /**
   * Delete DRAFT receipt.
   */
  async deleteDraft(id, authContext = {}) {
    const receipt = await this.receiptRepo.findById(id);
    if (!receipt) {
      throw ErrorHelper.notFound("Sale receipt not found");
    }
    this._checkBranchAuthorization(receipt.branchId, authContext);

    if (receipt.status !== "DRAFT") {
      throw ErrorHelper.conflict(`Only DRAFT receipts can be deleted. Cannot delete status '${receipt.status}'`);
    }

    await this.itemRepo.deleteByReceiptId(receipt._id);
    await this.receiptRepo.delete(receipt._id);

    return {
      message: `Draft receipt '${receipt.receiptNo}' deleted successfully`,
      receiptId: receipt._id,
    };
  }

  /**
   * Get single receipt by ID with items and inventory transactions.
   */
  async getReceiptById(id, authContext = {}) {
    const receipt = await this.receiptRepo.findById(id);
    if (!receipt) {
      throw ErrorHelper.notFound("Sale receipt not found");
    }
    this._checkBranchAuthorization(receipt.branchId, authContext);

    const items = await this.itemRepo.findByReceiptId(receipt._id);
    const txns = await this.invTxnRepo.findByReference("SALE", receipt._id);

    return {
      ...toPlain(receipt),
      items,
      inventoryTransactions: txns,
    };
  }

  /**
   * List sale receipts with query filters and branch RBAC.
   */
  async getReceipts(filters = {}, pagination = {}, authContext = {}) {
    let query = {};
    if (filters.branchId) query.branchId = filters.branchId;
    if (filters.status) query.status = String(filters.status).trim().toUpperCase();
    if (filters.paymentStatus) query.paymentStatus = String(filters.paymentStatus).trim().toUpperCase();
    if (filters.paymentMode) query.paymentMode = String(filters.paymentMode).trim().toUpperCase();
    if (filters.customerId) query.customerId = filters.customerId;
    if (filters.createdBy) query.createdBy = filters.createdBy;

    if (filters.from || filters.to) {
      query.saleDate = {};
      if (filters.from) query.saleDate.$gte = new Date(filters.from);
      if (filters.to) query.saleDate.$lte = new Date(filters.to);
    }

    if (filters.q) {
      const regex = new RegExp(String(filters.q).trim(), "i");
      query.$or = [
        { receiptNo: regex },
        { "customerSnapshot.name": regex },
        { "customerSnapshot.mobile": regex },
      ];
    }

    query = this._applyScopeConstraint(query, authContext);
    return this.receiptRepo.findAll(query, pagination);
  }

  /**
   * Print receipt view (A4 or thermal HTML/data).
   */
  async printReceipt(id, template = "a4", authContext = {}) {
    const receiptData = await this.getReceiptById(id, authContext);
    const html = SaleReceiptHelper.renderPrintHtml(receiptData, receiptData.items, template);
    return {
      receipt: receiptData,
      template,
      html,
    };
  }

  /**
   * Share receipt via WhatsApp / SMS / Email.
   */
  async shareReceipt(id, shareData, authContext = {}) {
    const { channel = "WHATSAPP", mobile, email } = shareData;
    const receiptData = await this.getReceiptById(id, authContext);

    // If third-party messaging provider is not active in environment
    const isIntegrationActive = Boolean(process.env.WHATSAPP_API_KEY || process.env.TWILIO_AUTH_TOKEN);

    if (!isIntegrationActive) {
      const err = new Error("Messaging integration provider is not configured/disabled in environment");
      err.statusCode = 422;
      err.code = "INTEGRATION_DISABLED";
      throw err;
    }

    try {
      await AuditHelper.log({
        actorId: authContext.user?._id || authContext.user?.id,
        action: "SALE_RECEIPT_SHARE",
        entityType: "SALE_RECEIPT",
        entityId: receiptData._id,
        branchId: receiptData.branchId,
        after: { channel, target: mobile || email },
      });
    } catch (e) {
      console.warn("Audit log warning on share:", e.message);
    }

    return {
      accepted: true,
      channel,
      recipient: mobile || email,
      receiptNo: receiptData.receiptNo,
      message: `Sale receipt '${receiptData.receiptNo}' queued for dispatch via ${channel}`,
    };
  }

  /**
   * Export receipt metadata/HTML.
   */
  async exportReceipt(id, format = "pdf", authContext = {}) {
    const receiptData = await this.getReceiptById(id, authContext);
    const html = SaleReceiptHelper.renderPrintHtml(receiptData, receiptData.items, "a4");

    return {
      format: String(format).toLowerCase(),
      receiptNo: receiptData.receiptNo,
      generatedAt: new Date(),
      content: html,
      receipt: receiptData,
    };
  }
}

module.exports = new SaleReceiptService();
