/**
 * Branch Data Transfer Objects
 * Contains ONLY the required fields:
 * - _id (generated automatically by MongoDB, never accepted in request body)
 * - name
 * - code
 * - address
 * - branchType
 * - weeklyOffDays
 * - createdAt
 * - updatedAt
 */

class CreateBranchDto {
  constructor({ name, code, address = "", branchType = "retail", weeklyOffDays = [], createdAt, updatedAt } = {}) {
    this.name = typeof name === "string" ? name.trim() : "";
    this.code = typeof code === "string" ? code.trim().toUpperCase() : "";
    this.address = typeof address === "string" ? address.trim() : "";
    this.branchType = typeof branchType === "string" ? branchType.trim() : "retail";
    this.weeklyOffDays = Array.isArray(weeklyOffDays) ? weeklyOffDays : [];
    if (createdAt) this.createdAt = createdAt;
    if (updatedAt) this.updatedAt = updatedAt;
  }

  static fromRequest(req) {
    const { name, code, address, branchType, weeklyOffDays, createdAt, updatedAt } = req.body || {};
    return new CreateBranchDto({ name, code, address, branchType, weeklyOffDays, createdAt, updatedAt });
  }
}

class UpdateBranchDto {
  constructor(data = {}) {
    if (data.name !== undefined) this.name = typeof data.name === "string" ? data.name.trim() : data.name;
    if (data.code !== undefined) this.code = typeof data.code === "string" ? data.code.trim().toUpperCase() : data.code;
    if (data.address !== undefined) this.address = typeof data.address === "string" ? data.address.trim() : data.address;
    if (data.branchType !== undefined) this.branchType = typeof data.branchType === "string" ? data.branchType.trim() : data.branchType;
    if (data.weeklyOffDays !== undefined) this.weeklyOffDays = Array.isArray(data.weeklyOffDays) ? data.weeklyOffDays : [];
  }

  static fromRequest(req) {
    return new UpdateBranchDto(req.body || {});
  }
}

class BranchResponseDto {
  static serialize(branch) {
    if (!branch) return null;
    return {
      _id: branch._id ? branch._id.toString() : branch._id,
      name: branch.name,
      code: branch.code,
      address: branch.address || "",
      branchType: branch.branchType || "retail",
      weeklyOffDays: branch.weeklyOffDays || [],
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    };
  }

  static serializeList(branches = []) {
    return branches.map((b) => BranchResponseDto.serialize(b));
  }
}

module.exports = {
  CreateBranchDto,
  UpdateBranchDto,
  BranchResponseDto,
};
