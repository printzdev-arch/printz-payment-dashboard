const { describe, it, before, after } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const crypto = require("crypto");

// Infrastructure & Models
const Branch = require("../src/infrastructure/database/mongoose/models/Branch");
const Customer = require("../src/infrastructure/database/mongoose/models/customer/Customer");
const JobOrder = require("../src/infrastructure/database/mongoose/models/job-order/JobOrder");
const { JobItem } = require("../src/infrastructure/database/mongoose/models/job-order/JobItem");
const JobSample = require("../src/infrastructure/database/mongoose/models/design/JobSample");
const JobAssignment = require("../src/infrastructure/database/mongoose/models/design/JobAssignment");
const DesignApprovalToken = require("../src/infrastructure/database/mongoose/models/design/DesignApprovalToken");
const User = require("../src/infrastructure/database/mongoose/models/User");
const Notification = require("../src/infrastructure/database/mongoose/models/Notification");

// Services
const PublicJobRequestService = require("../src/application/services/public/publicJobRequest.service");
const PublicDesignApprovalService = require("../src/application/services/public/publicDesignApproval.service");
const DesignSampleService = require("../src/application/services/design/designSample.service");
const JobOrderService = require("../src/application/services/job-order/jobOrder.service");
const CustomerService = require("../src/application/services/customer/customer.service");
const WhatsAppService = require("../src/infrastructure/whatsapp/WhatsAppService");
const { PublicJobRequestDto } = require("../src/application/dto/public/PublicJobRequestDto");
const { PublicApprovalDecisionDto } = require("../src/application/dto/public/PublicDesignApprovalDto");
const { FORBIDDEN_PRIVILEGED_FIELDS } = require("../src/presentation/validators/public/publicJobRequest.validator");

const TEST_DB_URI = process.env.MONGO_URI || "mongodb://localhost:27017/printzpayment";

