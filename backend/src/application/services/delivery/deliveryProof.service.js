const deliveryProofRepository = require("../../../infrastructure/database/mongoose/repositories/delivery/MongoDeliveryProofRepository");
const numberSequenceService = require("../common/numberSequence.service");
const ErrorHelper = require("../../../shared/errors/ErrorHelper");

class DeliveryProofService {
  /**
   * List delivery proofs with filters & pagination
   */
  static async findAll(query = {}) {
    return deliveryProofRepository.findAll(query);
  }

  /**
   * Get delivery proof by ID
   */
  static async findById(id) {
    const proof = await deliveryProofRepository.findById(id);
    if (!proof) {
      throw ErrorHelper.notFound(`Delivery Proof not found with ID: ${id}`);
    }
    return proof;
  }

  /**
   * Get proofs by delivery order ID
   */
  static async findByDeliveryOrderId(deliveryOrderId) {
    return deliveryProofRepository.findByDeliveryOrderId(deliveryOrderId);
  }

  /**
   * Get latest proof for a delivery order
   */
  static async findLatestByDeliveryOrderId(deliveryOrderId) {
    return deliveryProofRepository.findLatestByDeliveryOrderId(deliveryOrderId);
  }

  /**
   * Get proofs by job order ID
   */
  static async findByJobOrderId(jobOrderId) {
    return deliveryProofRepository.findByJobOrderId(jobOrderId);
  }

  /**
   * Create a delivery proof document
   */
  static async createProof(proofData = {}, user = null) {
    let { proofNo } = proofData;
    if (!proofNo) {
      try {
        proofNo = await numberSequenceService.generateBusinessNumber("DELIVERY_PROOF", {
          prefix: "DP",
          padLength: 5,
        });
      } catch (err) {
        const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const count = await deliveryProofRepository.countDocuments();
        proofNo = `DP-${datePrefix}-${String(count + 1).padStart(4, "0")}`;
      }
    }

    const payload = {
      ...proofData,
      proofNo,
      recordedBy: user ? user._id : null,
      deliveredAt: proofData.deliveredAt || new Date(),
    };

    return deliveryProofRepository.create(payload);
  }
}

module.exports = DeliveryProofService;
