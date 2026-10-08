const mongoose = require("mongoose");
const IPastDateRequestRepository = require("../../../../domain/repositories/IPastDateRequestRepository");
const PastDateRequest = require("../models/PastDateRequest");
const Branch = require("../models/Branch");

class MongoPastDateRequestRepository extends IPastDateRequestRepository {
  async _resolveBranchId(identifier) {
    if (!identifier) return null;
    const trimmed = String(identifier).trim();
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      return new mongoose.Types.ObjectId(trimmed);
    }
    const branch = await Branch.findOne({
      $or: [
        { name: new RegExp(`^${trimmed}$`, "i") },
        { code: new RegExp(`^${trimmed}$`, "i") },
      ],
    }).lean();
    return branch ? branch._id : null;
  }

  async findAll(filters = {}) {
    const query = {};

    const branchIdentifier = filters.branchId || filters.requestedBranch || filters.branch;
    if (branchIdentifier) {
      const trimmed = String(branchIdentifier).trim();
      if (trimmed.toLowerCase() !== "all" && trimmed.toLowerCase() !== "all branches") {
        const resolvedId = await this._resolveBranchId(trimmed);
        const orConditions = [
          { requestedBranch: new RegExp(`^${trimmed}$`, "i") },
          { appliesToAllBranches: true },
          { requestedBranch: new RegExp(`^all branches$`, "i") },
        ];
        if (resolvedId) {
          orConditions.push({ branchId: resolvedId });
        }
        query.$or = orConditions;
      }
    }

    if (filters.appliesToAllBranches !== undefined) {
      query.appliesToAllBranches = filters.appliesToAllBranches === "true" || filters.appliesToAllBranches === true;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.requestedDate || filters.date) {
      const targetDate = filters.requestedDate || filters.date;
      query.requestedDate = new RegExp(`^${targetDate}`, "i");
    }

    if (filters.type) {
      query.type = filters.type;
    }

    return PastDateRequest.find(query)
      .populate("branchId", "name code")
      .sort({ createdAt: -1, requestedDateAt: -1 });
  }

  async findById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return PastDateRequest.findById(id).populate("branchId", "name code");
  }

  async create(data) {
    let appliesToAll = Boolean(data.appliesToAllBranches);
    let requestedBranch = data.requestedBranch || null;
    let resolvedBranchId = data.branchId && mongoose.Types.ObjectId.isValid(data.branchId)
      ? new mongoose.Types.ObjectId(data.branchId)
      : null;

    if (
      requestedBranch &&
      (String(requestedBranch).trim().toLowerCase() === "all branches" ||
        String(requestedBranch).trim().toLowerCase() === "all")
    ) {
      appliesToAll = true;
      requestedBranch = "All Branches";
      resolvedBranchId = null;
    } else if (!appliesToAll && !resolvedBranchId && requestedBranch) {
      resolvedBranchId = await this._resolveBranchId(requestedBranch);
    }

    const docData = {
      branchId: appliesToAll ? null : resolvedBranchId,
      requestedBranch: requestedBranch,
      appliesToAllBranches: appliesToAll,
      requestedBy: data.requestedBy,
      requestedDate: data.requestedDate,
      requestedDateAt: data.requestedDateAt || (data.requestedDate ? new Date(data.requestedDate) : new Date()),
      status: data.status || "Pending",
      type: data.type || "Manual Admin Grant",
      createdAt: new Date(),
      updatedAt: null,
    };

    const request = new PastDateRequest(docData);
    await request.save();
    return request;
  }

  async update(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await PastDateRequest.findById(id);
    if (!doc) return null;

    if (updateData.appliesToAllBranches !== undefined) {
      doc.appliesToAllBranches = Boolean(updateData.appliesToAllBranches);
      if (doc.appliesToAllBranches) {
        doc.branchId = null;
      }
    }

    if (updateData.branchId !== undefined && !doc.appliesToAllBranches) {
      doc.branchId = updateData.branchId ? new mongoose.Types.ObjectId(updateData.branchId) : null;
    }

    if (updateData.requestedBy !== undefined) doc.requestedBy = updateData.requestedBy;
    if (updateData.requestedDate !== undefined) doc.requestedDate = updateData.requestedDate;
    if (updateData.requestedDateAt !== undefined) doc.requestedDateAt = updateData.requestedDateAt;
    if (updateData.status !== undefined) doc.status = updateData.status;
    if (updateData.type !== undefined) doc.type = updateData.type;

    doc.updatedAt = new Date();
    await doc.save();
    return doc;
  }

  async delete(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return PastDateRequest.findByIdAndDelete(id);
  }
}

module.exports = new MongoPastDateRequestRepository();
