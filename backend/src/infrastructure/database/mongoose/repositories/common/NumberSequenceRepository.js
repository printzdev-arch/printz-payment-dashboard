const mongoose = require("mongoose");
const INumberSequenceRepository = require("../../../../../domain/repositories/common/INumberSequenceRepository");
const NumberSequence = require("../../models/common/NumberSequence");

class NumberSequenceRepository extends INumberSequenceRepository {
  /**
   * Atomically increments the sequence counter by 1 and returns the new document.
   * If sequence doesn't exist, it upserts and sets initial lastValue to 1.
   */
  async incrementAndGet(sequenceKey, branchId = null, period = null) {
    const key = String(sequenceKey).trim().toUpperCase();
    const bId = branchId
      ? mongoose.Types.ObjectId.isValid(branchId)
        ? new mongoose.Types.ObjectId(branchId)
        : branchId
      : null;
    const p = period ? String(period).trim() : null;

    const filter = {
      sequenceKey: key,
      branchId: bId,
      period: p,
    };

    const update = {
      $inc: { lastValue: 1 },
      $setOnInsert: {
        sequenceKey: key,
        branchId: bId,
        period: p,
      },
    };

    const options = {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    };

    const result = await NumberSequence.findOneAndUpdate(filter, update, options).lean();
    return result;
  }

  async findByKey(sequenceKey, branchId = null, period = null) {
    const key = String(sequenceKey).trim().toUpperCase();
    const bId = branchId
      ? mongoose.Types.ObjectId.isValid(branchId)
        ? new mongoose.Types.ObjectId(branchId)
        : branchId
      : null;
    const p = period ? String(period).trim() : null;

    return NumberSequence.findOne({ sequenceKey: key, branchId: bId, period: p })
      .populate("branchId", "name code")
      .lean();
  }

  async findAll(query = {}, { page = 1, limit = 50, sort = { sequenceKey: 1 } } = {}) {
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const [records, total] = await Promise.all([
      NumberSequence.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Math.max(1, limit))
        .populate("branchId", "name code")
        .lean(),
      NumberSequence.countDocuments(query),
    ]);

    return {
      records,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

module.exports = new NumberSequenceRepository();
