const mongoose = require("mongoose");
const IInventoryBalanceRepository = require("../../../../../domain/repositories/inventory/IInventoryBalanceRepository");
const InventoryBalance = require("../../models/inventory/InventoryBalance");

class InventoryBalanceRepository extends IInventoryBalanceRepository {
  async findAll(query = {}, { page = 1, limit = 50, sort = { updatedAt: -1 } } = {}) {
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const [records, total] = await Promise.all([
      InventoryBalance.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Math.max(1, limit))
        .populate("itemId")
        .populate("branchId", "name code type branchType")
        .lean(),
      InventoryBalance.countDocuments(query),
    ]);

    return {
      records,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findByItemAndBranch(itemId, branchId, session = null) {
    if (!itemId || !branchId) return null;
    const iId = mongoose.Types.ObjectId.isValid(itemId) ? new mongoose.Types.ObjectId(itemId) : itemId;
    const bId = mongoose.Types.ObjectId.isValid(branchId) ? new mongoose.Types.ObjectId(branchId) : branchId;

    const query = InventoryBalance.findOne({ itemId: iId, branchId: bId });
    if (session) query.session(session);
    return query.lean();
  }

  async incrementBalance(itemId, branchId, quantityChange, session = null) {
    const iId = mongoose.Types.ObjectId.isValid(itemId) ? new mongoose.Types.ObjectId(itemId) : itemId;
    const bId = mongoose.Types.ObjectId.isValid(branchId) ? new mongoose.Types.ObjectId(branchId) : branchId;

    const filter = { itemId: iId, branchId: bId };
    const update = {
      $inc: { quantity: Number(quantityChange) },
      $set: { updatedAt: new Date() },
    };
    const options = {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      session,
    };

    return InventoryBalance.findOneAndUpdate(filter, update, options).lean();
  }

  async findWithItemDetails(
    matchFilter = {},
    { page = 1, limit = 50, category = null, lowStock = false, search = null, activeOnly = false, warehouseOnly = false } = {}
  ) {
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const pipeline = [
      { $match: matchFilter },
      {
        $lookup: {
          from: "inventoryItems",
          localField: "itemId",
          foreignField: "_id",
          as: "item",
        },
      },
      { $unwind: "$item" },
      {
        $lookup: {
          from: "branches",
          localField: "branchId",
          foreignField: "_id",
          as: "branch",
        },
      },
      {
        $unwind: {
          path: "$branch",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (activeOnly) {
      pipeline.push({
        $match: {
          "item.isActive": true,
        },
      });
    }

    if (category) {
      pipeline.push({
        $match: {
          "item.category": String(category).trim().toUpperCase(),
        },
      });
    }

    if (warehouseOnly) {
      pipeline.push({
        $match: {
          $or: [
            { "branch.branchType": { $regex: /^warehouse$/i } },
            { "branch.name": { $regex: /warehouse/i } },
          ],
        },
      });
    }

    if (search) {
      const searchRegex = new RegExp(String(search).trim(), "i");
      pipeline.push({
        $match: {
          $or: [
            { "item.itemCode": searchRegex },
            { "item.name": searchRegex },
            { "item.hsnCode": searchRegex },
            { "item.category": searchRegex },
          ],
        },
      });
    }

    if (lowStock) {
      pipeline.push({
        $match: {
          $expr: { $lte: ["$quantity", { $ifNull: ["$item.reorderLevel", 0] }] },
        },
      });
    }

    const countPipeline = [...pipeline, { $count: "total" }];
    const dataPipeline = [
      ...pipeline,
      { $sort: { "item.itemCode": 1 } },
      { $skip: skip },
      { $limit: Math.max(1, limit) },
      {
        $project: {
          _id: 1,
          itemId: "$item._id",
          itemCode: "$item.itemCode",
          name: "$item.name",
          category: "$item.category",
          unit: "$item.unit",
          quantity: 1,
          reorderLevel: "$item.reorderLevel",
          purchaseRate: "$item.purchaseRate",
          saleRate: "$item.saleRate",
          taxRate: "$item.taxRate",
          branchId: 1,
          branchName: "$branch.name",
          branchCode: "$branch.code",
          branchType: "$branch.branchType",
          updatedAt: 1,
        },
      },
    ];

    const [records, countResult] = await Promise.all([
      InventoryBalance.aggregate(dataPipeline),
      InventoryBalance.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;

    return {
      records,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findLowStock({ branchIds = [], category = null, search = null, page = 1, limit = 50 } = {}) {
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);

    const balanceMatch = {};
    if (branchIds && branchIds.length > 0) {
      balanceMatch.branchId = {
        $in: branchIds.map((id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id)),
      };
    }

    const pipeline = [
      { $match: balanceMatch },
      {
        $lookup: {
          from: "inventoryItems",
          localField: "itemId",
          foreignField: "_id",
          as: "item",
        },
      },
      { $unwind: "$item" },
      {
        $match: {
          "item.isActive": true,
          "item.isStockTracked": true,
          "item.reorderLevel": { $gt: 0 },
          $expr: { $lte: ["$quantity", "$item.reorderLevel"] },
        },
      },
      {
        $lookup: {
          from: "branches",
          localField: "branchId",
          foreignField: "_id",
          as: "branch",
        },
      },
      {
        $unwind: {
          path: "$branch",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (category) {
      pipeline.push({
        $match: { "item.category": String(category).trim().toUpperCase() },
      });
    }

    if (search) {
      const searchRegex = new RegExp(String(search).trim(), "i");
      pipeline.push({
        $match: {
          $or: [
            { "item.itemCode": searchRegex },
            { "item.name": searchRegex },
            { "item.hsnCode": searchRegex },
            { "item.category": searchRegex },
          ],
        },
      });
    }

    // Check for active stock-tracked items with reorderLevel > 0 that have no balance record in specified branch(es)
    let missingBalanceRecords = [];
    if (branchIds && branchIds.length > 0) {
      for (const branchId of branchIds) {
        const branchObjId = mongoose.Types.ObjectId.isValid(branchId)
          ? new mongoose.Types.ObjectId(branchId)
          : branchId;

        const existingItemIds = await InventoryBalance.distinct("itemId", {
          branchId: { $in: [branchObjId, branchId.toString()] },
        });

        const branchDoc = await mongoose.model("Branch").findById(branchObjId).lean();

        const missingQuery = {
          _id: { $nin: existingItemIds },
          isActive: true,
          isStockTracked: true,
          reorderLevel: { $gt: 0 },
        };

        if (category) {
          missingQuery.category = String(category).trim().toUpperCase();
        }

        if (search) {
          const searchRegex = new RegExp(String(search).trim(), "i");
          missingQuery.$or = [
            { itemCode: searchRegex },
            { name: searchRegex },
            { hsnCode: searchRegex },
            { category: searchRegex },
          ];
        }

        const missingItems = await mongoose.model("InventoryItem").find(missingQuery).lean();

        const mapped = missingItems.map((itm) => ({
          _id: new mongoose.Types.ObjectId(),
          itemId: itm._id,
          itemCode: itm.itemCode,
          itemName: itm.name,
          category: itm.category,
          unit: itm.unit,
          branchId: branchObjId,
          branchName: branchDoc?.name || "",
          branchCode: branchDoc?.code || "",
          currentStock: 0,
          reorderLevel: itm.reorderLevel || 0,
          shortageQuantity: itm.reorderLevel || 0,
          stockStatus: "OUT_OF_STOCK",
          updatedAt: null,
        }));

        missingBalanceRecords.push(...mapped);
      }
    }

    const dataPipeline = [
      ...pipeline,
      {
        $project: {
          _id: 1,
          itemId: "$item._id",
          itemCode: "$item.itemCode",
          itemName: "$item.name",
          category: "$item.category",
          unit: "$item.unit",
          branchId: 1,
          branchName: "$branch.name",
          branchCode: "$branch.code",
          currentStock: "$quantity",
          reorderLevel: "$item.reorderLevel",
          shortageQuantity: {
            $max: [0, { $subtract: ["$item.reorderLevel", "$quantity"] }],
          },
          stockStatus: {
            $cond: {
              if: { $lte: ["$quantity", 0] },
              then: "OUT_OF_STOCK",
              else: "LOW_STOCK",
            },
          },
          updatedAt: 1,
        },
      },
      { $sort: { shortageQuantity: -1, itemCode: 1 } },
    ];

    const [existingRecords] = await Promise.all([
      InventoryBalance.aggregate(dataPipeline),
    ]);

    const combined = [...existingRecords, ...missingBalanceRecords];
    combined.sort(
      (a, b) =>
        (b.shortageQuantity || 0) - (a.shortageQuantity || 0) ||
        (a.itemCode || "").localeCompare(b.itemCode || "")
    );

    const total = combined.length;
    const paginatedRecords = combined.slice(skip, skip + Math.max(1, limit));

    return {
      records: paginatedRecords,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

module.exports = new InventoryBalanceRepository();

