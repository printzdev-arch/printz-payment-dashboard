const productOrderService = require("../../services/product-order/productOrderService");

class SubmitProductOrder {
  constructor(service = productOrderService) {
    this.service = service;
  }

  async execute(id, data = {}, authContext = {}) {
    return this.service.submitOrder(id, data, authContext);
  }
}

class ApproveProductOrder {
  constructor(service = productOrderService) {
    this.service = service;
  }

  async execute(id, dto, authContext = {}) {
    return this.service.approveOrder(id, dto, authContext);
  }
}

class RejectProductOrder {
  constructor(service = productOrderService) {
    this.service = service;
  }

  async execute(id, dto, authContext = {}) {
    return this.service.rejectOrder(id, dto, authContext);
  }
}

class CancelProductOrder {
  constructor(service = productOrderService) {
    this.service = service;
  }

  async execute(id, data = {}, authContext = {}) {
    return this.service.cancelOrder(id, data, authContext);
  }
}

class GetProductOrders {
  constructor(service = productOrderService) {
    this.service = service;
  }

  async execute(filters = {}, pagination = {}, authContext = {}) {
    return this.service.getOrders(filters, pagination, authContext);
  }
}

module.exports = {
  SubmitProductOrder,
  ApproveProductOrder,
  RejectProductOrder,
  CancelProductOrder,
  GetProductOrders,
};
