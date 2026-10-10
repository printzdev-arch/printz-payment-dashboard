const mongoose = require("mongoose");
const Customer = require("../models/customer/Customer");

/**
 * Ensure customer indexes and unique constraints safely.
 * Checks for existing conflicts before applying uniqueness constraints.
 */
async function ensureCustomerIndexes() {
  const collection = Customer.collection;
  const existingIndexes = await collection.indexes();

  // 1. Check existing duplicates for mobile
  const duplicateMobiles = await collection
    .aggregate([
      { $match: { mobile: { $ne: null, $exists: true } } },
      { $group: { _id: "$mobile", count: { $sum: 1 }, ids: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  if (duplicateMobiles.length > 0) {
    for (const dup of duplicateMobiles) {
      // Keep the primary/earliest document, remove redundant duplicate records
      const idsToRemove = dup.ids.slice(1);
      await collection.deleteMany({ _id: { $in: idsToRemove } });
    }
  }

  // 2. Check if mobile_1 index exists and if it is non-unique
  const mobileIdx = existingIndexes.find((idx) => idx.name === "mobile_1");
  if (mobileIdx && !mobileIdx.unique) {
    try {
      await collection.dropIndex("mobile_1");
    } catch (_) {}
    await collection.createIndex({ mobile: 1 }, { unique: true, sparse: true, background: true });
  } else if (!mobileIdx) {
    await collection.createIndex({ mobile: 1 }, { unique: true, sparse: true, background: true });
  }

  // 3. Ensure other indexes only if they don't already exist
  const existingNames = new Set(existingIndexes.map((idx) => idx.name));
  if (!existingNames.has("company_1")) {
    await collection.createIndex({ company: 1 }, { background: true }).catch(() => {});
  }
  if (!existingNames.has("visitedBranches_1")) {
    await collection.createIndex({ visitedBranches: 1 }, { background: true }).catch(() => {});
  }

  return { success: true };
}

module.exports = ensureCustomerIndexes;
