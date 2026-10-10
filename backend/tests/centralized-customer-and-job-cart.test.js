const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

// Infrastructure & Models
const Branch = require("../src/infrastructure/database/mongoose/models/Branch");
const Customer = require("../src/infrastructure/database/mongoose/models/customer/Customer");
const JobOrder = require("../src/infrastructure/database/mongoose/models/job-order/JobOrder");
const User = require("../src/infrastructure/database/mongoose/models/User");

// Services
const CustomerService = require("../src/application/services/customer/customer.service");
const CustomerMatchingService = require("../src/application/services/customer/customerMatching.service");
const JobOrderService = require("../src/application/services/job-order/jobOrder.service");
const PublicJobRequestService = require("../src/application/services/public/publicJobRequest.service");

const ensureCustomerIndexes = require("../src/infrastructure/database/mongoose/migrations/ensureCustomerIndexes");

const TEST_DB_URI = process.env.MONGO_URI || "mongodb://localhost:27017/printzpayment";

describe("PrintZ — Centralized Customers Across All Branches & Job Cart Integration", () => {
  let branchA;
  let branchB;
  let employeeBranchA;
  let employeeBranchB;
  let superAdmin;
  const uniqueSuffix = Date.now().toString().slice(-6);
  const createdCustomerIds = [];
  const createdJobIds = [];

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }

    // Ensure database unique constraints and indexes safely
    await ensureCustomerIndexes();

    // 1. Create Branch A and Branch B
    branchA = await Branch.create({
      name: `Branch Alpha ${uniqueSuffix}`,
      code: `BRA${uniqueSuffix}`,
      address: "101 Downtown Road",
      branchType: "retail",
    });

    branchB = await Branch.create({
      name: `Branch Beta ${uniqueSuffix}`,
      code: `BRB${uniqueSuffix}`,
      address: "202 Uptown Avenue",
      branchType: "retail",
    });

    // 2. Create Staff at Branch A
    employeeBranchA = await User.create({
      name: "Staff Branch A",
      email: `staff_a_${uniqueSuffix}@printz.local`,
      password: "password123",
      role: "employee",
      branchId: branchA._id,
      branchIds: [branchA._id],
    });

    // 3. Create Staff at Branch B
    employeeBranchB = await User.create({
      name: "Staff Branch B",
      email: `staff_b_${uniqueSuffix}@printz.local`,
      password: "password123",
      role: "employee",
      branchId: branchB._id,
      branchIds: [branchB._id],
    });

    // 4. Create Super Admin
    superAdmin = await User.create({
      name: "Global Admin",
      email: `admin_${uniqueSuffix}@printz.local`,
      password: "password123",
      role: "admin",
      branchId: branchA._id,
    });
  });

  after(async () => {
    try {
      if (branchA) await Branch.findByIdAndDelete(branchA._id);
      if (branchB) await Branch.findByIdAndDelete(branchB._id);
      if (employeeBranchA) await User.findByIdAndDelete(employeeBranchA._id);
      if (employeeBranchB) await User.findByIdAndDelete(employeeBranchB._id);
      if (superAdmin) await User.findByIdAndDelete(superAdmin._id);
      if (createdCustomerIds.length > 0) {
        await Customer.deleteMany({ _id: { $in: createdCustomerIds } });
      }
      if (createdJobIds.length > 0) {
        await JobOrder.deleteMany({ _id: { $in: createdJobIds } });
      }
    } catch (err) {
      console.warn("Cleanup warning:", err.message);
    }
  });

  // Shared Customer Variable for Multi-Step Flow
  let sharedCustomer;
  const sharedMobile = `9811${uniqueSuffix}`;

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Customer registers at Branch A
  // ─────────────────────────────────────────────────────────────
  it("1. Should allow customer to register at Branch A with branch recorded", async () => {
    const authContextA = {
      user: employeeBranchA,
      authorizedBranchIds: [branchA._id.toString()],
      isSuperAdmin: false,
    };

    sharedCustomer = await CustomerService.createCustomer(
      {
        name: "Vikram Malhotra",
        mobile: sharedMobile,
        email: `vikram_${uniqueSuffix}@example.com`,
        company: "Malhotra Technologies",
        branchId: branchA._id,
      },
      authContextA
    );

    assert.ok(sharedCustomer);
    assert.strictEqual(sharedCustomer.name, "Vikram Malhotra");
    assert.strictEqual(sharedCustomer.mobile, sharedMobile);
    assert.strictEqual(String(sharedCustomer.branchId), String(branchA._id));
    assert.ok(sharedCustomer.customerCode);
    createdCustomerIds.push(sharedCustomer._id);
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 2: The same customer is searched for at Branch B
  // ─────────────────────────────────────────────────────────────
  it("2. Should allow Branch B employees to search for the customer registered at Branch A", async () => {
    const authContextB = {
      user: employeeBranchB,
      authorizedBranchIds: [branchB._id.toString()],
      isSuperAdmin: false,
    };

    const searchResults = await CustomerService.searchCustomers("Vikram", 10, authContextB);

    assert.ok(Array.isArray(searchResults));
    const found = searchResults.find((c) => String(c._id) === String(sharedCustomer._id));
    assert.ok(found, "Customer registered at Branch A must be findable by Branch B staff");
    assert.strictEqual(found.name, "Vikram Malhotra");
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Branch B finds and selects the existing customer
  // ─────────────────────────────────────────────────────────────
  it("3. Should allow Branch B employees to retrieve customer details by ID without branch restriction", async () => {
    const authContextB = {
      user: employeeBranchB,
      authorizedBranchIds: [branchB._id.toString()],
      isSuperAdmin: false,
    };

    const selectedCustomer = await CustomerService.getCustomerById(sharedCustomer._id, authContextB);

    assert.ok(selectedCustomer);
    assert.strictEqual(String(selectedCustomer._id), String(sharedCustomer._id));
    assert.strictEqual(selectedCustomer.name, "Vikram Malhotra");
    assert.strictEqual(selectedCustomer.companyName, "Malhotra Technologies");
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 4 & 5: Creating a JobOrder at Branch B references original customerId and uses Branch B as branchId
  // ─────────────────────────────────────────────────────────────
  it("4 & 5. Should create JobOrder at Branch B referencing shared customerId and using Branch B as branchId", async () => {
    const jobOrderDto = {
      customerId: sharedCustomer._id,
      branchId: branchB._id,
      title: "Corporate Visiting Cards",
      quantity: 500,
      customerCompany: "Malhotra Technologies",
      items: [{ itemName: "Matte Visiting Cards", quantity: 500, unitRate: 2 }],
    };

    const job = await JobOrderService.create(jobOrderDto, employeeBranchB);

    assert.ok(job);
    assert.strictEqual(String(job.customerId), String(sharedCustomer._id), "JobOrder must reference shared customerId");
    const resolvedBranchId = job.branchId?._id ? job.branchId._id : job.branchId;
    assert.strictEqual(String(resolvedBranchId), String(branchB._id), "JobOrder must use current branch (Branch B)");
    assert.strictEqual(job.customerName, "Vikram Malhotra");
    assert.strictEqual(job.customerPhone, sharedMobile);
    assert.ok(job.customerSnapshot);
    assert.strictEqual(job.customerSnapshot.name, "Vikram Malhotra");
    createdJobIds.push(job._id);
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 6: The existing Customer record is not duplicated
  // ─────────────────────────────────────────────────────────────
  it("6. Should verify customer profile was not duplicated when placing an order at Branch B", async () => {
    const customerCount = await Customer.countDocuments({ mobile: sharedMobile });
    assert.strictEqual(customerCount, 1, "There must be exactly ONE customer profile across all branches");

    // Also verify visitedBranches tracks both Branch A and Branch B
    const updatedCust = await Customer.findById(sharedCustomer._id);
    const visitedStrs = (updatedCust.visitedBranches || []).map((b) => String(b));
    assert.ok(visitedStrs.includes(String(branchA._id)), "Should include Branch A");
    assert.ok(visitedStrs.includes(String(branchB._id)), "Should include Branch B in visitedBranches");
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 7: Name and email partial searches return the correct customers
  // ─────────────────────────────────────────────────────────────
  it("7. Should support partial name, company, and email searches across branches", async () => {
    const authContext = { user: employeeBranchB, isSuperAdmin: false };

    // Search by partial name
    const byName = await CustomerService.searchCustomers("Malhot", 10, authContext);
    assert.ok(byName.some((c) => c.name === "Vikram Malhotra"));

    // Search by partial email
    const byEmail = await CustomerService.searchCustomers(`vikram_${uniqueSuffix}`, 10, authContext);
    assert.ok(byEmail.some((c) => c.email === `vikram_${uniqueSuffix}@example.com`));

    // Search by company
    const byCompany = await CustomerService.searchCustomers("Technologies", 10, authContext);
    assert.ok(byCompany.some((c) => c.companyName === "Malhotra Technologies"));
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 8: Mobile-number normalization finds existing records
  // ─────────────────────────────────────────────────────────────
  it("8. Should find existing customer using various phone formatting and country codes", async () => {
    const authContext = { user: employeeBranchA, isSuperAdmin: false };

    // Search with +91 country code prefix
    const withCountryCode = await CustomerService.searchCustomers(`+91 ${sharedMobile}`, 10, authContext);
    assert.ok(
      withCountryCode.some((c) => String(c._id) === String(sharedCustomer._id)),
      "Searching with +91 country code must match customer"
    );

    // Search with dashes
    const formatted = `${sharedMobile.slice(0, 5)}-${sharedMobile.slice(5)}`;
    const withDashes = await CustomerService.searchCustomers(formatted, 10, authContext);
    assert.ok(
      withDashes.some((c) => String(c._id) === String(sharedCustomer._id)),
      "Searching with dashes must match customer"
    );
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 9: Two simultaneous registration requests do not create duplicate customers
  // ─────────────────────────────────────────────────────────────
  it("9. Should prevent duplicate customer creation during simultaneous concurrent registration requests", async () => {
    const concurrentMobile = `9822${uniqueSuffix}`;
    const authContext = { user: employeeBranchB, isSuperAdmin: false };

    // Trigger two simultaneous registration attempts with the same phone
    const [result1, result2] = await Promise.all([
      CustomerService.createCustomer(
        {
          name: "Concurrent Client A",
          mobile: concurrentMobile,
          branchId: branchA._id,
        },
        authContext
      ),
      CustomerService.createCustomer(
        {
          name: "Concurrent Client A",
          mobile: concurrentMobile,
          branchId: branchB._id,
        },
        authContext
      ),
    ]);

    assert.ok(result1);
    assert.ok(result2);
    assert.strictEqual(
      String(result1._id),
      String(result2._id),
      "Simultaneous submissions must resolve to the identical customer record"
    );

    const totalCount = await Customer.countDocuments({ mobile: concurrentMobile });
    assert.strictEqual(totalCount, 1, "Database must strictly have 1 customer record for this mobile number");
    createdCustomerIds.push(result1._id);
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 10: Similar names with different identities are not automatically merged
  // ─────────────────────────────────────────────────────────────
  it("10. Should NOT merge different customers solely because their names match", async () => {
    const commonName = "Johnathan Doe";
    const authContext = { user: employeeBranchA, isSuperAdmin: false };

    const person1 = await CustomerService.createCustomer(
      {
        name: commonName,
        mobile: `9833${uniqueSuffix}`,
        email: `john1_${uniqueSuffix}@example.com`,
        branchId: branchA._id,
      },
      authContext
    );

    const person2 = await CustomerService.createCustomer(
      {
        name: commonName,
        mobile: `9844${uniqueSuffix}`,
        email: `john2_${uniqueSuffix}@example.com`,
        branchId: branchB._id,
      },
      authContext
    );

    assert.ok(person1);
    assert.ok(person2);
    assert.notStrictEqual(
      String(person1._id),
      String(person2._id),
      "Two different people with the same name but distinct phone numbers must remain distinct customers"
    );
    assert.strictEqual(person1.name, commonName);
    assert.strictEqual(person2.name, commonName);
    createdCustomerIds.push(person1._id, person2._id);
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 11: Customer search respects authentication
  // ─────────────────────────────────────────────────────────────
  it("11. Should reject unauthenticated requests to search or get customer", async () => {
    await assert.rejects(
      async () => {
        await CustomerService.searchCustomers("Vikram", 10, null);
      },
      (err) => {
        assert.ok(err.statusCode === 401 || err.status === 401 || err.message.includes("Authentication required"));
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await CustomerService.getCustomerById(sharedCustomer._id, null);
      },
      (err) => {
        assert.ok(err.statusCode === 401 || err.status === 401 || err.message.includes("Authentication required"));
        return true;
      }
    );
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 12: Existing manual customer registration and QR job-request flows continue to work
  // ─────────────────────────────────────────────────────────────
  it("12. Should ensure QR job-request and manual customer registration flows both work seamlessly with centralized matching", async () => {
    // 12a. Customer submits self-service QR request for Branch B with existing mobile number
    const qrResult = await PublicJobRequestService.createJobRequest(
      {
        branchCode: branchB.code,
        customerName: "Vikram Malhotra",
        customerPhone: sharedMobile,
        customerEmail: `vikram_${uniqueSuffix}@example.com`,
        jobType: "PRINT_JOB",
        title: "QR Created Brochure",
        quantity: 200,
        jobDescription: "Tri-fold brochure 300gsm",
      },
      []
    );

    assert.ok(qrResult);
    assert.ok(qrResult.jobNo);
    assert.strictEqual(String(qrResult.customerId), String(sharedCustomer._id), "QR request must reuse centralized customer");
    const qrBranchId = qrResult.branchId?._id ? qrResult.branchId._id : qrResult.branchId;
    assert.strictEqual(String(qrBranchId), String(branchB._id), "QR request must be assigned to Branch B");
    createdJobIds.push(qrResult.jobId);

    // 12b. Manual customer registration for an existing customer returns the existing customer
    const reRegisterResult = await CustomerService.createCustomer(
      {
        name: "Vikram Malhotra",
        mobile: sharedMobile,
        company: "Malhotra Technologies Corp",
      },
      { user: employeeBranchB, isSuperAdmin: false }
    );

    assert.ok(reRegisterResult);
    assert.strictEqual(String(reRegisterResult._id), String(sharedCustomer._id), "Manual re-registration must reuse existing profile");
  });
});
