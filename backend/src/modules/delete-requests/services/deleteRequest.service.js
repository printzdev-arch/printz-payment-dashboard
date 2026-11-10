const mongoose = require("mongoose");
const DeleteRequest = require("../models/DeleteRequest");
const REGISTRY = require("../registry");
const ApiError = require("../../../utils/errors/ApiError");

const idText = (v) => (v && typeof v === "object" ? String(v._id || v.id || "") : String(v || ""));

/** Admin and Super Admin delete directly; everyone else sends a request. */
const isAdminUser = (user = {}) => {
  const role = String(user.role || "").toLowerCase();
  const code = String(user.roleCode || "").toLowerCase();
  return ["admin", "super_admin", "superadmin"].includes(role) || ["admin", "super_admin", "internal_admin"].includes(code);
};

class DeleteRequestService {
  /** Resource types a request can be made for, as [{ key, label }]. */
  getTypes() {
    return Object.entries(REGISTRY).map(([key, v]) => ({ key, label: v.label }));
  }

  async createRequest({ resourceType, resourceId, reason }, user) {
    const entry = REGISTRY[resourceType];
    if (!entry) throw ApiError.badRequest("This kind of record cannot be requested for deletion.");

    const why = String(reason || "").trim();
    if (why.length < 5) throw ApiError.validation("A reason of at least 5 characters is required to request a delete.");

    if (!resourceId || (!mongoose.Types.ObjectId.isValid(String(resourceId)) && typeof resourceId !== "string")) {
      throw ApiError.badRequest("Invalid record ID.");
    }
    const doc = await entry.load(resourceId);
    if (!doc) throw ApiError.notFound(`${entry.label} not found.`);

    const already = await DeleteRequest.findOne({
      resourceType,
      resourceId: String(resourceId),
      status: { $in: ["PENDING", "PROCESSING"] },
    }).lean();
    if (already) throw ApiError.conflict("A delete request for this record is already waiting for an admin.");

    const branch = entry.branchOf(doc) || {};
    return DeleteRequest.create({
      resourceType,
      resourceId: String(resourceId),
      resourceLabel: entry.describe(doc),
      branchId: branch.id || null,
      branchName: branch.name || "",
      reason: why,
      requestedBy: idText(user._id || user.id),
      requestedByName: user.name || user.email || "",
    });
  }

  /** Admins see every request; everyone else sees only their own. */
  async list({ status, resourceType, page = 1, limit = 20 } = {}, user) {
    const q = {};
    if (status) q.status = status;
    if (resourceType) q.resourceType = resourceType;
    if (!isAdminUser(user)) q.requestedBy = idText(user._id || user.id);

    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const [items, total, pending] = await Promise.all([
      DeleteRequest.find(q).sort({ requestedAt: -1 }).skip((p - 1) * l).limit(l).lean(),
      DeleteRequest.countDocuments(q),
      DeleteRequest.countDocuments({ ...q, status: "PENDING" }),
    ]);
    const labels = Object.fromEntries(Object.entries(REGISTRY).map(([k, v]) => [k, v.label]));
    return {
      items: items.map((r) => ({ ...r, resourceTypeLabel: labels[r.resourceType] || r.resourceType })),
      total,
      pending,
      page: p,
      pages: Math.max(1, Math.ceil(total / l)),
    };
  }

  /** Approve (deletes the record) or reject. Admin only. */
  async decide(id, { approve, note = "" }, user, authz = {}) {
    if (!isAdminUser(user)) throw ApiError.forbidden("Only an admin can approve or reject a delete request.");
    if (!mongoose.Types.ObjectId.isValid(String(id))) throw ApiError.badRequest("Invalid request ID.");

    const decidedBy = idText(user._id || user.id);
    const decidedByName = user.name || user.email || "";
    const noteText = String(note || "").trim();

    if (!approve) {
      const rejected = await DeleteRequest.findOneAndUpdate(
        { _id: id, status: "PENDING" },
        { $set: { status: "REJECTED", decidedBy, decidedByName, decidedAt: new Date(), decisionNote: noteText } },
        { new: true }
      ).lean();
      if (!rejected) throw ApiError.conflict("This request is no longer waiting for a decision.");
      return rejected;
    }

    // Claim it first so two admins cannot approve the same request at once
    const claimed = await DeleteRequest.findOneAndUpdate({ _id: id, status: "PENDING" }, { $set: { status: "PROCESSING" } }, { new: true });
    if (!claimed) throw ApiError.conflict("This request is no longer waiting for a decision.");

    const entry = REGISTRY[claimed.resourceType];
    try {
      if (!entry) throw new Error("This kind of record is no longer supported.");
      await entry.perform(claimed.resourceId, { user, authz });
    } catch (err) {
      // Already gone counts as done; any other failure puts the request back so it can be tried again
      const alreadyGone = err && (err.statusCode === 404 || /not found/i.test(err.message || ""));
      if (!alreadyGone) {
        claimed.status = "PENDING";
        claimed.executionError = err.message || "The record could not be deleted.";
        await claimed.save();
        throw ApiError.conflict(`The record could not be deleted: ${claimed.executionError}`);
      }
    }

    claimed.status = "APPROVED";
    claimed.decidedBy = decidedBy;
    claimed.decidedByName = decidedByName;
    claimed.decidedAt = new Date();
    claimed.decisionNote = noteText;
    claimed.executionError = "";
    await claimed.save();
    return claimed.toObject();
  }

  /** The person who asked may withdraw a request that is still waiting. */
  async cancel(id, user) {
    if (!mongoose.Types.ObjectId.isValid(String(id))) throw ApiError.badRequest("Invalid request ID.");
    const filter = { _id: id, status: "PENDING" };
    if (!isAdminUser(user)) filter.requestedBy = idText(user._id || user.id);
    const cancelled = await DeleteRequest.findOneAndUpdate(filter, { $set: { status: "CANCELLED", decidedAt: new Date() } }, { new: true }).lean();
    if (!cancelled) throw ApiError.conflict("This request cannot be withdrawn.");
    return cancelled;
  }
}

module.exports = new DeleteRequestService();
module.exports.isAdminUser = isAdminUser;
