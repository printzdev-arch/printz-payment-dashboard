/**
 * PrintZ V3 - Comprehensive End-to-End Workflow Validation Test
 * Simulates and verifies the complete lifecycle from Customer Registration -> Job -> Estimate -> Rejection/Approval -> Design -> Proof Approval -> Production Planning -> Production Execution -> Quality Control & Rework/Reprint.
 */

// Minimal localStorage mock for Node environment
const storage = {};
global.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); }
};

// Set manager auth in localStorage
localStorage.setItem("user", JSON.stringify({
  id: "usr_001",
  name: "Arun Kumar",
  email: "arun.manager@printz.com",
  role: "manager",
  branch: "Banaswadi",
  branchName: "Banaswadi",
  branchId: "64f1a2b3c4d5e6f7a8b90001",
  branchCode: "BR001"
}));

import { handleMockRequest, resetMockDb } from "./src/mock/mockServer.js";

async function makeRequest(method, url, data = null, params = {}) {
  const config = {
    method,
    url,
    data,
    params,
    headers: { "content-type": "application/json" }
  };
  return await handleMockRequest(config);
}

async function runWorkflowTest() {
  console.log("===============================================================");
  console.log("🚀 STARTING PRINTZ V3 END-TO-END WORKFLOW VALIDATION");
  console.log("===============================================================\n");

  resetMockDb();

  let passedSteps = 0;
  let totalSteps = 0;

  function assert(condition, message) {
    totalSteps++;
    if (condition) {
      passedSteps++;
      console.log(`  ✅ [PASS] Step ${totalSteps}: ${message}`);
    } else {
      console.error(`  ❌ [FAIL] Step ${totalSteps}: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // -------------------------------------------------------------
  // STEP 1: Customer Registration (Walk-in & QR)
  // -------------------------------------------------------------
  console.log("--- 1. CUSTOMER REGISTRATION ---");
  
  // 1a. Walk-in Customer
  const walkinPayload = {
    customerType: "BUSINESS",
    name: "Vijay Kumar",
    companyName: "TechPrint Innovations Pvt Ltd",
    mobile: "9988771122",
    email: "vijay@techprint.in",
    gstNumber: "29AAAAA0000A1Z5",
    branchName: "Banaswadi",
    branchId: "64f1a2b3c4d5e6f7a8b90001",
    source: "WALK_IN",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560043"
  };

  const walkinRes = await makeRequest("post", "/customers", walkinPayload);
  assert(walkinRes.status === 201 || walkinRes.status === 200, "Walk-in customer registered");
  const createdWalkin = walkinRes.data.customer || walkinRes.data;
  assert(createdWalkin.name === "Vijay Kumar", "Walk-in customer name matches");
  assert(createdWalkin.customerCode.startsWith("CUS-"), `Customer code generated: ${createdWalkin.customerCode}`);

  // 1b. Mobile QR Customer
  const qrPayload = {
    customerType: "INDIVIDUAL",
    name: "Sunita Sharma",
    mobile: "9988771133",
    email: "sunita.sharma@gmail.com",
    branchName: "Banaswadi",
    branchId: "64f1a2b3c4d5e6f7a8b90001",
    source: "QR",
    city: "Bengaluru",
    pincode: "560043"
  };
  const qrRes = await makeRequest("post", "/customers", qrPayload);
  assert(qrRes.status === 201 || qrRes.status === 200, "QR Customer registered");
  const createdQr = qrRes.data.customer || qrRes.data;
  assert(createdQr.source === "QR", "QR source verified");

  // -------------------------------------------------------------
  // STEP 2: Job Creation & Requirement Capture
  // -------------------------------------------------------------
  console.log("\n--- 2. JOB ORDER & REQUIREMENT CAPTURE ---");
  
  const jobPayload = {
    customerId: createdWalkin.id || createdWalkin._id || createdWalkin.customerId,
    customerCode: createdWalkin.customerCode,
    customerName: createdWalkin.name,
    customerMobile: createdWalkin.mobile,
    customerCompany: createdWalkin.companyName,
    branchId: "64f1a2b3c4d5e6f7a8b90001",
    branchName: "Banaswadi",
    jobTitle: "TechPrint Corporate Tri-Fold Brochures",
    priority: "HIGH",
    source: "WALK_IN",
    expectedDeliveryDate: "2026-10-25",
    items: [
      {
        jobItemId: `item_${Date.now()}_1`,
        itemName: "Corporate Tri-Fold Brochure",
        productType: "Brochure / Pamphlet",
        quantity: 500,
        unit: "PCS",
        size: {
          type: "PRESET",
          presetName: "A4 Tri-Fold (8.27 × 11.69 in)",
          width: 8.27,
          height: 11.69,
          unit: "INCH"
        },
        printing: {
          side: "DOUBLE_SIDE",
          colourMode: "COLOUR"
        },
        material: {
          paperType: "Art Paper",
          gsm: 250,
          paperSize: "A4",
          notes: "Gloss finish art paper"
        },
        finishing: ["CUTTING", "CREASING", "LAMINATION_GLOSS"],
        designRequired: true,
        designNotes: "3-panel glossy brochure layout with logo and product matrix",
        notes: "Strict colour calibration matching brand cyan"
      }
    ]
  };

  const jobRes = await makeRequest("post", "/jobs", jobPayload);
  assert(jobRes.status === 201 || jobRes.status === 200, "Job order created successfully");
  const createdJob = jobRes.data.job || jobRes.data;
  assert(createdJob.jobNo.startsWith("JOB-"), `Job No generated: ${createdJob.jobNo}`);
  assert(createdJob.items.length === 1, "Job contains 1 item");
  const jobItem = createdJob.items[0];

  // -------------------------------------------------------------
  // STEP 3 & 4: Commercial Estimate Creation, Rejection & Approval
  // -------------------------------------------------------------
  console.log("\n--- 3. ESTIMATION & CUSTOMER APPROVAL ---");

  const estimatePayload = {
    jobId: createdJob.id || createdJob.jobId || createdJob._id,
    jobNo: createdJob.jobNo,
    customerId: createdWalkin.id || createdWalkin.customerId,
    customerName: createdWalkin.name,
    customerMobile: createdWalkin.mobile,
    customerCompany: createdWalkin.companyName,
    branchId: "64f1a2b3c4d5e6f7a8b90001",
    branchName: "Banaswadi",
    items: [
      {
        jobItemId: jobItem.jobItemId || jobItem.id,
        itemName: jobItem.itemName,
        lines: [
          {
            description: "A4 Tri-Fold Brochure Printing (Double side color)",
            category: "PRINTING",
            quantity: 500,
            rate: 15.50,
            unit: "PCS"
          },
          {
            description: "Creative Design & Prepress Proofing",
            category: "DESIGN",
            quantity: 1,
            rate: 500.00,
            unit: "JOB"
          },
          {
            description: "Thermal Gloss Lamination & Precision Crease",
            category: "FINISHING",
            quantity: 500,
            rate: 0.70,
            unit: "PCS"
          }
        ]
      }
    ],
    tax: { type: "GST_18", rate: 18 },
    validUntil: "2026-11-15",
    status: "SENT"
  };

  const estRes = await makeRequest("post", "/estimates", estimatePayload);
  assert(estRes.status === 201 || estRes.status === 200, "Estimate created and marked SENT");
  const createdEst = estRes.data.estimate || estRes.data;
  const estId = createdEst.id || createdEst._id || createdEst.estimateId;

  // 3a. Test Customer Estimate Rejection Flow (Requests revision)
  const rejectRes = await makeRequest("post", `/customer/estimates/${estId}/reject`, {
    reason: "Price / Specification Change",
    comments: "Price slightly high for tri-fold, requesting 5% discount",
    reasonCode: "PRICE_HIGH"
  });
  assert(rejectRes.status === 200, "Estimate V1 rejection/revision request handled cleanly");
  assert(rejectRes.data.estimate.status === "REJECTED", "Estimate V1 status set to REJECTED");

  // 3b. Estimator creates Revised Estimate V2 with 5% discount
  const revisedEstimatePayload = {
    ...estimatePayload,
    version: "V2",
    versionNumber: 2,
    discount: { type: "PERCENTAGE", value: 5 },
    customerNotes: "Revised with 5% special discount as requested.",
    status: "SENT"
  };
  const estV2Res = await makeRequest("post", "/estimates", revisedEstimatePayload);
  assert(estV2Res.status === 201 || estV2Res.status === 200, "Revised Estimate V2 created and sent to customer");
  const createdEstV2 = estV2Res.data.estimate || estV2Res.data;
  const estV2Id = createdEstV2.id || createdEstV2._id || createdEstV2.estimateId;

  // 3c. Customer approves Revised Estimate V2
  const approveRes = await makeRequest("post", `/customer/estimates/${estV2Id}/accept`, {
    approvalMethod: "CUSTOMER_PORTAL_SIGNATURE",
    approvedBy: "Vijay Kumar",
    signatureDataUrl: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    comments: "Approved with revised rate and discount"
  });
  assert(approveRes.status === 200, "Revised Estimate V2 approved successfully");
  assert(approveRes.data.estimate.status === "ACCEPTED", "Estimate V2 status updated to ACCEPTED");

  // -------------------------------------------------------------
  // STEP 5 & 6: Design Assignment & Proof Approval
  // -------------------------------------------------------------
  console.log("\n--- 4. DESIGN WORKSPACE & PROOF APPROVAL ---");

  // 4a. Get Design Queue
  const queueRes = await makeRequest("get", "/customer/design-approvals");
  assert(queueRes.status === 200, "Fetched customer design approvals");
  const approvalsList = queueRes.data.approvals || [];
  const targetDesign = approvalsList.find((a) => a.jobNo === createdJob.jobNo) || approvalsList[0];
  assert(Boolean(targetDesign), "Found design assignment generated from estimate approval");

  // 4b. Customer Approves Proof (Step 6 -> Ready for Production)
  const proofApproveRes = await makeRequest("post", `/customer/design-approvals/${targetDesign.id || targetDesign.assignmentId || targetDesign.assignmentNo}/approve`, {
    comments: "Colours and layout approved for offset digital printing."
  });
  assert(proofApproveRes.status === 200, "Customer proof approved successfully");

  // -------------------------------------------------------------
  // STEP 8: Production Planning & Production Order Creation
  // -------------------------------------------------------------
  console.log("\n--- 5. PRODUCTION PLANNING & ORDER CREATION ---");

  // 5a. Query Eligible Jobs for Planning
  const planEligibleRes = await makeRequest("get", "/production/planning");
  assert(planEligibleRes.status === 200, "Fetched eligible jobs for production planning");
  const eligibleList = planEligibleRes.data.eligibleJobs || planEligibleRes.data;
  assert(eligibleList.length > 0, "Found eligible job items for planning");

  const targetJobItem = eligibleList.find((j) => j.jobItemId === jobItem.jobItemId || j.jobNo === createdJob.jobNo || (!j.hasActiveOrder && j.planningStatus !== "PLANNED")) || eligibleList[0];
  assert(Boolean(targetJobItem), `Selected eligible job item for planning: ${targetJobItem.jobNo}`);

  // 5b. Create Production Order (status = PLANNED)
  const createOrderPayload = {
    jobItemId: targetJobItem.jobItemId,
    plannedQty: targetJobItem.requiredQuantity + 25, // 5% allowance
    allowanceReason: "Machine setup & trimming allowance",
    plannedStart: "2026-10-23",
    expectedCompletion: "2026-10-24",
    priority: "HIGH",
    operations: [
      {
        operationCode: "PRINTING",
        operationName: "Digital Colour Printing",
        sequenceNo: 1,
        isRequired: true,
        estimatedMinutes: 30,
        defaultMachineId: "mach_001",
        defaultMachineName: "Konica Minolta AccurioPress C4080",
        remarks: "Digital CMYK on Art Paper 250 GSM"
      },
      {
        operationCode: "LAMINATION",
        operationName: "Gloss Lamination",
        sequenceNo: 2,
        isRequired: true,
        estimatedMinutes: 20,
        defaultMachineId: "mach_003",
        defaultMachineName: "Thermal Laminator L-02",
        remarks: "Thermal gloss lamination both sides"
      },
      {
        operationCode: "CUTTING",
        operationName: "Precision Cutting & Creasing",
        sequenceNo: 3,
        isRequired: true,
        estimatedMinutes: 15,
        defaultMachineId: "mach_004",
        defaultMachineName: "Hydraulic Guillotine G-01",
        remarks: "Tri-fold creasing lines and trim"
      },
      {
        operationCode: "PACKING",
        operationName: "Packaging & Bundling",
        sequenceNo: 4,
        isRequired: true,
        estimatedMinutes: 10,
        defaultMachineId: "mach_006",
        defaultMachineName: "Packing Station P-01",
        remarks: "Bundle in 100s in craft paper wrap"
      }
    ],
    notes: "Deliver before 5 PM on Oct 24"
  };

  const createOrderRes = await makeRequest("post", "/production/orders", createOrderPayload);
  assert(createOrderRes.status === 201 || createOrderRes.status === 200, "Production order created");
  const createdOrder = createOrderRes.data.productionOrder || createOrderRes.data;
  assert(createdOrder.status === "PLANNED", `Production order status is PLANNED (${createdOrder.productionNo})`);
  assert(createdOrder.operations.length === 4, "Configured 4 sequential production operations");

  // -------------------------------------------------------------
  // STEP 9: Production Operations Execution
  // -------------------------------------------------------------
  console.log("\n--- 6. PRODUCTION QUEUE & OPERATIONS EXECUTION ---");

  // 6a. Check Production Queue
  const queueOpsRes = await makeRequest("get", "/production/queue");
  assert(queueOpsRes.status === 200, "Fetched production operations queue");
  const queueOps = queueOpsRes.data.items || queueOpsRes.data.queue || queueOpsRes.data;
  
  // Find operations for this production order
  const orderOps = queueOps.filter((q) => q.productionOrderId === createdOrder.id || q.productionNo === createdOrder.productionNo);
  assert(orderOps.length === 4, `Found ${orderOps.length} queued operations for order`);

  // Operation 1 should be READY, others BLOCKED
  assert(orderOps[0].availabilityStatus === "READY", "First operation (PRINTING) is READY");
  assert(orderOps[1].availabilityStatus === "BLOCKED", "Second operation (LAMINATION) is BLOCKED");

  // 6b. Execute Operation 1 (Printing)
  const op1 = orderOps[0];
  const startOp1 = await makeRequest("post", `/production/operations/${op1.operationId}/start`, {
    operatorName: "Ramesh P (Print Lead)"
  });
  assert(startOp1.status === 200, "Operation 1 (Printing) started -> status RUNNING");

  const completeOp1 = await makeRequest("post", `/production/operations/${op1.operationId}/complete`, {
    completedQty: 525,
    wastageQty: 5,
    operatorNotes: "Flawless digital print run, 5 sheets setup waste"
  });
  assert(completeOp1.status === 200, "Operation 1 (Printing) completed -> status COMPLETED");

  // 6c. Execute Remaining Operations sequentially
  for (let i = 1; i < orderOps.length; i++) {
    const nextOp = orderOps[i];
    const startNext = await makeRequest("post", `/production/operations/${nextOp.operationId}/start`, {
      operatorName: "Team Operator"
    });
    assert(startNext.status === 200, `Operation ${i + 1} (${nextOp.operationName}) started`);

    const completeNext = await makeRequest("post", `/production/operations/${nextOp.operationId}/complete`, {
      completedQty: 520,
      wastageQty: 2,
      operatorNotes: `Completed ${nextOp.operationName} successfully`
    });
    assert(completeNext.status === 200, `Operation ${i + 1} (${nextOp.operationName}) completed`);
  }

  // -------------------------------------------------------------
  // STEP 10: Quality Control & Rework / Reprint Lifecycle
  // -------------------------------------------------------------
  console.log("\n--- 7. QUALITY CONTROL & REWORK / REPRINT ---");

  // 7a. Check QC Queue - Order should now appear in QC Queue
  const qcQueueRes = await makeRequest("get", "/quality-control/queue");
  assert(qcQueueRes.status === 200, "Fetched Quality Control queue");
  const qcItems = qcQueueRes.data.items || [];
  const qcTarget = qcItems.find((q) => q.productionNo === createdOrder.productionNo || q.id === createdOrder.id);
  assert(Boolean(qcTarget), "Completed production order is now present in QC Inspection Queue");

  // 7b. Test QC Issue Flow (Simulate Reprint Request on sample)
  const qcIssuePayload = {
    productionOrderId: createdOrder.id || createdOrder.productionOrderId,
    result: "ISSUE",
    correctiveAction: "REPRINT",
    quantityChecked: 520,
    inspectedQty: 520,
    acceptedQty: 470,
    rejectedQty: 50,
    defects: [
      {
        defectCode: "DEF_COLOR_MISMATCH",
        defectName: "Color Shift / Mismatch",
        defectCategory: "PRINTING",
        quantity: 50,
        severity: "MAJOR",
        notes: "Cyan saturation low on last 50 sheets"
      }
    ],
    checklistResponses: [
      { itemKey: "visual_color", checkName: "Color Accuracy", status: "FAIL", notes: "Cyan low on batch tail" },
      { itemKey: "dimensions", checkName: "Size & Dimensions", status: "PASS", notes: "Exact A4 Tri-Fold" }
    ],
    inspectorNotes: "50 copies have slight colour drift. Requesting reprint of 50 pcs.",
    inspectorName: "Lakshmi P (QC Lead)"
  };

  const qcIssueRes = await makeRequest("post", "/quality-checks", qcIssuePayload);
  assert(qcIssueRes.status === 201 || qcIssueRes.status === 200, "QC Issue logged with corrective action REPRINT");
  assert(qcIssueRes.data.qualityCheck?.correctiveAction === "REPRINT", "Reprint request generated");

  // 7c. Check Reprint Requests Directory & Approve Reprint
  const reprintListRes = await makeRequest("get", "/reprint-requests");
  assert(reprintListRes.status === 200, "Fetched reprint requests");
  const reprintRequests = reprintListRes.data.reprintRequests || [];
  const reprintItem = reprintRequests.find((r) => r.productionNo === createdOrder.productionNo);
  assert(Boolean(reprintItem), "Found reprint request in manager queue");

  const approveReprintRes = await makeRequest("post", `/reprint-requests/${reprintItem.id}/approve`, {
    managerNotes: "Approved reprint of 50 pcs. Recalibrate cyan toner before run."
  });
  assert(approveReprintRes.status === 200, "Manager approved reprint request");
  assert(approveReprintRes.data.reprintRequest.status === "APPROVED", "Reprint status is APPROVED");

  // 7d. Final Corrective QC Inspection: PASS Flow
  const qcPassPayload = {
    productionOrderId: createdOrder.id || createdOrder.productionOrderId,
    result: "PASS",
    quantityChecked: 520,
    inspectedQty: 520,
    acceptedQty: 520,
    rejectedQty: 0,
    defects: [],
    checklistResponses: [
      { itemKey: "visual_color", checkName: "Color Accuracy", status: "PASS", notes: "100% matched to proof" },
      { itemKey: "dimensions", checkName: "Size & Dimensions", status: "PASS", notes: "Exact A4 Tri-Fold" },
      { itemKey: "finishing", checkName: "Lamination & Creasing", status: "PASS", notes: "Clean gloss and sharp creases" },
      { itemKey: "packing", checkName: "Packing & Labeling", status: "PASS", notes: "Boxed and labeled correctly" }
    ],
    inspectorNotes: "All 520 copies verified and meet strict quality criteria. Approved for dispatch / POS.",
    inspectorName: "Lakshmi P (QC Lead)"
  };

  const qcPassRes = await makeRequest("post", "/quality-checks", qcPassPayload);
  assert(qcPassRes.status === 201 || qcPassRes.status === 200, "Final QC Pass logged successfully");
  assert(qcPassRes.data.qualityCheck.result === "PASS", "Inspection result is PASS");
  assert(qcPassRes.data.productionOrder.status === "QC_PASSED", "Production order status updated to QC_PASSED");

  // 7e. Verify QC History Timeline
  const historyRes = await makeRequest("get", `/production-orders/${createdOrder.id || createdOrder.productionOrderId}/qc-history`);
  assert(historyRes.status === 200, "Fetched QC History Timeline");
  assert(historyRes.data.qualityChecks.length >= 2, `Recorded ${historyRes.data.qualityChecks.length} historical QC checks (Issue + Pass)`);
  assert(historyRes.data.reprintRequests.length >= 1, "Recorded Reprint Request history");

  console.log("\n===============================================================");
  console.log(`🎉 ALL ${passedSteps}/${totalSteps} WORKFLOW STEPS PASSED WITH 100% SUCCESS!`);
  console.log("===============================================================\n");
}

runWorkflowTest()
  .then(() => {
    console.log("Validation complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Pipeline failure:", err);
    process.exit(1);
  });
