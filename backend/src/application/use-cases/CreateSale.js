const mongoose = require("mongoose");
const ErrorHelper = require("../../shared/errors/ErrorHelper");
const { CreateSaleDto, SaleResponseDto } = require("../dto/SaleDto");

class CreateSale {
  constructor(saleRepoOrOptions) {
    this.saleRepository =
      saleRepoOrOptions?.saleRepository || saleRepoOrOptions;
  }

  async execute(saleDto) {
    let dto = saleDto;
    if (!(dto instanceof CreateSaleDto)) {
      dto = new CreateSaleDto(saleDto);
    }

    dto.validate();

    if (!mongoose.Types.ObjectId.isValid(dto.managerID)) {
      throw ErrorHelper.badRequest("Invalid manager ID.");
    }

    const existing = await this.saleRepository.findByInvoiceNo(dto.invoiceNo);
    if (existing) {
      throw ErrorHelper.conflict(
        `Invoice number '${dto.invoiceNo}' already exists.`
      );
    }

    const createdSale = await this.saleRepository.create({
      branchID: dto.branchID,
      branchName: dto.branchName,
      managerID: dto.managerID,
      invoiceNo: dto.invoiceNo,
      date: dto.date,
      itemsSold: dto.itemsSold,
      subtotal: dto.subtotal,
      gst: dto.gst,
      grandTotal: dto.grandTotal,
      totalAmount: dto.totalAmount,
      paymentStatus: dto.paymentStatus,
    });

    return SaleResponseDto.serialize(createdSale);
  }
}

module.exports = CreateSale;
