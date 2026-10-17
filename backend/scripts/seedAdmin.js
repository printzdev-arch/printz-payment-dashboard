const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const connectDB = require("../src/config/database");
const User = require("../src/models/User");
const Role = require("../src/models/Role");

async function seedAdmin() {
  await connectDB();
  console.log(" Connected to MongoDB");

  // Keep only ADMIN role
  await Role.deleteMany({ code: { $ne: "ADMIN" } });
  let adminRole = await Role.findOne({ code: "ADMIN" });
  if (!adminRole) {
    adminRole = await Role.create({
      code: "ADMIN",
      name: "Admin",
      description: "System Administrator",
      isSystem: true,
      isActive: true,
      grants: [{ permissionCode: "CAN_MANAGE_ALL", scope: "ALL" }],
    });
    console.log(" Created ADMIN role:", adminRole._id);
  } else {
    console.log(" Found existing ADMIN role:", adminRole._id);
  }

  // Remove other seed users
  await User.deleteMany({ email: { $ne: "admin@gmail.com" } });

  let adminUser = await User.findOne({ email: "admin@gmail.com" });
  if (adminUser) {
    adminUser.name = "Admin";
    adminUser.username = "admin@gmail.com";
    adminUser.password = "123456"; // pre-save hook will hash this automatically
    adminUser.role = "admin";
    adminUser.roleCode = "ADMIN";
    adminUser.roleIds = [adminRole._id];
    adminUser.status = "ACTIVE";
    adminUser.isActive = true;
    adminUser.failedLoginAttempts = 0;
    adminUser.lockoutEnd = null;
    await adminUser.save();
    console.log(" Updated admin user:", adminUser.username);
  } else {
    adminUser = await User.create({
      name: "Admin",
      username: "admin@gmail.com",
      email: "admin@gmail.com",
      password: "123456", // pre-save hook will hash this automatically
      role: "admin",
      roleCode: "ADMIN",
      roleIds: [adminRole._id],
      status: "ACTIVE",
      isActive: true,
    });
    console.log(" Created admin user:", adminUser.username);
  }

  console.log(" Seed completed successfully. User: admin@gmail.com, Password: 123456");
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error(" Seeding failed:", err);
  process.exit(1);
});
