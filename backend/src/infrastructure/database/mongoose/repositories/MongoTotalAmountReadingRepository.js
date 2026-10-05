const mongoose = require("mongoose");
const ITotalAmountReadingRepository = require("../../../../domain/repositories/ITotalAmountReadingRepository");
const TotalAmountReading = require("../models/TotalAmountReading");
const Branch = require("../models/Branch");

class MongoTotalAmountReadingRepository extends ITotalAmountReadingRepository {
  async _resolveBranch(identifier) {
    if (!identifier) return null;
    const trimmed = String(identifier).trim();
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      const branch = await Branch.findById(trimmed).lean();
      if (branch) return branch;
    }
    return Branch.findOne({
      $or: [
        { name: new RegExp(`^${trimmed}$`, "i") },
        { code: new RegExp(`^${trimmed}$`, "i") },
      ],
    }).lean();
  }

  async findAll(filters = {}) {
    const query = {};
    const branchIdentifier = filters.branchId || filters.branchName || filters.branch;
    if (branchIdentifier) {
      const branch = await this._resolveBranch(branchIdentifier);
      if (branch) {
        query.$or = [
          { branchId: branch._id },
          { branchId: branch._id.toString() },
          { branchName: new RegExp(`^${branch.name}$`, "i") },
        ];
      } else {
        query.$or = [
          { branchId: branchIdentifier },
          { branchName: new RegExp(`^${branchIdentifier}$`, "i") },
        ];
      }
    }

    if (filters.date) query.date = filters.date;
    if (filters.startDate && filters.endDate) {
      query.date = { $gte: filters.startDate, $lte: filters.endDate };
    }

    return TotalAmountReading.find(query).sort({ date: -1, timestamp: -1, createdAt: -1 });
  }

  async findById(id) {
    if (!id) return null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      const reading = await TotalAmountReading.findById(id);
      if (reading) return reading;
    }
    return TotalAmountReading.findOne({
      $or: [{ _id: id }, { legacyFirestoreId: id }],
    });
  }

  async findByBranchAndDate(branchIdentifier, date) {
    const branch = await this._resolveBranch(branchIdentifier);
    const query = { date };
    if (branch) {
      query.$or = [
        { branchId: branch._id },
        { branchId: branch._id.toString() },
        { branchName: new RegExp(`^${branch.name}$`, "i") },
      ];
    } else {
      query.$or = [
        { branchId: branchIdentifier },
        { branchName: new RegExp(`^${branchIdentifier}$`, "i") },
      ];
    }
    return TotalAmountReading.findOne(query);
  }

  async save(data) {
    let existing = null;
    const targetId = data._id || data.id;
    if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
      existing = await TotalAmountReading.findById(targetId).catch(() => null);
    }
    if (!existing && data.branchId && data.date) {
      existing = await TotalAmountReading.findOne({
        $or: [{ branchId: data.branchId }, { branchId: data.branchId.toString() }],
        date: data.date,
      });
    }
    if (!existing && data.branchName && data.date) {
      existing = await this.findByBranchAndDate(data.branchName, data.date);
    }

    const payload = data.toJSON ? data.toJSON() : { ...data };
    delete payload.id;
    if (payload.branchId && typeof payload.branchId === "string" && mongoose.Types.ObjectId.isValid(payload.branchId)) {
      payload.branchId = new mongoose.Types.ObjectId(payload.branchId);
    }

    if (existing) {
      Object.assign(existing, payload);
      existing.lastUpdated = new Date();
      await existing.save();
      return { reading: existing, isNew: false };
    }

    const reading = new TotalAmountReading(payload);
    await reading.save();
    return { reading, isNew: true };
  }

  async update(id, updateData) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const payload = updateData.toJSON ? updateData.toJSON() : { ...updateData };
    delete payload.id;
    if (payload.branchId && typeof payload.branchId === "string" && mongoose.Types.ObjectId.isValid(payload.branchId)) {
      payload.branchId = new mongoose.Types.ObjectId(payload.branchId);
    }

    Object.assign(existing, payload);
    existing.lastUpdated = new Date();
    await existing.save();
    return existing;
  }

  async delete(id) {
    const existing = await this.findById(id);
    if (!existing) return null;
    await TotalAmountReading.findByIdAndDelete(existing._id);
    return existing;
  }
}

module.exports = new MongoTotalAmountReadingRepository();
