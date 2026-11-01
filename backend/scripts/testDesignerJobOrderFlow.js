const connectDB = require("../src/config/database");
require("../src/modules/models");
const app = require("../src/app");
const http = require("http");
const jwtTokenService = require("../src/utils/JwtTokenService");
const mongoose = require("mongoose");

async function runTests() {
  console.log("=================================================================");
  console.log("   AUTOMATED TEST SUITE: DESIGNER JOB ORDER & ESTIMATION FLOW    ");
  console.log("=================================================================\n");

  await connectDB();
  const User = require("../src/modules/auth/models/User");
  const Branch = require("../src/modules/branches/models/Branch");

  let branch = await Branch.findOne();
  if (!branch) {
    branch = await Branch.create({
      name: "Banaswadi",
      code: "BN01",
      city: "Bangalore",
      isActive: true,
    });
  }
  const branchId = branch._id.toString();

  // Fetch or create actual database users for authenticated sessions
  let designerA = await User.findOne({ role: "designer" });
  if (!designerA) {
    designerA = await User.create({
      name: "Designer Alice",
      email: `designer.alice.${Date.now()}@printz.com`,
      password: "password123",
      role: "designer",
      branch: "Banaswadi",
      branchId: branchId,
      isActive: true,
    });
  }

  let designerB = await User.findOne({ role: "designer", _id: { $ne: designerA._id } });
  if (!designerB) {
    designerB = await User.create({
      name: "Designer Bob",
      email: `designer.bob.${Date.now()}@printz.com`,
      password: "password123",
      role: "designer",
      branch: "Banaswadi",
      branchId: branchId,
      isActive: true,
    });
  }

  let manager = await User.findOne({ role: { $in: ["manager", "branch_manager", "admin"] } });
  if (!manager) {
    manager = await User.create({
      name: "Manager Mike",
      email: `manager.mike.${Date.now()}@printz.com`,
      password: "password123",
      role: "manager",
      branch: "Banaswadi",
      branchId: branchId,
      isActive: true,
    });
  } else {
    manager.branchId = branch._id;
    manager.branch = branch.name || "Banaswadi";
    await manager.save();
  }

  designerA.branchId = branch._id;
  await designerA.save();
  designerB.branchId = branch._id;
  await designerB.save();

  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;
  const baseURL = `http://localhost:${port}/api`;

  const designerAId = String(designerA._id);
  const designerBId = String(designerB._id);
  const managerId = String(manager._id);

  // Tokens
  const designerAToken = jwtTokenService.generateTokenPair({
    userId: designerAId,
    _id: designerAId,
    role: "designer",
    roleCode: "DESIGNER",
    branch: designerA.branch || "Banaswadi",
    branchId: branchId,
    name: designerA.name,
    email: designerA.email,
  }).accessToken;

  const designerBToken = jwtTokenService.generateTokenPair({
    userId: designerBId,
    _id: designerBId,
    role: "designer",
    roleCode: "DESIGNER",
    branch: designerB.branch || "Banaswadi",
    branchId: branchId,
    name: designerB.name,
    email: designerB.email,
  }).accessToken;

  const managerToken = jwtTokenService.generateTokenPair({
    userId: managerId,
    _id: managerId,
    role: manager.role || "manager",
    roleCode: "BRANCH_MANAGER",
    branch: manager.branch || "Banaswadi",
    branchId: branchId,
    name: manager.name,
    email: manager.email,
  }).accessToken;

  async function api(token, method, path, body = null) {
    const res = await fetch(`${baseURL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch (_) {}
    return { status: res.status, data, text };
  }

  // Get or create a test customer
  const custRes = await api(designerAToken, "GET", "/customers?limit=1");
  let customerId = custRes.data?.items?.[0]?._id || custRes.data?.data?.[0]?._id;
  let customerName = custRes.data?.items?.[0]?.name || "Test Client";
  let customerPhone = custRes.data?.items?.[0]?.mobile || "9876543210";

  if (!customerId) {
    const createCust = await api(designerAToken, "POST", "/customers", {
      name: "JobFlow Verification Customer",
      mobile: "9876543210",
      email: "test.customer@printz.com",
      customerType: "WALK_IN",
    });
    customerId = createCust.data?.data?._id || createCust.data?._id;
  }

  let passedCount = 0;
  let failedCount = 0;

  function assert(testName, condition, details = "") {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      failedCount++;
    }
  }

  let designerAJobId = null;
  let managerJobId = null;

  try {
    // -------------------------------------------------------------
    // TEST 1: Designer Creates Job Order
    // -------------------------------------------------------------
    console.log("\n--- TEST 1: Designer Creates Job Order ---");
    const dOrderPayload = {
      branchId,
      customerId,
      customerName,
      customerPhone,
      jobTitle: "Designer Test Brochure",
      jobType: "Brochure",
      quantity: 500,
      paperType: "Art Card 300gsm",
      printType: "Digital",
      sides: "DOUBLE",
      lamination: "Matte",
      targetDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      items: [
        {
          name: "Brochure Print",
          qty: 500,
          rate: 5,
          unit: "sheets",
          subtotal: 2500,
          notes: "Full color",
        },
      ],
      pricing: {
        subtotal: 2500,
        tax: 200,
        grandTotal: 2700,
      },
    };

    const dCreateRes = await api(designerAToken, "POST", "/job-orders", dOrderPayload);
    const dJob = dCreateRes.data?.data || dCreateRes.data;
    designerAJobId = dJob?._id || dJob?.id;

    assert("Designer Job Order creation HTTP 201/200", [200, 201].includes(dCreateRes.status), `Status: ${dCreateRes.status}, Error: ${dCreateRes.text}`);
    assert("Backend assigned source = 'DESIGNER'", dJob?.source === "DESIGNER", `Actual source: ${dJob?.source}`);
    assert("Backend assigned createdByRole = 'DESIGNER'", (dJob?.createdByRole || "").toUpperCase() === "DESIGNER", `Actual createdByRole: ${dJob?.createdByRole}`);
    assert("Backend assigned designerId = Designer A", String(dJob?.designerId || dJob?.createdBy) === designerAId, `Expected ${designerAId}, got ${dJob?.designerId || dJob?.createdBy}`);

    // -------------------------------------------------------------
    // TEST 2: Manager Creates Job Order
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Manager Creates Job Order ---");
    const mOrderPayload = {
      ...dOrderPayload,
      jobTitle: "Manager Normal Order",
    };
    const mCreateRes = await api(managerToken, "POST", "/job-orders", mOrderPayload);
    const mJob = mCreateRes.data?.data || mCreateRes.data;
    managerJobId = mJob?._id || mJob?.id;

    assert("Manager Job Order creation HTTP 201/200", [200, 201].includes(mCreateRes.status), `Status: ${mCreateRes.status}, Error: ${mCreateRes.text}`);
    assert("Backend assigned source = 'MANAGER'", mJob?.source === "MANAGER", `Actual source: ${mJob?.source}`);
    assert("Backend assigned createdByRole = 'MANAGER'", (mJob?.createdByRole || "").toUpperCase() === "MANAGER", `Actual createdByRole: ${mJob?.createdByRole}`);

    // -------------------------------------------------------------
    // TEST 3: Separation in Listing (source filtering)
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Separation in Listing Queries ---");
    const dListRes = await api(designerAToken, "GET", "/job-orders?source=DESIGNER&limit=50");
    const dList = dListRes.data?.items || dListRes.data?.data || [];
    const containsDesignerJob = dList.some((j) => (j._id || j.id) === designerAJobId);
    const containsManagerJobInDesignerList = dList.some((j) => (j._id || j.id) === managerJobId);

    assert("GET /job-orders?source=DESIGNER returns Designer Job", containsDesignerJob);
    assert("GET /job-orders?source=DESIGNER does NOT contain Manager Job", !containsManagerJobInDesignerList);

    const mListRes = await api(managerToken, "GET", "/job-orders?source=MANAGER&limit=50");
    const mList = mListRes.data?.items || mListRes.data?.data || [];
    const containsManagerJob = mList.some((j) => (j._id || j.id) === managerJobId);
    const containsDesignerJobInManagerList = mList.some((j) => (j._id || j.id) === designerAJobId);

    assert("GET /job-orders?source=MANAGER returns Manager Job", containsManagerJob);
    assert("GET /job-orders?source=MANAGER does NOT contain Designer Job", !containsDesignerJobInManagerList);

    // -------------------------------------------------------------
    // TEST 4: Estimation Approval Security & Ownership
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: Estimation Approval Authorization Rules ---");

    // Case 4A: Designer B tries to approve Designer A's job order -> Expect 403 Forbidden
    const d2ApproveRes = await api(designerBToken, "POST", `/job-orders/${designerAJobId}/estimation/approve`, {
      grandTotal: 2700,
      comments: "Illegal attempt by Designer B",
    });
    assert("Designer B CANNOT approve Designer A's order (403 Forbidden)", d2ApproveRes.status === 403, `Status: ${d2ApproveRes.status}`);

    // Case 4B: Designer A tries to approve Manager's job order -> Expect 403 Forbidden
    const d1ApproveMRes = await api(designerAToken, "POST", `/job-orders/${managerJobId}/estimation/approve`, {
      grandTotal: 2700,
      comments: "Illegal attempt by Designer A on Manager job",
    });
    assert("Designer A CANNOT approve Manager Job Order (403 Forbidden)", d1ApproveMRes.status === 403, `Status: ${d1ApproveMRes.status}`);

    // Case 4C: Designer A approves their OWN job order -> Expect 200 OK
    const d1ApproveOwnRes = await api(designerAToken, "POST", `/job-orders/${designerAJobId}/estimation/approve`, {
      grandTotal: 2700,
      comments: "Approved by Designer A",
    });
    assert("Designer A CAN approve their OWN job order (200 OK)", [200, 201].includes(d1ApproveOwnRes.status), `Status: ${d1ApproveOwnRes.status}, Error: ${d1ApproveOwnRes.text}`);

    // Check stage transition after Designer approval
    const getDJobAfterApproval = await api(designerAToken, "GET", `/job-orders/${designerAJobId}`);
    const updatedDJob = getDJobAfterApproval.data?.data || getDJobAfterApproval.data;
    assert("Designer Job Order stage transitioned to DESIGN_IN_PROGRESS / DESIGN_QUEUE", ["DESIGN_IN_PROGRESS", "DESIGN_QUEUE"].includes(updatedDJob?.currentStage), `Current stage: ${updatedDJob?.currentStage}`);
    assert("Designer Job Order estimationStatus is APPROVED", updatedDJob?.estimationStatus === "APPROVED", `Estimation status: ${updatedDJob?.estimationStatus}`);

    // Case 4D: Manager approves Manager's job order -> Expect 200 OK
    const mApproveMRes = await api(managerToken, "POST", `/job-orders/${managerJobId}/estimation/approve`, {
      grandTotal: 2700,
      comments: "Approved by Branch Manager",
    });
    assert("Manager CAN approve Manager Job Order (200 OK)", [200, 201].includes(mApproveMRes.status), `Status: ${mApproveMRes.status}, Error: ${mApproveMRes.text}`);

  } catch (err) {
    console.error("Test execution exception:", err);
    failedCount++;
  } finally {
    server.close();
    console.log("\n=================================================================");
    console.log(`   TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED   `);
    console.log("=================================================================\n");
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runTests();
