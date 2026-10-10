/**
 * PrintZ Data Adapter & Normalization Utilities
 * Bridges compatibility between Frontend Mock Data and MongoDB Atlas production database schema.
 */

/**
 * Safely extracts document ID handling both MongoDB '_id' (string or ObjectId) and client 'id'
 * @param {Object} doc - Document object
 * @returns {string}
 */
export const normalizeId = (doc) => {
  if (!doc) return "";
  if (typeof doc === "string") return doc;
  const id = doc.id || doc._id || doc.uuid || "";
  return typeof id === "object" && id !== null ? (id.$oid || id.toString()) : String(id);
};

/**
 * Safe date formatter handling ISODate, Unix timestamps, and string dates
 * @param {string|number|Date} dateValue
 * @param {Object} [options]
 * @returns {string}
 */
export const formatDate = (dateValue, options = {}) => {
  if (!dateValue) return options.fallback || "-";

  const d = new Date(dateValue);
  if (isNaN(d.getTime())) {
    return String(dateValue);
  }

  const defaultOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options
  };

  return d.toLocaleDateString("en-IN", defaultOptions);
};

/**
 * Safe datetime formatter
 * @param {string|number|Date} dateValue
 * @returns {string}
 */
export const formatDateTime = (dateValue) => {
  if (!dateValue) return "-";
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return String(dateValue);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};

/**
 * Normalizes Branch records (harmonizes Atlas 'name/code' with Sample 'branchName/branchCode')
 * @param {Object} branch
 * @returns {Object}
 */
export const normalizeBranch = (branch) => {
  if (!branch) return null;

  const id = normalizeId(branch);
  const name = branch.name || branch.branchName || "Unnamed Branch";
  const code = branch.code || branch.branchCode || "";

  let addressStr = "";
  if (typeof branch.address === "string") {
    addressStr = branch.address;
  } else if (branch.address && typeof branch.address === "object") {
    const parts = [
      branch.address.line1 || branch.address.street,
      branch.address.city,
      branch.address.state,
      branch.address.pincode
    ].filter(Boolean);
    addressStr = parts.join(", ");
  }

  return {
    ...branch,
    _id: id,
    id: id,
    branchId: id,
    name,
    branchName: name,
    code,
    branchCode: code,
    address: addressStr,
    phone: branch.phone || branch.mobile || "",
    email: branch.email || "",
    isMainBranch: branch.isMainBranch ?? (branch.branchType === "MAIN" || branch.branchType === "HEAD_OFFICE"),
    status: branch.status || (branch.isActive !== false ? "Active" : "Inactive"),
    isActive: branch.isActive !== false && branch.status !== "Inactive"
  };
};

/**
 * Normalizes User profile objects
 * Supports both single role/branch and MongoDB Atlas arrays (roleIds, branchIds, grants)
 * @param {Object} user
 * @returns {Object}
 */
export const normalizeUser = (user) => {
  if (!user) return null;

  const id = normalizeId(user);
  const roleName = user.role || user.roleName || (user.roleIds && user.roleIds[0]) || "staff";
  const branchId = user.branchId || (user.branchIds && user.branchIds[0]) || null;
  const branchIds = user.branchIds || (user.branchId ? [user.branchId] : []);

  // Consolidate permissions & grants
  let permissions = user.permissions || {};
  if (Array.isArray(user.permissions)) {
    const permMap = {};
    user.permissions.forEach(p => { permMap[p] = true; });
    permissions = permMap;
  }

  const grants = Array.isArray(user.grants) ? user.grants : Object.keys(permissions);

  // Default admin capability bypass
  if (roleName.toLowerCase() === "admin" || roleName.toUpperCase() === "SUPER_ADMIN") {
    permissions = {
      isDashboardCapability: true,
      isPrinterCapability: true,
      isStockCapability: true,
      isRevenueCapability: true,
      isAddAdmin: true,
      isAddManager: true,
      isExtraCapability: true,
      all: true,
      ...permissions
    };
  }

  return {
    ...user,
    _id: id,
    id: id,
    uid: id,
    name: user.name || user.fullName || user.username || "User",
    email: user.email || "",
    role: roleName,
    roleName: roleName,
    branchId: branchId,
    branchIds: branchIds,
    branchName: user.branchName || user.branch || "",
    permissions,
    grants,
    profilePicUrl: user.profilePicUrl || null
  };
};

/**
 * Helper to check permissions across both Sample (permissions map) and Atlas (grants array)
 * @param {Object} user
 * @param {string} permissionKey
 * @returns {boolean}
 */
export const hasPermission = (user, permissionKey) => {
  if (!user) return false;
  if (user.role === "admin" || user.role === "SUPER_ADMIN" || user.permissions?.all) return true;

  if (user.permissions && user.permissions[permissionKey] === true) return true;
  if (Array.isArray(user.grants) && user.grants.includes(permissionKey)) return true;

  return false;
};

/**
 * Normalizes Sale and Receipt records (combines flat mock and relational Atlas models)
 * @param {Object} sale
 * @returns {Object}
 */
export const normalizeSale = (sale) => {
  if (!sale) return null;

  const id = normalizeId(sale);
  const items = sale.items || sale.itemsSold || [];
  const saleNo = sale.saleNo || sale.invoiceNo || sale.receiptNo || `SALE-${id}`;
  const totalAmount = sale.grandTotal ?? sale.totalAmount ?? sale.amountPaid ?? 0;
  const taxAmount = sale.taxAmount ?? sale.gst ?? 0;

  return {
    ...sale,
    _id: id,
    id: id,
    saleId: id,
    saleNo,
    items,
    totalAmount,
    grandTotal: totalAmount,
    taxAmount,
    status: sale.status || "COMPLETED",
    paymentMethod: sale.paymentMethod || "CASH",
    isWalkIn: sale.isWalkIn ?? !sale.customerId
  };
};

/**
 * Normalizes Stock and Day-End Reading entries
 * @param {Object} reading
 * @returns {Object}
 */
export const normalizeStockReading = (reading) => {
  if (!reading) return null;

  const id = normalizeId(reading);
  const isLocked = Boolean(reading.isLocked || reading.isFinalSubmitted);

  return {
    ...reading,
    _id: id,
    id: id,
    isLocked,
    isFinalSubmitted: isLocked,
    totalAmount: reading.totalAmount ?? 0,
    items: reading.items || reading.stocks || []
  };
};
