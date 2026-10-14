const mongoose = require("mongoose");
const IInvoiceRepository = require("../../../../../domain/repositories/invoice/IInvoiceRepository");
const Invoice = require("../../models/invoice/Invoice");

class MongoInvoiceRepository extends IInvoiceRepository {
  async create(invoiceData) {
    const doc = new Invoice(invoiceData);
    return doc.save();
  }

  async findById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Invoice.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate("jobOrderId", "jobNo title status currentStage")
      .populate("branchId", "name code address")
      .populate("createdBy", "username email employeeCode")
      .populate("finalizedBy", "username email employeeCode");
  }

  async findByInvoiceNumber(invoiceNumber) {
    if (!invoiceNumber) return null;
    return Invoice.findOne({ invoiceNumber, isDeleted: { $ne: true } });
  }

  async findByJobOrderId(jobOrderId) {
    if (!mongoose.Types.ObjectId.isValid(jobOrderId)) return [];
    return Invoice.find({ jobOrderId, isDeleted: { $ne: true } }).sort({ createdAt: -1 });
  }

  async findActiveByJobOrderId(jobOrderId) {
    if (!mongoose.Types.ObjectId.isValid(jobOrderId)) return null;
    return Invoice.findOne({
      jobOrderId,
      status: { $ne: "CANCELLED" },
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 });
  }

  async findAll(filter = {}, pagination = { page: 1, limit: 20 }) {
    const query = { isDeleted: { $ne: true } };

    if (filter.status) query.status = filter.status;
    if (filter.branchId) query.branchId = filter.branchId;
    if (filter.branchIds && Array.isArray(filter.branchIds) && filter.branchIds.length > 0) {
      query.branchId = { $in: filter.branchIds };
    }
    if (filter.customerId) query.customerId = filter.customerId;
    if (filter.jobOrderId) query.jobOrderId = filter.jobOrderId;
    if (filter.search) {
      const regex = new RegExp(filter.search, "i");
      query.$or = [
        { invoiceNumber: regex },
        { jobNo: regex },
        { "customerSnapshot.name": regex },
        { "customerSnapshot.mobile": regex },
      ];
    }
    if (filter.startDate && filter.endDate) {
      query.invoiceDate = {
        $gte: new Date(filter.startDate),
        $lte: new Date(filter.endDate),
      };
    }

    const page = Math.max(1, Number(pagination.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(pagination.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Invoice.find(query)
        .populate("branchId", "name code")
        .sort({ invoiceDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(query),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async updateById(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Invoice.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  async count(filter = {}) {
    return Invoice.countDocuments({ ...filter, isDeleted: { $ne: true } });
  }
}

module.exports = new MongoInvoiceRepository();
