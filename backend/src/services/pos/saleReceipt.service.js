const mongoose = require("mongoose");
const SaleReceipt = require("../../models/pos/SaleReceipt");
const SaleReceiptItem = require("../../models/pos/SaleReceiptItem");
let Product, InventoryItem, InventoryTransaction, InventoryBalance, Branch, Customer;
try {
  Product = require("../../models/Product");
} catch (e) {
  Product = mongoose.models.Product || null;
}
try {
  InventoryItem = require("../../models/inventory/InventoryItem");
} catch (e) {
  InventoryItem = mongoose.models.InventoryItem || null;
}
try {
  InventoryTransaction = require("../../models/inventory/InventoryTransaction");
} catch (e) {
  InventoryTransaction = mongoose.models.InventoryTransaction || null;
}
try {
  InventoryBalance = require("../../models/inventory/InventoryBalance");
} catch (e) {
  InventoryBalance = mongoose.models.InventoryBalance || null;
}
try {
  Branch = require("../../models/Branch");
} catch (e) {
  Branch = require("../../models/common/Branch");
}
try {
  Customer = require("../../models/Customer");
} catch (e) {
  Customer = require("../../models/customer/Customer");
}
let StockItem;
try {
  StockItem = require("../../models/common/StockItem");
} catch (e) {
  StockItem = mongoose.models.StockItem || null;
}
let inventoryService;
try {
  inventoryService = require("../inventory/inventory.service");
} catch (e) {
  inventoryService = require("../inventory.service");
}
let numberSequenceService;
try {
  numberSequenceService = require("../numberSequence.service");
} catch (e) {
  numberSequenceService = require("../common/numberSequence.service");
}
const SaleReceiptHelper = require("../../utils/helpers/saleReceipt.helper");
const AuditService = require("../../utils/AuditService");
const ErrorHelper = require("../../utils/errors/ErrorHelper");
const whatsAppService = require("../../utils/WhatsAppService");

const saleReceiptRepository = {
  create: async (data, session = null) => {
    const opts = session ? { session } : {};
    const [doc] = await SaleReceipt.create([data], opts);
    return doc;
  },
  findById: async (id, session = null) => {
    const q = SaleReceipt.findById(id);
    if (session) q.session(session);
    return q.exec();
  },
  findByReceiptNo: async (receiptNo, session = null) => {
    const q = SaleReceipt.findOne({ receiptNo });
    if (session) q.session(session);
    return q.exec();
  },
  findByIdempotencyKey: async (idempotencyKey, session = null) => {
    if (!idempotencyKey) return null;
    const q = SaleReceipt.findOne({ idempotencyKey });
    if (session) q.session(session);
    return q.exec();
  },
  update: async (id, updateData, session = null) => {
    const opts = { new: true };
    if (session) opts.session = session;
    return SaleReceipt.findByIdAndUpdate(id, { $set: updateData }, opts).exec();
  },
  delete: async (id, session = null) => {
    const opts = session ? { session } : {};
    return SaleReceipt.findByIdAndDelete(id, opts).exec();
  },
  findAll: async (query = {}, pagination = {}) => {
    const { page = 1, limit = 50, sort = { saleDate: -1 } } = pagination;
    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      SaleReceipt.find(query).sort(sort).skip(skip).limit(limit).lean().exec(),
      SaleReceipt.countDocuments(query).exec(),
    ]);
    return { records, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) || 1 };
  },
};

const saleReceiptItemRepository = {
  createMany: async (items, session = null) => {
    if (!Array.isArray(items) || items.length === 0) return [];
    const opts = session ? { session } : {};
    return SaleReceiptItem.insertMany(items, opts);
  },
  findByReceiptId: async (receiptId, session = null) => {
    const q = SaleReceiptItem.find({ receiptId });
    if (session) q.session(session);
    return q.exec();
  },
  deleteByReceiptId: async (receiptId, session = null) => {
    const opts = session ? { session } : {};
    return SaleReceiptItem.deleteMany({ receiptId }, opts).exec();
  },
};

