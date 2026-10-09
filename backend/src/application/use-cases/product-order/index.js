const CreateProductOrder = require("./CreateProductOrder");
const {
  SubmitProductOrder,
  ApproveProductOrder,
  RejectProductOrder,
  CancelProductOrder,
  GetProductOrders,
} = require("./ProductOrderLifecycleUseCases");
const {
  DispatchStockTransfer,
  ReceiveStockTransfer,
  CancelStockTransfer,
  GetStockTransfers,
} = require("./StockTransferUseCases");

module.exports = {
  CreateProductOrder,
  SubmitProductOrder,
  ApproveProductOrder,
  RejectProductOrder,
  CancelProductOrder,
  GetProductOrders,
  DispatchStockTransfer,
  ReceiveStockTransfer,
  CancelStockTransfer,
  GetStockTransfers,
};
