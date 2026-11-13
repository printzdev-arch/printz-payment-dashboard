import api from "../../../shared/services/api";
import { dedupedGet } from "./dedupedGet";

export const getTotalAmounts = (config) => api.get("/total-amounts", config);
export const searchTotalAmounts = (query) => dedupedGet(`/total-amounts?${query}`);
export const createTotalAmount = (data) => api.post("/total-amounts", data);
export const updateTotalAmount = (id, data) => api.put(`/total-amounts/${id}`, data);

export const getPayments = (config) => api.get("/payments", config);
export const createPayment = (data) => api.post("/payments", data);
export const updatePayment = (id, data) => api.put(`/payments/${id}`, data);
