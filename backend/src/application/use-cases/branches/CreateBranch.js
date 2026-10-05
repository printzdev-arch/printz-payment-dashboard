const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class CreateBranch {
  constructor({ branchRepository }) {
    this.branchRepository = branchRepository;
  }

  async execute(branchData = {}) {
    const name = branchData?.name;
    const code = branchData?.code;

    if (!name || typeof name !== "string" || !name.trim()) {
      throw ErrorHelper.badRequest("Branch name is required.");
    }

    if (!code || typeof code !== "string" || !code.trim()) {
      throw ErrorHelper.badRequest("Branch code is required.");
    }

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    // Check duplicate code first
    const existingByCode = await this.branchRepository.findByCode(trimmedCode);
    if (existingByCode) {
      throw ErrorHelper.conflict(`Branch code '${trimmedCode}' already exists.`);
    }

    // Check duplicate name
    const existingByName = await this.branchRepository.findByName(trimmedName);
    if (existingByName) {
      throw ErrorHelper.conflict(`Branch name '${trimmedName}' already exists.`);
    }

    const newBranch = await this.branchRepository.create({
      name: trimmedName,
      code: trimmedCode,
      address: typeof branchData.address === "string" ? branchData.address.trim() : "",
      branchType: typeof branchData.branchType === "string" ? branchData.branchType.trim() : "retail",
      weeklyOffDays: Array.isArray(branchData.weeklyOffDays) ? branchData.weeklyOffDays : [],
    });

    return newBranch;
  }
}

module.exports = CreateBranch;
