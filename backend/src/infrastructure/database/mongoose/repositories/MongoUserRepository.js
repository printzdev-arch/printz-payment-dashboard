const mongoose = require("mongoose");
const IUserRepository = require("../../../../domain/repositories/IUserRepository");
const User = require("../models/User");
const Branch = require("../models/Branch");

class MongoUserRepository extends IUserRepository {
  _buildIdQuery(id) {
    if (!id) return { _id: id };
    const str = String(id).trim();
    if (mongoose.Types.ObjectId.isValid(str) && str.length === 24) {
      return {
        $or: [
          { _id: new mongoose.Types.ObjectId(str) },
          { _id: str },
        ],
      };
    }
    return { _id: str };
  }

  async _resolveBranch(identifier) {
    if (!identifier) return null;
    const trimmed = String(identifier).trim();
    if (mongoose.Types.ObjectId.isValid(trimmed) && trimmed.length === 24) {
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

  async _enrichUser(user) {
    if (!user) return null;
    if (!user.branch && user.branchId) {
      const branch = await this._resolveBranch(user.branchId);
      if (branch) {
        user.branch = branch.name;
      }
    }
    return user;
  }

  async findById(id) {
    const user = await User.findOne(this._buildIdQuery(id)).select("-password");
    return this._enrichUser(user);
  }

  async findByIdWithPassword(id) {
    const user = await User.findOne(this._buildIdQuery(id));
    return this._enrichUser(user);
  }

  async findByEmail(email) {
    if (!email) return null;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    return this._enrichUser(user);
  }

  async findByEmailOrPhone(identifier) {
    if (!identifier) return null;
    const trimmed = String(identifier).trim();
    const user = await User.findOne({
      $or: [
        { email: trimmed.toLowerCase() },
        { phone: trimmed },
        { name: new RegExp(`^${trimmed}$`, "i") },
      ],
    });
    return this._enrichUser(user);
  }

  async findAll(filters = {}) {
    const query = {};
    if (filters.role) query.role = filters.role;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const branchIdentifier = filters.branchId || filters.branchName || filters.branch;
    if (branchIdentifier) {
      const branch = await this._resolveBranch(branchIdentifier);
      if (branch) {
        query.$or = [
          { branchId: branch._id },
          { branchId: branch._id.toString() },
          { branch: new RegExp(`^${branch.name}$`, "i") },
          { location: new RegExp(`^${branch.name}$`, "i") },
        ];
      } else {
        query.$or = [
          { branchId: branchIdentifier },
          { branch: new RegExp(`^${branchIdentifier}$`, "i") },
          { location: new RegExp(`^${branchIdentifier}$`, "i") },
        ];
      }
    }

    return User.find(query).select("-password").sort({ createdAt: -1 });
  }

  async create(userData) {
    const data = { ...userData };
    if (data.id && !data._id) {
      data._id = data.id;
    }
    if (data.branch && !data.branchId) {
      const branch = await this._resolveBranch(data.branch);
      if (branch) {
        data.branchId = branch._id;
        data.branch = branch.name;
      }
    } else if (data.branchId && !data.branch) {
      const branch = await this._resolveBranch(data.branchId);
      if (branch) {
        data.branch = branch.name;
      }
    }
    const user = new User(data);
    await user.save();
    return user;
  }

  async update(id, updateData) {
    const user = await User.findOne(this._buildIdQuery(id));
    if (!user) return null;

    if (updateData.password) {
      user.password = updateData.password;
    }
    if (updateData.name) user.name = updateData.name;
    if (updateData.email) user.email = updateData.email.toLowerCase().trim();
    if (updateData.phone !== undefined) user.phone = updateData.phone;
    if (updateData.branch !== undefined) user.branch = updateData.branch;
    if (updateData.branchId !== undefined) user.branchId = updateData.branchId;
    if (updateData.location !== undefined) user.location = updateData.location;
    if (updateData.role) user.role = updateData.role;
    if (updateData.permissions !== undefined) user.permissions = updateData.permissions;
    if (updateData.profilePicUrl !== undefined) user.profilePicUrl = updateData.profilePicUrl;
    if (updateData.needsReview !== undefined) user.needsReview = updateData.needsReview;
    if (updateData.isActive !== undefined) user.isActive = updateData.isActive;

    if (user.branch && !user.branchId) {
      const branch = await this._resolveBranch(user.branch);
      if (branch) user.branchId = branch._id;
    }

    await user.save();
    return User.findOne(this._buildIdQuery(id)).select("-password");
  }

  async delete(id, hardDelete = true) {
    const user = await User.findOne(this._buildIdQuery(id));
    if (!user) return null;

    if (hardDelete) {
      await User.deleteOne(this._buildIdQuery(id));
    } else {
      user.isActive = false;
      await user.save();
    }
    return user;
  }
}

module.exports = new MongoUserRepository();
