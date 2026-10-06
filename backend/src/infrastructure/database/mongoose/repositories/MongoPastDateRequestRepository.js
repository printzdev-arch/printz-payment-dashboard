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

    const requests = await PastDateRequest.find(query)
      .populate("branchId", "name code")
      .sort({ createdAt: -1, requestedDateAt: -1 });

    return this._enrichRequestsWithUserData(requests);
  }

  async findById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const request = await PastDateRequest.findById(id).populate("branchId", "name code");
    if (!request) return null;
    await this._enrichRequestsWithUserData([request]);
    return request;
  }

  async _enrichRequestsWithUserData(requests) {
    if (!requests || requests.length === 0) return requests;
    const isArray = Array.isArray(requests);
    const list = isArray ? requests : [requests];

    const userIdsToFetch = new Set();
    for (const req of list) {
      if (!req.requestedByName) {
        if (req.requestedByUserId && mongoose.Types.ObjectId.isValid(req.requestedByUserId)) {
          userIdsToFetch.add(String(req.requestedByUserId));
        } else if (req.requestedBy && mongoose.Types.ObjectId.isValid(String(req.requestedBy).trim())) {
          userIdsToFetch.add(String(req.requestedBy).trim());
        }
      }
    }

    let userMap = new Map();
    if (userIdsToFetch.size > 0) {
      const User = require("../models/User");
      const users = await User.find({
        _id: { $in: Array.from(userIdsToFetch).map((id) => new mongoose.Types.ObjectId(id)) },
      })
        .select("name username email")
        .lean();
      users.forEach((u) => userMap.set(String(u._id), u));
    }

    for (const req of list) {
      const idToCheck =
        (req.requestedByUserId && String(req.requestedByUserId)) ||
        (req.requestedBy && String(req.requestedBy).trim());
      const user = userMap.get(idToCheck);

      if (user) {
        const uName = user.name || user.username || user.email;
        const uEmail = user.email || "";
        req.requestedByName = req.requestedByName || uName;
        req.requestedByEmail = req.requestedByEmail || uEmail;
        if (mongoose.Types.ObjectId.isValid(String(req.requestedBy).trim())) {
          req.requestedBy = uEmail ? `${uName} (${uEmail})` : uName;
        }
      } else if (!req.requestedByName && req.requestedBy && req.requestedBy.includes("(") && req.requestedBy.includes(")")) {
        req.requestedByName = req.requestedBy.split("(")[0].trim();
        req.requestedByEmail = req.requestedBy.split("(")[1].replace(")", "").trim();
      }
    }

    return requests;
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

    let requestedBy = data.requestedBy;
    let requestedByName = data.requestedByName || null;
    let requestedByEmail = data.requestedByEmail || null;
    let requestedByUserId = data.requestedByUserId || null;

    // If requestedBy is an ObjectId or we have requestedByUserId, resolve user details
    const targetUserId =
      requestedByUserId ||
      (requestedBy && mongoose.Types.ObjectId.isValid(String(requestedBy).trim())
        ? String(requestedBy).trim()
        : null);

    if (targetUserId && (!requestedByName || !requestedByEmail)) {
      const User = require("../models/User");
      const user = await User.findById(targetUserId).select("name username email").lean().catch(() => null);
      if (user) {
        requestedByName = requestedByName || user.name || user.username || user.email;
        requestedByEmail = requestedByEmail || user.email;
        requestedByUserId = user._id;
        requestedBy = requestedByEmail ? `${requestedByName} (${requestedByEmail})` : requestedByName;
      }
    }

    const docData = {
      branchId: appliesToAll ? null : resolvedBranchId,
      requestedBranch: requestedBranch,
      appliesToAllBranches: appliesToAll,
      requestedBy: requestedBy,
      requestedByName: requestedByName,
      requestedByEmail: requestedByEmail,
      requestedByUserId: requestedByUserId,
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
