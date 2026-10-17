const mongoose = require("mongoose");
const Branch = require("../../models/common/Branch");
const ApiError = require("../../utils/ApiError");

class BranchService {
  async getAllBranches(filters = {}) {
    return Branch.find(filters).sort({ name: 1 });
  }

  async getBranchById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid branch ID format.");
    }
    const branch = await Branch.findById(id);
    if (!branch) {
      throw ApiError.notFound("Branch not found.");
    }
    return branch;
  }

  async createBranch(branchData = {}) {
    const name = branchData?.name;
    const code = branchData?.code;

    if (!name || typeof name !== "string" || !name.trim()) {
      throw ApiError.badRequest("Branch name is required.");
    }

    if (!code || typeof code !== "string" || !code.trim()) {
      throw ApiError.badRequest("Branch code is required.");
    }

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    // Check duplicate code first
    const existingByCode = await Branch.findOne({
      code: new RegExp(`^${trimmedCode}$`, "i"),
    });
    if (existingByCode) {
      throw ApiError.conflict(`Branch code '${trimmedCode}' already exists.`);
    }

    // Check duplicate name
    const existingByName = await Branch.findOne({
      name: new RegExp(`^${trimmedName}$`, "i"),
    });
    if (existingByName) {
      throw ApiError.conflict(`Branch name '${trimmedName}' already exists.`);
    }

    const newBranch = new Branch({
      name: trimmedName,
      code: trimmedCode,
      address: typeof branchData.address === "string" ? branchData.address.trim() : "",
      branchType: typeof branchData.branchType === "string" ? branchData.branchType.trim() : "retail",
      weeklyOffDays: Array.isArray(branchData.weeklyOffDays) ? branchData.weeklyOffDays : [],
    });

    await newBranch.save();
    return newBranch;
  }

  async updateBranch(id, branchData = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid branch ID format.");
    }

    const existingBranch = await Branch.findById(id);
    if (!existingBranch) {
      throw ApiError.notFound("Branch not found.");
    }

    const updates = {};

    // Validate and check code uniqueness if code is updated
    if (branchData.code !== undefined && typeof branchData.code === "string" && branchData.code.trim()) {
      const trimmedCode = branchData.code.trim().toUpperCase();
      if (trimmedCode !== existingBranch.code) {
        const duplicateCodeBranch = await Branch.findOne({
          _id: { $ne: new mongoose.Types.ObjectId(id) },
          code: new RegExp(`^${trimmedCode}$`, "i"),
        });
        if (duplicateCodeBranch) {
          throw ApiError.conflict(`Branch code '${trimmedCode}' already exists.`);
        }
      }
      updates.code = trimmedCode;
    }

    // Validate and check name uniqueness if name is updated
    if (branchData.name !== undefined && typeof branchData.name === "string" && branchData.name.trim()) {
      const trimmedName = branchData.name.trim();
      if (trimmedName.toLowerCase() !== (existingBranch.name || "").toLowerCase()) {
        const duplicateNameBranch = await Branch.findOne({
          _id: { $ne: new mongoose.Types.ObjectId(id) },
          name: new RegExp(`^${trimmedName}$`, "i"),
        });
        if (duplicateNameBranch) {
          throw ApiError.conflict(`Branch name '${trimmedName}' already exists.`);
        }
      }
      updates.name = trimmedName;
    }

    if (branchData.address !== undefined) {
      updates.address = typeof branchData.address === "string" ? branchData.address.trim() : "";
    }

    if (branchData.branchType !== undefined) {
      updates.branchType = typeof branchData.branchType === "string" ? branchData.branchType.trim() : "retail";
    }

    if (branchData.weeklyOffDays !== undefined) {
      updates.weeklyOffDays = Array.isArray(branchData.weeklyOffDays) ? branchData.weeklyOffDays : [];
    }

    return Branch.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
  }

  async deleteBranch(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid branch ID format.");
    }

    const branch = await Branch.findByIdAndDelete(id);
    if (!branch) {
      throw ApiError.notFound("Branch not found.");
    }
    return { _id: id, message: "Branch deleted successfully" };
  }
}

module.exports = new BranchService();
