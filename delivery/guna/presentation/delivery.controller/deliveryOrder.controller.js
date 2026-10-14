const DeliveryOrderService = require("../../../application/services/delivery/deliveryOrder.service");
const { asyncHandler, ResponseHelper } = require("../../../shared");

/**
 * Delivery Orders Controller - Module 08 Delivery Management
 */

// List delivery orders
const getDeliveryOrders = asyncHandler(async (req, res) => {
  const { items, total, page, limit } = await DeliveryOrderService.findAll(req.query, req.user);
  return ResponseHelper.paginated(
    res,
    items,
    { total, page, limit },
    "Delivery orders retrieved successfully"
  );
});

// Get single delivery order by ID
const getDeliveryOrderById = asyncHandler(async (req, res) => {
  const order = await DeliveryOrderService.findById(req.params.id, req.user);
  return ResponseHelper.ok(res, "Delivery order retrieved successfully", order);
});

// Step 1: Manager reviews jobs (READY_FOR_DELIVERY - MANAGER ONLY)
const getReadyJobsForDelivery = asyncHandler(async (req, res) => {
  const result = await DeliveryOrderService.getReadyJobsForDelivery(req.query, req.user);
  return ResponseHelper.paginated(
    res,
    result.items,
    { total: result.total, page: result.page, limit: result.limit },
    "Ready jobs for delivery retrieved successfully"
  );
});

// Step 1: Manager reviews specific job
const reviewJob = asyncHandler(async (req, res) => {
  const reviewed = await DeliveryOrderService.reviewJob(
    req.params.jobOrderId,
    req.body,
    req.user
  );
  return ResponseHelper.ok(res, "Job reviewed and ready for delivery", reviewed);
});

// Step 2: Enter delivery details (DO-xxxxx)
const createDeliveryOrder = asyncHandler(async (req, res) => {
  const order = await DeliveryOrderService.createDeliveryOrder(req.body, req.user);
  return ResponseHelper.created(res, "Delivery order created successfully", order);
});

// Step 2: Update delivery details
const updateDeliveryDetails = asyncHandler(async (req, res) => {
  const updated = await DeliveryOrderService.updateDeliveryDetails(
    req.params.id,
    req.body,
    req.user
  );
  return ResponseHelper.ok(res, "Delivery details updated successfully", updated);
});

// Step 3: Assign and send details (status ASSIGNED)
const assignDeliveryOrder = asyncHandler(async (req, res) => {
  const assigned = await DeliveryOrderService.assignDeliveryPerson(
    req.params.id,
    req.body,
    req.user
  );
  return ResponseHelper.ok(
    res,
    "Delivery order assigned and notification sent successfully",
    assigned
  );
});

// Step 4: Pack and verify goods (Stage: PACKED)
const packDeliveryOrder = asyncHandler(async (req, res) => {
  const packed = await DeliveryOrderService.pack(req.params.id, req.body, req.user);
  return ResponseHelper.ok(res, "Delivery order packed and goods verified", packed);
});

// Step 5: Dispatch or counter pickup (Stage: OUT_FOR_DELIVERY)
const dispatchDeliveryOrder = asyncHandler(async (req, res) => {
  const dispatched = await DeliveryOrderService.dispatch(
    req.params.id,
    req.body,
    req.user
  );
  return ResponseHelper.ok(
    res,
    "Delivery order dispatched (Out for delivery / counter pickup ready)",
    dispatched
  );
});

// Step 6: Record handover evidence (Delivery Proof)
const recordHandoverEvidence = asyncHandler(async (req, res) => {
  const result = await DeliveryOrderService.recordHandoverEvidence(
    req.params.id,
    req.body,
    req.user
  );
  return ResponseHelper.ok(
    res,
    result.message || "Handover evidence recorded successfully",
    result
  );
});

// Step 7: Complete delivery (backward compatible)
const deliverDeliveryOrder = asyncHandler(async (req, res) => {
  const delivered = await DeliveryOrderService.deliver(
    req.params.id,
    req.body,
    req.user
  );
  return ResponseHelper.ok(res, "Delivery order successfully delivered", delivered);
});

// Generate Handover OTP
const generateOtp = asyncHandler(async (req, res) => {
  const result = await DeliveryOrderService.generateOtp(req.params.id, req.user);
  return ResponseHelper.ok(res, "Handover OTP generated successfully", result);
});

// Verify Handover OTP
const verifyOtp = asyncHandler(async (req, res) => {
  const result = await DeliveryOrderService.verifyOtp(req.params.id, req.body.otp, req.user);
  if (!result.verified) {
    return ResponseHelper.badRequest(res, result.message);
  }
  return ResponseHelper.ok(res, result.message, result);
});

// Get Handover Proof
const getDeliveryProof = asyncHandler(async (req, res) => {
  const proof = await DeliveryOrderService.getProof(req.params.id, req.user);
  return ResponseHelper.ok(res, "Delivery proof retrieved successfully", proof);
});

module.exports = {
  getDeliveryOrders,
  getDeliveryOrderById,
  getReadyJobsForDelivery,
  reviewJob,
  createDeliveryOrder,
  updateDeliveryDetails,
  assignDeliveryOrder,
  packDeliveryOrder,
  dispatchDeliveryOrder,
  recordHandoverEvidence,
  deliverDeliveryOrder,
  generateOtp,
  verifyOtp,
  getDeliveryProof,
};
