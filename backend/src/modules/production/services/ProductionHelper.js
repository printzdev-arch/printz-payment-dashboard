const ErrorHelper = require("../../../utils/errors/ApiError");

const ADMIN_ROLES = ["admin", "super_admin", "superadmin", "owner"];

const ProductionHelper = {
  isOperationFinished: (status) => {
    return ["COMPLETED", "SKIPPED"].includes(status);
  },

  /**
   * A branch user may only work on the production records of their own branch. Another branch's record
   * is reported as "not found" (admins see every branch).
   */
  assertBranchAccess(branchId, user, what = "Production record") {
    if (!user || !user.branchId) return;
    if (ADMIN_ROLES.includes(String(user.role || "").toLowerCase())) return;
    const own = String(user.branchId._id || user.branchId);
    const target = String((branchId && branchId._id) || branchId || "");
    if (target && target !== own) {
      throw ErrorHelper.notFound(`${what} not found.`);
    }
  },
};

module.exports = ProductionHelper;
