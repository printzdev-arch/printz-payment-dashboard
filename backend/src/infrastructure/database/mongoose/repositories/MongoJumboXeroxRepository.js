const mongoose = require("mongoose");
const IJumboXeroxRepository = require("../../../../domain/repositories/IJumboXeroxRepository");
const JumboXerox = require("../models/JumboXerox");

const Branch = require("../models/Branch");

class MongoJumboXeroxRepository extends IJumboXeroxRepository {
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
      } else if (mongoose.Types.ObjectId.isValid(branchIdentifier)) {
        query.branchId = new mongoose.Types.ObjectId(branchIdentifier);
      }
    }
    if (filters.printerId) {
      query.printerId = String(filters.printerId).trim();
    }
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive === "true" || filters.isActive === true;
    }
    if (filters.size) {
      query.size = String(filters.size).trim();
    }
    if (filters.type) {
      query.type = String(filters.type).trim();
    }

    return JumboXerox.find(query).sort({ createdAt: -1 });
  }

  async findById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return JumboXerox.findById(id);
  }

  async create(data) {
    const toSave = { ...data };
    delete toSave._id;
    delete toSave.id;

    if (toSave.branchId && typeof toSave.branchId === "string" && mongoose.Types.ObjectId.isValid(toSave.branchId)) {
      toSave.branchId = new mongoose.Types.ObjectId(toSave.branchId);
    }
    if (toSave.printerRef && typeof toSave.printerRef === "string" && mongoose.Types.ObjectId.isValid(toSave.printerRef)) {
      toSave.printerRef = new mongoose.Types.ObjectId(toSave.printerRef);
    }

    const newMachine = new JumboXerox(toSave);
    await newMachine.save();
    return newMachine;
  }

  async update(id, data) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const toUpdate = { ...data };
    delete toUpdate._id;
    delete toUpdate.id;

    if (toUpdate.branchId && typeof toUpdate.branchId === "string" && mongoose.Types.ObjectId.isValid(toUpdate.branchId)) {
      toUpdate.branchId = new mongoose.Types.ObjectId(toUpdate.branchId);
    }
    if (toUpdate.printerRef && typeof toUpdate.printerRef === "string" && mongoose.Types.ObjectId.isValid(toUpdate.printerRef)) {
      toUpdate.printerRef = new mongoose.Types.ObjectId(toUpdate.printerRef);
    }

    return JumboXerox.findByIdAndUpdate(id, { $set: toUpdate }, { new: true, runValidators: true });
  }

  async save(data) {
    if (data.id || data._id) {
      const id = data.id || data._id;
      const updated = await this.update(id, data);
      if (updated) {
        return { machine: updated, isNew: false };
      }
    }

    const created = await this.create(data);
    return { machine: created, isNew: true };
  }

  async delete(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return JumboXerox.findByIdAndDelete(id);
  }
}

module.exports = new MongoJumboXeroxRepository();