const inventoryItemRepository = {
  findById: async (id, session = null) => {
    let item = null;
    try {
      const ProdModel = Product || (mongoose.models.Product ? mongoose.model("Product") : null);
      if (ProdModel && mongoose.Types.ObjectId.isValid(id)) {
        const q = ProdModel.findById(id);
        if (session) q.session(session);
        item = await q.exec();
      }
    } catch (e) {}

    if (!item) {
      try {
        const InvModel = InventoryItem || (mongoose.models.InventoryItem ? mongoose.model("InventoryItem") : null);
        if (InvModel && mongoose.Types.ObjectId.isValid(id)) {
          const q = InvModel.findById(id);
          if (session) q.session(session);
          item = await q.exec();
        }
      } catch (e) {}
    }

    if (!item) {
      try {
        const StockModel = StockItem || (mongoose.models.StockItem ? mongoose.model("StockItem") : null);
        if (StockModel && id) {
          const idStr = String(id);
          const objId = mongoose.Types.ObjectId.isValid(idStr) ? new mongoose.Types.ObjectId(idStr) : null;
          let rawStock = null;
          if (StockModel.collection) {
            rawStock = await StockModel.collection.findOne({
              $or: [
                { _id: idStr },
                ...(objId ? [{ _id: objId }] : []),
                { stockId: idStr },
              ],
            });
          }
          if (!rawStock && typeof StockModel.findById === "function") {
            try {
              rawStock = await StockModel.findById(id);
            } catch (err) {}
          }
          if (!rawStock && objId) {
            try {
              rawStock = await StockModel.findOne({ _id: objId });
            } catch (err) {}
          }
          if (rawStock) {
            item = {
              _id: rawStock._id,
              name: rawStock.itemName || rawStock.name,
              itemCode: rawStock.stockId || rawStock.itemCode || "STOCK",
              saleRate: Number(rawStock.rate || rawStock.unitPrice || rawStock.amount || 0),
              price: Number(rawStock.rate || rawStock.unitPrice || rawStock.amount || 0),
              costPrice: Number(rawStock.rate || rawStock.unitPrice || 0),
              taxRate: Number(rawStock.taxRate || 0),
              isStockTracked: true,
              unit: rawStock.unit || "PCS",
              category: rawStock.category || "General",
              currentStock: Number(rawStock.currentStock || rawStock.quantity || rawStock.qty || 0),
              isStockItem: true,
            };
          }
        }
      } catch (e) {
        console.error("Error looking up StockItem:", e.message);
      }
    }
    return item;
  },
};

const inventoryTransactionRepository = {
  findByReference: async (referenceType, referenceId, session = null) => {
    const q = InventoryTransaction.find({ referenceType, referenceId });
    if (session) q.session(session);
    return q.exec();
  },
};

