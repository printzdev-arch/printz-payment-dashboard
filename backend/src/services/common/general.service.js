const mongoose = require("mongoose");
const categoryRepository = require("../../models/common/Category");
const finalizedDateRepository = require("../../models/common/FinalizedDate");
const inventoryMovementRepository = require("../../models/inventory/InventoryMovement");
const saleRepository = require("../../models/pos/Sale");
const ApiError = require("../../utils/ApiError");

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
    return this.finRepo.finalize(dto.branchName, dto.date, dto);
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
