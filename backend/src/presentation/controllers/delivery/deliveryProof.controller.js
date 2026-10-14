const DeliveryProofService = require("../../../application/services/delivery/deliveryProof.service");
const { asyncHandler, ResponseHelper } = require("../../../shared");

/**
 * Delivery Proof Controller
 */
const getDeliveryProofs = asyncHandler(async (req, res) => {
  const { items, total, page, limit } = await DeliveryProofService.findAll(req.query);
  return ResponseHelper.paginated(
    res,
    items,
    { total, page, limit },
    "Delivery proofs retrieved successfully"
  );
});

const getDeliveryProofById = asyncHandler(async (req, res) => {
  const proof = await DeliveryProofService.findById(req.params.id);
  return ResponseHelper.ok(res, "Delivery proof retrieved successfully", proof);
});

const getProofsByDeliveryOrderId = asyncHandler(async (req, res) => {
  const proofs = await DeliveryProofService.findByDeliveryOrderId(req.params.deliveryOrderId);
  return ResponseHelper.ok(res, "Delivery proofs retrieved successfully", proofs);
});

const createDeliveryProof = asyncHandler(async (req, res) => {
  const proof = await DeliveryProofService.createProof(req.body, req.user);
  return ResponseHelper.created(res, "Delivery proof recorded successfully", proof);
});

module.exports = {
  getDeliveryProofs,
  getDeliveryProofById,
  getProofsByDeliveryOrderId,
  createDeliveryProof,
};