const AuditHelper = {
  log: async (params) => AuditService.log(params),
};

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
          const rawRequested =
            typeof query.branchId === "object" && query.branchId !== null && query.branchId.$in
              ? query.branchId.$in[0]
              : query.branchId;
          const requestedBranch = rawRequested ? rawRequested.toString() : "";
          if (!authorizedBranches.includes(requestedBranch)) {
            query.branchId = new mongoose.Types.ObjectId("000000000000000000000000"); // Fail closed
          } else {
            const variants = [requestedBranch];
            if (mongoose.Types.ObjectId.isValid(requestedBranch)) {
              variants.push(new mongoose.Types.ObjectId(requestedBranch));
            }
            query.branchId = { $in: variants };
          }
        } else {
          const variants = authorizedBranches.flatMap((b) => [
            b.toString(),
            mongoose.Types.ObjectId.isValid(b) ? new mongoose.Types.ObjectId(b) : null,
          ].filter(Boolean));
          query.branchId = { $in: variants };
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
      if (product.isActive === false) {
        throw ErrorHelper.badRequest(`Product '${product.itemCode || product.code || product.name}' is inactive`);
      }

      const defaultRate =
        product.saleRate !== undefined && product.saleRate !== null
          ? Number(product.saleRate)
          : Number(product.price || 0);

      const unitPrice =
        line.unitPrice !== undefined && line.unitPrice !== null
          ? Number(line.unitPrice)
          : defaultRate;

      // Price override check
      if (line.unitPrice !== undefined && Number(line.unitPrice) !== defaultRate) {
        const userPermissions = authContext.user?.permissions || [];
        const hasOverridePerm =
          authContext.isSuperAdmin ||
          userPermissions.includes("pos.saleReceipt.priceOverride") ||
          (authContext.scopes || []).includes("ALL");

        if (!hasOverridePerm) {
          throw ErrorHelper.forbidden("Permission 'pos.saleReceipt.priceOverride' required to modify product sale rate");
        }
      }

      const taxRate =
        line.taxRate !== undefined && line.taxRate !== null
          ? Number(line.taxRate)
          : Number(product.taxRate || 0);
      const discount = Number(line.discount || 0);

      const calculated = SaleReceiptHelper.calculateLineItem({
        quantity: Number(line.quantity),
        unitPrice,
        discount,
        taxRate,
      });

      calculatedLines.push({
        productId: product._id,
        productCode: product.itemCode || product.code || "ITEM",
        productName: product.name,
        unit: product.unit || "NOS",
        isStockTracked: Boolean(product.isStockTracked || product.trackInventory),
        isStockItem: Boolean(product.isStockItem),
        quantity: calculated.quantity,
        unitPrice: calculated.unitPrice,
        discount: calculated.discount,
        taxRate: calculated.taxRate,
        baseAmount: calculated.baseAmount,
        taxableAmount: calculated.taxableAmount,
        taxAmount: calculated.taxAmount,
        lineTotal: calculated.lineTotal,
        consumptionSnapshot: Array.isArray(line.consumptionSnapshot) ? line.consumptionSnapshot : [],
        wastageQuantity: Number(line.wastageQuantity || 0),
        wastageReason: line.wastageReason || null,
        notes: line.notes || line.wastageNote || null,
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
      wastageQuantity: Number(it.wastageQuantity || 0),
      wastageReason: it.wastageReason || null,
      notes: it.notes || null,
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
  async updateDraft(id, updateData = {}, authContext = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ErrorHelper.badRequest("Invalid sale receipt ID format");
    }

    const receipt = await this.receiptRepo.findById(id);
    if (!receipt) {
      throw ErrorHelper.notFound("Sale receipt not found");
    }
    this._checkBranchAuthorization(receipt.branchId, authContext);

    if (receipt.status !== "DRAFT") {
      throw ErrorHelper.conflict(`Cannot update receipt with status '${receipt.status}'`);
    }

    const data = updateData || {};
    const allowedUpdates = {};
    let items;

    // Recalculate totals if editable items change
    if (Array.isArray(data.items)) {
      if (data.items.length === 0) {
        throw ErrorHelper.badRequest("At least one item is required when updating draft items");
      }
      const calculation = await this.calculate({ items: data.items }, authContext);

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

      items = await this.itemRepo.createMany(receiptItemsData);

      allowedUpdates.subtotal = calculation.subtotal;
      allowedUpdates.discountAmount = calculation.discountAmount;
      allowedUpdates.taxAmount = calculation.taxAmount;
      allowedUpdates.grandTotal = calculation.grandTotal;
    }

    if (data.customerId !== undefined) allowedUpdates.customerId = data.customerId;
    if (data.customerSnapshot && typeof data.customerSnapshot === "object") {
      allowedUpdates.customerSnapshot = {
        name: data.customerSnapshot.name !== undefined ? data.customerSnapshot.name : (receipt.customerSnapshot?.name || null),
        mobile: data.customerSnapshot.mobile !== undefined ? data.customerSnapshot.mobile : (receipt.customerSnapshot?.mobile || null),
        email: data.customerSnapshot.email !== undefined ? data.customerSnapshot.email : (receipt.customerSnapshot?.email || null),
        gstin: data.customerSnapshot.gstin !== undefined ? data.customerSnapshot.gstin : (receipt.customerSnapshot?.gstin || null),
        address: data.customerSnapshot.address !== undefined ? data.customerSnapshot.address : (receipt.customerSnapshot?.address || null),
      };
    } else if (data.customerName !== undefined || data.customerMobile !== undefined) {
      allowedUpdates.customerSnapshot = {
        ...(receipt.customerSnapshot || {}),
        ...(data.customerName !== undefined ? { name: data.customerName } : {}),
        ...(data.customerMobile !== undefined ? { mobile: data.customerMobile } : {}),
      };
    }
    if (data.saleDate) allowedUpdates.saleDate = new Date(data.saleDate);
    if (data.remarks !== undefined) allowedUpdates.remarks = data.remarks;
    if (data.paymentMode) allowedUpdates.paymentMode = data.paymentMode;

    const updated = await this.receiptRepo.update(receipt._id, allowedUpdates);
    if (!items) {
      items = await this.itemRepo.findByReceiptId(receipt._id);
    }

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
        if (product.isStockItem) {
          const StockModel = StockItem || (mongoose.models.StockItem ? mongoose.model("StockItem") : null);
          if (StockModel) {
            const idStr = String(product._id);
            const objId = mongoose.Types.ObjectId.isValid(idStr) ? new mongoose.Types.ObjectId(idStr) : null;
            if (StockModel.collection) {
              await StockModel.collection.updateOne(
                {
                  $or: [
                    { _id: idStr },
                    ...(objId ? [{ _id: objId }] : []),
                    { stockId: idStr },
                  ],
                },
                {
                  $inc: {
                    currentStock: -Number(item.quantity),
                    quantity: -Number(item.quantity),
                    qty: -Number(item.quantity),
                  },
                }
              );
            } else {
              await StockModel.findByIdAndUpdate(
                product._id,
                {
                  $inc: {
                    currentStock: -Number(item.quantity),
                    quantity: -Number(item.quantity),
                    qty: -Number(item.quantity),
                  },
                },
                { session }
              );
            }
          }
        } else if (product.isStockTracked !== false) {
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
            allowNegative: true,
            isOverride: true,
          });
          generatedTxnRecords.push(postResult.transaction);
        }

        // Consumables deduction (Paper, Ink, etc.) - Decoupled from printing press jobs
        // Decoupled: consumable printing loop (consumptionSnapshot) removed as it was only for physical paper/toner printing jobs.
        /*
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
        */
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

    const resolvedCustomerSnapshot = {
      name: data.customerName || (customerSnapshot && customerSnapshot.name) || null,
      mobile: data.customerMobile || (customerSnapshot && customerSnapshot.mobile) || null,
      email: (customerSnapshot && customerSnapshot.email) || null,
      gstin: (customerSnapshot && customerSnapshot.gstin) || null,
      address: (customerSnapshot && customerSnapshot.address) || null,
      ...(typeof customerSnapshot === "object" ? customerSnapshot : {}),
    };

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
        customerSnapshot: resolvedCustomerSnapshot,
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        subtotal: calculation.subtotal,
        discountAmount: calculation.discountAmount,
        taxAmount: calculation.taxAmount,
        grandTotal: calculation.grandTotal,
        paymentStatus,
        paymentMode,
        splitPayments: Array.isArray(data.splitPayments) ? data.splitPayments : [],
        paymentReference,
        status: "COMPLETED",
        amountPaid: paid,
        balanceDue: Math.max(0, calculation.grandTotal - paid),
        managerApproval: data.managerApproval || { isApproved: false },
        remarks,
        createdBy: performedBy,
      };
      if (idempotencyKey) receiptData.idempotencyKey = idempotencyKey;

      const receipt = await this.receiptRepo.create(receiptData, session);

      const generatedTxnRecords = [];
      const receiptItemsData = [];

      for (const it of calculation.items) {
        const totalConsumptionQty = Number(it.quantity) + Number(it.wastageQuantity || 0);

        // Stock deduction for product / stock item
        if (it.isStockItem) {
          const StockModel = StockItem || (mongoose.models.StockItem ? mongoose.model("StockItem") : null);
          if (StockModel) {
            const idStr = String(it.productId);
            const objId = mongoose.Types.ObjectId.isValid(idStr) ? new mongoose.Types.ObjectId(idStr) : null;
            if (StockModel.collection) {
              await StockModel.collection.updateOne(
                {
                  $or: [
                    { _id: idStr },
                    ...(objId ? [{ _id: objId }] : []),
                    { stockId: idStr },
                  ],
                },
                {
                  $inc: {
                    currentStock: -totalConsumptionQty,
                    quantity: -totalConsumptionQty,
                    qty: -totalConsumptionQty,
                  },
                }
              );
            } else {
              await StockModel.findByIdAndUpdate(
                it.productId,
                {
                  $inc: {
                    currentStock: -totalConsumptionQty,
                    quantity: -totalConsumptionQty,
                    qty: -totalConsumptionQty,
                  },
                },
                { session }
              );
            }
          }
        } else if (it.isStockTracked) {
          const postResult = await this.invService.post({
            itemId: it.productId,
            branchId,
            type: "SALE",
            quantity: -totalConsumptionQty,
            referenceType: "SALE",
            referenceId: receipt._id,
            performedBy,
            notes: `POS Counter Checkout ${receiptNo}${it.wastageQuantity > 0 ? ` (Includes ${it.wastageQuantity} wastage: ${it.wastageReason || "unspecified"})` : ""}`,
            session,
            allowNegative: true,
            isOverride: true,
          });
          generatedTxnRecords.push(postResult.transaction);
        }

        // Consumables deduction (decoupled from physical printing jobs)
        const consSnapshots = [];
        /*
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
        */

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
          wastageQuantity: Number(it.wastageQuantity || 0),
          wastageReason: it.wastageReason || null,
          notes: it.notes || it.wastageNote || null,
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
        const restoreQty = Number(item.quantity) + Number(item.wastageQuantity || 0);

        if (product && product.isStockItem) {
          const StockModel = StockItem || (mongoose.models.StockItem ? mongoose.model("StockItem") : null);
          if (StockModel) {
            await StockModel.findByIdAndUpdate(
              product._id,
              {
                $inc: {
                  currentStock: restoreQty,
                  quantity: restoreQty,
                  qty: restoreQty,
                },
              },
              { session }
            );
          }
        } else if (product && product.isStockTracked !== false) {
          const revResult = await this.invService.post({
            itemId: item.productId,
            branchId,
            type: "RETURN",
            quantity: restoreQty, // Positive to restore stock
            referenceType: "SALE",
            referenceId: receipt._id,
            performedBy,
            notes: `Void Reversal for ${receipt.receiptNo}: ${reason}`,
            session,
          });
          reversalTxns.push(revResult.transaction);
        }

        // Consumables reversal decoupled
        /*
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
        */
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
  async recordPayment(id, data = {}, authContext = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ErrorHelper.badRequest("Invalid sale receipt ID format");
    }

    const { amount, paymentMode = "CASH", paymentReference = null } = data || {};
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
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ErrorHelper.badRequest("Invalid receipt ID format");
    }

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
    if (filters.branchId) {
      const bStr = String(filters.branchId).trim();
      const variants = [bStr];
      if (mongoose.Types.ObjectId.isValid(bStr)) {
        variants.push(new mongoose.Types.ObjectId(bStr));
      }
      query.branchId = { $in: variants };
    }
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
   * Print receipt view (A4 or thermal data).
   */
  async printReceipt(id, template = "a4", authContext = {}) {
    const receiptData = await this.getReceiptById(id, authContext);
    return {
      receipt: receiptData,
      template,
    };
  }

  /**
   * Get formatted Sale Receipt Report with totals, payment details, and inventory transactions.
   */
  async getReceiptReport(id, authContext = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ErrorHelper.badRequest("Invalid receipt ID format");
    }

    const receiptData = await this.getReceiptById(id, authContext);

    const grandTotal = Number(receiptData.grandTotal || 0);
    const amountPaid = Number(receiptData.amountPaid || 0);
    const balanceDue = Math.max(0, SaleReceiptHelper.round2(grandTotal - amountPaid));

    let branch = null;
    if (receiptData.branchId) {
      try {
        const Branch = mongoose.models.Branch || mongoose.model("Branch");
        const b = await Branch.findById(receiptData.branchId).lean();
        if (b) {
          branch = {
            _id: b._id,
            name: b.name,
            code: b.code,
            address: b.address || "",
          };
        }
      } catch (e) {
        // Fallback gracefully
      }
    }

    return {
      receiptId: receiptData._id,
      receiptNo: receiptData.receiptNo,
      date: receiptData.saleDate,
      saleDate: receiptData.saleDate,
      branchId: receiptData.branchId,
      branch: branch || receiptData.branchId,
      customerId: receiptData.customerId,
      customerSnapshot: receiptData.customerSnapshot || {},
      status: receiptData.status,
      items: receiptData.items || [],
      subtotal: receiptData.subtotal,
      discount: receiptData.discountAmount,
      discountAmount: receiptData.discountAmount,
      tax: receiptData.taxAmount,
      taxAmount: receiptData.taxAmount,
      grandTotal,
      paymentStatus: receiptData.paymentStatus,
      paymentMode: receiptData.paymentMode,
      paymentReference: receiptData.paymentReference,
      amountPaid,
      balanceDue,
      inventoryTransactions: receiptData.inventoryTransactions || [],
      createdAt: receiptData.createdAt,
      updatedAt: receiptData.updatedAt,
    };
  }

  /**
   * Share receipt via WhatsApp only.
   */
  async shareReceipt(id, shareData = {}, authContext = {}) {
    const { channel = "WHATSAPP", mobile, phone } = shareData || {};

    // Enforce WhatsApp only
    if (channel && String(channel).trim().toUpperCase() !== "WHATSAPP") {
      throw ErrorHelper.badRequest("Only WhatsApp sharing is supported. Please set channel to 'WHATSAPP'.");
    }

    const receiptData = await this.getReceiptById(id, authContext);

    // Verify WhatsApp messaging provider is configured in environment
    if (!whatsAppService.isConfigured()) {
      const err = new Error(
        "Messaging integration provider is not configured/disabled in environment. " +
          "Please configure WHATSAPP_API_KEY and WHATSAPP_PHONE_NUMBER_ID (for Meta WhatsApp Cloud API) " +
          "or TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM (for Twilio WhatsApp API)."
      );
      err.statusCode = 422;
      err.code = "INTEGRATION_DISABLED";
      throw err;
    }

    // Resolve recipient mobile number
    let recipientPhone = mobile || phone || shareData?.recipient;
    if (!recipientPhone) {
      recipientPhone = receiptData.customerSnapshot?.mobile || receiptData.customerSnapshot?.phone;
    }
    if (!recipientPhone && receiptData.customerId) {
      try {
        const customerDoc = await Customer.findById(receiptData.customerId).lean();
        if (customerDoc && (customerDoc.phone || customerDoc.mobile)) {
          recipientPhone = customerDoc.phone || customerDoc.mobile;
        }
      } catch (e) {
        // Fallback
      }
    }

    if (!recipientPhone || String(recipientPhone).trim() === "") {
      throw ErrorHelper.badRequest(
        "Recipient phone number is required. Please provide a mobile number in the request body or ensure the customer has a mobile number registered."
      );
    }

    // Resolve branch name for receipt template
    let branchName = null;
    if (receiptData.branchId) {
      try {
        const branchDoc = await Branch.findById(receiptData.branchId).lean();
        if (branchDoc) branchName = branchDoc.name;
      } catch (e) {
        // Fallback
      }
    }

    // Dispatch WhatsApp message via configured provider
    const sendResult = await whatsAppService.sendReceiptMessage({
      to: recipientPhone,
      receiptData,
      branchName,
    });

    // Record audit details only after confirmed dispatch
    try {
      await AuditHelper.log({
        actorId: authContext.user?._id || authContext.user?.id,
        action: "SALE_RECEIPT_SHARE",
        entityType: "SALE_RECEIPT",
        entityId: receiptData._id,
        branchId: receiptData.branchId,
        after: {
          channel: "WHATSAPP",
          target: sendResult.recipient,
          messageId: sendResult.messageId,
          provider: sendResult.provider,
        },
      });
    } catch (e) {
      console.warn("Audit log warning on share:", e.message);
    }

    return {
      accepted: true,
      sent: true,
      channel: "WHATSAPP",
      recipient: sendResult.recipient,
      receiptNo: receiptData.receiptNo,
      messageId: sendResult.messageId,
      message: `Sale receipt '${receiptData.receiptNo}' shared successfully via WhatsApp to ${sendResult.recipient}`,
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

  /**
   * Alias for completeSale to maintain universal API compatibility.
   */
  async completeReceipt(id, data = {}, authContext = {}) {
    return this.completeSale(id, data, authContext);
  }
}

module.exports = new SaleReceiptService();
