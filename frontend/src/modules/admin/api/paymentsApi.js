import api from "../../../shared/services/api";

export const getPayments = (config) => api.get("/payments", config);
