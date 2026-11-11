/**
 * Which branch is the manufacturing unit.
 *
 * The unit is the branch flagged branchType "manufacturing" (the same flag the sale-order flow routes orders by).
 * The shop's unit is the branch named "backend"; it is also recognised by that name, in case the flag was never
 * set on it. Everyone whose employee record is at the unit gets the same unit portal and works the same orders.
 */
const UNIT_BRANCH_TYPE = "manufacturing";
const UNIT_BRANCH_NAME = "backend";

const isManufacturingUnitBranch = (branch) => {
  if (!branch || typeof branch !== "object") return false;
  if (String(branch.branchType || "").trim().toLowerCase() === UNIT_BRANCH_TYPE) return true;
  return String(branch.name || "").trim().toLowerCase() === UNIT_BRANCH_NAME;
};

module.exports = { isManufacturingUnitBranch, UNIT_BRANCH_TYPE, UNIT_BRANCH_NAME };
