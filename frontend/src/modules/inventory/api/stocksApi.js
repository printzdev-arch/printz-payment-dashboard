import api from "../../../shared/services/api";
import { dedupedGet } from "./dedupedGet";

// `config` is passed straight to the client, e.g. { params: { branchName } }.
// `search*` functions take the query string that follows "?".
export const getStockItems = (config) => api.get("/stocks/items", config);
export const createStockItem = (data) => api.post("/stocks/items", data);
export const updateStockItem = (id, data) => api.put(`/stocks/items/${id}`, data);
export const deleteStockItem = (id) => api.delete(`/stocks/items/${id}`);

export const getStockReadings = (config) => api.get("/stocks/readings", config);
export const searchStockReadings = (query) => dedupedGet(`/stocks/readings?${query}`);
export const createStockReading = (data) => api.post("/stocks/readings", data);
