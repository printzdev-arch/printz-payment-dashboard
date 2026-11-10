import api from "../../../shared/services/api";

// Admins see every request; everyone else sees only the ones they made
export const listDeleteRequests = async (params = {}) => {
  const res = await api.get("/delete-requests", { params });
  return res.data?.data || {};
};

export const getDeleteRequestTypes = async () => {
  const res = await api.get("/delete-requests/types");
  return res.data?.data || [];
};

// Admin only: approving deletes the record
export const approveDeleteRequest = async (id, note = "") => (await api.post(`/delete-requests/${id}/approve`, { note })).data;
export const rejectDeleteRequest = async (id, note = "") => (await api.post(`/delete-requests/${id}/reject`, { note })).data;

// The person who asked can withdraw a request that is still waiting
export const cancelDeleteRequest = async (id) => (await api.post(`/delete-requests/${id}/cancel`)).data;
