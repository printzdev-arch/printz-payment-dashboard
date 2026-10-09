const mongoose = require("mongoose");
const IRoleRepository = require("../../../../domain/repositories/IRoleRepository");
const Role = require("../models/Role");

class MongoRoleRepository extends IRoleRepository {
  async findAll() {
    return Role.find().sort({ isSystem: -1, createdAt: 1 }).lean();
  }

  async findById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return Role.findById(id).lean();
  }

  async findByCode(code) {
    if (!code) return null;
    return Role.findOne({ code: code.toUpperCase().trim() }).lean();
  }

  async findByIds(ids = []) {
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) return [];
    return Role.find({ _id: { $in: validIds }, isActive: true }).lean();
  }

  async create(roleData) {
    const role = new Role({
      ...roleData,
      code: roleData.code.toUpperCase().trim(),
      name: roleData.name.trim(),
    });
    await role.save();
    return role;
  }

  async update(id, roleData) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const role = await Role.findById(id);
    if (!role) return null;

    if (roleData.name) role.name = roleData.name.trim();
    if (roleData.description !== undefined) role.description = roleData.description;
    if (roleData.grants) {
      role.grants = roleData.grants.map((g) => ({
        permissionCode: g.permissionCode,
        scope: g.scope || "BRANCH",
      }));
    }
    if (roleData.isActive !== undefined && !role.isSystem) {
      role.isActive = roleData.isActive;
    }

    await role.save();
    return role;
  }

  async delete(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return Role.findByIdAndDelete(id);
  }
}

module.exports = new MongoRoleRepository();
