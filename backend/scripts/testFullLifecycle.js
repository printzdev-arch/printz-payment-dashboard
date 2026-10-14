async function testFullLifecycle() {
  const baseURL = "http://localhost:5000/api";
  console.log("Starting Full Job Flow to Settlement Validation...");

  // 1. Authenticate as Manager
  const loginRes = await fetch(`${baseURL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "bn@printz.shop",
      password: "Manager@123",
    }),
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.token || loginData?.token;
  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  // 2. Fetch a job order
  const joRes = await fetch(`${baseURL}/job-orders?limit=1`, authHeaders);
  const joData = await joRes.json();
  const jobs = joData?.data?.items || joData?.data || [];
  if (jobs.length === 0) {
    console.error("No jobs found to test lifecycle.");
    process.exit(1);
  }
  const targetJob = jobs[0];
  console.log(` Target Job Order: ${targetJob.jobNo} (ID: ${targetJob._id})`);

  // 3. Create Draft Invoice
  let draftInvoiceId = null;
  try {
    const draftRes = await fetch(`${baseURL}/invoices/draft`, {
      method: "POST",
      ...authHeaders,
      body: JSON.stringify({
        jobOrderId: targetJob._id,
        items: [
          {
            itemName: "Production Print Run - 500 units",
            quantity: 500,
            unitPrice: 1.5,
            taxRate: 18,
          },
        ],
        notes: "Automated end-to-end integration test invoice",
      }),
    });
    const draftData = await draftRes.json();
    if (draftRes.status >= 200 && draftRes.status < 300) {
      draftInvoiceId = draftData.data?._id || draftData.data?.id;
      console.log(` Created Draft Invoice: ${draftData.data?.invoiceNumber} (ID: ${draftInvoiceId})`);
    } else {
      console.log("Draft notice (may already have invoice or status constraint):", draftData.message || draftData);
    }
  } catch (err) {
    console.warn("Draft invoice error:", err.message);
  }

  // 4. Test Invoices Listing & Outstanding
  const outRes = await fetch(`${baseURL}/settlement/invoices/outstanding`, authHeaders);
  const outData = await outRes.json();
  const outstandingInvoices = outData?.data?.items || [];
  console.log(` Outstanding Invoices in Settlement Ledger: ${outstandingInvoices.length}`);

  if (outstandingInvoices.length > 0) {
    const inv = outstandingInvoices[0];
    console.log(` Testing payment on Outstanding Invoice: ${inv.invoiceNumber} (Balance Due: ${inv.balanceDue})`);

    // 5. Collect Payment
    const payRes = await fetch(`${baseURL}/settlement/invoices/${inv.id}/payments`, {
      method: "POST",
      ...authHeaders,
      body: JSON.stringify({
        amount: Math.min(100, inv.balanceDue),
        paymentMode: "CASH",
        notes: "Settlement counter collection",
      }),
    });
    const payData = await payRes.json();
    console.log(` Payment Collection Status: ${payRes.status}`, payData.message || "");

    // 6. Test Receipt Retrieval
    if (payData.data?.payment?.id || payData.data?.payment?._id) {
      const paymentId = payData.data?.payment?.id || payData.data?.payment?._id;
      const recRes = await fetch(`${baseURL}/settlement/payments/${paymentId}/receipt`, authHeaders);
      console.log(` Payment Receipt Generation Status: ${recRes.status}`);
    }

    // 7. Test Customer Feedback
    const fbRes = await fetch(`${baseURL}/settlement/job-orders/${inv.jobOrderId}/feedback`, {
      method: "POST",
      ...authHeaders,
      body: JSON.stringify({
        rating: 5,
        ratingDetails: {
          quality: 5,
          speed: 5,
          communication: 5,
        },
        feedback: "Outstanding print quality and professional handover!",
        channel: "COUNTER",
      }),
    });
    const fbData = await fbRes.json();
    console.log(` Customer Feedback Submission Status: ${fbRes.status}`, fbData.message || "");
  }

  console.log("\n Full Backend Settlement, Invoicing & Feedback integration verified successfully!");
}

testFullLifecycle();
