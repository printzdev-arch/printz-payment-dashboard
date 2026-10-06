const mongoose = require("mongoose");
const ErrorHelper = require("../../shared/errors/ErrorHelper");

/**
 * Data Transfer Objects for Past Date Requests
 */

class CreatePastDateRequestDto {
  constructor({
    branchId = null,
    requestedBranch = null,
    appliesToAllBranches = false,
    requestedBy,
    requestedByName = null,
    requestedByEmail = null,
    requestedByUserId = null,
    requestedDate,
    status = "Pending",
    type = "Manual Admin Grant",
  } = {}) {
    this.appliesToAllBranches = Boolean(appliesToAllBranches);
    this.branchId = this.appliesToAllBranches
      ? null
      : branchId
      ? (typeof branchId === "string" ? branchId.trim() : branchId)
      : null;
    this.requestedBranch = requestedBranch ? String(requestedBranch).trim() : null;
    this.requestedBy = requestedBy ? String(requestedBy).trim() : "";
    this.requestedByName = requestedByName ? String(requestedByName).trim() : null;
    this.requestedByEmail = requestedByEmail ? String(requestedByEmail).trim() : null;
    this.requestedByUserId = requestedByUserId || null;
    this.requestedDate = requestedDate ? String(requestedDate).trim() : "";
    this.status = status ? String(status).trim() : "Pending";
    this.type = type ? String(type).trim() : "Manual Admin Grant";

    // Set requestedDateAt from requestedDate
    if (this.requestedDate) {
      const parsedDate = new Date(this.requestedDate);
      this.requestedDateAt = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    } else {
      this.requestedDateAt = new Date();
    }
  }

  static fromRequest(req) {
    const body = req.body || {};
    let requestedBy = body.requestedBy;
    let requestedByName = body.requestedByName || null;
    let requestedByEmail = body.requestedByEmail || null;
    let requestedByUserId = body.requestedByUserId || null;

    if (req.user) {
      requestedByUserId = requestedByUserId || req.user.id || req.user._id;
      requestedByName = requestedByName || req.user.name || req.user.username;
      requestedByEmail = requestedByEmail || req.user.email;
    }

    if (!requestedBy) {
      if (requestedByName && requestedByEmail) {
        requestedBy = `${requestedByName} (${requestedByEmail})`;
      } else if (req.user) {
        requestedBy = req.user.name ? `${req.user.name} (${req.user.email})` : (req.user.email || "Admin");
      } else {
        requestedBy = "User";
      }
    } else if (requestedByName && requestedByEmail && mongoose.Types.ObjectId.isValid(String(requestedBy).trim())) {
      // If requestedBy was passed as raw ObjectId but we have user name and email, format nicely
      requestedBy = `${requestedByName} (${requestedByEmail})`;
    }

    const branchNameStr = body.requestedBranch || body.requestedBranchName || body.branch || null;
    const isAll =
      body.appliesToAllBranches === true ||
      body.appliesToAllBranches === "true" ||
      (branchNameStr &&
        (String(branchNameStr).trim().toLowerCase() === "all branches" ||
          String(branchNameStr).trim().toLowerCase() === "all"));

    return new CreatePastDateRequestDto({
      branchId: isAll ? null : (body.branchId || null),
      requestedBranch: isAll ? "All Branches" : branchNameStr,
      appliesToAllBranches: isAll,
      requestedBy: requestedBy || "User",
      requestedByName: requestedByName,
      requestedByEmail: requestedByEmail,
      requestedByUserId: requestedByUserId,
      requestedDate: body.requestedDate || body.date,
      status: body.status || "Pending",
      type: body.type || "Manual Admin Grant",
    });
  }

  validate() {
    if (!this.requestedDate) {
      throw ErrorHelper.badRequest("Requested date is required");
    }

    if (!this.appliesToAllBranches) {
      if (!this.branchId && !this.requestedBranch) {
        throw ErrorHelper.badRequest("branchId or requestedBranch is required when appliesToAllBranches is false");
      }
      if (this.branchId && !mongoose.Types.ObjectId.isValid(this.branchId)) {
        throw ErrorHelper.badRequest("Invalid branchId format. Must be a valid 24-character hexadecimal ObjectId.");
      }
    }

    const validStatuses = ["Pending", "Approved", "Rejected"];
    if (this.status && !validStatuses.includes(this.status)) {
      throw ErrorHelper.badRequest(`Status must be one of: ${validStatuses.join(", ")}`);
    }
  }
}

