import api from "../../../shared/services/api";

export const getUsersByRole = (role) => api.get(`/users?role=${role}`);
export const createUser = (payload) => api.post("/users", payload);
export const updateUser = (userId, payload) => api.put(`/users/${userId}`, payload);
export const deleteUser = (userId) => api.delete(`/users/${userId}`);
export const sendResetEmail = (payload) => api.post("/auth/send-reset-email", payload);