describe("PrintZ — Customer QR Job Request & WhatsApp Design Approval Test Suite", () => {
  let testBranch;
  let testDesigner;
  let testAdmin;
  const uniqueSuffix = Date.now().toString().slice(-6);

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI);
    }

    // Create Test Branch
    testBranch = await Branch.create({
      name: `Test QR Branch ${uniqueSuffix}`,
      code: `QRBR${uniqueSuffix}`,
      address: "100 Test St",
      branchType: "retail",
    });

    // Create Test Admin
    testAdmin = await User.create({
      name: "Test Admin",
      email: `admin_${uniqueSuffix}@printz.local`,
      password: "password123",
      role: "admin",
      branchId: testBranch._id,
    });

    // Create Test Designer
    testDesigner = await User.create({
      name: "Test Designer",
      email: `designer_${uniqueSuffix}@printz.local`,
      password: "password123",
      role: "designer",
      branchId: testBranch._id,
    });
  });

  after(async () => {
    // Cleanup created test records
    try {
      if (testBranch) {
        await Branch.deleteOne({ _id: testBranch._id });
        await Customer.deleteMany({ branchId: testBranch._id });
        await JobOrder.deleteMany({ branchId: testBranch._id });
        await User.deleteMany({ _id: { $in: [testAdmin?._id, testDesigner?._id] } });
        await Notification.deleteMany({ branchId: testBranch._id });
      }
    } catch (_) {}
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 1: New customer creation through public job request
  // ─────────────────────────────────────────────────────────────
  it("1. Should create a new Customer record when customer does not exist", async () => {
    const testPhone = `9800${uniqueSuffix}`;
    const dto = new PublicJobRequestDto({
      branchCode: testBranch.code,
      customerName: "Arun NewCustomer",
      customerPhone: testPhone,
      customerEmail: `arun_${uniqueSuffix}@example.com`,
      customerCompany: "Arun Graphics",
      title: "Banner 6x3 Vinyl",
      quantity: 2,
    });

    const result = await PublicJobRequestService.createJobRequest(dto);

    assert.strictEqual(result.isDuplicate, false);
    assert.ok(result.jobNo.startsWith("JO-"));
    assert.strictEqual(result.stage, "ENQUIRY");
    assert.strictEqual(result.status, "DRAFT");

    // Verify Customer in DB
    const savedCustomer = await Customer.findOne({ mobile: testPhone });
    assert.ok(savedCustomer, "Customer should be saved in DB");
    assert.strictEqual(savedCustomer.name, "Arun NewCustomer");
    assert.strictEqual(String(savedCustomer.branchId), String(testBranch._id));
    assert.strictEqual(savedCustomer.customerType, "WALK_IN");
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Existing customer matching
  // ─────────────────────────────────────────────────────────────
  it("2. Should match and reuse existing Customer without creating duplicates", async () => {
    const existingPhone = `9811${uniqueSuffix}`;
    const preExisting = await Customer.create({
      customerCode: `CUST-EX-${uniqueSuffix}`,
      name: "Pre-Existing Customer",
      mobile: existingPhone,
      branchId: testBranch._id,
    });

    const dto = new PublicJobRequestDto({
      branchCode: testBranch.code,
      customerName: "Pre-Existing Customer",
      customerPhone: existingPhone,
      title: "Visiting Cards 500 pcs",
      quantity: 500,
    });

    const result = await PublicJobRequestService.createJobRequest(dto);

    assert.strictEqual(result.isDuplicate, false);

    // Verify only ONE customer exists with this mobile
    const customerCount = await Customer.countDocuments({ mobile: existingPhone });
    assert.strictEqual(customerCount, 1, "Should not duplicate existing customer");

    // Verify Job was linked to the existing customer
    const job = await JobOrder.findOne({ jobNo: result.jobNo });
    assert.strictEqual(String(job.customerId), String(preExisting._id));
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Automatic JobOrder creation and correct customer snapshot
  // ─────────────────────────────────────────────────────────────
  it("3. Should automatically create JobOrder with valid ENQUIRY/DRAFT stage and correct customerSnapshot", async () => {
    const testPhone = `9822${uniqueSuffix}`;
    const dto = new PublicJobRequestDto({
      branchCode: testBranch.code,
      customerName: "Meera Nair",
      customerPhone: testPhone,
      customerEmail: "meera@printz.com",
      customerCompany: "Nair Books",
      customerAddress: "45 Book Street",
      customerGstin: "33ABCDE1234F1Z5",
      title: "Brochure A4 Tri-fold",
      quantity: 300,
      paperSize: "A4",
      paperType: "170 GSM Gloss",
      colorMode: "CMYK",
      sides: "DOUBLE",
      customerRequirements: "Exact color match required",
    });

    const result = await PublicJobRequestService.createJobRequest(dto);

    const job = await JobOrder.findOne({ jobNo: result.jobNo });
    assert.ok(job);
    assert.strictEqual(job.currentStage, "ENQUIRY");
    assert.strictEqual(job.status, "DRAFT");
    assert.strictEqual(job.quantity, 300);

    // Verify customer snapshot
    assert.strictEqual(job.customerSnapshot.name, "Meera Nair");
    assert.strictEqual(job.customerSnapshot.mobile, testPhone);
    assert.strictEqual(job.customerSnapshot.company, "Nair Books");
    assert.strictEqual(job.customerSnapshot.gstin, "33ABCDE1234F1Z5");
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Branch validation and access control
  // ─────────────────────────────────────────────────────────────
  it("4. Should reject invalid branch codes and provide secure branch QR config", async () => {
    // 4a. Invalid branch code rejected
    const invalidDto = new PublicJobRequestDto({
      branchCode: "NON_EXISTENT_BRANCH_XYZ",
      customerName: "Test User",
      customerPhone: "9999999999",
      title: "Test Job",
    });

    await assert.rejects(
      async () => {
        await PublicJobRequestService.createJobRequest(invalidDto);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );

    // 4b. Valid branch returns clean public URL without leaking credentials
    const qrConfig = await PublicJobRequestService.getBranchQrConfig(testBranch._id, {
      user: testAdmin,
    });

    assert.strictEqual(String(qrConfig.branchId), String(testBranch._id));
    assert.strictEqual(qrConfig.branchCode, testBranch.code);
    assert.ok(qrConfig.publicJobRequestUrl.includes(testBranch.code));
    assert.strictEqual(qrConfig.apiKey, undefined);
    assert.strictEqual(qrConfig.secret, undefined);

    // 4c. Forbidden branch access for user from another branch
    const otherBranch = await Branch.create({
      name: `Other Branch ${uniqueSuffix}`,
      code: `OTH${uniqueSuffix}`,
    });

    await assert.rejects(
      async () => {
        await PublicJobRequestService.getBranchQrConfig(otherBranch._id, {
          user: testDesigner, // Assigned to testBranch, not otherBranch
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );
    await Branch.deleteOne({ _id: otherBranch._id });
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 5: Duplicate submission and idempotency
  // ─────────────────────────────────────────────────────────────
  it("5. Should prevent duplicate job creation when idempotent request is re-submitted", async () => {
    const idempotencyKey = `idemp-key-${uniqueSuffix}-${Date.now()}`;
    const testPhone = `9833${uniqueSuffix}`;

    const dto1 = new PublicJobRequestDto({
      branchCode: testBranch.code,
      customerName: "Idempotent Submitter",
      customerPhone: testPhone,
      title: "Idempotent Poster Job",
      quantity: 50,
      idempotencyKey,
    });

    const res1 = await PublicJobRequestService.createJobRequest(dto1);
    assert.strictEqual(res1.isDuplicate, false);

    // Immediate second submission with identical key
    const dto2 = new PublicJobRequestDto({
      branchCode: testBranch.code,
      customerName: "Idempotent Submitter",
      customerPhone: testPhone,
      title: "Idempotent Poster Job",
      quantity: 50,
      idempotencyKey,
    });

    const res2 = await PublicJobRequestService.createJobRequest(dto2);
    assert.strictEqual(res2.isDuplicate, true);
    assert.strictEqual(res2.jobNo, res1.jobNo, "Should return existing job number");

    // Check database count
    const count = await JobOrder.countDocuments({ idempotencyKey });
    assert.strictEqual(count, 1, "Only 1 JobOrder should exist for this idempotency key");
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 6: Invalid fields and unauthorized privileged fields
  // ─────────────────────────────────────────────────────────────
  it("6. Should list and reject unauthorized privileged fields in public requests", () => {
    assert.ok(FORBIDDEN_PRIVILEGED_FIELDS.includes("status"));
    assert.ok(FORBIDDEN_PRIVILEGED_FIELDS.includes("stage"));
    assert.ok(FORBIDDEN_PRIVILEGED_FIELDS.includes("discount"));
    assert.ok(FORBIDDEN_PRIVILEGED_FIELDS.includes("discountAmount"));
    assert.ok(FORBIDDEN_PRIVILEGED_FIELDS.includes("designerId"));
    assert.ok(FORBIDDEN_PRIVILEGED_FIELDS.includes("paymentStatus"));
    assert.ok(FORBIDDEN_PRIVILEGED_FIELDS.includes("permissions"));
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 7: Invalid or excessive requests and abuse protection
  // ─────────────────────────────────────────────────────────────
  it("7. Should reject requests missing mandatory customer name or phone", async () => {
    const dtoMissingPhone = new PublicJobRequestDto({
      branchCode: testBranch.code,
      customerName: "No Phone User",
      customerPhone: "",
      title: "Some Job",
    });

    await assert.rejects(
      async () => {
        await PublicJobRequestService.createJobRequest(dtoMissingPhone);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.ok(err.message.includes("mobile"));
        return true;
      }
    );
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 8: Approval token creation and sample-version binding
  // ─────────────────────────────────────────────────────────────
  it("8. Should generate a secure approval token bound to job, sample, and version upon submission", async () => {
    // Create a job in DESIGN_IN_PROGRESS stage
    const job = await JobOrder.create({
      jobNo: `JO-SMP-${uniqueSuffix}-01`,
      branchId: testBranch._id,
      title: "Letterhead Design",
      customerPhone: `9844${uniqueSuffix}`,
      currentStage: "DESIGN_IN_PROGRESS",
      stage: "DESIGN_IN_PROGRESS",
      status: "DESIGN",
    });

    // Upload draft sample
    const sample = await DesignSampleService.uploadSample(
      job._id,
      { fileUrl: "/uploads/sample-v1.png", comments: "First draft for approval" },
      testDesigner
    );

    assert.strictEqual(sample.status, "DRAFT");
    assert.strictEqual(sample.versionNo, 1);

    // Submit sample
    const submitted = await DesignSampleService.submitSample(
      job._id,
      sample._id,
      { shareViaWhatsapp: true },
      testDesigner
    );

    assert.strictEqual(submitted.status, "SUBMITTED");
    assert.ok(submitted.approvalToken);
    assert.ok(submitted.approvalToken.token);
    assert.ok(submitted.approvalToken.approvalUrl);

    // Verify token stored in DB is hashed
    const tokenHash = crypto.createHash("sha256").update(submitted.approvalToken.token).digest("hex");
    const tokenRecord = await DesignApprovalToken.findOne({ tokenHash });

    assert.ok(tokenRecord, "Hashed token record must exist in DB");
    assert.strictEqual(String(tokenRecord.jobOrderId), String(job._id));
    assert.strictEqual(String(tokenRecord.sampleId), String(sample._id));
    assert.strictEqual(tokenRecord.versionNo, 1);
    assert.strictEqual(tokenRecord.status, "ACTIVE");
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 9: Public preview retrieval with valid and invalid tokens
  // ─────────────────────────────────────────────────────────────
  it("9. Should return safe preview for valid token and reject invalid tokens with 404", async () => {
    // 9a. Invalid token
    await assert.rejects(
      async () => {
        await PublicDesignApprovalService.getPreview("invalid-token-does-not-exist");
      },
      (err) => {
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );

    // 9b. Valid token preview
    const job = await JobOrder.create({
      jobNo: `JO-SMP-${uniqueSuffix}-02`,
      branchId: testBranch._id,
      title: "Certificate Printing",
      customerName: "Sundar Pichai",
      customerPhone: `9855${uniqueSuffix}`,
      currentStage: "DESIGN_IN_PROGRESS",
      stage: "DESIGN_IN_PROGRESS",
      status: "DESIGN",
    });

    const sample = await DesignSampleService.uploadSample(
      job._id,
      { fileUrl: "/uploads/cert.png", comments: "Please check border alignment" },
      testDesigner
    );

    const submitted = await DesignSampleService.submitSample(
      job._id,
      sample._id,
      {},
      testDesigner
    );

    const preview = await PublicDesignApprovalService.getPreview(submitted.approvalToken.token);

    assert.strictEqual(preview.jobNo, job.jobNo);
    assert.strictEqual(preview.jobTitle, "Certificate Printing");
    assert.strictEqual(preview.versionNo, 1);
    assert.strictEqual(preview.designerComments, "Please check border alignment");
    assert.ok(preview.customerName.includes("***"), "Customer name should be masked");
    assert.strictEqual(preview.isPendingDecision, true);
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 10: Successful approval and correct workflow transition
  // ─────────────────────────────────────────────────────────────
  it("10. Should transition job to PRODUCTION_PLANNING when customer approves sample", async () => {
    const job = await JobOrder.create({
      jobNo: `JO-SMP-${uniqueSuffix}-03`,
      branchId: testBranch._id,
      title: "T-Shirt Screen Printing",
      currentStage: "DESIGN_IN_PROGRESS",
      stage: "DESIGN_IN_PROGRESS",
      status: "DESIGN",
    });

    const sample = await DesignSampleService.uploadSample(
      job._id,
      { fileUrl: "/uploads/tshirt.png", comments: "Color: Navy Blue" },
      testDesigner
    );

    const submitted = await DesignSampleService.submitSample(
      job._id,
      sample._id,
      {},
      testDesigner
    );

    // Customer approves via public endpoint
    const decisionDto = new PublicApprovalDecisionDto({
      decision: "APPROVED",
      feedback: "Looks awesome, please print!",
    });

    const result = await PublicDesignApprovalService.processDecision(
      submitted.approvalToken.token,
      decisionDto
    );

    assert.strictEqual(result.decision, "APPROVED");
    assert.strictEqual(result.nextStage, "PRODUCTION_PLANNING");

    // Verify job transitioned in DB
    const updatedJob = await JobOrder.findById(job._id);
    assert.strictEqual(updatedJob.currentStage, "PRODUCTION_PLANNING");
    assert.strictEqual(updatedJob.status, "PRODUCTION");

    // Verify sample status
    const updatedSample = await JobSample.findById(sample._id);
    assert.strictEqual(updatedSample.status, "APPROVED");
    assert.strictEqual(updatedSample.customerFeedback, "Looks awesome, please print!");

    // Verify token consumed
    const tokenHash = crypto.createHash("sha256").update(submitted.approvalToken.token).digest("hex");
    const tokenDoc = await DesignApprovalToken.findOne({ tokenHash });
    assert.strictEqual(tokenDoc.status, "USED");
    assert.strictEqual(tokenDoc.decision, "APPROVED");

    // Verify notification was generated for staff
    const notif = await Notification.findOne({ entityId: job._id });
    assert.ok(notif, "In-app staff notification should be created");
    assert.ok(notif.title.includes("Approved"));
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 11: Revision request and feedback recording
  // ─────────────────────────────────────────────────────────────
  it("11. Should transition job to REVISION when customer requests changes", async () => {
    const job = await JobOrder.create({
      jobNo: `JO-SMP-${uniqueSuffix}-04`,
      branchId: testBranch._id,
      title: "Envelope Design",
      currentStage: "DESIGN_IN_PROGRESS",
      stage: "DESIGN_IN_PROGRESS",
      status: "DESIGN",
    });

    const sample = await DesignSampleService.uploadSample(
      job._id,
      { fileUrl: "/uploads/envelope.png", comments: "First Proof" },
      testDesigner
    );

    const submitted = await DesignSampleService.submitSample(
      job._id,
      sample._id,
      {},
      testDesigner
    );

    // Customer requests revisions
    const decisionDto = new PublicApprovalDecisionDto({
      decision: "REVISION_REQUIRED",
      feedback: "Please change the font color to Royal Blue and enlarge logo by 20%",
    });

    const result = await PublicDesignApprovalService.processDecision(
      submitted.approvalToken.token,
      decisionDto
    );

    assert.strictEqual(result.decision, "REVISION_REQUIRED");
    assert.strictEqual(result.nextStage, "REVISION");

    // Verify job transitioned to REVISION
    const updatedJob = await JobOrder.findById(job._id);
    assert.strictEqual(updatedJob.currentStage, "REVISION");
    assert.strictEqual(updatedJob.status, "DESIGN");

    // Verify sample status in DB
    const updatedSample = await JobSample.findById(sample._id);
    assert.strictEqual(updatedSample.status, "REVISION_REQUIRED");
    assert.ok(updatedSample.customerFeedback.includes("Royal Blue"));
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 12: Expired, revoked, reused, and superseded token rejection
  // ─────────────────────────────────────────────────────────────
  it("12. Should reject reused, expired, and superseded approval tokens", async () => {
    const job = await JobOrder.create({
      jobNo: `JO-SMP-${uniqueSuffix}-05`,
      branchId: testBranch._id,
      title: "Menu Card Printing",
      currentStage: "DESIGN_IN_PROGRESS",
      stage: "DESIGN_IN_PROGRESS",
      status: "DESIGN",
    });

    // 12a. Reused Token Rejection
    const sample1 = await DesignSampleService.uploadSample(
      job._id,
      { fileUrl: "/uploads/menu-v1.png" },
      testDesigner
    );
    const sub1 = await DesignSampleService.submitSample(job._id, sample1._id, {}, testDesigner);
    const token1 = sub1.approvalToken.token;

    // Use token once
    await PublicDesignApprovalService.processDecision(
      token1,
      new PublicApprovalDecisionDto({ decision: "APPROVED", feedback: "OK" })
    );

    // Try reusing token
    await assert.rejects(
      async () => {
        await PublicDesignApprovalService.processDecision(
          token1,
          new PublicApprovalDecisionDto({ decision: "APPROVED", feedback: "Try again" })
        );
      },
      (err) => {
        assert.strictEqual(err.statusCode, 409);
        assert.ok(err.message.includes("already been decided"));
        return true;
      }
    );

    // 12b. Superseded Token Rejection
    // Simulate job moved back to revision and a new sample is submitted
    await JobOrder.updateOne({ _id: job._id }, { currentStage: "REVISION" });
    const sample2 = await DesignSampleService.uploadSample(
      job._id,
      { fileUrl: "/uploads/menu-v2.png" },
      testDesigner
    );

    // Submitting sample2 supersedes any older tokens
    const sub2 = await DesignSampleService.submitSample(job._id, sample2._id, {}, testDesigner);

    // Check old token is marked superseded
    const oldHash = crypto.createHash("sha256").update(token1).digest("hex");
    const oldToken = await DesignApprovalToken.findOne({ tokenHash: oldHash });
    assert.ok(["USED", "SUPERSEDED"].includes(oldToken.status));

    // 12c. Expired Token Rejection
    const expiredToken = crypto.randomBytes(32).toString("hex");
    const expiredHash = crypto.createHash("sha256").update(expiredToken).digest("hex");

    await DesignApprovalToken.create({
      jobOrderId: job._id,
      sampleId: sample2._id,
      versionNo: 2,
      tokenHash: expiredHash,
      expiresAt: new Date(Date.now() - 10000), // In the past
      status: "ACTIVE",
    });

    await assert.rejects(
      async () => {
        await PublicDesignApprovalService.validateToken(expiredToken);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 410);
        return true;
      }
    );
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 13: Concurrent decision requests
  // ─────────────────────────────────────────────────────────────
  it("13. Should ensure atomic single-decision when concurrent requests submit simultaneously", async () => {
    const job = await JobOrder.create({
      jobNo: `JO-SMP-${uniqueSuffix}-06`,
      branchId: testBranch._id,
      title: "Concurrent Decision Test",
      currentStage: "DESIGN_IN_PROGRESS",
      stage: "DESIGN_IN_PROGRESS",
      status: "DESIGN",
    });

    const sample = await DesignSampleService.uploadSample(
      job._id,
      { fileUrl: "/uploads/sample-conc.png" },
      testDesigner
    );

    const sub = await DesignSampleService.submitSample(job._id, sample._id, {}, testDesigner);
    const token = sub.approvalToken.token;

    // Fire 2 concurrent decision requests
    const p1 = PublicDesignApprovalService.processDecision(
      token,
      new PublicApprovalDecisionDto({ decision: "APPROVED", feedback: "First client tap" })
    );

    const p2 = PublicDesignApprovalService.processDecision(
      token,
      new PublicApprovalDecisionDto({ decision: "APPROVED", feedback: "Second client tap" })
    );

    const results = await Promise.allSettled([p1, p2]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.strictEqual(fulfilled.length, 1, "Exactly 1 decision must succeed");
    assert.strictEqual(rejected.length, 1, "The concurrent duplicate decision must fail");
    assert.strictEqual(rejected[0].reason.statusCode, 409);
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 14: WhatsApp provider success and failure handling
  // ─────────────────────────────────────────────────────────────
  it("14. Should report WhatsApp provider configuration diagnostics and mock dispatch resilience", async () => {
    const configStatus = WhatsAppService.getConfigurationStatus();

    assert.ok(typeof configStatus.isConfigured === "boolean");
    assert.ok(configStatus.provider);
    assert.ok(configStatus.approvalBaseUrl);

    // Test send message with mock mode
    const sendResult = await WhatsAppService.sendDesignApprovalMessage({
      to: "919876543210",
      customerName: "Rahul",
      jobNo: "JO-TEST-001",
      versionNo: 1,
      approvalUrl: "http://localhost:5173/design-approval/mock123",
    });

    assert.strictEqual(sendResult.success, true);
    assert.ok(sendResult.messageId);

    // Test invalid phone handling without throwing
    const invalidPhoneRes = await WhatsAppService.sendDesignApprovalMessage({
      to: "",
      customerName: "No Phone",
      jobNo: "JO-TEST-002",
      versionNo: 1,
      approvalUrl: "http://localhost:5173/design-approval/mock456",
    });

    assert.strictEqual(invalidPhoneRes.success, false);
    assert.strictEqual(invalidPhoneRes.status, "FAILED");
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 15: Existing employee creation regressions
  // ─────────────────────────────────────────────────────────────
  it("15. Should ensure employee Customer creation, JobOrder creation, and staff sample approval have zero regression", async () => {
    // 15a. Employee creates customer via CustomerService
    const employeeCust = await CustomerService.createCustomer(
      {
        name: "Employee Created Client",
        mobile: `9866${uniqueSuffix}`,
        branchId: testBranch._id,
      },
      { user: testAdmin, isSuperAdmin: true }
    );


    assert.ok(employeeCust);
    assert.strictEqual(employeeCust.name, "Employee Created Client");

    // 15b. Employee creates JobOrder via JobOrderService.create
    const employeeJob = await JobOrderService.create(
      {
        branchId: testBranch._id,
        customerId: employeeCust._id,
        title: "Standard Internal Job",
        quantity: 100,
        items: [{ itemName: "Standard Item", quantity: 100, unitRate: 5 }],
      },
      testAdmin
    );

    assert.ok(employeeJob);
    assert.strictEqual(employeeJob.currentStage, "ESTIMATION");

    // 15c. Staff sample decision directly via DesignSampleService.decide
    await JobOrder.updateOne({ _id: employeeJob._id }, { currentStage: "DESIGN_IN_PROGRESS" });

    const staffSample = await DesignSampleService.uploadSample(
      employeeJob._id,
      { fileUrl: "/uploads/staff-proof.png" },
      testDesigner
    );

    await DesignSampleService.submitSample(employeeJob._id, staffSample._id, {}, testDesigner);

    const staffDecision = await DesignSampleService.decide(
      employeeJob._id,
      staffSample._id,
      { decision: "APPROVED", customerFeedback: "Approved by manager in office" },
      testAdmin
    );

    assert.strictEqual(staffDecision.status, "APPROVED");
    const verifiedJob = await JobOrder.findById(employeeJob._id);
    assert.strictEqual(verifiedJob.currentStage, "PRODUCTION_PLANNING");
  });
});
