/**
 * PrintZ V3 - Job API Service
 * Centralized API methods for Job Creation, Requirements Capture, and Job Management.
 */
import api from "../../../../services/api";

/**
 * Fetch list of print jobs with optional filters
 * @param {Object} filterParams { status, branch, customerId, search, priority, page, limit }
 * @returns {Promise<Array>}
 */
export const getJobs = async (filterParams = {}) => {
  try {
    const response = await api.get("/job-orders", { params: filterParams });
    const data = response.data;

    let rawList = [];
    if (Array.isArray(data)) rawList = data;
    else if (data && Array.isArray(data.data)) rawList = data.data;
    else if (data && Array.isArray(data.jobs)) rawList = data.jobs;

    return rawList.map((j) => {
      const snap = j.customerSnapshot || {};
      const cust = typeof j.customerId === "object" ? j.customerId : (j.customer || {});
      const mobile = j.customerMobile || j.customerPhone || snap.mobile || cust.mobile || cust.phone || "";
      const code = j.customerCode || snap.customerCode || cust.customerCode || "";
      return {
        ...j,
        customerMobile: mobile || "—",
        customerPhone: mobile || j.customerPhone || "",
        customerCode: code || "—",
        customerName: j.customerName || snap.name || cust.name || "Customer"
      };
    });
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    throw error;
  }
};

/**
 * Fetch a single Job Order with full item specifications by ID or Job Number
 * Automatically resolves customerCode and customerMobile from customer master if needed
 * @param {string} jobId
 * @returns {Promise<Object>}
 */
export const getJobById = async (jobId) => {
  try {
    const response = await api.get(`/job-orders/${jobId}`);
    const j = response.data?.data || response.data?.job || response.data;
    if (!j) return null;

    const snap = j.customerSnapshot || {};
    const custObj = typeof j.customerId === "object" ? j.customerId : (j.customer || {});

    let customerCode = j.customerCode || snap.customerCode || custObj.customerCode;
    let customerMobile = j.customerMobile || j.customerPhone || snap.mobile || custObj.mobile || custObj.phone;
    let customerName = j.customerName || snap.name || custObj.name;
    let customerCompany = j.customerCompany || snap.company || custObj.companyName || custObj.company;

    // If customerCode or customerMobile is missing, fetch customer details if customerId is present
    const custId = typeof j.customerId === "object" ? j.customerId?._id : j.customerId;
    if ((!customerCode || !customerMobile) && custId) {
      try {
        const custRes = await api.get(`/customers/${custId}`);
        const custData = custRes.data?.data || custRes.data?.customer || custRes.data;
        if (custData) {
          if (!customerCode && custData.customerCode) customerCode = custData.customerCode;
          if (!customerMobile && (custData.mobile || custData.phone)) customerMobile = custData.mobile || custData.phone;
          if (!customerName && custData.name) customerName = custData.name;
          if (!customerCompany && (custData.companyName || custData.company)) customerCompany = custData.companyName || custData.company;
        }
      } catch (cErr) {
        console.warn("Could not fetch customer by ID for job details:", cErr);
      }
    }

    return {
      ...j,
      customerCode: customerCode || "—",
      customerMobile: customerMobile || "—",
      customerPhone: customerMobile || j.customerPhone || "",
      customerName: customerName || "Customer",
      customerCompany: customerCompany || ""
    };
  } catch (error) {
    console.error(`Failed to fetch job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Create a new Print Job with requirement capture
 * @param {Object} jobData
 * @returns {Promise<Object>} { success: true, job: Object }
 */
export const createJob = async (jobData) => {
  try {
    const response = await api.post("/job-orders", jobData);
    return response.data;
  } catch (error) {
    console.error("Failed to create job:", error);
    throw error;
  }
};

/**
 * Update an existing Job Order
 * @param {string} jobId
 * @param {Object} updateData
 * @returns {Promise<Object>}
 */
export const updateJob = async (jobId, updateData) => {
  try {
    const response = await api.patch(`/job-orders/${jobId}`, updateData);
    return response.data?.data || response.data?.job || response.data;
  } catch (error) {
    console.error(`Failed to update job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Add a Job Item to an existing Job
 * @param {string} jobId
 * @param {Object} itemData
 * @returns {Promise<Object>}
 */
export const addJobItem = async (jobId, itemData) => {
  try {
    const response = await api.post(`/job-orders/${jobId}/items`, itemData);
    return response.data;
  } catch (error) {
    console.error(`Failed to add item to job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Update a specific Job Item
 * @param {string} jobId
 * @param {string} itemId
 * @param {Object} itemData
 * @returns {Promise<Object>}
 */
export const updateJobItem = async (jobId, itemId, itemData) => {
  try {
    const response = await api.patch(`/job-orders/${jobId}/items/${itemId}`, itemData);
    return response.data;
  } catch (error) {
    console.error(`Failed to update item ${itemId} in job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Remove a Job Item from a Job
 * @param {string} jobId
 * @param {string} itemId
 * @returns {Promise<Object>}
 */
export const deleteJobItem = async (jobId, itemId) => {
  try {
    const response = await api.delete(`/job-orders/${jobId}/items/${itemId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to delete item ${itemId} from job ${jobId}:`, error);
    throw error;
  }
};
