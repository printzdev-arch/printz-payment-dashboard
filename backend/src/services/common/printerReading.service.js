const mongoose = require("mongoose");
const PrinterReading = require("../../models/common/PrinterReading");
const Branch = require("../../models/common/Branch");
const ApiError = require("../../utils/ApiError");

class PrinterReadingService {
  async _resolveBranch(identifier) {
    if (!identifier) return null;
    const trimmed = String(identifier).trim();
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
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

  async getAllReadings(filters = {}) {
    const query = {};
    const branchIdentifier = filters.branchId || filters.branchName || filters.branch;
    if (branchIdentifier) {
      const branch = await this._resolveBranch(branchIdentifier);
      if (branch) {
        query.$or = [
          { branchId: branch._id },
          { branchId: branch._id.toString() },
          { branchName: new RegExp(`^${branch.name}$`, "i") },
        ];
      } else {
        query.$or = [
          { branchId: branchIdentifier },
          { branchName: new RegExp(`^${branchIdentifier}$`, "i") },
        ];
      }
    }

    if (filters.date) {
      query.date = filters.date;
    } else if (filters.startDate && filters.endDate) {
      query.date = { $gte: filters.startDate, $lte: filters.endDate };
    }

    const readings = await PrinterReading.find(query).sort({ date: -1, timestamp: -1 });

    const missingBranchDocs = readings.filter((r) => !r.branchName && r.branchId);
    if (missingBranchDocs.length > 0) {
      const branches = await Branch.find({}).lean();
      const branchMap = new Map();
      branches.forEach((b) => {
        branchMap.set(b._id.toString(), b.name);
        if (b.code) branchMap.set(b.code.toUpperCase(), b.name);
      });

      readings.forEach((doc) => {
        if (!doc.branchName && doc.branchId) {
          const resolvedName = branchMap.get(doc.branchId.toString());
          if (resolvedName) {
            doc.branchName = resolvedName;
            doc.branch = resolvedName;
          }
        }
      });
    }

    return readings;
  }

  async getReadingById(id) {
    if (!id) {
      throw ApiError.notFound("Printer reading not found");
    }
    const reading = await PrinterReading.findById(id);
    if (!reading) {
      throw ApiError.notFound("Printer reading not found");
    }
    return reading;
  }

  async findByBranchAndDate(branchNameOrId, date) {
    const branch = await this._resolveBranch(branchNameOrId);
    const query = { date };
    if (branch) {
      query.$or = [
        { branchId: branch._id },
        { branchId: branch._id.toString() },
        { branchName: new RegExp(`^${branch.name}$`, "i") },
      ];
    } else {
      query.$or = [
        { branchId: branchNameOrId },
        { branchName: new RegExp(`^${branchNameOrId}$`, "i") },
      ];
    }

    const doc = await PrinterReading.findOne(query);
    if (doc && !doc.branchName && branch) {
      doc.branchName = branch.name;
      doc.branch = branch.name;
    }
    return doc;
  }

  async saveReading(data) {
    if (data && typeof data.validate === "function") {
      data.validate();
    }

    let existing = null;
    const targetId = data._id || data.id;
    if (targetId) {
      existing = await PrinterReading.findById(targetId).catch(() => null);
    }

    const resolvedBranch = await this._resolveBranch(data.branchId || data.branchName || data.branch);
    const resolvedBranchId = resolvedBranch
      ? resolvedBranch._id
      : data.branchId
      ? typeof data.branchId === "string" && mongoose.Types.ObjectId.isValid(data.branchId)
        ? new mongoose.Types.ObjectId(data.branchId)
        : data.branchId
      : null;
    const resolvedBranchName = resolvedBranch ? resolvedBranch.name : (data.branchName || data.branch || "");

    if (!existing && resolvedBranchId && data.date) {
      existing = await PrinterReading.findOne({
        $or: [
          { branchId: resolvedBranchId },
          { branchId: resolvedBranchId.toString() },
          ...(resolvedBranchName ? [{ branchName: new RegExp(`^${resolvedBranchName}$`, "i") }] : []),
        ],
        date: data.date,
      });
    }

    if (existing) {
      if (resolvedBranchId) existing.branchId = resolvedBranchId;
      if (resolvedBranchName) {
        existing.branchName = resolvedBranchName;
        existing.branch = resolvedBranchName;
      }
      if (data.readings !== undefined) existing.readings = data.readings;
      if (data.date !== undefined) {
        existing.date = data.date;
        existing.dateAt = data.dateAt || new Date(data.date);
      }
      if (data.userId !== undefined) existing.userId = data.userId;
      if (data.finalSubmittedAt !== undefined) existing.finalSubmittedAt = data.finalSubmittedAt;
      if (data.finalSubmittedBy !== undefined) existing.finalSubmittedBy = data.finalSubmittedBy;
      if (data.isFinalSubmitted !== undefined) existing.isFinalSubmitted = data.isFinalSubmitted;
      if (data.isLocked !== undefined) existing.isLocked = data.isLocked;
      if (data.needsReview !== undefined) existing.needsReview = data.needsReview;
      existing.lastUpdated = new Date();
      await existing.save();
      return { reading: existing, isNew: false };
    }

    const docData = {
      legacyFirestoreId: data.legacyFirestoreId || null,
      branchId: resolvedBranchId,
      branchName: resolvedBranchName || null,
      branch: resolvedBranchName || null,
      date: data.date,
      dateAt: data.dateAt || (data.date ? new Date(data.date) : new Date()),
      readings: data.readings !== undefined ? data.readings : {},
      timestamp: data.timestamp || new Date(),
      lastUpdated: null,
      userId: data.userId || null,
      finalSubmittedAt: data.finalSubmittedAt || null,
      finalSubmittedBy: data.finalSubmittedBy || null,
      isFinalSubmitted: Boolean(data.isFinalSubmitted),
      isLocked: Boolean(data.isLocked),
      needsReview: Boolean(data.needsReview),
    };

    const reading = new PrinterReading(docData);
    await reading.save();
    return { reading, isNew: true };
  }

  async updateReading(id, data) {
    if (data && typeof data.validate === "function") {
      data.validate();
    }
    const existing = await PrinterReading.findById(id);
    if (!existing) {
      throw ApiError.notFound("Printer reading not found");
    }

    if (data.branchId !== undefined || data.branchName !== undefined || data.branch !== undefined) {
      const resolvedBranch = await this._resolveBranch(data.branchId || data.branchName || data.branch);
      if (resolvedBranch) {
        existing.branchId = resolvedBranch._id;
        existing.branchName = resolvedBranch.name;
        existing.branch = resolvedBranch.name;
      } else {
        if (data.branchId !== undefined) {
          existing.branchId = typeof data.branchId === "string" && mongoose.Types.ObjectId.isValid(data.branchId)
            ? new mongoose.Types.ObjectId(data.branchId)
            : data.branchId;
        }
        if (data.branchName !== undefined || data.branch !== undefined) {
          const name = data.branchName || data.branch;
          existing.branchName = name;
          existing.branch = name;
        }
      }
    }
    if (data.date !== undefined) {
      existing.date = data.date;
      existing.dateAt = data.dateAt || new Date(data.date);
    }
    if (data.readings !== undefined) existing.readings = data.readings;
    if (data.userId !== undefined) existing.userId = data.userId;
    if (data.finalSubmittedAt !== undefined) existing.finalSubmittedAt = data.finalSubmittedAt;
    if (data.finalSubmittedBy !== undefined) existing.finalSubmittedBy = data.finalSubmittedBy;
    if (data.isFinalSubmitted !== undefined) existing.isFinalSubmitted = data.isFinalSubmitted;
    if (data.isLocked !== undefined) existing.isLocked = data.isLocked;
    if (data.needsReview !== undefined) existing.needsReview = data.needsReview;

    existing.lastUpdated = new Date();
    await existing.save();
    return existing;
  }

  async deleteReading(id) {
    const deleted = await PrinterReading.findByIdAndDelete(id);
    if (!deleted) {
      throw ApiError.notFound("Printer reading not found");
    }
    return { success: true };
  }
}

module.exports = new PrinterReadingService();
