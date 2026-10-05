const mongoose = require("mongoose");
const IBranchRepository = require("../../../../domain/repositories/IBranchRepository");
const Branch = require("../models/Branch");

class MongoBranchRepository extends IBranchRepository {
  async findAll() {
    return Branch.find({}).sort({ name: 1 });
  }

  async findById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return Branch.findById(id);
  }

  async findByName(name, excludeId = null) {
    if (!name || typeof name !== "string") return null;
    const query = { name: new RegExp(`^${name.trim()}$`, "i") };
    if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }
    return Branch.findOne(query);
  }

  async findByCode(code, excludeId = null) {
    if (!code || typeof code !== "string") return null;
    const query = { code: new RegExp(`^${code.trim()}$`, "i") };
    if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }
    return Branch.findOne(query);
  }

  async create(branchData) {
    // Ensure MongoDB automatically generates native _id: never pass custom _id
    const data = { ...branchData };
    delete data._id;
    delete data.id;

    const branch = new Branch(data);
    await branch.save();
    return branch;
  }

  async update(id, branchData) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    // Prevent modifying _id during update
    const data = { ...branchData };
    delete data._id;
    delete data.id;

    return Branch.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  }

  async delete(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return Branch.findByIdAndDelete(id);
  }
}

module.exports = new MongoBranchRepository();
