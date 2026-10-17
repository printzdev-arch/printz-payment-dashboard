require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");
const Role = require(path.join(__dirname, "../src/models/Role"));
const Permission = require(path.join(__dirname, "../src/models/Permission"));

async function seed() {
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/printz";

  console.log("Connecting to MongoDB for RBAC seed...");
  await mongoose.connect(mongoUri);

  // 1. Create standard permissions
  const perms = [
    { code: "pos.saleReceipt.create", module: "POS", description: "Create draft receipts & complete billing" },
    { code: "pos.saleReceipt.view", module: "POS", description: "View sale receipts & reports" },
    { code: "pos.saleReceipt.void", module: "POS", description: "Void completed sale receipts" },
    { code: "pos.saleReceipt.priceOverride", module: "POS", description: "Override standard product rates" },
    { code: "admin.role.view", module: "ADMIN", description: "View roles and permissions catalogue" },
    { code: "admin.role.manage", module: "ADMIN", description: "Create and update system roles" },
    { code: "admin.employee.view", module: "ADMIN", description: "View employee profiles" },
    { code: "admin.employee.create", module: "ADMIN", description: "Create/onboard new employees" },
    { code: "admin.employee.update", module: "ADMIN", description: "Update employee details & branches" },
    { code: "admin.employee.deactivate", module: "ADMIN", description: "Deactivate/offboard employees" },
  ];

  for (const perm of perms) {
    await Permission.findOneAndUpdate(
      { code: perm.code },
      { $setOnInsert: perm },
      { upsert: true, new: true }
    );
  }

  // 2. Create Super Admin Role (Bypasses all checks, full ALL scope)
  await Role.findOneAndUpdate(
    { code: "SUPER_ADMIN" },
    {
      code: "SUPER_ADMIN",
      name: "Super Administrator",
      description: "Full system administration with unrestricted access",
      isSystem: true,
      grants: [
        { permissionCode: "CAN_MANAGE_ALL", scope: "ALL" },
        { permissionCode: "pos.saleReceipt.create", scope: "ALL" },
        { permissionCode: "pos.saleReceipt.view", scope: "ALL" },
        { permissionCode: "pos.saleReceipt.void", scope: "ALL" },
        { permissionCode: "pos.saleReceipt.priceOverride", scope: "ALL" },
        { permissionCode: "admin.role.view", scope: "ALL" },
        { permissionCode: "admin.role.manage", scope: "ALL" },
        { permissionCode: "admin.employee.view", scope: "ALL" },
        { permissionCode: "admin.employee.create", scope: "ALL" },
        { permissionCode: "admin.employee.update", scope: "ALL" },
        { permissionCode: "admin.employee.deactivate", scope: "ALL" },
      ],
      isActive: true,
    },
    { upsert: true }
  );

  // 3. Create Cashier Role
  await Role.findOneAndUpdate(
    { code: "CASHIER" },
    {
      code: "CASHIER",
      name: "Cashier",
      description: "POS counter billing, receipt creation, and payments",
      grants: [
        { permissionCode: "pos.saleReceipt.create", scope: "ALL" },
        { permissionCode: "pos.saleReceipt.view", scope: "ALL" },
      ],
      isActive: true,
    },
    { upsert: true }
  );

  console.log("RBAC seeded successfully: Permissions, SUPER_ADMIN, and CASHIER configured.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("RBAC seed failed:", err.message);
  process.exit(1);
});
