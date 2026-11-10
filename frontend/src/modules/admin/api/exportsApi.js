import api from "../../../shared/services/api";

// `config` is passed straight to the client, e.g. { params: { branchName } }
export const getTotalAmounts = (config) => api.get("/total-amounts", config);
export const getExpenses = (config) => api.get("/expenses", config);
