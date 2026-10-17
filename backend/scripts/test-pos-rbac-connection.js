/**
 * Comprehensive POS & RBAC Connection Verification Script
 */
process.env.NODE_ENV = "test";
const assert = require("assert");

console.log("=== Step 1: Verifying File & Module Resolution ===");

// 1. Models
const User = require("../src/models/User");
const Role = require("../src/models/Role");
const Permission = require("../src/models/Permission");
const Branch = require("../src/models/Branch");
const Customer = require("../src/models/Customer");
const Product = require("../src/models/Product");
const NumberSequence = require("../src/models/common/NumberSequence");
const AuditLog = require("../src/models/common/AuditLog");
const SaleReceipt = require("../src/models/pos/SaleReceipt");
const SaleReceiptItem = require("../src/models/pos/SaleReceiptItem");
const Employee = require("../src/models/Employee");
const EmployeeBranchAssignment = require("../src/models/EmployeeBranchAssignment");

assert(User, "User model failed to load");
assert(Role, "Role model failed to load");
assert(Permission, "Permission model failed to load");
assert(Branch, "Branch model failed to load");
assert(Customer, "Customer model failed to load");
assert(Product, "Product model failed to load");
assert(NumberSequence, "NumberSequence model failed to load");
assert(AuditLog, "AuditLog model failed to load");
assert(SaleReceipt, "SaleReceipt model failed to load");
assert(SaleReceiptItem, "SaleReceiptItem model failed to load");
assert(Employee, "Employee model failed to load");
assert(EmployeeBranchAssignment, "EmployeeBranchAssignment model failed to load");
console.log("✔ All Models (including Employee) loaded and compiled successfully.");

// 2. Middleware
const { authenticate, optionalAuthenticate } = require("../src/middleware/auth.middleware");
const { requirePermission, authorizePermission } = require("../src/middleware/permission.middleware");

assert(typeof authenticate === "function", "authenticate middleware not exported");
assert(typeof optionalAuthenticate === "function", "optionalAuthenticate middleware not exported");
assert(typeof requirePermission === "function", "requirePermission middleware not exported");
assert(typeof authorizePermission === "function", "authorizePermission middleware not exported");
console.log("✔ Authentication and RBAC Middleware loaded successfully.");

// 3. Controllers
const roleController = require("../src/controllers/role.controller");
const saleReceiptController = require("../src/controllers/pos/saleReceipt.controller");
const employeeController = require("../src/controllers/employee.controller");

assert(typeof roleController.getRoles === "function", "roleController.getRoles missing");
assert(typeof roleController.getPermissionsCatalogue === "function", "roleController.getPermissionsCatalogue missing");
assert(typeof roleController.createRole === "function", "roleController.createRole missing");

assert(typeof saleReceiptController.calculate === "function", "saleReceiptController.calculate missing");
assert(typeof saleReceiptController.createDraft === "function", "saleReceiptController.createDraft missing");
assert(typeof saleReceiptController.completeSale === "function", "saleReceiptController.completeSale missing");
assert(typeof saleReceiptController.checkout === "function", "saleReceiptController.checkout missing");
assert(typeof saleReceiptController.printReceipt === "function", "saleReceiptController.printReceipt missing");
assert(typeof saleReceiptController.getReceiptReport === "function", "saleReceiptController.getReceiptReport missing");
assert(typeof saleReceiptController.shareReceipt === "function", "saleReceiptController.shareReceipt missing");
assert(typeof saleReceiptController.exportReceipt === "function", "saleReceiptController.exportReceipt missing");

assert(typeof employeeController.getEmployees === "function", "employeeController.getEmployees missing");
assert(typeof employeeController.getEmployeeById === "function", "employeeController.getEmployeeById missing");
assert(typeof employeeController.createEmployee === "function", "employeeController.createEmployee missing");
assert(typeof employeeController.updateEmployee === "function", "employeeController.updateEmployee missing");
assert(typeof employeeController.deactivateEmployee === "function", "employeeController.deactivateEmployee missing");
console.log("✔ Controllers (including Employee) loaded with all required actions.");

// 4. Services
const roleService = require("../src/services/role.service");
const numberSequenceService = require("../src/services/numberSequence.service");
const saleReceiptService = require("../src/services/pos/saleReceipt.service");
const saleReceiptServiceAlias = require("../src/services/saleReceipt.service");
const employeeService = require("../src/services/employee.service");

assert(roleService, "roleService missing");
assert(numberSequenceService, "numberSequenceService missing");
assert(saleReceiptService, "saleReceiptService missing");
assert(saleReceiptServiceAlias === saleReceiptService, "saleReceipt.service alias mismatch");
assert(typeof saleReceiptService.completeReceipt === "function", "completeReceipt alias missing on saleReceiptService");
assert(employeeService, "employeeService missing");
assert(typeof employeeService.createEmployee === "function", "employeeService.createEmployee missing");
assert(typeof employeeService.getEmployees === "function", "employeeService.getEmployees missing");
console.log("✔ Services (including Employee) loaded with all business methods and aliases.");

