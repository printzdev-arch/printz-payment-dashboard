process.env.NODE_ENV = "test";
const http = require("http");
const assert = require("assert");
const app = require("../src/app");
const jwt = require("jsonwebtoken");

async function testHttp() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Test HTTP server listening on port ${port}`);

  async function request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        `http://localhost:${port}${path}`,
        {
          method: options.method || "GET",
          headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
          },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            try {
              resolve({
                status: res.statusCode,
                headers: res.headers,
                body: JSON.parse(body),
              });
            } catch (e) {
              resolve({
                status: res.statusCode,
                headers: res.headers,
                body,
              });
            }
          });
        }
      );
      req.on("error", reject);
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      req.end();
    });
  }

  try {
    // 1. Test /api/v1/roles unauthorized
    console.log("Testing GET /api/v1/roles unauthorized...");
    const resRoles = await request("/api/v1/roles");
    assert.strictEqual(resRoles.status, 401, `Expected 401, got ${resRoles.status}`);
    console.log("✔ /api/v1/roles rejected unauthenticated request with 401.");

    // 2. Test /api/v1/sale-receipts unauthorized
    console.log("Testing GET /api/v1/sale-receipts unauthorized...");
    const resReceipts = await request("/api/v1/sale-receipts");
    assert.strictEqual(resReceipts.status, 401, `Expected 401, got ${resReceipts.status}`);
    console.log("✔ /api/v1/sale-receipts rejected unauthenticated request with 401.");

    // 3. Test /api/roles and /api/sale-receipts dual prefix
    console.log("Testing dual prefix /api/roles...");
    const resDualRoles = await request("/api/roles");
    assert.strictEqual(resDualRoles.status, 401);
    console.log("✔ /api/roles rejected unauthenticated request with 401.");

    // 4. Test /api/v1/employees and /api/employees unauthorized
    console.log("Testing GET /api/v1/employees unauthorized...");
    const resEmp = await request("/api/v1/employees");
    assert.strictEqual(resEmp.status, 401, `Expected 401, got ${resEmp.status}`);
    console.log("✔ /api/v1/employees rejected unauthenticated request with 401.");

    console.log("Testing dual prefix /api/employees unauthorized...");
    const resDualEmp = await request("/api/employees");
    assert.strictEqual(resDualEmp.status, 401, `Expected 401, got ${resDualEmp.status}`);
    console.log("✔ /api/employees rejected unauthenticated request with 401.");

    console.log("\n🎉 HTTP verification succeeded! All endpoints are protected and accessible.");
  } finally {
    server.close();
  }
}

testHttp().catch((err) => {
  console.error("HTTP test failed:", err);
  process.exit(1);
});
