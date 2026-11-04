const mongoose = require("mongoose");
const ErrorHelper = require("../../../utils/ApiError");

const ADMIN_ROLES = ["admin", "super_admin", "superadmin"];
const MANAGER_ROLES = ["manager", "branch_manager", "branch_manager1", "store_manager"];

const roleOf = (user) => String(user?.role || user?.roleCode || "").toLowerCase();

const DesignHelper = {
  isDesignFinished: (status) => {
    return ["ACCEPTED", "COMPLETED", "APPROVED"].includes(status);
  },

  roleOf,

  isAdmin: (user) => ADMIN_ROLES.includes(roleOf(user)),

  isManager: (user) => MANAGER_ROLES.includes(roleOf(user)),

  /** Admin or branch manager: the people who run the design queue and approve proofs. */
  isManagerOrAdmin: (user) => ADMIN_ROLES.includes(roleOf(user)) || MANAGER_ROLES.includes(roleOf(user)),

  /** A designer who is not an admin or manager. */
  isDesigner: (user) => roleOf(user) === "designer",

  /**
   * Branch managers only work on job orders of their own branch (admins see every branch).
   */
  assertBranchAccess(job, user) {
    if (!user || DesignHelper.isAdmin(user)) return;
    if (!DesignHelper.isManager(user)) return;
    const own = user.branchId ? String(user.branchId._id || user.branchId) : null;
    const jobBranch = job?.branchId ? String(job.branchId._id || job.branchId) : null;
    if (own && jobBranch && own !== jobBranch) {
      throw ErrorHelper.forbidden("This job order belongs to another branch.");
    }
  },

  /** Branch to filter lists by: a manager is limited to their own branch, an admin may pick one. */
  scopeBranchId(user, requested = null) {
    if (user && !DesignHelper.isAdmin(user) && DesignHelper.isManager(user) && user.branchId) {
      return String(user.branchId._id || user.branchId);
    }
    return requested ? String(requested) : null;
  },

  /** True when a customer type means "walk-in" (the stored values are written in several ways). */
  isWalkInType(customerType) {
    const type = String(customerType || "WALK_IN").toUpperCase().replace(/[\s-]+/g, "_");
    return type === "WALK_IN" || type === "WALKIN";
  },

  /**
   * A walk-in customer has no portal or approval link: the branch manager shows the proof in person and
   * records the decision. A job with no customer record is treated as walk-in as well.
   */
  async isWalkInCustomer(job) {
    if (!job) return false;
    if (!job.customerId || !mongoose.Types.ObjectId.isValid(String(job.customerId))) return true;
    const Customer = require("../../customers/models/Customer");
    const customer = await Customer.findById(job.customerId).select("customerType").lean();
    if (!customer) return true;
    return DesignHelper.isWalkInType(customer.customerType);
  },

  /** Adds `isWalkInCustomer` to a list of jobs with one customer lookup. */
  async markWalkIn(jobs) {
    const Customer = require("../../customers/models/Customer");
    const ids = [
      ...new Set(
        (jobs || [])
          .map((j) => String(j.customerId?._id || j.customerId || ""))
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
      ),
    ];
    const customers = ids.length ? await Customer.find({ _id: { $in: ids } }).select("customerType").lean() : [];
    const typeById = new Map(customers.map((c) => [String(c._id), c.customerType]));
    for (const j of jobs || []) {
      const id = String(j.customerId?._id || j.customerId || "");
      j.isWalkInCustomer = !typeById.has(id) || DesignHelper.isWalkInType(typeById.get(id));
    }
    return jobs;
  },
};

module.exports = DesignHelper;