// 5. Routes
const roleRoutes = require("../src/routes/role.routes");
const saleReceiptRoutes = require("../src/routes/pos/saleReceipt.routes");
const employeeRoutes = require("../src/routes/employee.routes");
const apiRoleRoutes = require("../src/routes/api/role.routes");
const apiPosRoutes = require("../src/routes/api/pos.routes");
const apiEmployeeRoutes = require("../src/routes/api/employee.routes");

assert(roleRoutes, "roleRoutes missing");
assert(saleReceiptRoutes, "saleReceiptRoutes missing");
assert(employeeRoutes, "employeeRoutes missing");
assert(apiRoleRoutes, "api/role.routes missing");
assert(apiPosRoutes, "api/pos.routes missing");
assert(apiEmployeeRoutes, "api/employee.routes missing");
console.log("✔ Routes (including Employee) loaded successfully.");

// 5b. DTOs
const { CreateEmployeeDto, UpdateEmployeeDto, DeactivateEmployeeDto } = require("../src/dto/EmployeeDto");
assert(CreateEmployeeDto, "CreateEmployeeDto missing");
assert(UpdateEmployeeDto, "UpdateEmployeeDto missing");
assert(DeactivateEmployeeDto, "DeactivateEmployeeDto missing");
console.log("✔ Employee DTOs loaded successfully.");

// 6. Utils
const asyncHandler = require("../src/utils/asyncHandler");
const PERMISSIONS = require("../src/utils/constants/permissions");
const AppError = require("../src/utils/errors/AppError");
const ErrorHelper = require("../src/utils/errors/ErrorHelper");
const ScopeHelper = require("../src/utils/helpers/scopeHelper");
const sequenceHelper = require("../src/utils/helpers/sequence.helper");
const SaleReceiptHelper = require("../src/utils/helpers/saleReceipt.helper");
const ResponseHelper = require("../src/utils/response/ResponseHelper");
const whatsAppService = require("../src/utils/WhatsAppService");

assert(asyncHandler, "asyncHandler missing");
assert(PERMISSIONS.POS && PERMISSIONS.ADMIN, "PERMISSIONS constants missing");
assert(AppError, "AppError missing");
assert(ErrorHelper, "ErrorHelper missing");
assert(ScopeHelper, "ScopeHelper missing");
assert(sequenceHelper, "sequenceHelper missing");
assert(SaleReceiptHelper, "SaleReceiptHelper missing");
assert(ResponseHelper, "ResponseHelper missing");
assert(whatsAppService, "whatsAppService missing");
console.log("✔ Utils and Helpers loaded successfully.");

console.log("\n=== Step 2: Verifying Math & Helper Logic ===");
const line1 = SaleReceiptHelper.calculateLineItem({
  quantity: 3,
  unitPrice: 150,
  discount: 50,
  taxRate: 18,
});
assert.strictEqual(line1.baseAmount, 450, "Base amount calculation error");
assert.strictEqual(line1.taxableAmount, 400, "Taxable amount calculation error");
assert.strictEqual(line1.taxAmount, 72, "Tax amount calculation error");
assert.strictEqual(line1.lineTotal, 472, "Line total calculation error");

const totals = SaleReceiptHelper.calculateTotals([line1]);
assert.strictEqual(totals.subtotal, 450, "Subtotal calculation error");
assert.strictEqual(totals.discountAmount, 50, "Discount amount calculation error");
assert.strictEqual(totals.taxAmount, 72, "Tax amount calculation error");
assert.strictEqual(totals.grandTotal, 472, "Grand total calculation error");
console.log("✔ SaleReceiptHelper calculations verified: Subtotal=450, Tax=72, GrandTotal=472.");

console.log("\n=== Step 3: Verifying Express Route Mounting ===");
const app = require("../src/app");
assert(app, "Express app failed to initialize");

// Inspect express route stack
function findRoutes(stack, basePath = "") {
  const routes = [];
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(",").toUpperCase();
      routes.push(`${methods} ${basePath}${layer.route.path}`);
    } else if (layer.name === "router" && layer.handle.stack) {
      const match = layer.regexp.source
        .replace("^\\", "")
        .replace("\\/?(?=\\/|$)", "")
        .replace(/\\\//g, "/")
        .replace(/\^|\$/g, "")
        .replace(/\(\?:\(\[\^\\\/]\+\?\)\)/g, ":id");
      routes.push(...findRoutes(layer.handle.stack, `${basePath}/${match}`.replace(/\/+/g, "/")));
    }
  }
  return routes;
}

const allMountedRoutes = findRoutes(app._router.stack);

const checkEndpoints = [
  "/roles",
  "/sale-receipts",
  "/employees",
];

for (const ep of checkEndpoints) {
  const found = allMountedRoutes.some((r) => r.includes(ep));
  assert(found, `Expected route containing '${ep}' to be mounted`);
  console.log(`✔ Route prefix '${ep}' is actively mounted in Express.`);
}

console.log("\n🎉 ALL CHECKS PASSED: Sales Receipt, RBAC, and Employee modules are fully connected and decoupled!");
process.exit(0);
