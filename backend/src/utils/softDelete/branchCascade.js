/**
 * Soft-delete a branch together with everything that belongs to it.
 *
 * Nothing is removed from the database: the branch and every related record get isDeleted = true (plus who/when and
 * which branch caused it), and from then on every query hides them (see softDeletePlugin.js).
 *
 * What counts as "belonging to the branch" is worked out from the schemas themselves: every model with a branch
 * field (branchId, orderBranchId, primaryBranchId, sourceBranchId, fromBranchId, toBranchId, branchID, or a
 * branchName / branch text field) is included, so a module added later is covered without changing this file.
 * Child tables that only point at a parent (job items, receipt items, ...) are listed in CHILDREN below.
 */
const mongoose = require("mongoose");
const ApiError = require("../errors/ApiError");

const ID_FIELDS = ["branchId", "orderBranchId", "primaryBranchId", "sourceBranchId", "fromBranchId", "toBranchId", "branchID"];
const NAME_FIELDS = ["branchName", "branch"];

// [child model, parent model, field on the child that holds the parent's id]
const CHILDREN = [
  ["JobItem", "JobOrder", "jobOrderId"],
  ["JobFile", "JobOrder", "jobOrderId"],
  ["JobWorkflowEvent", "JobOrder", "jobOrderId"],
  ["JobApproval", "JobOrder", "jobOrderId"],
  ["JobAssignment", "JobOrder", "jobOrderId"],
  ["JobSample", "JobOrder", "jobOrderId"],
  ["DesignApprovalToken", "JobOrder", "jobOrderId"],
  ["EstimateApproval", "Estimate", "estimateId"],
  ["SaleOrderItem", "SaleOrder", "orderId"],
  ["SaleOrderDesign", "SaleOrder", "orderId"],
  ["WhatsappMessage", "SaleOrder", "orderId"],
  ["SaleReceiptItem", "SaleReceipt", "receiptId"],
  ["LoanRepayment", "EmployeeLoan", "employeeLoanId"],
];

// Handled by their own rules, not by the generic branch match
const SPECIAL = new Set(["Branch", "User", "Customer"]);

const ADMIN_ROLES = ["admin", "ADMIN", "SUPER_ADMIN", "super_admin", "INTERNAL_ADMIN"];

const idVariants = (id) => {
  const s = String(id);
  return mongoose.Types.ObjectId.isValid(s) ? [new mongoose.Types.ObjectId(s), s] : [s];
};

const fieldType = (model, path) => {
  const p = model.schema.path(path);
  return p ? p.instance : null;
};

/** The filter that finds a model's records of this branch, or null when the model has no branch field. */
function matchFor(model, branch) {
  const ids = idVariants(branch._id);
  const name = branch.name ? String(branch.name) : null;
  const or = [];
  for (const f of ID_FIELDS) {
    const type = fieldType(model, f);
    if (!type) continue;
    // A real id field only holds ids; a Mixed / String field may hold the id as text or (older data) the branch name
    if (type === "ObjectID" || type === "ObjectId") or.push({ [f]: { $in: ids.filter((v) => typeof v !== "string") } });
    else or.push({ [f]: { $in: name ? [...ids, name] : ids } });
  }
  if (name) {
    for (const f of NAME_FIELDS) {
      if (fieldType(model, f) === "String") or.push({ [f]: name });
    }
  }
  if (or.length === 0) return null;
  let filter = or.length === 1 ? or[0] : { $or: or };
  // A date request that applies to every branch is not this branch's
  if (model.schema.path("appliesToAllBranches")) filter = { $and: [filter, { appliesToAllBranches: { $ne: true } }] };
  return filter;
}

function customerMatch(branch) {
  const ids = idVariants(branch._id);
  // A customer who also visited another branch belongs to the company, not to this branch, and stays
  return {
    $and: [
      { $or: [{ branchId: { $in: ids } }, { primaryBranchId: { $in: ids } }] },
      { visitedBranches: { $not: { $elemMatch: { $nin: ids } } } },
    ],
  };
}

function userMatch(branch, actorId) {
  const ids = idVariants(branch._id);
  const filter = {
    $and: [
      { $or: [{ branchId: { $in: ids } }, { branchIds: { $in: ids } }, ...(branch.name ? [{ branch: branch.name }] : [])] },
      { branchIds: { $not: { $elemMatch: { $nin: ids } } } }, // not assigned to any other branch too
      { role: { $nin: ADMIN_ROLES } }, // an admin is never removed with a branch
    ],
  };
  if (actorId && mongoose.Types.ObjectId.isValid(String(actorId))) filter.$and.push({ _id: { $ne: new mongoose.Types.ObjectId(String(actorId)) } });
  return filter;
}

