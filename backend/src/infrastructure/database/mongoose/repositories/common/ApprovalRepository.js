const mongoose = require("mongoose");
const IApprovalRepository = require("../../../../../domain/repositories/common/IApprovalRepository");
const Approval = require("../../models/common/Approval");

class ApprovalRepository extends IApprovalRepository {
  async create(data) {
    const approval = new Approval(data);
    return approval.save();
  }

  async findAll(query = {}, { page = 1, limit = 50, sort = { createdAt: -1 } } = {}) {
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const [records, total] = await Promise.all([
      Approval.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Math.max(1, limit))
        .populate("requestedBy", "name email username role")
        .populate("approverId", "name email username role")
        .populate("branchId", "name code")
        .lean(),
      Approval.countDocuments(query),
    ]);

    return {
      records,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return Approval.findById(id)
      .populate("requestedBy", "name email username role")
      .populate("approverId", "name email username role")
      .populate("branchId", "name code")
      .lean();
  }

  async findByReference(referenceType, referenceId) {
    const refId = mongoose.Types.ObjectId.isValid(referenceId)
      ? new mongoose.Types.ObjectId(referenceId)
      : referenceId;
    return Approval.findOne({ referenceType, referenceId: refId })
      .sort({ createdAt: -1 })
      .lean();
  }

  async updateStatus(id, { status, approverId, decidedAt = new Date(), comments = null }) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return Approval.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          approverId,
          decidedAt,
          comments,
        },
      },
      { new: true }
    )
      .populate("requestedBy", "name email username role")
      .populate("approverId", "name email username role")
      .populate("branchId", "name code")
      .lean();
  }

  async getCounts(query = {}) {
    const matchQuery = { ...query };

    const [byStatus, byReferenceType, total] = await Promise.all([
      Approval.aggregate([
        { $match: matchQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Approval.aggregate([
        { $match: matchQuery },
        { $group: { _id: "$referenceType", count: { $sum: 1 } } },
      ]),
      Approval.countDocuments(matchQuery),
    ]);

    const statusCounts = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };
    byStatus.forEach((item) => {
      if (statusCounts[item._id] !== undefined) {
        statusCounts[item._id] = item.count;
      }
    });

    const referenceTypeCounts = {};
    byReferenceType.forEach((item) => {
      referenceTypeCounts[item._id] = item.count;
    });

    return {
      total,
      byStatus: statusCounts,
      byReferenceType: referenceTypeCounts,
    };
  }
}

module.exports = new ApprovalRepository();
