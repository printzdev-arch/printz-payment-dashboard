const asyncHandler = require("../../../shared/asyncHandler");
const ResponseHelper = require("../../../shared/response/ResponseHelper");
const DeliveryOrderService = require("../../../application/services/production/deliveryOrder.service");

/**
 * Delivery Orders Controller
 */
const getDeliveryOrders = asyncHandler(async (req, res) => {
  const { items, total, page, limit } = await DeliveryOrderService.findAll(req.query);
  return ResponseHelper.paginated(
    res,
    items,
    total,
    page,
    limit,
    "Delivery orders retrieved successfully"
  );
});

const getDeliveryOrderById = asyncHandler(async (req, res) => {
  const order = await DeliveryOrderService.findById(req.params.id);
  return ResponseHelper.ok(res, "Delivery order retrieved successfully", order);
});

const packDeliveryOrder = asyncHandler(async (req, res) => {
  const packed = await DeliveryOrderService.pack(req.params.id, req.user);
  return ResponseHelper.ok(res, "Delivery order marked as packed", packed);
});

const dispatchDeliveryOrder = asyncHandler(async (req, res) => {
  const dispatched = await DeliveryOrderService.dispatch(req.params.id, req.user);
  return ResponseHelper.ok(
    res,
    "Delivery order dispatched (Out for Delivery)",
    dispatched
  );
});

const deliverDeliveryOrder = asyncHandler(async (req, res) => {
  const delivered = await DeliveryOrderService.deliver(
    req.params.id,
    req.body,
    req.user
  );
  return ResponseHelper.ok(res, "Delivery order successfully delivered", delivered);
});

module.exports = {
  getDeliveryOrders,
  getDeliveryOrderById,
  packDeliveryOrder,
  dispatchDeliveryOrder,
  deliverDeliveryOrder,
};
