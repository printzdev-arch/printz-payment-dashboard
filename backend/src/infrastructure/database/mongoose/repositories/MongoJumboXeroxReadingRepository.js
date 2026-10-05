const mongoose = require("mongoose");
const IJumboXeroxReadingRepository = require("../../../../domain/repositories/IJumboXeroxReadingRepository");
const JumboXeroxReading = require("../models/JumboXeroxReading");
const Branch = require("../models/Branch");

class MongoJumboXeroxReadingRepository extends IJumboXeroxReadingRepository {
  async _getBranchMap() {
    try {
      const branches = await Branch.find({}).lean();
      const map = {};
      branches.forEach((b) => {
        map[b._id.toString()] = b.name;
      });
      return map;
    } catch {
      return {};
    }
  }

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
          { branch: new RegExp(`^${branch.name}$`, "i") },
          { branchName: new RegExp(`^${branchIdentifier}$`, "i") },
        ];
      } else {
        query.$or = [
          { branchName: new RegExp(`^${branchIdentifier}$`, "i") },
          { branch: new RegExp(`^${branchIdentifier}$`, "i") },
        ];
      }
    }

    if (filters.date) {
      query.date = filters.date;
    } else if (filters.startDate && filters.endDate) {
      query.date = { $gte: filters.startDate, $lte: filters.endDate };
    }

    const readings = await JumboXeroxReading.find(query).sort({ date: -1, createdAt: -1 }).lean();
    const branchMap = await this._getBranchMap();

    return readings.map((r) => {
      const branchIdStr = r.branchId ? r.branchId.toString() : null;
      return {
        ...r,
        id: r._id ? r._id.toString() : r._id,
        branchId: branchIdStr || r.branchId,
        branchName: r.branchName || (branchIdStr ? branchMap[branchIdStr] : "") || "",
      };
    });
  }

  async findById(id) {
    const reading = await JumboXeroxReading.findById(id).lean();
    if (!reading) return null;
    const branchMap = await this._getBranchMap();
    const branchIdStr = reading.branchId ? reading.branchId.toString() : null;
    return {
      ...reading,
      id: reading._id ? reading._id.toString() : reading._id,
      branchId: branchIdStr || reading.branchId,
      branchName: reading.branchName || (branchIdStr ? branchMap[branchIdStr] : "") || "",
    };
  }

  async findByBranchAndDate(branchNameOrId, date) {
    const branch = await this._resolveBranch(branchNameOrId);
    const query = { date };
    if (branch) {
      query.$or = [
        { branchId: branch._id },
        { branchId: branch._id.toString() },
        { branchName: new RegExp(`^${branch.name}$`, "i") },
        { branchName: new RegExp(`^${branchNameOrId}$`, "i") },
      ];
    } else {
      query.branchName = new RegExp(`^${branchNameOrId}$`, "i");
    }

    const reading = await JumboXeroxReading.findOne(query).lean();
    if (!reading) return null;
    const branchMap = await this._getBranchMap();
    const branchIdStr = reading.branchId ? reading.branchId.toString() : null;
    return {
      ...reading,
      id: reading._id ? reading._id.toString() : reading._id,
      branchId: branchIdStr || reading.branchId,
      branchName: reading.branchName || (branchIdStr ? branchMap[branchIdStr] : "") || "",
    };
  }

  async save(data) {
    let existing = null;
    if (data.id || data._id) {
      existing = await JumboXeroxReading.findById(data.id || data._id).catch(() => null);
    }

    const branchIdentifier = data.branchId || data.branchName || data.branch;
    if (branchIdentifier) {
      const branch = await this._resolveBranch(branchIdentifier);
      if (branch) {
        data.branchId = branch._id;
        data.branchName = branch.name;
        data.branch = branch.name;
      }
    }

    if (!existing && data.branchName && data.date) {
      existing = await this.findByBranchAndDate(data.branchName, data.date);
    }

    if (existing) {
      Object.assign(existing, data);
      await existing.save();
      const branchMap = await this._getBranchMap();
      const branchIdStr = existing.branchId ? existing.branchId.toString() : null;
      const resObj = existing.toJSON ? existing.toJSON() : { ...existing };
      resObj.branchName = resObj.branchName || (branchIdStr ? branchMap[branchIdStr] : "") || "";
      return { reading: resObj, isNew: false };
    }

    const reading = new JumboXeroxReading(data);
    await reading.save();
    const branchMap = await this._getBranchMap();
    const branchIdStr = reading.branchId ? reading.branchId.toString() : null;
    const resObj = reading.toJSON ? reading.toJSON() : { ...reading };
    resObj.branchName = resObj.branchName || (branchIdStr ? branchMap[branchIdStr] : "") || "";
    return { reading: resObj, isNew: true };
  }

  async delete(id) {
    return JumboXeroxReading.findByIdAndDelete(id);
  }
}

module.exports = new MongoJumboXeroxReadingRepository();

