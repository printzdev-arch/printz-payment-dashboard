const mongoose = require("mongoose");
const IPaymentRepository = require("../../../../domain/repositories/IPaymentRepository");
const PaymentToBeCollected = require("../models/PaymentToBeCollected");
const Branch = require("../models/Branch");

class MongoPaymentRepository extends IPaymentRepository {
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

    const branchIdentifier = filters.branchId || filters.branchName || filters.branch;
    if (branchIdentifier) {
      const resolvedId = await this._resolveBranchId(branchIdentifier);
      if (resolvedId) {
        query.branchId = resolvedId;
      }
    }

    if (filters.date) {
      query.date = filters.date;
    } else if (filters.startDate && filters.endDate) {
      query.date = { $gte: filters.startDate, $lte: filters.endDate };
    }

    return PaymentToBeCollected.find(query)
      .populate("branchId", "name code")
      .sort({ date: -1, createdAt: -1 });
  }

  async findById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return PaymentToBeCollected.findById(id).populate("branchId", "name code");
  }

  async create(data) {
    const branchId = data.branchId
      ? (typeof data.branchId === "string" ? new mongoose.Types.ObjectId(data.branchId) : data.branchId)
      : null;

    const docData = {
      branchId: branchId,
      date: data.date,
      dateAt: data.dateAt || (data.date ? new Date(data.date) : new Date()),
      balance: typeof data.balance === "number" ? data.balance : Number(data.balance) || 0,
      paymentCollectedTillNow: typeof data.paymentCollectedTillNow === "number" ? data.paymentCollectedTillNow : Number(data.paymentCollectedTillNow) || 0,
      paymentToBeCollected: typeof data.paymentToBeCollected === "number" ? data.paymentToBeCollected : Number(data.paymentToBeCollected) || 0,
      items: Array.isArray(data.items) ? data.items : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const payment = new PaymentToBeCollected(docData);
    await payment.save();
    return payment;
  }

  async update(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const doc = await PaymentToBeCollected.findById(id);
    if (!doc) return null;

    if (updateData.branchId !== undefined) {
      doc.branchId = updateData.branchId
        ? (typeof updateData.branchId === "string" ? new mongoose.Types.ObjectId(updateData.branchId) : updateData.branchId)
        : doc.branchId;
    }

    if (updateData.date !== undefined) {
      doc.date = updateData.date;
      doc.dateAt = updateData.dateAt || new Date(updateData.date);
    }
    if (updateData.balance !== undefined) doc.balance = Number(updateData.balance) || 0;
    if (updateData.paymentCollectedTillNow !== undefined) doc.paymentCollectedTillNow = Number(updateData.paymentCollectedTillNow) || 0;
    if (updateData.paymentToBeCollected !== undefined) doc.paymentToBeCollected = Number(updateData.paymentToBeCollected) || 0;
    if (updateData.items !== undefined) doc.items = Array.isArray(updateData.items) ? updateData.items : [];

    doc.updatedAt = new Date();
    await doc.save();
    return doc;
  }

  async delete(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return PaymentToBeCollected.findByIdAndDelete(id);
  }
}

module.exports = new MongoPaymentRepository();
