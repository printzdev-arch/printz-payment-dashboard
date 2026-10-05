const ErrorHelper = require("../../shared/errors/ErrorHelper");
const { SaleResponseDto } = require("../dto/SaleDto");

class GetSaleById {
  constructor(saleRepoOrOptions) {
    this.saleRepository =
      saleRepoOrOptions?.saleRepository || saleRepoOrOptions;
  }

  async execute(id) {
    if (!id) {
      throw ErrorHelper.badRequest("Sale ID or Invoice Number is required.");
    }

    const sale = await this.saleRepository.findById(id);
    if (!sale) {
      throw ErrorHelper.notFound(`Sale with ID/Invoice '${id}' not found.`);
    }

    return SaleResponseDto.serialize(sale);
  }
}

module.exports = GetSaleById;
