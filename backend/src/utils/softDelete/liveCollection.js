/**
 * Read-only wrapper for raw driver collections (db.collection("name")) that skips soft-deleted records, so the
 * dashboards, which read the driver directly, hide a deleted branch's data the same way the models do.
 */
const NOT_DELETED = { isDeleted: { $ne: true } };

const liveCollection = (db, name) => {
  const c = db.collection(name);
  return {
    aggregate: (pipeline = [], options) => c.aggregate([{ $match: NOT_DELETED }, ...pipeline], options),
    countDocuments: (filter = {}, options) => c.countDocuments({ ...filter, ...NOT_DELETED, ...(filter.isDeleted !== undefined ? { isDeleted: filter.isDeleted } : {}) }, options),
    find: (filter = {}, options) => c.find({ ...filter, ...(filter.isDeleted !== undefined ? {} : NOT_DELETED) }, options),
    findOne: (filter = {}, options) => c.findOne({ ...filter, ...(filter.isDeleted !== undefined ? {} : NOT_DELETED) }, options),
    distinct: (field, filter = {}, options) => c.distinct(field, { ...filter, ...(filter.isDeleted !== undefined ? {} : NOT_DELETED) }, options),
  };
};

module.exports = { liveCollection, NOT_DELETED };
