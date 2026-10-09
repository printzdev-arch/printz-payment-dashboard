const stockTransferService = require("../../services/product-order/stockTransferService");

class DispatchStockTransfer {
  constructor(service = stockTransferService) {
    this.service = service;
  }

  async execute(id, dto, authContext = {}) {
    return this.service.dispatchTransfer(id, dto, authContext);
  }
}

class ReceiveStockTransfer {
  constructor(service = stockTransferService) {
    this.service = service;
  }

  async execute(id, dto, authContext = {}) {
    return this.service.receiveTransfer(id, dto, authContext);
  }
}

class CancelStockTransfer {
  constructor(service = stockTransferService) {
    this.service = service;
  }

  async execute(id, data = {}, authContext = {}) {
    return this.service.cancelTransfer(id, data, authContext);
  }
}

class GetStockTransfers {
  constructor(service = stockTransferService) {
    this.service = service;
  }

  async execute(filters = {}, pagination = {}, authContext = {}) {
    return this.service.getTransfers(filters, pagination, authContext);
  }
}

module.exports = {
  DispatchStockTransfer,
  ReceiveStockTransfer,
  CancelStockTransfer,
  GetStockTransfers,
};
