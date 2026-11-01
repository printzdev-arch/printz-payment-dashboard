const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5000/api';

const USERS = {
  branchManager: { email: 'vasu@gmail.com', password: '123456' },
  admin: { email: 'admin@gmail.com', password: '123456' },
  mfgManager: { email: 'mfgmanager@gmail.com', password: '123456' },
  mfgDesigner: { email: 'mfgdesigner@gmail.com', password: '123456' },
};

const results = {
  positive: [],
  negative: []
};

function logHeader(title) {
  console.log('\n======================================================================');
  console.log(`  ${title}`);
  console.log('======================================================================');
}

function record(category, testName, passed, details) {
  const symbol = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${symbol} | ${testName} -> ${details || ''}`);
  results[category].push({ testName, passed, details });
}

async function api(method, endpoint, { token, body, form, headers = {} } = {}) {
  const url = `${BASE}${endpoint}`;
  const reqHeaders = { ...headers };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

  let requestBody = body;
  if (body && !form) {
    reqHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  } else if (form) {
    requestBody = form;
  }

  const res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: requestBody
  });

  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    // raw text
  }

  return { status: res.status, ok: res.ok, json };
}

async function loginUser(credentials) {
  const res = await api('POST', '/auth/login', { body: credentials });
  if (!res.ok) {
    throw new Error(`Login failed for ${credentials.email}: ${res.json?.message || res.status}`);
  }
  return res.json?.data?.accessToken || res.json?.accessToken;
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

async function runTests() {
  logHeader('AUTHENTICATING TEST ACTORS');

  const adminToken = await loginUser(USERS.admin);
  console.log('🔑 Admin (admin@gmail.com) logged in successfully');

  let branchToken;
  try {
    branchToken = await loginUser(USERS.branchManager);
    console.log('🔑 Branch Manager (vasu@gmail.com) logged in successfully');
  } catch (e) {
    console.log('Branch Manager fallback to admin token');
    branchToken = adminToken;
  }

  const mfgManagerToken = await loginUser(USERS.mfgManager);
  console.log('🔑 Mfg Manager (mfgmanager@gmail.com) logged in successfully');

  const mfgDesignerToken = await loginUser(USERS.mfgDesigner);
  console.log('🔑 Mfg Designer (mfgdesigner@gmail.com) logged in successfully');

  // Get designer ID for assignment
  const designerMe = await api('GET', '/auth/me', { token: mfgDesignerToken });
  const designerId = designerMe.json?.data?._id || designerMe.json?.data?.id;
  console.log(`👤 Mfg Designer ID: ${designerId}`);

  // Get Dharapuram Branch ID (linked to Manufacturing Unit)
  const branchList = await api('GET', '/branches', { token: adminToken });
  const branch = branchList.json?.data?.find(b => b.code === 'DR03') || branchList.json?.data?.find(b => b.name === 'Erode');
  const branchId = branch?._id;
  console.log(`🏢 Order Branch: ${branch?.name} (${branchId})`);

  // ==========================================================================
  // SAMPLE 1: POSITIVE DATA (Complete End-to-End Sales Order Flow)
  // ==========================================================================
  logHeader('SAMPLE 1: POSITIVE DATA (Complete Order Lifecycle: Branch -> Mfg -> Branch -> Customer)');

  let orderId = null;
  let orderNumber = null;
  let grandTotal = 0;

  // 1.1 Create Draft
  const sample1Payload = {
    branchId: branchId,
    customerName: 'Sathasivam Print Solutions',
    mobile: '9876543210',
    whatsappNumber: '9876543210',
    whatsappOptIn: true,
    email: 'sathasivam.solutions@gmail.com',
    expectedDeliveryDate: tomorrowISO(),
    priority: 'NORMAL',
    customerRequirements: 'Multicolor Flex and Visiting Cards urgent batch',
    remarks: 'Sample 1 Positive Flow Verification',
    items: [
      {
        productType: 'BANNER',
        description: 'Star Backlit Flex Banner 10x4 ft',
        quantity: 2,
        unit: 'PCS',
        unitPrice: 600,
        taxRate: 18,
        discount: 100
      },
      {
        productType: 'CARD',
        description: 'Visiting Cards 350 GSM Matte Lamination',
        quantity: 1000,
        unit: 'PCS',
        unitPrice: 1.5,
        taxRate: 18,
        discount: 0
      }
    ]
  };

  const createRes = await api('POST', '/sale-orders', { token: branchToken, body: sample1Payload });
  if (createRes.status === 201) {
    orderId = createRes.json?.data?._id;
    orderNumber = createRes.json?.data?.orderNo;
    grandTotal = createRes.json?.data?.grandTotal;
    record('positive', '1.1 Create Draft Sale Order', true, `Order #${orderNumber} (ID: ${orderId}), GrandTotal: ₹${grandTotal}`);
  } else {
    record('positive', '1.1 Create Draft Sale Order', false, `HTTP ${createRes.status}: ${createRes.json?.message}`);
  }

  // 1.2 Place Order with Advance Payment (at least 50%)
  if (orderId) {
    const advanceAmount = Math.ceil(grandTotal * 0.5);
    const placePayload = {
      advanceAmount: advanceAmount,
      mode: 'UPI',
      reference: 'UPI-SAMPLE-POS-1001',
      remarks: '50% Advance received via GPay'
    };
    const placeRes = await api('POST', `/sale-orders/${orderId}/place`, {
      token: branchToken,
      body: placePayload,
      headers: { 'Idempotency-Key': `place-${Date.now()}` }
    });
    const isPlaced = placeRes.status === 200 || placeRes.status === 201;
    const currentStatus = placeRes.json?.data?.status;
    const balanceDue = placeRes.json?.data?.balanceDue;
    record('positive', '1.2 Place Order (Advance Payment ₹' + advanceAmount + ')', isPlaced && (currentStatus === 'PLACED' || currentStatus === 'ASSIGNED'), `Status: ${currentStatus}, Balance Due: ₹${balanceDue}`);
  }

  // 1.3 Mfg Manager: Verify Dashboard/Queue and Assign Designer
  if (orderId) {
    const queueRes = await api('GET', '/mfg/queue', { token: mfgManagerToken });
    const inQueue = Array.isArray(queueRes.json?.data) && queueRes.json?.data.some(o => o._id === orderId);
    record('positive', '1.3a Mfg Manager Queue Check', queueRes.ok, `Queue status: ${queueRes.status}, Order visible in Queue: ${inQueue}`);

    const assignRes = await api('POST', `/sale-orders/${orderId}/reassign`, {
      token: mfgManagerToken,
      body: {
        designerUserId: designerId,
        reason: 'Manager assigning order to primary designer'
      }
    });
    const isAssigned = assignRes.status === 200;
    record('positive', '1.3b Mfg Manager Assigns Order to Designer', isAssigned, `Assigned to: ${designerId}`);
  }

  // 1.4 Mfg Designer: Start Design, Upload Proof, Send for Approval
  if (orderId) {
    // Start design
    const startRes = await api('POST', `/sale-orders/${orderId}/design/start`, { token: mfgDesignerToken });
    const isStarted = startRes.status === 200 && startRes.json?.data?.status === 'IN_DESIGN';
    record('positive', '1.4a Mfg Designer Starts Design Work', isStarted, `Status: ${startRes.json?.data?.status}`);

    // Upload Design
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const form = new FormData();
    form.append('preview', new Blob([png], { type: 'image/png' }), 'preview_v1.png');
    form.append('printFile', new Blob(['%PDF-1.4 Mock High Res Print File'], { type: 'application/pdf' }), 'print_v1.pdf');

    const uploadRes = await api('POST', `/sale-orders/${orderId}/designs`, { token: mfgDesignerToken, form });
    const isUploaded = uploadRes.status === 200 || uploadRes.status === 201;
    record('positive', '1.4b Mfg Designer Uploads Design Preview & Print PDF', isUploaded, `Version: ${uploadRes.json?.data?.versionNo || 1}`);

    // Send design for customer approval
    const sendRes = await api('POST', `/sale-orders/${orderId}/designs/1/send`, { token: mfgDesignerToken });
    const orderStatusAfterSend = sendRes.json?.data?.order?.status || sendRes.json?.data?.status;
    const isSent = sendRes.status === 200 && orderStatusAfterSend === 'SENT_FOR_APPROVAL';
    record('positive', '1.4c Send Design for Customer Approval', isSent, `Status: ${orderStatusAfterSend}, WhatsApp Message ID: ${sendRes.json?.data?.whatsappMessage?._id || 'mock-id'}`);
  }

  // 1.5 Customer Approval
  if (orderId) {
    const approvePayload = {
      decision: 'APPROVED',
      channel: 'CALL_TO_BRANCH',
      remarks: 'Customer approved design preview v1 via phone call'
    };
    const approveRes = await api('POST', `/sale-orders/${orderId}/approval`, { token: branchToken, body: approvePayload });
    const isApproved = approveRes.status === 200 && approveRes.json?.data?.status === 'APPROVED';
    record('positive', '1.5 Record Customer Approval', isApproved, `Status: ${approveRes.json?.data?.status}`);
  }

  // 1.6 Production / Printing Phase
  if (orderId) {
    // Start printing
    const printStartRes = await api('POST', `/sale-orders/${orderId}/print/start`, { token: mfgDesignerToken });
    const isPrintStarted = printStartRes.status === 200 && printStartRes.json?.data?.status === 'PRINTING';
    record('positive', '1.6a Start Production Printing in Mfg Unit', isPrintStarted, `Status: ${printStartRes.json?.data?.status}`);

    // Finish printing (Total items = 2 banners + 1000 cards = 1002 units)
    const printFinishPayload = {
      printedQty: 1002,
      spoilageQty: 5,
      remarks: 'Printed successfully on Konica Minolta & Flex Machine'
    };
    const printFinishRes = await api('POST', `/sale-orders/${orderId}/print/finish`, { token: mfgDesignerToken, body: printFinishPayload });
    const isPrintFinished = printFinishRes.status === 200;
    record('positive', '1.6b Complete Production Printing', isPrintFinished, `Status: ${printFinishRes.json?.data?.status}, Printed: ${printFinishPayload.printedQty}`);
  }

  // 1.7 Dispatch from Mfg Unit to Branch
  if (orderId) {
    const dispatchPayload = {
      packages: 1,
      mode: 'COURIER',
      carrierDetails: 'Printz Logistics Dedicated Van #02',
      trackingRef: 'LOG-TRK-784910'
    };
    const dispatchRes = await api('POST', `/sale-orders/${orderId}/dispatch`, { token: mfgDesignerToken, body: dispatchPayload });
    const isDispatched = dispatchRes.status === 200 && dispatchRes.json?.data?.status === 'DISPATCHED';
    record('positive', '1.7 Dispatch from Manufacturing Unit', isDispatched, `Status: ${dispatchRes.json?.data?.status}, Tracking: ${dispatchPayload.trackingRef}`);
  }

  // 1.8 Receive at Branch and Deliver to Customer (Full Settlement)
  if (orderId) {
    // Receive
    const receivePayload = {
      packagesReceived: 1,
      remarks: 'Verified packages received in good condition at branch counter'
    };
    const receiveRes = await api('POST', `/sale-orders/${orderId}/receive`, { token: branchToken, body: receivePayload });
    const isReceived = receiveRes.status === 200 && receiveRes.json?.data?.status === 'RECEIVED_AT_BRANCH';
    record('positive', '1.8a Receive Parcel at Branch', isReceived, `Status: ${receiveRes.json?.data?.status}`);

    // Get final detail for balance calculation
    const detailRes = await api('GET', `/sale-orders/${orderId}`, { token: branchToken });
    const remainingBalance = detailRes.json?.data?.balanceDue;

    // Deliver
    const deliverPayload = {
      receivedByName: 'Sathasivam Customer',
      amount: remainingBalance,
      mode: 'CASH',
      reference: 'CASH-SETTLE-SAMPLE-01'
    };
    const deliverRes = await api('POST', `/sale-orders/${orderId}/deliver`, {
      token: branchToken,
      body: deliverPayload,
      headers: { 'Idempotency-Key': `deliver-${Date.now()}` }
    });
    const isDelivered = deliverRes.status === 200 && deliverRes.json?.data?.status === 'DELIVERED';
    const finalBalance = deliverRes.json?.data?.balanceDue;
    record('positive', '1.8b Deliver Order & Collect Remaining Balance', isDelivered && finalBalance === 0, `Status: ${deliverRes.json?.data?.status}, Final Balance Due: ₹${finalBalance}`);
  }

  // 1.9 Timeline Audit Check
  if (orderId) {
    const timelineRes = await api('GET', `/sale-orders/${orderId}/timeline`, { token: branchToken });
    const events = timelineRes.json?.data || [];
    record('positive', '1.9 Audit Timeline Integrity', events.length >= 7, `Total lifecycle events logged: ${events.length}`);
  }

  // ==========================================================================
  // SAMPLE 2: NEGATIVE DATA (Comprehensive Error & Boundary Tests)
  // ==========================================================================
  logHeader('SAMPLE 2: NEGATIVE DATA (Validations, Boundary Conditions & RBAC Guards)');

  // 2.1 Missing Customer Name (using fresh unregistered mobile)
  const negNamePayload = { ...sample1Payload, customerName: '', mobile: '9999900001', whatsappNumber: '9999900001' };
  const res21 = await api('POST', '/sale-orders', { token: branchToken, body: negNamePayload });
  record('negative', '2.1 Reject Empty Customer Name', res21.status === 422, `Status ${res21.status} (${res21.json?.code || res21.json?.message})`);

  // 2.2 Invalid Mobile Number (<10 digits)
  const negMobilePayload = { ...sample1Payload, mobile: '12345' };
  const res22 = await api('POST', '/sale-orders', { token: branchToken, body: negMobilePayload });
  record('negative', '2.2 Reject Invalid Mobile Number ("12345")', res22.status === 422, `Status ${res22.status} (${res22.json?.code || res22.json?.message})`);

  // 2.3 Empty Items Array
  const negItemsPayload = { ...sample1Payload, items: [] };
  const res23 = await api('POST', '/sale-orders', { token: branchToken, body: negItemsPayload });
  record('negative', '2.3 Reject Empty Items List', res23.status === 422, `Status ${res23.status} (${res23.json?.code || res23.json?.message})`);

  // 2.4 Zero Quantity Item
  const negZeroQtyPayload = {
    ...sample1Payload,
    items: [{ productType: 'BOARD', description: 'Sunboard print', quantity: 0, unit: 'PCS', unitPrice: 100 }]
  };
  const res24 = await api('POST', '/sale-orders', { token: branchToken, body: negZeroQtyPayload });
  record('negative', '2.4 Reject Zero Quantity Item', res24.status === 422, `Status ${res24.status} (${res24.json?.code || res24.json?.message})`);

  // 2.5 Discount Higher than Line Item Total
  const negDiscountPayload = {
    ...sample1Payload,
    items: [{ productType: 'BANNER', description: 'Vinyl Banner', quantity: 1, unit: 'PCS', unitPrice: 200, discount: 500 }]
  };
  const res25 = await api('POST', '/sale-orders', { token: branchToken, body: negDiscountPayload });
  record('negative', '2.5 Reject Discount Higher Than Item Amount', res25.status === 422, `Status ${res25.status} (${res25.json?.code || res25.json?.message})`);

  // 2.6 Past Delivery Date
  const negDatePayload = { ...sample1Payload, expectedDeliveryDate: '2020-01-01' };
  const res26 = await api('POST', '/sale-orders', { token: branchToken, body: negDatePayload });
  record('negative', '2.6 Reject Past Delivery Date ("2020-01-01")', res26.status === 422, `Status ${res26.status} (${res26.json?.code || res26.json?.message})`);

  // 2.7 Advance Lower Than Minimum (Below 40% without manager override reason)
  const freshDraft1 = await api('POST', '/sale-orders', { token: branchToken, body: sample1Payload });
  const draftId1 = freshDraft1.json?.data?._id;
  if (draftId1) {
    const res27 = await api('POST', `/sale-orders/${draftId1}/place`, {
      token: branchToken,
      body: { advanceAmount: 10, mode: 'CASH' }
    });
    record('negative', '2.7 Reject Advance Amount Below Minimum Threshold', res27.status === 422, `Status ${res27.status} (${res27.json?.code || res27.json?.message})`);
  }

  // 2.8 RBAC: Block Designer from Reassigning Orders (Manager-only endpoint)
  if (orderId) {
    const res28 = await api('POST', `/sale-orders/${orderId}/reassign`, {
      token: mfgDesignerToken,
      body: { designerUserId: designerId, reason: 'Unauthorized action by designer' }
    });
    record('negative', '2.8 RBAC: Block Designer from Reassigning Orders', res28.status === 403, `Status ${res28.status} (Access control enforced)`);
  }

  // 2.9 Invalid State Transition: Block Premature Dispatch on DRAFT Order
  if (draftId1) {
    const res29 = await api('POST', `/sale-orders/${draftId1}/dispatch`, {
      token: mfgDesignerToken,
      body: { packages: 1, mode: 'COURIER', carrierDetails: 'Test', trackingRef: 'TRK-INVALID' }
    });
    record('negative', '2.9 Block Premature Dispatch on DRAFT Order', res29.status === 409 || res29.status === 403, `Status ${res29.status} (${res29.json?.code || res29.json?.message})`);

    // 2.10 Invalid State Transition: Block Premature Delivery on DRAFT Order
    const res210 = await api('POST', `/sale-orders/${draftId1}/deliver`, {
      token: branchToken,
      body: { receivedByName: 'Test User', amount: 100, mode: 'CASH' }
    });
    record('negative', '2.10 Block Premature Delivery on DRAFT Order', res210.status === 409, `Status ${res210.status} (${res210.json?.code || res210.json?.message})`);

    // Clean up draft
    await api('POST', `/sale-orders/${draftId1}/cancel`, { token: branchToken, body: { reason: 'Clean up test draft' } });
  }

  // Summary
  logHeader('FINAL EXECUTION SUMMARY');
  const posPassed = results.positive.filter(r => r.passed).length;
  const posTotal = results.positive.length;
  const negPassed = results.negative.filter(r => r.passed).length;
  const negTotal = results.negative.length;

  console.log(`\nPositive Tests: ${posPassed}/${posTotal} Passed (${posPassed === posTotal ? '100% SUCCESS' : 'ISSUES DETECTED'})`);
  console.log(`Negative Tests: ${negPassed}/${negTotal} Passed (${negPassed === negTotal ? '100% SUCCESS' : 'ISSUES DETECTED'})`);
  console.log(`Total: ${posPassed + negPassed}/${posTotal + negTotal} Passed\n`);
}

runTests().catch(console.error);
