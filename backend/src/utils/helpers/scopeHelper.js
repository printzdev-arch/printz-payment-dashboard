const mongoose = require("mongoose");

/**
 * Scope Helper Utility
 * Implements fail-closed multi-role UNION scope resolution.
 */
class ScopeHelper {
  /**
   * Builds a MongoDB query filter enforcing authorization scopes.
   *
   * @param {Object} user - The authenticated user document
   * @param {Array<Object>} grants - Array of matched grants for the requested permission { scope, operationCodes }
   * @param {Object} entityConfig - Configuration of entity field names
   * @param {string} [entityConfig.branchField='branchId']
   * @param {string} [entityConfig.selfField='_id']
   * @param {string} [entityConfig.assignedField]
   * @returns {Object} MongoDB query filter object
   */
  static buildScopeFilter(user, grants = [], entityConfig = {}) {
    const FAIL_CLOSED = { _id: { $exists: false } };

    if (!user || !grants || !Array.isArray(grants) || grants.length === 0) {
      return FAIL_CLOSED;
    }

    const branchField = entityConfig.branchField || "branchId";
    const selfField = entityConfig.selfField || "_id";
    const assignedField = entityConfig.assignedField || null;

    const scopes = new Set(grants.map((g) => (g.scope || "").toUpperCase()));

    // 1. 'ALL' Scope: Global access outright
    if (scopes.has("ALL")) {
      return {};
    }

    const orConditions = [];

    // 2. 'BRANCH' Scope: User's assigned branch IDs
    if (scopes.has("BRANCH")) {
      const userBranchIds = (user.branchIds || [])
        .map((b) => (b._id ? b._id.toString() : b.toString()))
        .filter(Boolean);

      if (user.branchId) {
        const singleBranch = user.branchId._id
          ? user.branchId._id.toString()
          : user.branchId.toString();
        if (!userBranchIds.includes(singleBranch)) {
          userBranchIds.push(singleBranch);
        }
      }

      if (userBranchIds.length > 0) {
        const objectIds = userBranchIds
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id));

        orConditions.push({
          [branchField]: {
            $in: [...userBranchIds, ...objectIds],
          },
        });
      } else {
        // User has BRANCH scope grant but 0 authorized branches -> fail closed for this condition
        orConditions.push({ [branchField]: { $in: [] } });
      }
    }

    // 3. 'SELF' Scope: Belongs directly to user's employeeId
    if (scopes.has("SELF")) {
      const selfId = user.employeeId
        ? (user.employeeId._id ? user.employeeId._id.toString() : user.employeeId.toString())
        : null;

      if (selfId) {
        const isObjId = mongoose.Types.ObjectId.isValid(selfId);
        orConditions.push({
          [selfField]: isObjId
            ? { $in: [selfId, new mongoose.Types.ObjectId(selfId)] }
            : selfId,
        });
      } else {
        // employeeId is null with SELF scope -> fail closed
        orConditions.push({ [selfField]: { $exists: false } });
      }
    }

    // 4. 'ASSIGNED' Scope: Explicitly assigned to user or user's employee
    if (scopes.has("ASSIGNED")) {
      if (!assignedField) {
        // Missing entityConfig for ASSIGNED scope -> fail closed
        return FAIL_CLOSED;
      }

      const assignedTargetId = user.employeeId
        ? (user.employeeId._id ? user.employeeId._id.toString() : user.employeeId.toString())
        : (user._id ? user._id.toString() : null);

      if (assignedTargetId) {
        const isObjId = mongoose.Types.ObjectId.isValid(assignedTargetId);
        orConditions.push({
          [assignedField]: isObjId
            ? { $in: [assignedTargetId, new mongoose.Types.ObjectId(assignedTargetId)] }
            : assignedTargetId,
        });
      } else {
        orConditions.push({ [assignedField]: { $exists: false } });
      }
    }

    // Check for any invalid/unknown scopes
    const validScopes = ["ALL", "BRANCH", "SELF", "ASSIGNED"];
    for (const s of scopes) {
      if (!validScopes.includes(s)) {
        return FAIL_CLOSED;
      }
    }

    if (orConditions.length === 0) {
      return FAIL_CLOSED;
    }

    if (orConditions.length === 1) {
      return orConditions[0];
    }

    return { $or: orConditions };
  }

  /**
   * Safely combines a server-enforced scope filter with client-supplied filters.
   * Client filter is always AND-ed with the scope filter, never replacing it.
   */
  static combineFilters(scopeFilter, clientFilter = {}) {
    if (!scopeFilter || Object.keys(scopeFilter).length === 0) {
      return clientFilter || {};
    }
    if (!clientFilter || Object.keys(clientFilter).length === 0) {
      return scopeFilter;
    }

    return {
      $and: [scopeFilter, clientFilter],
    };
  }
}

module.exports = ScopeHelper;
