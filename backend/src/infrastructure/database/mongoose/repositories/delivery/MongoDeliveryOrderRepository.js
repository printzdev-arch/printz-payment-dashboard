const IDeliveryOrderRepository = require("../../../../../domain/repositories/delivery/IDeliveryOrderRepository");
const DeliveryOrder = require("../../models/DeliveryOrder");

class MongoDeliveryOrderRepository extends IDeliveryOrderRepository {
  async findAll(query = {}) {
    const filter = {};

    if (query.branchId) filter.branchId = query.branchId;
    if (query.status) {
      if (Array.isArray(query.status)) {
        filter.status = { $in: query.status };
      } else if (query.status.includes(",")) {
        filter.status = { $in: query.status.split(",").map((s) => s.trim()) };
      } else {
        filter.status = query.status;
      }
    }
    if (query.jobOrderId) filter.jobOrderId = query.jobOrderId;
    if (query.deliveryType) filter.deliveryType = query.deliveryType;
    if (query.customerId) filter.customerId = query.customerId;
    if (query.deliveryPersonPhone) filter.deliveryPersonPhone = query.deliveryPersonPhone;

    if (query.search) {
      const term = query.search.trim();
      filter.$or = [
        { deliveryNo: { $regex: term, $options: "i" } },
        { customerName: { $regex: term, $options: "i" } },
        { customerPhone: { $regex: term, $options: "i" } },
        { deliveryPersonName: { $regex: term, $options: "i" } },
        { vehicleNumber: { $regex: term, $options: "i" } },
      ];
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      DeliveryOrder.find(filter)
        .populate("jobOrderId", "jobNo title customerName customerPhone dueDate priority status currentStage")
        .populate("branchId", "name code address")
        .populate("reviewedBy", "name email role")
        .populate("assignedBy", "name email")
        .populate("packedBy", "name email")
        .populate("dispatchedBy", "name email")
        .populate("deliveredBy", "name email")
        .populate("proofId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DeliveryOrder.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findById(id) {
    const mongoose = require("mongoose");
    if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id)) {
      const doc = await DeliveryOrder.findById(id);
      if (doc) return doc;
    }
    return DeliveryOrder.findOne({
      $or: [{ deliveryNo: id }, { jobOrderId: id }],
    });
  }

  async findByIdWithDetails(id) {
    const mongoose = require("mongoose");
    const isHexId = mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
    const filter = isHexId
      ? { $or: [{ _id: id }, { deliveryNo: id }, { jobOrderId: id }] }
      : { $or: [{ deliveryNo: id }, { jobOrderId: id }] };

    return DeliveryOrder.findOne(filter)
      .populate("jobOrderId")
      .populate("branchId", "name code address phone")
      .populate("reviewedBy", "name email role")
      .populate("assignedBy", "name email")
      .populate("packedBy", "name email")
      .populate("dispatchedBy", "name email")
      .populate("deliveredBy", "name email")
      .populate("proofId")
      .lean();
  }

  async findOne(query = {}) {
    return DeliveryOrder.findOne(query);
  }

  async findByJobOrderId(jobOrderId) {
    return DeliveryOrder.findOne({ jobOrderId })
      .populate("jobOrderId")
      .populate("proofId");
  }

  async findByDeliveryNo(deliveryNo) {
    return DeliveryOrder.findOne({ deliveryNo });
  }

  async create(data) {
    return DeliveryOrder.create(data);
  }

  async upsert(filter, data) {
    return DeliveryOrder.findOneAndUpdate(
      filter,
      { $setOnInsert: data },
      { upsert: true, new: true }
    );
  }

  async update(id, updateData) {
    const mongoose = require("mongoose");
    if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id)) {
      const updated = await DeliveryOrder.findByIdAndUpdate(id, { $set: updateData }, { new: true });
      if (updated) return updated;
    }
    return DeliveryOrder.findOneAndUpdate(
      { $or: [{ deliveryNo: id }, { jobOrderId: id }] },
      { $set: updateData },
      { new: true }
    );
  }

  async countDocuments(filter = {}) {
    return DeliveryOrder.countDocuments(filter);
  }
}

module.exports = new MongoDeliveryOrderRepository();
