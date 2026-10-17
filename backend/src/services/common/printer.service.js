const mongoose = require("mongoose");
const Printer = require("../../models/common/Printer");
const Branch = require("../../models/common/Branch");
const ApiError = require("../../utils/ApiError");

class PrinterService {
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

  async getAllPrinters(filters = {}) {
    const query = {};
    const branchIdentifier = filters.branchId || filters.branchName || filters.branch;
    if (branchIdentifier) {
      const branch = await this._resolveBranch(branchIdentifier);
      if (branch) {
        query.$or = [
          { branchId: branch._id },
          { branchId: branch._id.toString() },
          { branchName: new RegExp(`^${branch.name}$`, "i") },
          { location: new RegExp(`^${branch.name}$`, "i") },
        ];
      } else {
        query.$or = [
          { branchId: branchIdentifier },
          { branchName: new RegExp(`^${branchIdentifier}$`, "i") },
          { location: new RegExp(`^${branchIdentifier}$`, "i") },
        ];
      }
    }

    if (filters.printerId) {
      query.printerId = new RegExp(`^${String(filters.printerId).trim()}$`, "i");
    }

    if (filters.printerType) {
      query.printerType = new RegExp(`^${String(filters.printerType).trim()}$`, "i");
    }

    if (filters.printerName) {
      query.printerName = new RegExp(`^${String(filters.printerName).trim()}$`, "i");
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.isActive !== undefined) {
      query.isActive = Boolean(filters.isActive);
    }

    return Printer.find(query).sort({ createdAt: -1 });
  }

  async getPrinterById(id) {
    if (!id) {
      throw ApiError.notFound("Printer not found");
    }
    let printer = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      printer = await Printer.findById(id);
    }
    if (!printer) {
      printer = await Printer.findOne({ printerId: id });
    }
    if (!printer) {
      throw ApiError.notFound("Printer not found");
    }
    return printer;
  }

  async createPrinter(printerData) {
    if (printerData && typeof printerData.validate === "function") {
      printerData.validate();
    }
    const data = printerData.toJSON ? printerData.toJSON() : { ...printerData };
    if (data.branchId && typeof data.branchId === "string" && mongoose.Types.ObjectId.isValid(data.branchId)) {
      data.branchId = new mongoose.Types.ObjectId(data.branchId);
    }
    const printer = new Printer(data);
    await printer.save();
    return printer;
  }

  async updatePrinter(id, printerData) {
    const printer = await this.getPrinterById(id);

    const data = printerData.toJSON ? printerData.toJSON() : { ...printerData };
    if (data.branchId !== undefined) {
      if (data.branchId && typeof data.branchId === "string" && mongoose.Types.ObjectId.isValid(data.branchId)) {
        data.branchId = new mongoose.Types.ObjectId(data.branchId);
      }
    }

    Object.assign(printer, data);
    await printer.save();
    return printer;
  }

  async deletePrinter(id) {
    const printer = await this.getPrinterById(id);
    await Printer.findByIdAndDelete(printer._id);
    return { success: true };
  }
}

module.exports = new PrinterService();
