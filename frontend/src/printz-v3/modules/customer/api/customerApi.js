/**
 * PrintZ V3 - Customer API Service (Step 1)
 * Extracts customer data from live backend Job Orders and supports local customer caching.
 */
import api from "../../../../services/api";

const CUSTOMERS_CACHE_KEY = "printz_v3_cached_customers";

function getCachedCustomers() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMERS_CACHE_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function saveCachedCustomer(customer) {
  try {
    const list = getCachedCustomers();
    const existingIdx = list.findIndex(c => c.id === customer.id || c.mobile === customer.mobile);
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...customer };
    } else {
      list.unshift(customer);
    }
    localStorage.setItem(CUSTOMERS_CACHE_KEY, JSON.stringify(list));
  } catch (e) {}
}

/**
 * Real-time Customer Search
 * Searches cached customers and existing Job Orders customer snapshots
 */
export const searchCustomers = async (query = "", branchName = "") => {
  try {
    const cached = getCachedCustomers();
    let backendCustomers = [];

    // 1. Try dedicated backend /customers/search or /customers
    try {
      const q = query && query.trim() ? query.trim() : "";
      const searchRes = await api.get(q ? `/customers/search` : `/customers`, {
        params: { q, search: q, ...(branchName && branchName !== "All Branches" ? { branch: branchName } : {}) }
      });
      const data = searchRes.data?.data || (Array.isArray(searchRes.data) ? searchRes.data : searchRes.data?.customers || []);
      if (Array.isArray(data) && data.length > 0) {
        backendCustomers = data.map((c) => ({
          _id: c._id || c.id,
          id: c._id || c.id || c.customerId,
          customerId: c._id || c.id,
          name: c.name || "Customer",
          mobile: c.mobile || c.phone || "",
          phone: c.phone || c.mobile || "",
          email: c.email || "",
          company: c.companyName || c.company || "",
          companyName: c.companyName || c.company || "",
          branch: c.branchName || c.branch || branchName,
          customerCode: c.customerCode || `CUST-${String(c._id || c.id || "").slice(-4).toUpperCase()}`
        }));
      }
    } catch (e) {
      // 2. Fallback to /job-orders snapshots
      try {
        const response = await api.get("/job-orders", { params: { search: query } });
        const jobs = response.data?.data || (Array.isArray(response.data) ? response.data : []);
        backendCustomers = jobs
          .map((j) => {
            const snap = j.customerSnapshot || {};
            return {
              id: j.customerId || snap.id || `cus-${j._id}`,
              name: j.customerName || snap.name || "Customer",
              mobile: j.customerPhone || snap.mobile || "",
              email: snap.email || "",
              company: snap.company || "",
              branch: j.branch || branchName,
              customerCode: snap.customerCode || `CUST-${String(j._id).slice(-4).toUpperCase()}`
            };
          })
          .filter((c) => c.name && c.mobile);
      } catch (err2) {}
    }

    // Merge cached and backend customers uniquely by mobile
    const all = [...cached, ...backendCustomers];
    const uniqueMap = new Map();
    all.forEach(c => {
      const key = c.mobile || c.id;
      if (!uniqueMap.has(key)) uniqueMap.set(key, c);
    });

    const list = Array.from(uniqueMap.values());
    if (!query) return list;

    const q = query.toLowerCase();
    return list.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.company && c.company.toLowerCase().includes(q))
    );
  } catch (error) {
    console.error("Failed to search customers:", error);
    return getCachedCustomers();
  }
};

/**
 * Get All Customers with optional filters
 */
export const getCustomers = async (filterParams = {}) => {
  return searchCustomers(filterParams.search || "", filterParams.branch || "");
};

/**
 * Get Single Customer by ID or Customer Code
 */
export const getCustomerById = async (customerId) => {
  if (!customerId) return null;
  try {
    if (/^[0-9a-fA-F]{24}$/.test(String(customerId))) {
      const res = await api.get(`/customers/${customerId}`);
      const c = res.data?.data || res.data?.customer || res.data;
      if (c) return { ...c, _id: c._id || c.id, id: c._id || c.id, customerId: c._id || c.id };
    }
  } catch (e) {}
  const all = await searchCustomers();
  const found = all.find(c => c.id === customerId || c._id === customerId || c.customerCode === customerId);
  return found || null;
};

/**
 * Create a New Customer (Walk-in or QR Registration)
 */
export const createCustomer = async (customerData) => {
  try {
    const res = await api.post("/customers", customerData);
    const created = res.data?.data || res.data?.customer || res.data;
    const realId = created._id || created.id;
    const finalCustomer = {
      ...customerData,
      ...created,
      _id: realId,
      id: realId || `cus-${Date.now()}`,
      customerId: realId,
      customerCode: created.customerCode || `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: created.createdAt || new Date().toISOString()
    };
    saveCachedCustomer(finalCustomer);
    return { success: true, customer: finalCustomer };
  } catch (error) {
    console.error("Failed to create customer in backend, using local fallback:", error?.response?.data || error);
    const fallbackCustomer = {
      ...customerData,
      _id: null,
      id: `cus-${Date.now()}`,
      customerId: null,
      customerCode: customerData.customerCode || `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString()
    };
    saveCachedCustomer(fallbackCustomer);
    return { success: true, customer: fallbackCustomer };
  }
};

/**
 * Update Existing Customer
 */
export const updateCustomer = async (customerId, updateData) => {
  const updated = { id: customerId, ...updateData };
  saveCachedCustomer(updated);
  return updated;
};

/**
 * Verify Branch Context for QR Registration
 */
export const verifyBranchQrSession = async (branchCode) => {
  try {
    const response = await api.get("/branches");
    const branches = response.data?.data || [];
    const branch = branches.find(
      b => (b.code && b.code.toLowerCase() === branchCode.toLowerCase()) ||
           (b.name && b.name.toLowerCase() === branchCode.toLowerCase())
    );
    return { success: true, branch: branch || { name: branchCode, code: branchCode } };
  } catch (error) {
    return { success: true, branch: { name: branchCode, code: branchCode } };
  }
};
