const mongoose = require("mongoose");
const categoryRepository = require("../../categories/models/Category");
const finalizedDateRepository = require("../../past-date-requests/models/FinalizedDate");
const inventoryMovementRepository = require("../../inventory/models/InventoryMovement");
const saleRepository = require("../../pos/models/Sale");
const ApiError = require("../../../utils/errors/ApiError");

class GeneralService {
  constructor(
    catRepo = categoryRepository,
    finRepo = finalizedDateRepository,
    movRepo = inventoryMovementRepository,
    saleRepo = saleRepository
  ) {
    this.catRepo = catRepo;
    this.finRepo = finRepo;
    this.movRepo = movRepo;
    this.saleRepo = saleRepo;
  }

  // Categories
  async getCategories() {
    return this.catRepo.findAll();
  }

  async createCategory(categoryDto) {
    if (categoryDto && typeof categoryDto.validate === "function") {
      categoryDto.validate();
    }
    const existing = await this.catRepo.findByCategoryId(categoryDto.categoryId);
    if (existing) {
      throw ApiError.conflict(`Category '${categoryDto.categoryId}' already exists`);
    }
    return this.catRepo.create(categoryDto);
  }

  // Finalized Dates
  async getFinalizedDates(query = {}) {
    return this.finRepo.findAll(query);
  }

  async finalizeDate(dto) {
    if (!dto.branchName || !dto.date) {
      throw ApiError.badRequest("branchName and date are required");
    }
    const existing = await this.finRepo.findByBranchAndDate(dto.branchName, dto.date);
    const payload = { ...dto };
    if (existing?.scanCheck) {
      // Already finalized: keep the original finalize time and scan snapshot
      payload.finalizedAt = existing.finalizedAt || existing.updatedAt;
      payload.scanCheck = existing.scanCheck;
    } else {
      const finalizedAt = new Date();
      payload.finalizedAt = finalizedAt;
      try {
        // Freeze the POS Color/B&W scan check at finalize time; the next sheet counts from here
        const scanCheckService = require("../../printers/services/scanCheck.service");
        payload.scanCheck = await scanCheckService.compute({
          branchName: dto.branchName,
          date: dto.date,
          endAt: finalizedAt,
          finalized: true,
        });
      } catch (err) {
        console.error("Scan check snapshot failed:", err.message);
      }
    }
    return this.finRepo.finalize(dto.branchName, dto.date, payload);
  }

  // Inventory Movements
  async getInventoryMovements(query = {}) {
    return this.movRepo.findAll(query);
  }

  async createInventoryMovement(data) {
    return this.movRepo.create(data);
  }

  // Sales
  async getSales(query = {}) {
    return this.saleRepo.findAll(query);
  }

  async getSaleById(id) {
    const sale = await this.saleRepo.findById(id);
    if (!sale) {
      throw ApiError.notFound("Sale not found");
    }
    return sale;
  }

  async createSale(saleDto) {
    if (saleDto && typeof saleDto.validate === "function") {
      saleDto.validate();
    }

    if (saleDto.managerID && !mongoose.Types.ObjectId.isValid(saleDto.managerID)) {
      throw ApiError.badRequest("Invalid manager ID.");
    }

    const existing = await this.saleRepo.findByInvoiceNo(saleDto.invoiceNo);
    if (existing) {
      throw ApiError.conflict(`Invoice number '${saleDto.invoiceNo}' already exists.`);
    }

    return this.saleRepo.create({
      branchID: saleDto.branchID,
      branchName: saleDto.branchName,
      managerID: saleDto.managerID,
      invoiceNo: saleDto.invoiceNo,
      date: saleDto.date,
      itemsSold: saleDto.itemsSold,
      subtotal: saleDto.subtotal,
      gst: saleDto.gst,
      grandTotal: saleDto.grandTotal,
      totalAmount: saleDto.totalAmount,
      paymentStatus: saleDto.paymentStatus,
    });
  }
}

module.exports = new GeneralService();
