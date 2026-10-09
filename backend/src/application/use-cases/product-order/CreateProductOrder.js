const productOrderService = require("../../services/product-order/productOrderService");

class CreateProductOrder {
  constructor(service = productOrderService) {
    this.service = service;
  }

  async execute(dto, authContext = {}) {
    return this.service.createDraft(dto, authContext);
  }
}

module.exports = CreateProductOrder;
