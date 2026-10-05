const mongoose = require("mongoose");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class UpdateBranch {
  constructor({ branchRepository }) {
    this.branchRepository = branchRepository;
  }

  async execute(id, branchData = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ErrorHelper.badRequest("Invalid branch ID format.");
    }

    const existingBranch = await this.branchRepository.findById(id);
    if (!existingBranch) {
      throw ErrorHelper.notFound("Branch not found.");
    }

    const updates = {};

    // Validate and check code uniqueness if code is updated
    if (branchData.code !== undefined && typeof branchData.code === "string" && branchData.code.trim()) {
      const trimmedCode = branchData.code.trim().toUpperCase();
      if (trimmedCode !== existingBranch.code) {
        const duplicateCodeBranch = await this.branchRepository.findByCode(trimmedCode, id);
        if (duplicateCodeBranch) {
          throw ErrorHelper.conflict(`Branch code '${trimmedCode}' already exists.`);
        }
      }
      updates.code = trimmedCode;
    }

    // Validate and check name uniqueness if name is updated
    if (branchData.name !== undefined && typeof branchData.name === "string" && branchData.name.trim()) {
      const trimmedName = branchData.name.trim();
      if (trimmedName.toLowerCase() !== (existingBranch.name || "").toLowerCase()) {
        const duplicateNameBranch = await this.branchRepository.findByName(trimmedName, id);
        if (duplicateNameBranch) {
          throw ErrorHelper.conflict(`Branch name '${trimmedName}' already exists.`);
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

    const updatedBranch = await this.branchRepository.update(id, updates);
    return updatedBranch;
  }
}

module.exports = UpdateBranch;
