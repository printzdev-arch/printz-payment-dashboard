const { SaleResponseDto } = require("../dto/SaleDto");

class GetSales {
  constructor(saleRepoOrOptions) {
    this.saleRepository =
      saleRepoOrOptions?.saleRepository || saleRepoOrOptions;
  }

  async execute(filters = {}) {
    const sales = await this.saleRepository.findAll(filters);
    return SaleResponseDto.serializeList(sales);
  }
}

module.exports = GetSales;