class UpdatePastDateRequestDto {
  constructor(data = {}) {
    if (data.status !== undefined) this.status = String(data.status).trim();
    if (data.type !== undefined) this.type = String(data.type).trim();
    if (data.appliesToAllBranches !== undefined) {
      this.appliesToAllBranches = Boolean(data.appliesToAllBranches);
      if (this.appliesToAllBranches) {
        this.branchId = null;
      }
    }
    if (data.branchId !== undefined && !this.appliesToAllBranches) {
      this.branchId = data.branchId ? (typeof data.branchId === "string" ? data.branchId.trim() : data.branchId) : null;
    }
    if (data.requestedBranch !== undefined) {
      this.requestedBranch = data.requestedBranch ? String(data.requestedBranch).trim() : null;
    }
    if (data.requestedDate !== undefined) {
      this.requestedDate = String(data.requestedDate).trim();
      const parsedDate = new Date(this.requestedDate);
      this.requestedDateAt = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    }
    if (data.requestedBy !== undefined) this.requestedBy = String(data.requestedBy).trim();
  }

  static fromRequest(req) {
    return new UpdatePastDateRequestDto(req.body || {});
  }

  validate() {
    if (this.status !== undefined) {
      const validStatuses = ["Pending", "Approved", "Rejected"];
      if (!validStatuses.includes(this.status)) {
        throw ErrorHelper.badRequest(`Status must be one of: ${validStatuses.join(", ")}`);
      }
    }

    if (this.branchId !== undefined && this.branchId !== null && !this.appliesToAllBranches) {
      if (!mongoose.Types.ObjectId.isValid(this.branchId)) {
        throw ErrorHelper.badRequest("Invalid branchId format. Must be a valid 24-character hexadecimal ObjectId.");
      }
    }
  }
}

class PastDateRequestResponseDto {
  constructor(entity) {
    if (!entity) return;
    const rawId = entity._id || entity.id;
    this._id = rawId ? (rawId.toString ? rawId.toString() : rawId) : rawId;
    
    let bName = entity.requestedBranch || "";
    if (entity.branchId && typeof entity.branchId === "object" && entity.branchId.name) {
      this.branchId = entity.branchId._id ? entity.branchId._id.toString() : entity.branchId.toString();
      if (!bName) bName = entity.branchId.name;
    } else {
      this.branchId = entity.branchId
        ? entity.branchId.toString
          ? entity.branchId.toString()
          : entity.branchId
        : null;
    }

    this.requestedBranch = bName || null;
    this.branchName = bName || null;
    this.appliesToAllBranches = Boolean(entity.appliesToAllBranches);
    this.requestedBy = entity.requestedBy || "";
    this.requestedByName = entity.requestedByName || null;
    this.requestedByEmail = entity.requestedByEmail || null;
    this.requestedByUserId = entity.requestedByUserId
      ? (entity.requestedByUserId.toString ? entity.requestedByUserId.toString() : entity.requestedByUserId)
      : null;
    this.requestedDate = entity.requestedDate || "";
    this.requestedDateAt = entity.requestedDateAt || null;
    this.status = entity.status || "Pending";
    this.type = entity.type || "Manual Admin Grant";
    this.createdAt = entity.createdAt || null;
    this.updatedAt = entity.updatedAt || null;
  }

  static fromEntity(entity) {
    if (!entity) return null;
    return new PastDateRequestResponseDto(entity);
  }

  static fromEntities(entities = []) {
    if (!Array.isArray(entities)) return [];
    return entities.map((e) => new PastDateRequestResponseDto(e));
  }
}

module.exports = {
  CreatePastDateRequestDto,
  UpdatePastDateRequestDto,
  PastDateRequestResponseDto,
};
