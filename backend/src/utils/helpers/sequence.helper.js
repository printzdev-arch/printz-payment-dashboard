const mongoose = require("mongoose");
const NumberSequence = require("../../models/common/NumberSequence");

const PREFIX_MAP = Object.freeze({
  EMPLOYEE: "EMP",
  JOB_ORDER: "JO",
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

async function incrementAndGet(sequenceKey, branchId = null, period = null) {
  const key = String(sequenceKey).trim().toUpperCase();
  const bId = branchId
    ? mongoose.Types.ObjectId.isValid(branchId)
      ? new mongoose.Types.ObjectId(branchId)
      : branchId
    : null;
  const p = period ? String(period).trim() : null;

  const filter = {
    sequenceKey: key,
    branchId: bId,
    period: p,
  };

  const update = {
    $inc: { lastValue: 1 },
    $setOnInsert: {
      sequenceKey: key,
      branchId: bId,
      period: p,
    },
  };

  const options = {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  };

  const result = await NumberSequence.findOneAndUpdate(filter, update, options).lean();
  return result.lastValue;
}

async function generateBusinessNumber(sequenceKey, options = {}) {
  const {
    prefix = PREFIX_MAP[sequenceKey.toUpperCase()] || sequenceKey.toUpperCase(),
    padLength = 5,
    branchId = null,
    period = null,
    separator = "-",
  } = options;

  const nextVal = await incrementAndGet(sequenceKey, branchId, period);
  const padded = String(nextVal).padStart(padLength, "0");
  return `${prefix}${separator}${padded}`;
}

async function ensureMinimum(sequenceKey, minimumValue, options = {}) {
  const minVal = Number(minimumValue);
  if (!Number.isFinite(minVal) || minVal < 0) return null;

  const key = String(sequenceKey).trim().toUpperCase();
  const { branchId = null, period = null } = options;
  const bId = branchId
    ? mongoose.Types.ObjectId.isValid(branchId)
      ? new mongoose.Types.ObjectId(branchId)
      : branchId
    : null;
  const p = period ? String(period).trim() : null;

  const filter = {
    sequenceKey: key,
    branchId: bId,
    period: p,
    $or: [{ lastValue: { $lt: minVal } }, { lastValue: { $exists: false } }],
  };

  const updated = await NumberSequence.findOneAndUpdate(
    filter,
    { $set: { lastValue: minVal } },
    { new: true }
  ).lean();

  if (updated) return updated;

  const existing = await NumberSequence.findOne({
    sequenceKey: key,
    branchId: bId,
    period: p,
  }).lean();

  if (existing) return existing;

  try {
    return await NumberSequence.create({
      sequenceKey: key,
      branchId: bId,
      period: p,
      lastValue: minVal,
    });
  } catch (err) {
    if (err.code === 11000) {
      return NumberSequence.findOne({ sequenceKey: key, branchId: bId, period: p }).lean();
    }
    throw err;
  }
}

class SequenceHelper {
  static async next(sequenceKey, options = {}) {
    return generateBusinessNumber(sequenceKey, options);
  }
  static async nextValue(sequenceKey, branchId = null, period = null) {
    return incrementAndGet(sequenceKey, branchId, period);
  }
}

module.exports = {
  PREFIX_MAP,
  incrementAndGet,
  generateBusinessNumber,
  ensureMinimum,
  next: (k, o) => generateBusinessNumber(k, o),
  nextValue: (k, b, p) => incrementAndGet(k, b, p),
  SequenceHelper,
};
