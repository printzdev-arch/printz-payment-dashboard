const mongoose = require("mongoose");
const jumboXeroxRepository = require("../../models/common/JumboXerox");
const jumboXeroxReadingRepository = require("../../models/common/JumboXeroxReading");
const branchRepository = require("../../models/common/Branch");
const ApiError = require("../../utils/ApiError");

class JumboXeroxService {
  constructor(
    jumboRepo = jumboXeroxRepository,
    readingRepo = jumboXeroxReadingRepository,
    branchRepo = branchRepository
  ) {
    this.jumboRepo = jumboRepo;
    this.readingRepo = readingRepo;
    this.branchRepo = branchRepo;
  }

  // Machine operations
  async getAllMachines(query = {}) {
    return this.jumboRepo.findAll(query);
  }

  async getMachineById(id) {
    const machine = await this.jumboRepo.findById(id);
    if (!machine) {
      throw ApiError.notFound("Jumbo Xerox machine not found");
    }
    return machine;
  }

  async saveMachine(machineData = {}) {
    const { branchId, printerId, printerName, size, type, unitPrice } = machineData;

    if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) {
      throw ApiError.badRequest("Invalid branch ID format.");
    }

    if (this.branchRepo) {
      const branch = await this.branchRepo.findById(branchId);
      if (!branch) {
        throw ApiError.notFound("Branch not found.");
      }
    }

    if (!printerId || !String(printerId).trim()) {
      throw ApiError.badRequest("Printer ID is required.");
    }

    if (!printerName || !String(printerName).trim()) {
      throw ApiError.badRequest("Printer name is required.");
    }

    if (!size || !String(size).trim()) {
      throw ApiError.badRequest("Size is required.");
    }

    if (!type || !String(type).trim()) {
      throw ApiError.badRequest("Type is required.");
    }

    const price = Number(unitPrice);
    if (isNaN(price) || price < 0) {
      throw ApiError.badRequest("Unit price must be greater than or equal to 0.");
    }

    return this.jumboRepo.create(machineData);
  }

  async updateMachine(id, updateData = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid machine ID format.");
    }

    const existing = await this.jumboRepo.findById(id);
    if (!existing) {
      throw ApiError.notFound("Jumbo Xerox machine not found.");
    }

    if (updateData.branchId) {
      if (!mongoose.Types.ObjectId.isValid(updateData.branchId)) {
        throw ApiError.badRequest("Invalid branch ID format.");
      }
      if (this.branchRepo) {
        const branch = await this.branchRepo.findById(updateData.branchId);
        if (!branch) {
          throw ApiError.notFound("Branch not found.");
        }
      }
    }

    if (updateData.unitPrice !== undefined) {
      const price = Number(updateData.unitPrice);
      if (isNaN(price) || price < 0) {
        throw ApiError.badRequest("Unit price must be greater than or equal to 0.");
      }
    }

    return this.jumboRepo.update(id, updateData);
  }

  async deleteMachine(id) {
    const deleted = await this.jumboRepo.delete(id);
    if (!deleted) {
      throw ApiError.notFound("Jumbo Xerox machine not found");
    }
    return { success: true };
  }

  // Reading operations
  async getAllReadings(query = {}) {
    return this.readingRepo.findAll(query);
  }

  async saveReading(readingData) {
    return this.readingRepo.save(readingData);
  }

  async deleteReading(id) {
    const deleted = await this.readingRepo.delete(id);
    if (!deleted) {
      throw ApiError.notFound("Jumbo Xerox reading not found");
    }
    return { success: true };
  }
}

module.exports = new JumboXeroxService();
