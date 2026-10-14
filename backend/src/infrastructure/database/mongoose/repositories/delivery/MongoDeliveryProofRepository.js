const IDeliveryProofRepository = require("../../../../../domain/repositories/delivery/IDeliveryProofRepository");
const DeliveryProof = require("../../models/DeliveryProof");

class MongoDeliveryProofRepository extends IDeliveryProofRepository {
  async findAll(query = {}) {
    const filter = {};

    if (query.branchId) filter.branchId = query.branchId;
    if (query.deliveryOrderId) filter.deliveryOrderId = query.deliveryOrderId;
    if (query.jobOrderId) filter.jobOrderId = query.jobOrderId;
    if (query.status) filter.status = query.status;
    if (query.proofType) filter.proofType = query.proofType;

    if (query.search) {
      const term = query.search.trim();
      filter.$or = [
        { deliveryNo: { $regex: term, $options: "i" } },
        { proofNo: { $regex: term, $options: "i" } },
        { recipientName: { $regex: term, $options: "i" } },
        { recipientPhone: { $regex: term, $options: "i" } },
      ];
    }

    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      DeliveryProof.find(filter)
        .populate("deliveryOrderId")
        .populate("jobOrderId", "jobNo title customerName customerPhone")
        .populate("branchId", "name code")
        .populate("recordedBy", "name email")
        .populate("deliveredBy", "name email")
        .sort({ deliveredAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DeliveryProof.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findById(id) {
    return DeliveryProof.findById(id)
      .populate("deliveryOrderId")
      .populate("jobOrderId")
      .populate("branchId")
      .populate("recordedBy", "name email")
      .populate("deliveredBy", "name email");
  }

  async findByDeliveryOrderId(deliveryOrderId) {
    return DeliveryProof.find({ deliveryOrderId })
      .populate("recordedBy", "name email")
      .populate("deliveredBy", "name email")
      .sort({ deliveredAt: -1 });
  }

  async findLatestByDeliveryOrderId(deliveryOrderId) {
    return DeliveryProof.findOne({ deliveryOrderId })
      .populate("recordedBy", "name email")
      .populate("deliveredBy", "name email")
      .sort({ deliveredAt: -1 });
  }

  async findByJobOrderId(jobOrderId) {
    return DeliveryProof.find({ jobOrderId })
      .populate("recordedBy", "name email")
      .populate("deliveredBy", "name email")
      .sort({ deliveredAt: -1 });
  }

  async create(data) {
    return DeliveryProof.create(data);
  }

  async update(id, updateData) {
    return DeliveryProof.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }

  async countDocuments(filter = {}) {
    return DeliveryProof.countDocuments(filter);
  }
}

module.exports = new MongoDeliveryProofRepository();
