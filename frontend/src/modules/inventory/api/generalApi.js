import api from "../../../shared/services/api";
import { dedupedGet } from "./dedupedGet";

export const getCategories = () => api.get("/general/categories");
export const createCategory = (data) => api.post("/general/categories", data);

export const getInventoryMovements = (config) => api.get("/general/inventory-movements", config);
export const createInventoryMovement = (data) => api.post("/general/inventory-movements", data);

export const getFinalizedDates = (config) => api.get("/general/finalized-dates", config);
export const searchFinalizedDates = (query) => dedupedGet(`/general/finalized-dates?${query}`);
export const createFinalizedDate = (data) => api.post("/general/finalized-dates", data);

export const getSales = (config) => api.get("/general/sales", config);
