import api from "../../../shared/services/api";

export const getPastDateRequests = (config) => api.get("/past-date-requests", config);
export const createPastDateRequest = (payload) => api.post("/past-date-requests", payload);
export const updatePastDateRequest = (id, payload) => api.put(`/past-date-requests/${id}`, payload);
