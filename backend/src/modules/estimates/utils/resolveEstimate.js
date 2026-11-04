const mongoose = require("mongoose");
const Estimate = require("../models/Estimate");
const JobOrder = require("../../job-orders/models/JobOrder");

/**
 * Find an estimate by its id, or by the job order number (e.g. JOB-20260101-0001).
 * A job order number returns that job's latest estimate version.
 */
const resolveEstimate = async (identifier, { lean = false } = {}) => {
  const id = String(identifier || "").trim();
  if (!id) return null;

  if (mongoose.Types.ObjectId.isValid(id)) {
    const byId = Estimate.findById(id);
    const found = await (lean ? byId.lean() : byId);
    if (found) return found;
  }

  const job = await JobOrder.findOne({ jobNo: id.toUpperCase() }).select("_id").lean();
  if (!job) return null;

  const latest = Estimate.findOne({ jobOrderId: job._id }).sort({ versionNo: -1, createdAt: -1 });
  return lean ? latest.lean() : latest;
};

module.exports = { resolveEstimate };
