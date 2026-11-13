/**
 * Soft delete for every collection.
 *
 * A record with isDeleted = true is never shown: every find / count / distinct / update / aggregate on a model
 * silently skips it, so every API, dropdown, table and report hides it without each one being changed.
 * Nothing is ever removed from the database; the record stays stored with isDeleted = true.
 *
 *   - A record saved before this existed has no isDeleted field; it counts as "not deleted".
 *   - A query that names isDeleted itself (for example { isDeleted: false }) is left exactly as written.
 *   - Code that must see deleted records (an audit, a restore) asks for them with .setOptions({ includeDeleted: true }).
 *   - Raw driver calls (Model.collection.*, db.collection(...)) bypass this; use utils/softDelete/liveCollection.js for reads.
 */
const mongoose = require("mongoose");

const FILTERED_QUERY_OPS = [
  "find",
  "findOne",
  "findOneAndUpdate",
  "findOneAndDelete",
  "findOneAndReplace",
  "countDocuments",
  "count",
  "distinct",
  "updateOne",
  "updateMany",
  "replaceOne",
  "deleteOne",
  "deleteMany",
];

const NOT_DELETED = { isDeleted: { $ne: true } };

function softDeletePlugin(schema) {
  // Models that already had their own isDeleted flag (invoices, payments) keep it
  if (!schema.path("isDeleted")) {
    schema.add({ isDeleted: { type: Boolean, default: false } });
  }
  // Who deleted it, when, and with which branch (no default, so they take no space until used)
  if (!schema.path("deletedAt")) schema.add({ deletedAt: { type: Date } });
  if (!schema.path("deletedBy")) schema.add({ deletedBy: { type: mongoose.Schema.Types.Mixed } });
  if (!schema.path("deletedWithBranchId")) schema.add({ deletedWithBranchId: { type: mongoose.Schema.Types.Mixed } });

  schema.pre(FILTERED_QUERY_OPS, function hideDeleted() {
    if (this.getOptions && this.getOptions().includeDeleted) return;
    const filter = this.getFilter ? this.getFilter() : null;
    if (filter && Object.prototype.hasOwnProperty.call(filter, "isDeleted")) return;
    this.where(NOT_DELETED);
  });

  schema.pre("aggregate", function hideDeletedInAggregate() {
    if (this.options && this.options.includeDeleted) return;
    this.pipeline().unshift({ $match: NOT_DELETED });
  });
}

/** Register once, before any model is compiled. Sub-documents (items inside an order, ...) are left alone. */
let registered = false;
function registerSoftDelete() {
  if (registered) return;
  registered = true;
  mongoose.plugin(softDeletePlugin, { applyPluginsToChildSchemas: false });
}

module.exports = { softDeletePlugin, registerSoftDelete, NOT_DELETED };
