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
    console.log(data);

    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.jobs)) return data.jobs;
    return [];
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    throw error;
  }
};

/**
 * Fetch a single Job Order with full item specifications by ID or Job Number
 * @param {string} jobId
 * @returns {Promise<Object>}
 */
export const getJobById = async (jobId) => {
  try {
    const response = await api.get(`/job-orders/${jobId}`);
    return response.data?.data || response.data?.job || response.data;
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
