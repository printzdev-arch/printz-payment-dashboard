const numberSequenceRepository = require("../../models/common/NumberSequence");
const ErrorHelper = require("../../utils/ApiError");

const PREFIX_MAP = Object.freeze({
  CUSTOMER: "CUS",
  EMPLOYEE: "EMP",
  JOB_ORDER: "JOB",
  ESTIMATE: "EST",
  INVOICE: "INV",
  APPROVAL: "APR",
  PRODUCT_ORDER: "PO",
  SALE_RECEIPT: "SR",
  REPRINT: "REP",
  STOCK_TRANSFER: "ST",
  STOCK_ADJUSTMENT: "ADJ",
  LEAVE_REQUEST: "LV",
  ATTENDANCE_REGULARIZATION: "REG",
  SALARY_RUN: "SAL",
  SALARY_ADJUSTMENT: "SADJ",
  SALE_RECEIPT_VOID: "VOID",
  PURCHASE_RECEIPT: "PR",
  INVENTORY_TRANSACTION: "TXN",
});

class NumberSequenceService {
  constructor(repository = numberSequenceRepository) {
    this.repository = repository;
  }

  /**
   * Atomically gets the next integer sequence value for a key.
   */
  async getNextNumber(sequenceKey, branchId = null, period = null) {
    if (!sequenceKey) {
      throw ErrorHelper.badRequest("sequenceKey is required");
    }
    const doc = await this.repository.incrementAndGet(sequenceKey, branchId, period);
    return doc.lastValue;
  }

  /**
   * Generates a formatted business number such as "EMP-00001" or "APR-00042".
   *
   * @param {string} sequenceKey - e.g. "EMPLOYEE", "APPROVAL", "JOB_ORDER"
   * @param {Object} [options]
   * @param {string} [options.prefix] - Overrides default prefix
   * @param {number} [options.padLength=5] - Number of padded digits (e.g. 5 -> 00001)
   * @param {string} [options.branchId] - Optional branch scoping
   * @param {string} [options.period] - Optional period (e.g. "2026-10")
   * @param {string} [options.separator="-"] - Separator between prefix and number
   */
  async generateBusinessNumber(sequenceKey, options = {}) {
    const {
      prefix = PREFIX_MAP[sequenceKey.toUpperCase()] || sequenceKey.toUpperCase(),
      padLength = 5,
      branchId = null,
      period = null,
      separator = "-",
    } = options;

    const nextVal = await this.getNextNumber(sequenceKey, branchId, period);
    const padded = String(nextVal).padStart(padLength, "0");
    return `${prefix}${separator}${padded}`;
  }

  /**
   * Helper alias for getNextSequence used by invoice and settlement services.
   */
  async getNextSequence(sequenceKey = "INV", branchId = null, formatPattern = null) {
    const key = (PREFIX_MAP[sequenceKey.toUpperCase()] || sequenceKey).toUpperCase();
    return this.generateBusinessNumber(key, { prefix: key, branchId, padLength: 5 });
  }

  /**
   * Read-only listing of all sequences for admin inspection.
   */
  async listSequences(query = {}, pagination = {}, authContext = {}) {
    return this.repository.findAll(query, pagination);
  }
}

module.exports = new NumberSequenceService();
