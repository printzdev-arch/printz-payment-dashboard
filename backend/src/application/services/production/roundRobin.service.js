const roundRobinRepository = require("../../../infrastructure/database/mongoose/repositories/production/MongoRoundRobinRepository");

/**
 * Strict Round Robin Service
 * Implements deterministic pointer progression: A -> B -> C -> A -> B -> C
 * Strictly excludes workload-based balancing.
 * Safe for concurrent requests using atomic counter operations.
 */
class RoundRobinService {
  /**
   * Get eligible employees for a given operation and branch.
   * Filters by active status, branch match, and operational role/permissions.
   */
  static async getEligibleEmployees(branchId, operationCode) {
    const query = {
      isActive: true,
    };

    if (branchId) {
      query.$or = [
        { branchId: branchId },
        { role: "admin" }, // Admins can operate across branches if needed
      ];
    }

    // Fetch users in deterministic sorted order by _id
    const users = await roundRobinRepository.findUsers(query);

    if (!users || users.length === 0) {
      // Fallback to all active users if no branch-specific users
      return roundRobinRepository.findUsers({ isActive: true });
    }

    // Further filter by operation role/team if custom permissions are specified
    const filtered = users.filter((u) => {
      if (u.role === "admin" || u.role === "manager") return true;
      if (u.permissions && u.permissions.production) {
        return u.permissions.production.update !== false;
      }
      return true;
    });

    return filtered.length > 0 ? filtered : users;
  }

  /**
   * Atomically assign the next employee in sequence via strict Round Robin pointer.
   * @param {string|ObjectId} branchId
   * @param {string} operationCode
   * @returns {Promise<Object|null>} The assigned User document
   */
  static async getNextEmployee(branchId, operationCode = "GENERAL") {
    const eligibleEmployees = await this.getEligibleEmployees(branchId, operationCode);

    if (!eligibleEmployees || eligibleEmployees.length === 0) {
      return null;
    }

    const totalEligible = eligibleEmployees.length;
    const pointerKey = `RR_BRANCH_${branchId || "ALL"}_OP_${operationCode}`;

    // Atomically increment the pointer
    const pointer = await roundRobinRepository.incrementPointer(pointerKey);

    // Calculate deterministic circular index (0-indexed modulo total eligible)
    // Decrement by 1 since we already incremented
    const rawIndex = (pointer.currentIndex - 1) % totalEligible;
    const selectedIndex = (rawIndex + totalEligible) % totalEligible;

    const assignedEmployee = eligibleEmployees[selectedIndex];

    // Store the last assigned user id for audit tracking
    await roundRobinRepository.updateLastAssigned(pointerKey, assignedEmployee._id);

    return assignedEmployee;
  }
}

module.exports = RoundRobinService;
