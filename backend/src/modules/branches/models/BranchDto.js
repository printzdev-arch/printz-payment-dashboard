/**
 * Branch Data Transfer Objects
 * Contains ONLY the required fields:
 * - _id (generated automatically by MongoDB, never accepted in request body)
 * - name
 * - code
 * - address
 * - phone
 * - branchType
 * - manufacturingUnitId
 * - createdAt
 * - updatedAt
 */

class CreateBranchDto {
  constructor({ name, code, address = "", phone = "", branchType = "retail", manufacturingUnitId, createdAt, updatedAt } = {}) {
    this.name = typeof name === "string" ? name.trim() : "";
    this.code = typeof code === "string" ? code.trim().toUpperCase() : "";
    this.address = typeof address === "string" ? address.trim() : "";
    this.phone = typeof phone === "string" ? phone.trim() : "";
    this.branchType = typeof branchType === "string" ? branchType.trim() : "retail";
    if (manufacturingUnitId !== undefined) this.manufacturingUnitId = manufacturingUnitId;
    if (createdAt) this.createdAt = createdAt;
    if (updatedAt) this.updatedAt = updatedAt;
  }

  static fromRequest(req) {
    const { name, code, address, phone, branchType, manufacturingUnitId, createdAt, updatedAt } = req.body || {};
    return new CreateBranchDto({ name, code, address, phone, branchType, manufacturingUnitId, createdAt, updatedAt });
  }
}

class UpdateBranchDto {
  constructor(data = {}) {
    if (data.name !== undefined) this.name = typeof data.name === "string" ? data.name.trim() : data.name;
    if (data.code !== undefined) this.code = typeof data.code === "string" ? data.code.trim().toUpperCase() : data.code;
    if (data.address !== undefined) this.address = typeof data.address === "string" ? data.address.trim() : data.address;
    if (data.phone !== undefined) this.phone = typeof data.phone === "string" ? data.phone.trim() : data.phone;
    if (data.branchType !== undefined) this.branchType = typeof data.branchType === "string" ? data.branchType.trim() : data.branchType;
    if (data.manufacturingUnitId !== undefined) this.manufacturingUnitId = data.manufacturingUnitId;
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
      phone: branch.phone || "",
      branchType: branch.branchType || "retail",
      manufacturingUnitId: branch.manufacturingUnitId ? branch.manufacturingUnitId.toString() : null,
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
