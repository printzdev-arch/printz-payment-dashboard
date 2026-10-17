const deliveryProofRepository = require("../../models/delivery/DeliveryProof");
const numberSequenceService = require("../common/numberSequence.service");
const ErrorHelper = require("../../utils/ApiError");
const { getDatePrefix } = require("../../utils/dateUtils");

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
        const datePrefix = getDatePrefix();
        const count = await deliveryProofRepository.countDocuments();
        proofNo = `DP-${datePrefix}-${String(count + 1).padStart(4, "0")}`;
      }
    }

    const validRel = ["SELF", "CUSTOMER", "FAMILY", "COLLEAGUE", "SECURITY", "OFFICE_STAFF", "STORE_MANAGER", "MANAGER", "AGENT", "OTHER"];
    const recipientRelationship = validRel.includes(proofData.recipientRelationship)
      ? proofData.recipientRelationship
      : (proofData.recipientRelationship ? "OTHER" : "CUSTOMER");

    const payload = {
      ...proofData,
      recipientRelationship,
      proofNo,
      recordedBy: user ? user._id : null,
      deliveredAt: proofData.deliveredAt || new Date(),
    };

    return deliveryProofRepository.create(payload);
  }
}

module.exports = DeliveryProofService;
