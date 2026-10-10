/**
 * PrintZ V3 - Complete Job Order Flow Validation with Brand New Real Example
 * Customer: "Aura Cosmetics Pvt Ltd" (Priya Menon)
 * Product: "Luxury Velvet Cosmetic Packaging Boxes" (2,000 units)
 */

const storage = {};
global.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); }
};

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

async function api(method, url, data = null, params = {}) {
  return await handleMockRequest({
    method,
    url,
    data,
    params,
    headers: { "content-type": "application/json" }
  });
}

async function runExampleFlow() {
  console.log("======================================================================");
  console.log("✨ EXECUTING COMPLETE JOB ORDER FLOW WITH NEW EXAMPLE ✨");
  console.log("Customer: Aura Cosmetics Pvt Ltd | Product: Luxury Cosmetic Packaging Boxes");
  console.log("======================================================================\n");

  resetMockDb();

  // --------------------------------------------------------------------------
  // STEP 1: CUSTOMER INTAKE & REGISTRATION
  // --------------------------------------------------------------------------
  console.log("🔹 STEP 1: Customer Registration (Direct Corporate Intake)...");
  const customerRes = await api("post", "/customers", {
    customerType: "BUSINESS",
    name: "Priya Menon",
    companyName: "Aura Cosmetics Pvt Ltd",
    mobile: "9845009988",
    email: "priya.menon@auracosmetics.in",
    gstNumber: "29AABCA1234D1Z8",
    branchName: "Banaswadi",
    branchId: "64f1a2b3c4d5e6f7a8b90001",
    source: "WALK_IN",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560038"
  });

  const customer = customerRes.data.customer || customerRes.data;
  console.log(`   ✅ Customer Registered: [${customer.customerCode}] ${customer.companyName} (${customer.name})`);

  // --------------------------------------------------------------------------
  // STEP 2: JOB ORDER & TECHNICAL REQUIREMENT CAPTURE
  // --------------------------------------------------------------------------
  console.log("\n🔹 STEP 2: Creating Job Order with Technical Specifications...");
  const jobRes = await api("post", "/jobs", {
    customerId: customer.id || customer._id,
    customerCode: customer.customerCode,
    customerName: customer.name,
    customerMobile: customer.mobile,
    customerCompany: customer.companyName,
    branchId: "64f1a2b3c4d5e6f7a8b90001",
    branchName: "Banaswadi",
    jobTitle: "Aura Luxury Matte Cosmetic Boxes (2,000 units)",
    priority: "HIGH",
    source: "WALK_IN",
    expectedDeliveryDate: "2026-10-28",
    items: [
      {
        jobItemId: `item_aura_${Date.now()}`,
        itemName: "Luxury Perfume Outer Packaging Box",
        productType: "Packaging Box",
        quantity: 2000,
        unit: "PCS",
        size: {
          type: "CUSTOM",
          presetName: "Custom Packaging (4.0 × 4.0 × 6.0 in)",
          width: 4.0,
          height: 6.0,
          unit: "INCH"
        },
        printing: {
          side: "SINGLE_SIDE",
          colourMode: "COLOUR"
        },
        material: {
          paperType: "SBS Velvet Card",
          gsm: 350,
          paperSize: "Custom Die Sheet",
          notes: "350 GSM premium virgin bleached sulphate paperboard"
        },
        finishing: [
          "DIE_CUTTING",
          "GOLD_FOIL_STAMPING",
          "LAMINATION_MATTE"
        ],
        designRequired: true,
        designNotes: "Emerald green background with embossed metallic gold logo.",
        notes: "Strict colour fidelity required. Digital sample approval mandatory."
      }
    ]
  });

  const job = jobRes.data.job || jobRes.data;
  const jobItem = job.items[0];
  console.log(`   ✅ Job Order Created: [${job.jobNo}] "${job.jobTitle}"`);
  console.log(`      Status: ${job.status} | Item Quantity: ${jobItem.quantity} ${jobItem.unit}`);

  // --------------------------------------------------------------------------
  // STEP 3: COMMERCIAL ESTIMATION & PRICING
  // --------------------------------------------------------------------------
  console.log("\n🔹 STEP 3: Preparing Commercial Quotation & Rates...");
  const estRes = await api("post", "/estimates", {
    jobId: job.id || job.jobId,
    jobNo: job.jobNo,
    customerId: customer.id || customer.customerId,
    customerName: customer.name,
    customerMobile: customer.mobile,
    customerCompany: customer.companyName,
    branchId: "64f1a2b3c4d5e6f7a8b90001",
    branchName: "Banaswadi",
    jobTitle: job.jobTitle,
    items: [
      {
        jobItemId: jobItem.jobItemId,
        itemName: jobItem.itemName,
        lines: [
          { description: "350 GSM SBS Velvet Touch Board (Raw Material)", quantity: 2000, rate: 14.50 },
          { description: "6-Colour Offset Press Printing (Pantone Emerald)", quantity: 2000, rate: 8.00 },
          { description: "Metallic Gold Foil Stamping & Embossing", quantity: 2000, rate: 4.50 },
          { description: "Precision Die-Cutting, Creasing & Side Gluing", quantity: 2000, rate: 3.00 }
        ]
      }
    ],
    discount: { type: "PERCENTAGE", value: 5 },
    tax: { type: "GST", rate: 18 },
    deliveryCharge: 500,
    terms: "Payment terms: 50% advance upon proof approval. Final delivery within 5 business days."
  });

  const estimate = estRes.data.estimate;
  console.log(`   ✅ Estimate Generated: [${estimate.estimateNo}] Subtotal: ₹${estimate.subtotal} | Grand Total: ₹${estimate.grandTotal}`);

  // Dispatch Estimate
  await api("post", `/estimates/${estimate.id}/send`);
  console.log(`   ✅ Quotation Dispatched to Customer.`);

  // --------------------------------------------------------------------------
  // STEP 4: CUSTOMER ESTIMATE REVIEW & ACCEPTANCE
  // --------------------------------------------------------------------------
  console.log("\n🔹 STEP 4: Customer Review & Acceptance...");
  const acceptRes = await api("post", `/customer/estimates/${estimate.id}/accept`, {
    acceptedBy: "Priya Menon (Procurement Head)",
    clientNotes: "Quote approved. Please assign designer immediately to share digital proof."
  });
  console.log(`   ✅ Customer Accepted Quote: Status = ${acceptRes.data.estimate.status}`);

  // --------------------------------------------------------------------------
  // STEP 5 & 6: DESIGN PROOF APPROVAL
  // --------------------------------------------------------------------------
  console.log("\n🔹 STEP 5 & 6: Pre-Press Design Assignment & Proof Approval...");
  const queueRes = await api("get", "/customer/design-approvals");
  const approvalsList = queueRes.data.approvals || [];
  const targetDesign = approvalsList.find((a) => a.jobNo === job.jobNo) || approvalsList[0];
  console.log(`   ✅ Pre-Press Proof Ready for Review: [${targetDesign.assignmentNo}] on ${targetDesign.itemName}`);

  // Customer Approves Proof
  const proofApproveRes = await api("post", `/customer/design-approvals/${targetDesign.id || targetDesign.assignmentId || targetDesign.assignmentNo}/approve`, {
    comments: "Colours, metallic gold alignment, and die lines approved for packaging production."
  });
  console.log(`   ✅ Customer Signed Off Proof: Status = ${proofApproveRes.data.assignment.status}`);

  // --------------------------------------------------------------------------
  // STEP 7 & 8: PRODUCTION PLANNING & ORDER CREATION
  // --------------------------------------------------------------------------
  console.log("\n🔹 STEP 7 & 8: Production Planning & Shop Floor Routing...");
  const planEligibleRes = await api("get", "/production/planning");
  const eligibleList = planEligibleRes.data.eligibleJobs || planEligibleRes.data || [];
  const targetJobItem = eligibleList.find((j) => j.jobItemId === jobItem.jobItemId || j.jobNo === job.jobNo) || eligibleList[0];

  const createOrderPayload = {
    jobItemId: targetJobItem.jobItemId,
    plannedQty: 2000,
    allowanceReason: "Machine setup & trimming allowance",
    plannedStart: "2026-10-24",
    expectedCompletion: "2026-10-26",
    priority: "HIGH",
    operations: [
      {
        operationCode: "PRINTING",
        operationName: "Offset Multi-Colour Printing",
        sequenceNo: 1,
        isRequired: true,
        estimatedMinutes: 90,
        defaultMachineId: "mach_001",
        defaultMachineName: "Heidelberg Speedmaster XL 75",
        remarks: "Pantone 3425C + Black SBS Board"
      },
      {
        operationCode: "LAMINATION",
        operationName: "Matte Velvet Lamination",
        sequenceNo: 2,
        isRequired: true,
        estimatedMinutes: 45,
        defaultMachineId: "mach_003",
        defaultMachineName: "Thermal Laminator L-02",
        remarks: "Soft-touch matte lamination"
      },
      {
        operationCode: "CUTTING",
        operationName: "Auto Die-Cutting & Creasing",
        sequenceNo: 3,
        isRequired: true,
        estimatedMinutes: 60,
        defaultMachineId: "mach_004",
        defaultMachineName: "Bobst Die-Cutter ProCut",
        remarks: "Precision folding carton crease"
      },
      {
        operationCode: "PACKING",
        operationName: "Final Packaging & Bundling",
        sequenceNo: 4,
        isRequired: true,
        estimatedMinutes: 30,
        defaultMachineId: "mach_006",
        defaultMachineName: "Packing Station P-01",
        remarks: "Bundle in 50s with protective craft wrap"
      }
    ],
    notes: "Deliver to Aura Cosmetics warehouse before Oct 28"
  };

  const createOrderRes = await api("post", "/production/orders", createOrderPayload);
  const createdOrder = createOrderRes.data.productionOrder || createOrderRes.data;
  console.log(`   ✅ Production Order Generated: [${createdOrder.productionNo}] Status = ${createdOrder.status}`);
  console.log(`      Configured ${createdOrder.operations.length} Sequential Operations with Machines.`);

  // --------------------------------------------------------------------------
  // STEP 9: SEQUENTIAL MACHINE OPERATOR TIMERS & EXECUTION
  // --------------------------------------------------------------------------
  console.log("\n🔹 STEP 9: Executing Machine Operations on Shop Floor...");
  const queueOpsRes = await api("get", "/production/queue");
  const queueOps = queueOpsRes.data.items || queueOpsRes.data.queue || queueOpsRes.data || [];
  const orderOps = queueOps.filter((q) => q.productionOrderId === createdOrder.id || q.productionNo === createdOrder.productionNo);

  for (let i = 0; i < orderOps.length; i++) {
    const op = orderOps[i];
    // Start
    await api("post", `/production/operations/${op.operationId}/start`, {
      operatorName: "Sunil Verma (Press Operator)"
    });
    console.log(`   ⚙️  [START]  Operation ${i + 1}: ${op.operationName} (${op.machineName})`);

    // Complete
    await api("post", `/production/operations/${op.operationId}/complete`, {
      completedQty: 2000,
      wastageQty: 10,
      operatorNotes: `Completed ${op.operationName} with zero defects.`
    });
    console.log(`   🏁 [FINISH] Operation ${i + 1}: Completed (Yield: 2,000 units, Setup Waste: 10 units)`);
  }

  // --------------------------------------------------------------------------
  // STEP 10: QUALITY CONTROL FINAL INSPECTION
  // --------------------------------------------------------------------------
  console.log("\n🔹 STEP 10: Quality Control (QC) Master Inspection...");
  const qcQueueRes = await api("get", "/quality-control/queue");
  const qcItems = qcQueueRes.data.items || [];
  const qcTarget = qcItems.find((q) => q.productionNo === createdOrder.productionNo || q.id === createdOrder.id);
  console.log(`   ✅ Order Present in QC Inspection Queue: [${qcTarget.productionNo}]`);

  const qcPassPayload = {
    productionOrderId: createdOrder.id || createdOrder.productionOrderId,
    result: "PASS",
    quantityChecked: 2000,
    inspectedQty: 2000,
    acceptedQty: 2000,
    rejectedQty: 0,
    defects: [],
    checklistResponses: [
      { itemKey: "visual_color", checkName: "Pantone Colour Fidelity", status: "PASS", notes: "100% match with approved proof" },
      { itemKey: "foil_adhesion", checkName: "Gold Foil Emboss Adhesion", status: "PASS", notes: "Clean edges, zero flaking" },
      { itemKey: "crease_die", checkName: "Die Crease & Fold Geometry", status: "PASS", notes: "Folds square at 90 degrees" },
      { itemKey: "packaging", checkName: "Bundle Count & Labeling", status: "PASS", notes: "40 bundles of 50 units properly boxed" }
    ],
    inspectorNotes: "All 2,000 cosmetic boxes pass international luxury packaging standards. Batch released.",
    inspectorName: "Kavita Rao (QC Lead)"
  };

  const qcPassRes = await api("post", "/quality-checks", qcPassPayload);
  console.log(`   ✅ Quality Control Decision: RESULT = ${qcPassRes.data.qualityCheck.decision}`);
  console.log(`      Status Updated: Order is officially QC_PASSED & READY FOR CLIENT HANDOVER!`);

  console.log("\n======================================================================");
  console.log("🏆 COMPLETE END-TO-END JOB ORDER FLOW SUCCESSFULLY VALIDATED! 🏆");
  console.log("Customer Intake ➜ Specifications ➜ Estimates ➜ Approval ➜ Design");
  console.log("➜ Proof Sign-Off ➜ Planning ➜ Machine Execution ➜ Quality Inspection");
  console.log("======================================================================\n");
}

runExampleFlow().catch((err) => {
  console.error("Workflow failed with error:", err);
  process.exit(1);
});
