const numberSequenceService = require("../../number-sequences/services/numberSequence.service");

/**
 * Invoice and payment numbers must be unique across all branches (the database enforces it), so they come
 * from one shared counter instead of one counter per branch. A number that already exists (from numbers
 * issued earlier) is skipped.
 */
const nextUniqueNumber = async (sequenceKey, Model, field) => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const candidate = await numberSequenceService.getNextSequence(sequenceKey, null);
    const taken = await Model.exists({ [field]: candidate });
    if (!taken) return candidate;
  }
  throw new Error(`Could not generate a free ${sequenceKey} number.`);
};

const nextInvoiceNumber = () => nextUniqueNumber("INV", require("../models/Invoice"), "invoiceNumber");
const nextPaymentNo = () => nextUniqueNumber("PAY", require("../models/Payment"), "paymentNo");
const nextDeliveryNo = () => nextUniqueNumber("DO", require("../../delivery/models/DeliveryOrder"), "deliveryNo");

module.exports = { nextInvoiceNumber, nextPaymentNo, nextDeliveryNo };
