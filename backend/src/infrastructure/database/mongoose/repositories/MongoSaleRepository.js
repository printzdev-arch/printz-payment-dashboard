const mongoose = require("mongoose");
const ISaleRepository = require("../../../../domain/repositories/ISaleRepository");
const Sale = require("../models/Sale");

class MongoSaleRepository extends ISaleRepository {
  async findAll(filters = {}) {
    const query = {};

    if (filters.branchName) {
      query.$or = [
        { branchName: filters.branchName },
        { branchID: filters.branchName },
      ];
    } else if (filters.branchID) {
      query.$or = [
        { branchID: filters.branchID },
        { branchName: filters.branchID },
      ];
    }

    if (filters.date) {
      query.date = filters.date;
    } else if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = filters.startDate;
      if (filters.endDate) query.date.$lte = filters.endDate;
    }

    return Sale.find(query).sort({ createdAt: -1 });
  }

  async findById(id) {
    if (!id) return null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      const sale = await Sale.findById(id);
      if (sale) return sale;
    }
    return Sale.findOne({ invoiceNo: String(id).trim().toUpperCase() });
  }

  async findByInvoiceNo(invoiceNo) {
    if (!invoiceNo) return null;
    return Sale.findOne({ invoiceNo: String(invoiceNo).trim().toUpperCase() });
  }

  async create(saleData) {
    const data = { ...saleData };
    delete data._id;
    delete data.id;

    const sale = new Sale(data);
    await sale.save();
    return sale;
  }
}

module.exports = new MongoSaleRepository();
