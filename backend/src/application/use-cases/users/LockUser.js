const mongoose = require("mongoose");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");
const User = require("../../../infrastructure/database/mongoose/models/User");
const auditService = require("../../../infrastructure/audit/AuditService");

class LockUser {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

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

  async execute(userId, { reason = "Manual lock by administrator", lockoutMinutes = 15 } = {}, caller = {}, requestContext = {}) {
    if (!userId) {
      throw ErrorHelper.badRequest("User ID is required");
    }

    const user = await User.findOne(this._buildIdQuery(userId));
    if (!user) {
      throw ErrorHelper.notFound("User not found");
    }

    const lockoutEnd = new Date(Date.now() + (parseInt(lockoutMinutes, 10) || 15) * 60 * 1000);
    const beforeState = { status: user.status, lockoutEnd: user.lockoutEnd };

    user.status = "LOCKED";
    user.lockoutEnd = lockoutEnd;
    await user.save();

    await auditService.log({
      event: "USER_LOCKED",
      action: "USER_LOCKED",
      userId: caller._id || caller.id || caller.userId,
      userEmail: caller.email,
      resourceType: "User",
      resourceId: user._id,
      branchId: user.branchId,
      before: beforeState,
      after: { status: "LOCKED", lockoutEnd },
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent,
      status: "SUCCESS",
      reason,
    });

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;
    return userObj;
  }
}

module.exports = LockUser;
