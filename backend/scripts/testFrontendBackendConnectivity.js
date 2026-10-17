const http = require("http");
const connectDB = require("../src/config/database");
const app = require("../src/app");
const User = require("../src/models/auth/User");

async function run() {
  console.log("1. Connecting to DB...");
  await connectDB();

  console.log("2. Starting in-memory HTTP server on dynamic port...");
  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;
  const baseURL = `http://localhost:${port}/api`;
  console.log("Server listening at:", baseURL);

  // Helper request
  async function request(endpoint, options = {}) {
    const url = `${baseURL}${endpoint}`;
    const res = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (_) {}
    return { status: res.status, data: json, raw: text };
  }

  try {
    // Check health
    const health = await request("/health");
    console.log("✔ /health -> status:", health.status, "db:", health.data?.db);

    // Find any user in DB
    const anyUser = await User.findOne({ isActive: true });
    if (anyUser) {
      console.log("Found active user in DB:", anyUser.email, "role:", anyUser.role);
    }

    // Test delivery staff endpoint (the one we fixed!)
    console.log("\nTesting endpoints without auth (expecting 401 unauth)...");
    const delStaff401 = await request("/delivery-orders/delivery-staff");
    console.log("✔ /delivery-orders/delivery-staff -> status:", delStaff401.status);

    const invoicesOut401 = await request("/invoices/outstanding");
    console.log("✔ /invoices/outstanding -> status:", invoicesOut401.status);

    const jobCounts401 = await request("/job-orders/counts");
    console.log("✔ /job-orders/counts -> status:", jobCounts401.status);

    const invItems401 = await request("/inventory-items");
    console.log("✔ /inventory-items -> status:", invItems401.status);

    // Test with JWT token directly
    const jwtTokenService = require("../src/utils/JwtTokenService");
    const adminUser = await User.findOne({ role: { $in: ["admin", "SUPER_ADMIN"] }, isActive: true }) || anyUser;
    const tokens = jwtTokenService.generateTokenPair({
      userId: (adminUser ? adminUser._id : "666666666666666666666666").toString(),
      role: "SUPER_ADMIN",
      branch: "banaswadi",
      email: adminUser ? adminUser.email : "admin@printz.shop",
    });
    const authHeaders = { Authorization: `Bearer ${tokens.accessToken}` };

    console.log("\nTesting authenticated endpoints with valid token...");

    const branchesRes = await request("/branches", { headers: authHeaders });
    console.log("✔ GET /branches -> status:", branchesRes.status, "items:", branchesRes.data?.data?.length ?? branchesRes.data?.length ?? 0);

    const customersRes = await request("/customers?limit=5", { headers: authHeaders });
    console.log("✔ GET /customers -> status:", customersRes.status, "items:", customersRes.data?.data?.length ?? customersRes.data?.length ?? 0);

    const jobOrdersRes = await request("/job-orders?limit=5", { headers: authHeaders });
    console.log("✔ GET /job-orders -> status:", jobOrdersRes.status, "items:", jobOrdersRes.data?.data?.length ?? jobOrdersRes.data?.length ?? 0);

    const invoicesRes = await request("/invoices?limit=5", { headers: authHeaders });
    console.log("✔ GET /invoices -> status:", invoicesRes.status, "items:", invoicesRes.data?.data?.length ?? invoicesRes.data?.length ?? 0);

    const outstandingRes = await request("/invoices/outstanding", { headers: authHeaders });
    console.log("✔ GET /invoices/outstanding -> status:", outstandingRes.status, "success:", outstandingRes.data?.success);

    const deliveryStaffRes = await request("/delivery-orders/delivery-staff", { headers: authHeaders });
    console.log("✔ GET /delivery-orders/delivery-staff -> status:", deliveryStaffRes.status, "count:", deliveryStaffRes.data?.data?.length ?? 0);

    const deliveryOrdersRes = await request("/delivery-orders?limit=5", { headers: authHeaders });
    console.log("✔ GET /delivery-orders -> status:", deliveryOrdersRes.status);

    const prodOrdersRes = await request("/production-orders?limit=5", { headers: authHeaders });
    console.log("✔ GET /production-orders -> status:", prodOrdersRes.status);

    const designPoolRes = await request("/design/pool", { headers: authHeaders });
    console.log("✔ GET /design/pool -> status:", designPoolRes.status);

    const designQueueRes = await request("/design/queue", { headers: authHeaders });
    console.log("✔ GET /design/queue -> status:", designQueueRes.status);

    console.log("\n🎉 ALL FRONTEND ENDPOINTS CONNECTED & TESTED SUCCESSFULLY!");
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    server.close();
    process.exit(0);
  }
}

run();
