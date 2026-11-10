import api from "../../../shared/services/api";

export const getProfile = () => api.get("/users/profile");
export const getCurrentUser = () => api.get("/auth/me");
export const getUsers = () => api.get("/users");