/**
 * @returns {Promise<{ branchId, branchName, total, collections: Record<string, number> }>}
 */
async function softDeleteBranch(branchId, actor = {}) {
  const Branch = mongoose.model("Branch");
  if (!branchId || !mongoose.Types.ObjectId.isValid(String(branchId))) throw ApiError.badRequest("Invalid branch ID format.");

  const branch = await Branch.findById(branchId).lean(); // an already-deleted branch is hidden, so it is "not found"
  if (!branch) throw ApiError.notFound("Branch not found.");

  // A manufacturing unit that other branches still send their orders to cannot be removed under them
  if (String(branch.branchType || "").toLowerCase() === "manufacturing") {
    const dependants = await Branch.countDocuments({ manufacturingUnitId: branch._id, _id: { $ne: branch._id } });
    if (dependants > 0) {
      throw ApiError.conflict(
        `This is the manufacturing unit for ${dependants} branch(es). Point those branches to another unit (or delete them) before deleting it.`
      );
    }
    const SaleOrder = mongoose.models.SaleOrder;
    if (SaleOrder) {
      const open = await SaleOrder.countDocuments({ manufacturingUnitId: branch._id, orderBranchId: { $ne: branch._id } });
      if (open > 0) throw ApiError.conflict(`${open} sale order(s) from other branches are produced at this unit. Move them before deleting it.`);
    }
  }

  const stamp = {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: actor.id || actor._id || null,
    deletedWithBranchId: branch._id,
  };
  const live = { isDeleted: { $ne: true } };
  const summary = {};
  const add = (name, n) => { if (n) summary[name] = (summary[name] || 0) + n; };

  const session = await startSessionIfSupported();
  const opts = session ? { session } : {};
  const run = async () => {
    // 1. Parents first: remember their ids so the child rows can follow them
    const parentIds = {};
    for (const [, parent] of CHILDREN) {
      if (parentIds[parent]) continue;
      const model = mongoose.models[parent];
      const match = model && matchFor(model, branch);
      parentIds[parent] = match ? await model.collection.distinct("_id", { ...match, ...live }, opts) : [];
    }
    // 2. Child rows of those parents
    for (const [child, parent, field] of CHILDREN) {
      const model = mongoose.models[child];
      const ids = parentIds[parent];
      if (!model || !ids || ids.length === 0) continue;
      const r = await model.collection.updateMany({ [field]: { $in: ids }, ...live }, { $set: stamp }, opts);
      add(model.collection.collectionName, r.modifiedCount);
    }
    // 3. Every model that has a branch field
    for (const name of mongoose.modelNames()) {
      if (SPECIAL.has(name)) continue;
      const model = mongoose.models[name];
      const match = matchFor(model, branch);
      if (!match) continue;
      const r = await model.collection.updateMany({ $and: [match, live] }, { $set: stamp }, opts);
      add(model.collection.collectionName, r.modifiedCount);
    }
    // 4. Customers who only ever belonged to this branch, and users assigned only to it
    const cust = mongoose.models.Customer;
    if (cust) add(cust.collection.collectionName, (await cust.collection.updateMany({ $and: [customerMatch(branch), live] }, { $set: stamp }, opts)).modifiedCount);
    const usr = mongoose.models.User;
    if (usr) add(usr.collection.collectionName, (await usr.collection.updateMany({ $and: [userMatch(branch, stamp.deletedBy), live] }, { $set: stamp }, opts)).modifiedCount);
    // 5. The branch itself, last: if anything above failed the branch is still listed and the delete can simply be repeated
    await Branch.collection.updateOne({ _id: branch._id }, { $set: stamp }, opts);
    add(Branch.collection.collectionName, 1);
  };

  try {
    if (session) await session.withTransaction(run);
    else await run();
  } finally {
    if (session) await session.endSession();
  }

  return {
    branchId: String(branch._id),
    branchName: branch.name,
    total: Object.values(summary).reduce((a, b) => a + b, 0),
    collections: summary,
  };
}

async function startSessionIfSupported() {
  try {
    const client = mongoose.connection.client;
    const isReplicaSet = Boolean(client && client.topology && client.topology.description && client.topology.description.servers && client.topology.description.servers.size > 1);
    return isReplicaSet ? await mongoose.startSession() : null;
  } catch (e) {
    return null;
  }
}

module.exports = { softDeleteBranch, matchFor, CHILDREN };
