async function testApi() {
  const baseURL = "http://localhost:5000/api";
  console.log("Testing API at:", baseURL);

  // 1. Authenticate as Manager
  let token = null;
  try {
    const loginRes = await fetch(`${baseURL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "bn@printz.shop",
        password: "Manager@123",
      }),
    });
    const loginData = await loginRes.json();
    token = loginData?.data?.token || loginData?.token;
    if (!token) {
      throw new Error(`Login failed with status ${loginRes.status}: ${JSON.stringify(loginData)}`);
    }
    console.log(" Manager Login Successful! Token acquired.");
  } catch (err) {
    console.error(" Login Failed:", err.message);
    process.exit(1);
  }

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  // 2. Test Invoices endpoint
  try {
    const invoicesRes = await fetch(`${baseURL}/invoices`, authHeaders);
    const invoicesData = await invoicesRes.json();
    console.log(" GET /invoices status:", invoicesRes.status, "count:", invoicesData?.data?.items?.length ?? invoicesData?.data?.length ?? "OK");
  } catch (err) {
    console.error(" GET /invoices Failed:", err.message);
  }

  // 3. Test Outstanding Invoices via Settlement
  try {
    const outRes = await fetch(`${baseURL}/settlement/invoices/outstanding`, authHeaders);
    const outData = await outRes.json();
    console.log(" GET /settlement/invoices/outstanding status:", outRes.status, "items:", outData?.data?.items?.length ?? "OK");
  } catch (err) {
    console.error(" GET /settlement/invoices/outstanding Failed:", err.message);
  }

  // 4. Test Delivery Orders
  try {
    const delRes = await fetch(`${baseURL}/delivery-orders`, authHeaders);
    const delData = await delRes.json();
    console.log(" GET /delivery-orders status:", delRes.status, "items:", delData?.data?.items?.length ?? delData?.data?.length ?? "OK");
  } catch (err) {
    console.error(" GET /delivery-orders Failed:", err.message);
  }

  // 5. Test Job Orders
  try {
    const joRes = await fetch(`${baseURL}/job-orders?limit=5`, authHeaders);
    const joData = await joRes.json();
    console.log(" GET /job-orders status:", joRes.status, "items:", joData?.data?.items?.length ?? joData?.data?.length ?? "OK");
  } catch (err) {
    console.error(" GET /job-orders Failed:", err.message);
  }

  console.log(" All tested endpoints responded successfully!");
}

testApi();
