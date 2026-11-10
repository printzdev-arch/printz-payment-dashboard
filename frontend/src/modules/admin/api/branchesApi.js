import api from "../../../shared/services/api";

export const getBranches = () => api.get("/branches");
export const createBranch = (payload) => api.post("/branches", payload);
export const updateBranch = (branchId, payload) => api.put(`/branches/${branchId}`, payload);
export const deleteBranch = (branchId) => api.delete(`/branches/${branchId}`);
