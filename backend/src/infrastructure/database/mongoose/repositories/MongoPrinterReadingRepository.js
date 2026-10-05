const mongoose = require("mongoose");
const IPrinterReadingRepository = require("../../../../domain/repositories/IPrinterReadingRepository");
const PrinterReading = require("../models/PrinterReading");
const Branch = require("../models/Branch");

class MongoPrinterReadingRepository extends IPrinterReadingRepository {
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

  async findAll(filters = {}) {
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

    // Populate branchName for any legacy documents that only stored branchId
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

  async findById(id) {
    if (!id) return null;
    return PrinterReading.findById(id);
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

  async save(data) {
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

  async update(id, updateData) {
    const existing = await PrinterReading.findById(id);
    if (!existing) return null;

    if (updateData.branchId !== undefined || updateData.branchName !== undefined || updateData.branch !== undefined) {
      const resolvedBranch = await this._resolveBranch(updateData.branchId || updateData.branchName || updateData.branch);
      if (resolvedBranch) {
        existing.branchId = resolvedBranch._id;
        existing.branchName = resolvedBranch.name;
        existing.branch = resolvedBranch.name;
      } else {
        if (updateData.branchId !== undefined) {
          existing.branchId = typeof updateData.branchId === "string" && mongoose.Types.ObjectId.isValid(updateData.branchId)
            ? new mongoose.Types.ObjectId(updateData.branchId)
            : updateData.branchId;
        }
        if (updateData.branchName !== undefined || updateData.branch !== undefined) {
          const name = updateData.branchName || updateData.branch;
          existing.branchName = name;
          existing.branch = name;
        }
      }
    }
    if (updateData.date !== undefined) {
      existing.date = updateData.date;
      existing.dateAt = updateData.dateAt || new Date(updateData.date);
    }
    if (updateData.readings !== undefined) existing.readings = updateData.readings;
    if (updateData.userId !== undefined) existing.userId = updateData.userId;
    if (updateData.finalSubmittedAt !== undefined) existing.finalSubmittedAt = updateData.finalSubmittedAt;
    if (updateData.finalSubmittedBy !== undefined) existing.finalSubmittedBy = updateData.finalSubmittedBy;
    if (updateData.isFinalSubmitted !== undefined) existing.isFinalSubmitted = updateData.isFinalSubmitted;
    if (updateData.isLocked !== undefined) existing.isLocked = updateData.isLocked;
    if (updateData.needsReview !== undefined) existing.needsReview = updateData.needsReview;

    existing.lastUpdated = new Date();
    await existing.save();
    return existing;
  }

  async delete(id) {
    return PrinterReading.findByIdAndDelete(id);
  }
}

module.exports = new MongoPrinterReadingRepository();
