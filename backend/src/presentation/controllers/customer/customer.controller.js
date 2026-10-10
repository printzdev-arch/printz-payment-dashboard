const customerService = require("../../../application/services/customer/customer.service");
const { asyncHandler, ResponseHelper } = require("../../../shared");

function extractAuthContext(req) {
  const userBranches = req.user?.branchIds && req.user.branchIds.length > 0
    ? req.user.branchIds
    : req.user?.branchId ? [req.user.branchId] : [];

  const authorizedBranchIds =
    req.authz?.userBranchIds ||
    req.authz?.authorizedBranches ||
    req.authz?.authorizedBranchIds ||
    req.authorizedBranchIds ||
    userBranches ||
    [];

  return {
    user: req.user,
    scopes: req.authz?.scopes || [],
    authorizedBranchIds: authorizedBranchIds.map((b) => (b && b._id ? b._id.toString() : b.toString())),
    isSuperAdmin: Boolean(
      req.authz?.isSuperAdmin ||
      req.user?.role === "admin" ||
      req.user?.role === "SUPER_ADMIN" ||
      req.user?.roleCode === "ADMIN" ||
      req.user?.roleCode === "SUPER_ADMIN"
    ),
  };
}

const getCustomers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, customerType, isActive, branchId, q } = req.query;
  const filters = { customerType, isActive, branchId, q };
  const pagination = { page: Number(page), limit: Number(limit) };
  const authContext = extractAuthContext(req);

  const result = await customerService.getCustomers(filters, pagination, authContext);
  return ResponseHelper.success(res, result.data, "Customers retrieved successfully", 200, result.meta);
});

const searchCustomers = asyncHandler(async (req, res) => {
  const { q = "", limit = 10 } = req.query;
  const authContext = extractAuthContext(req);
  const customers = await customerService.searchCustomers(q, limit, authContext);
  return ResponseHelper.success(res, customers, "Customer search completed");
});

const getCustomerById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const customer = await customerService.getCustomerById(id, authContext);
  return ResponseHelper.success(res, customer, "Customer details retrieved successfully");
});

const createCustomer = asyncHandler(async (req, res) => {
  const authContext = extractAuthContext(req);
  const customer = await customerService.createCustomer(req.body, authContext);
  return ResponseHelper.success(res, customer, "Customer created successfully", 201);
});

const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const customer = await customerService.updateCustomer(id, req.body, authContext);
  return ResponseHelper.success(res, customer, "Customer updated successfully");
});

const deactivateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const customer = await customerService.deactivateCustomer(id, authContext);
  return ResponseHelper.success(res, customer, "Customer deactivated successfully");
});

const activateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const customer = await customerService.activateCustomer(id, authContext);
  return ResponseHelper.success(res, customer, "Customer activated successfully");
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authContext = extractAuthContext(req);
  const result = await customerService.deleteCustomer(id, authContext);
  return ResponseHelper.success(res, result, "Customer deleted successfully");
});

module.exports = {
  getCustomers,
  searchCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deactivateCustomer,
  activateCustomer,
  deleteCustomer,
};
