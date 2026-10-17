const BASE_URL = "http://localhost:5000/api";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✔ ${message}`);
}

async function runVerification() {
  console.log("\n========================================================");
  console.log("   PRINTZ DESIGN WORKFLOW END-TO-END VERIFICATION");
  console.log("========================================================\n");

  // 1. Authenticate as Manager
  console.log("1. Authenticating as Manager...");
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "bn@printz.shop",
      password: "Manager@123",
    }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson?.data?.token || loginJson?.token;
  assert(Boolean(token), "Manager logged in and received JWT token");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Fetch designers to use in test
  let desRes = await fetch(`${BASE_URL}/design/pool`, { headers });
  let desJson = await desRes.json();
  let designers = desJson?.data?.designers || desJson?.data || [];
  if (!Array.isArray(designers) || designers.length < 2) {
    desRes = await fetch(`${BASE_URL}/auth/designers`, { headers });
    desJson = await desRes.json();
    designers = desJson?.data || [];
  }
  if (!Array.isArray(designers) || designers.length < 2) {
    desRes = await fetch(`${BASE_URL}/users?role=designer`, { headers });
    desJson = await desRes.json();
    designers = desJson?.data?.items || desJson?.data || [];
  }
  assert(designers.length >= 2, `Found ${designers.length} active designers in pool`);
  const designerA = designers[0];
  const designerB = designers[1];
  console.log(`  Designer A: ${designerA.name} (${designerA._id || designerA.id})`);
  console.log(`  Designer B: ${designerB.name} (${designerB._id || designerB.id})`);

  // Fetch customer and branch for job order creation
  const custRes = await fetch(`${BASE_URL}/customers?limit=1`, { headers });
  const custJson = await custRes.json();
  const customer = custJson?.data?.items?.[0] || custJson?.data?.[0] || {};
  const customerId = customer?._id || customer?.id;
  const customerName = customer?.name || "Naresh";
  const customerPhone = customer?.mobile || "9876543210";

  const branchRes = await fetch(`${BASE_URL}/branches?limit=1`, { headers });
  const branchJson = await branchRes.json();
  const branch = branchJson?.data?.items?.[0] || branchJson?.data?.[0] || {};
  const branchId = branch?._id || branch?.id || "489571a9af51836599708543";

  async function createTestJob(title, jobType = "Flyer Printing") {
    const payload = {
      customerId,
      customerName,
      customerPhone,
      branchId,
      title,
      jobType,
      priority: "MEDIUM",
      source: "WALK_IN",
      items: [
        {
          name: title,
          quantity: 250,
          unitRate: 4.5,
          unit: "pcs",
        },
      ],
    };
    const res = await fetch(`${BASE_URL}/job-orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error("Job creation error response:", res.status, json);
    }
    return json?.data;
  }

  // ========================================================
  // SCENARIO A: Happy Path Workflow
  // UNASSIGNED -> PENDING_DESIGNER_APPROVAL -> IN_PROGRESS -> PENDING_SAMPLE_APPROVAL -> COMPLETED
  // ========================================================
  console.log("\n--- SCENARIO A: Complete Successful Job Lifecycle ---");

  // Step A1: Create Job Order
  const jobA = await createTestJob(`E2E Verify Job Flow Flyer ${Date.now()}`);
  assert(Boolean(jobA?._id), `Created Job Order: ${jobA?.jobNo}`);
  assert(jobA?.designStatus === "UNASSIGNED", `Initial designStatus is 'UNASSIGNED' (actual: ${jobA?.designStatus})`);
  assert(!jobA?.designerId, `Designer is unassigned on creation (actual: ${jobA?.designerName || 'Unassigned'})`);

  // Step A2: Manager Allocates to Designer A (Manual Allocation)
  console.log("  Allocating to Designer A...");
  const allocRes = await fetch(`${BASE_URL}/design/jobs/${jobA._id}/assign`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      employeeId: designerA._id || designerA.id,
      designerId: designerA._id || designerA.id,
      method: "MANUAL",
      notes: "E2E manual allocation to Designer A",
    }),
  });
  const allocJson = await allocRes.json();
  assert(allocRes.ok, `Allocated job to ${designerA.name}`);

  // Fetch updated job
  const checkJobAlloc = await (await fetch(`${BASE_URL}/job-orders/${jobA._id}`, { headers })).json();
  assert(
    checkJobAlloc.data.designStatus === "PENDING_DESIGNER_APPROVAL",
    `Status transitioned to 'PENDING_DESIGNER_APPROVAL' (actual: ${checkJobAlloc.data.designStatus})`
  );

  // Step A3: Designer A Approves Job Order
  console.log("  Designer A accepting assignment...");
  const acceptRes = await fetch(`${BASE_URL}/design/jobs/${jobA._id}/accept`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      designerId: designerA._id || designerA.id,
    }),
  });
  assert(acceptRes.ok, `Designer A accepted job assignment`);

  const checkJobAccepted = await (await fetch(`${BASE_URL}/job-orders/${jobA._id}`, { headers })).json();
  assert(
    checkJobAccepted.data.designStatus === "IN_PROGRESS",
    `Status transitioned to 'IN_PROGRESS' (actual: ${checkJobAccepted.data.designStatus})`
  );

  // Step A4: Designer uploads and submits sample proof
  console.log("  Designer submitting sample proof...");
  const submitProofRes = await fetch(`${BASE_URL}/design/jobs/${jobA._id}/submit-proof`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fileUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800",
      notes: "Proof concept version 1",
    }),
  });
  const submitProofJson = await submitProofRes.json();
  assert(submitProofRes.ok, `Proof submitted successfully`);

  const checkJobProof = await (await fetch(`${BASE_URL}/job-orders/${jobA._id}`, { headers })).json();
  assert(
    checkJobProof.data.designStatus === "PENDING_SAMPLE_APPROVAL",
    `Status transitioned to 'PENDING_SAMPLE_APPROVAL' (actual: ${checkJobProof.data.designStatus})`
  );

  // Step A5: Manager Approves Sample Design
  console.log("  Manager approving sample proof...");
  const approveRes = await fetch(`${BASE_URL}/design/jobs/${jobA._id}/approve`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      notes: "Approved for production run",
    }),
  });
  assert(approveRes.ok, `Sample approved by manager`);

  const checkJobCompleted = await (await fetch(`${BASE_URL}/job-orders/${jobA._id}`, { headers })).json();
  assert(
    checkJobCompleted.data.designStatus === "COMPLETED",
    `Status transitioned to 'COMPLETED' (actual: ${checkJobCompleted.data.designStatus})`
  );
  assert(
    checkJobCompleted.data.currentStage === "PRODUCTION_PLANNING",
    `Job handed off to production module ('PRODUCTION_PLANNING') (actual: ${checkJobCompleted.data.currentStage})`
  );

  // ========================================================
  // SCENARIO B: Initial Designer Rejection & Reallocation
  // UNASSIGNED -> PENDING_DESIGNER_APPROVAL -> REJECTED -> Manager Reallocation -> PENDING_DESIGNER_APPROVAL
  // ========================================================
  console.log("\n--- SCENARIO B: Initial Designer Rejection & Manager Reallocation ---");

  // Step B1: Create fresh job
  const jobB = await createTestJob(`E2E Job for Rejection Flow ${Date.now()}`, "Banner Printing");
  assert(Boolean(jobB?._id), `Created Job Order: ${jobB?.jobNo}`);

  // Step B2: Allocate to Designer A
  await fetch(`${BASE_URL}/design/jobs/${jobB._id}/assign`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      employeeId: designerA._id || designerA.id,
      method: "MANUAL",
    }),
  });

  // Step B3: Designer A Rejects Assignment
  console.log("  Designer A rejecting assignment with reason...");
  const rejectAssignRes = await fetch(`${BASE_URL}/design/jobs/${jobB._id}/reject`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      reason: "Workload capacity full, please reassign",
    }),
  });
  assert(rejectAssignRes.ok, `Designer A rejected assignment`);

  const checkJobRejected = await (await fetch(`${BASE_URL}/job-orders/${jobB._id}`, { headers })).json();
  assert(
    checkJobRejected.data.designStatus === "REJECTED",
    `Status transitioned to 'REJECTED' (actual: ${checkJobRejected.data.designStatus})`
  );
  assert(
    checkJobRejected.data.designRejectionReason === "Workload capacity full, please reassign",
    `Rejection reason recorded (actual: '${checkJobRejected.data.designRejectionReason}')`
  );

  // Step B4: Manager Reallocates to Designer B
  console.log("  Manager reallocating to Designer B...");
  const reallocRes = await fetch(`${BASE_URL}/design/jobs/${jobB._id}/assign`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      employeeId: designerB._id || designerB.id,
      method: "MANUAL",
      notes: "Reassigned to Designer B after capacity rejection",
    }),
  });
  assert(reallocRes.ok, `Reallocated to Designer B`);

  const checkJobReallocated = await (await fetch(`${BASE_URL}/job-orders/${jobB._id}`, { headers })).json();
  assert(
    checkJobReallocated.data.designStatus === "PENDING_DESIGNER_APPROVAL",
    `Status transitioned to 'PENDING_DESIGNER_APPROVAL' for new designer (actual: ${checkJobReallocated.data.designStatus})`
  );
  assert(
    String(checkJobReallocated.data.designerId?._id || checkJobReallocated.data.designerId) === String(designerB._id || designerB.id),
    `Assigned designer is Designer B (${designerB.name})`
  );

  // ========================================================
  // SCENARIO C: Sample Rejection, Revision, and Resubmission
  // PENDING_SAMPLE_APPROVAL -> REJECTED_SAMPLE -> STARTED_REVISION -> PENDING_SAMPLE_APPROVAL -> COMPLETED
  // ========================================================
  console.log("\n--- SCENARIO C: Sample Rejection, Revision & Resubmission ---");

  // Step C1: Accept and submit sample on jobB
  await fetch(`${BASE_URL}/design/jobs/${jobB._id}/accept`, {
    method: "POST",
    headers,
    body: JSON.stringify({ designerId: designerB._id || designerB.id }),
  });
  await fetch(`${BASE_URL}/design/jobs/${jobB._id}/submit-proof`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fileUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800",
      notes: "Initial banner sample v1",
    }),
  });

  const checkJobSampleC = await (await fetch(`${BASE_URL}/job-orders/${jobB._id}`, { headers })).json();
  assert(
    checkJobSampleC.data.designStatus === "PENDING_SAMPLE_APPROVAL",
    `Job is in 'PENDING_SAMPLE_APPROVAL' before sample review`
  );

  // Step C2: Manager rejects sample with revision reason
  console.log("  Reviewer rejecting sample with feedback...");
  const sampleRejRes = await fetch(`${BASE_URL}/design/jobs/${jobB._id}/reject-sample`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      reason: "Logo colors must match PANTONE 186 C and font size needs to increase by 20%",
    }),
  });
  assert(sampleRejRes.ok, `Sample rejected by reviewer`);

  const checkJobSampleRej = await (await fetch(`${BASE_URL}/job-orders/${jobB._id}`, { headers })).json();
  assert(
    checkJobSampleRej.data.designStatus === "REJECTED_SAMPLE",
    `Status transitioned to 'REJECTED_SAMPLE' (actual: ${checkJobSampleRej.data.designStatus})`
  );
  assert(
    Boolean(checkJobSampleRej.data.rejectedSampleUrl),
    `rejectedSampleUrl preserved for reference (${checkJobSampleRej.data.rejectedSampleUrl})`
  );
  assert(
    Boolean(checkJobSampleRej.data.sampleRejectedAt),
    `sampleRejectedAt timestamp persisted`
  );

  // Step C3: Designer clicks "Start Revision"
  console.log("  Designer clicking Start Revision...");
  const startRevRes = await fetch(`${BASE_URL}/design/jobs/${jobB._id}/start`, {
    method: "POST",
    headers,
    body: JSON.stringify({ isRevision: true }),
  });
  assert(startRevRes.ok, `Start revision API returned success`);

  const checkJobStartedRev = await (await fetch(`${BASE_URL}/job-orders/${jobB._id}`, { headers })).json();
  assert(
    checkJobStartedRev.data.designStatus === "STARTED_REVISION",
    `Status transitioned to 'STARTED_REVISION' (actual: ${checkJobStartedRev.data.designStatus})`
  );
  assert(
    checkJobStartedRev.data.isRevisionStarted === true,
    `isRevisionStarted is true`
  );
  assert(
    Boolean(checkJobStartedRev.data.revisionStartedAt),
    `revisionStartedAt recorded`
  );

  // Step C4: Prevent duplicate simultaneous start
  console.log("  Verifying single-start idempotency...");
  const dupStartRes = await fetch(`${BASE_URL}/design/jobs/${jobB._id}/start`, {
    method: "POST",
    headers,
    body: JSON.stringify({ isRevision: true }),
  });
  assert(dupStartRes.ok, `Duplicate start request handled safely without error or mutation`);

  // Step C5: Designer submits revised sample
  console.log("  Designer submitting revised sample (v2)...");
  const submitRevRes = await fetch(`${BASE_URL}/design/jobs/${jobB._id}/submit-proof`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fileUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200",
      notes: "Revised sample with PANTONE 186 C colors and enlarged headline",
    }),
  });
  assert(submitRevRes.ok, `Revised sample submitted`);

  const checkJobRevSubmitted = await (await fetch(`${BASE_URL}/job-orders/${jobB._id}`, { headers })).json();
  assert(
    checkJobRevSubmitted.data.designStatus === "PENDING_SAMPLE_APPROVAL",
    `Status transitioned back to 'PENDING_SAMPLE_APPROVAL' (actual: ${checkJobRevSubmitted.data.designStatus})`
  );
  assert(
    checkJobRevSubmitted.data.isRevisionStarted === false,
    `isRevisionStarted reset to false upon submission`
  );

  // Step C6: Manager approves revised sample
  console.log("  Manager approving revised sample...");
  const approveRevRes = await fetch(`${BASE_URL}/design/jobs/${jobB._id}/approve`, {
    method: "POST",
    headers,
    body: JSON.stringify({ notes: "Revised artwork looks excellent! Handing off to production." }),
  });
  assert(approveRevRes.ok, `Revised sample approved`);

  const checkJobRevFinal = await (await fetch(`${BASE_URL}/job-orders/${jobB._id}`, { headers })).json();
  assert(
    checkJobRevFinal.data.designStatus === "COMPLETED",
    `Status transitioned to 'COMPLETED' (actual: ${checkJobRevFinal.data.designStatus})`
  );
  assert(
    checkJobRevFinal.data.currentStage === "PRODUCTION_PLANNING",
    `Job handed off to production module`
  );

  // ========================================================
  // SCENARIO D: Repeated Revision Cycles
  // ========================================================
  console.log("\n--- SCENARIO D: Repeated Revision Cycles ---");

  // Create Job D
  const jobD = await createTestJob(`E2E Multi-Revision Job ${Date.now()}`, "Packaging");
  assert(Boolean(jobD?._id), `Created Job Order: ${jobD?.jobNo}`);

  // Allocate & Accept
  await fetch(`${BASE_URL}/design/jobs/${jobD._id}/assign`, {
    method: "POST",
    headers,
    body: JSON.stringify({ employeeId: designerA._id || designerA.id, method: "MANUAL" }),
  });
  await fetch(`${BASE_URL}/design/jobs/${jobD._id}/accept`, {
    method: "POST",
    headers,
    body: JSON.stringify({ designerId: designerA._id || designerA.id }),
  });

  // Cycle 1: Submit v1 -> Reject v1
  await fetch(`${BASE_URL}/design/jobs/${jobD._id}/submit-proof`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fileUrl: "https://proofs.com/v1.png", notes: "Proof v1" }),
  });
  await fetch(`${BASE_URL}/design/jobs/${jobD._id}/reject-sample`, {
    method: "POST",
    headers,
    body: JSON.stringify({ reason: "Cycle 1 feedback: Barcode position wrong" }),
  });

  const checkD1 = await (await fetch(`${BASE_URL}/job-orders/${jobD._id}`, { headers })).json();
  assert(checkD1.data.designStatus === "REJECTED_SAMPLE", `Cycle 1 rejected -> REJECTED_SAMPLE`);

  // Cycle 2: Start Rev -> Submit v2 -> Reject v2 again
  await fetch(`${BASE_URL}/design/jobs/${jobD._id}/start`, {
    method: "POST",
    headers,
    body: JSON.stringify({ isRevision: true }),
  });
  const checkDStart2 = await (await fetch(`${BASE_URL}/job-orders/${jobD._id}`, { headers })).json();
  assert(checkDStart2.data.designStatus === "STARTED_REVISION", `Cycle 2 started -> STARTED_REVISION`);

  await fetch(`${BASE_URL}/design/jobs/${jobD._id}/submit-proof`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fileUrl: "https://proofs.com/v2.png", notes: "Proof v2 barcode fixed" }),
  });
  const checkDSub2 = await (await fetch(`${BASE_URL}/job-orders/${jobD._id}`, { headers })).json();
  assert(checkDSub2.data.designStatus === "PENDING_SAMPLE_APPROVAL", `Cycle 2 submitted -> PENDING_SAMPLE_APPROVAL`);

  await fetch(`${BASE_URL}/design/jobs/${jobD._id}/reject-sample`, {
    method: "POST",
    headers,
    body: JSON.stringify({ reason: "Cycle 2 feedback: Adjust bleed margins to 3mm" }),
  });
  const checkDRej2 = await (await fetch(`${BASE_URL}/job-orders/${jobD._id}`, { headers })).json();
  assert(checkDRej2.data.designStatus === "REJECTED_SAMPLE", `Cycle 2 rejected -> returned to REJECTED_SAMPLE`);
  assert(checkDRej2.data.designRejectionReason.includes("Adjust bleed margins"), `Latest rejection reason updated`);

  // Cycle 3: Start Rev -> Submit v3 -> Approve
  await fetch(`${BASE_URL}/design/jobs/${jobD._id}/start`, {
    method: "POST",
    headers,
    body: JSON.stringify({ isRevision: true }),
  });
  await fetch(`${BASE_URL}/design/jobs/${jobD._id}/submit-proof`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fileUrl: "https://proofs.com/v3.png", notes: "Proof v3 3mm bleed added" }),
  });
  await fetch(`${BASE_URL}/design/jobs/${jobD._id}/approve`, {
    method: "POST",
    headers,
    body: JSON.stringify({ notes: "Perfect bleed and barcode. Approved!" }),
  });

  const checkDFinal = await (await fetch(`${BASE_URL}/job-orders/${jobD._id}`, { headers })).json();
  assert(checkDFinal.data.designStatus === "COMPLETED", `Cycle 3 approved -> COMPLETED`);
  assert(checkDFinal.data.currentStage === "PRODUCTION_PLANNING", `Handed off to Production module`);

  console.log("\n========================================================");
  console.log("   ALL SCENARIOS PASSED WITH 100% SUCCESS!");
  console.log("========================================================\n");
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
