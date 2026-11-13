import api from "../../../shared/services/api";

export const getPrinters = (config) => api.get("/printers", config);
export const searchPrinters = (query) => api.get(`/printers?${query}`);
export const createPrinter = (data) => api.post("/printers", data);
export const updatePrinter = (id, data) => api.put(`/printers/${id}`, data);
export const deletePrinter = (id) => api.delete(`/printers/${id}`);

export const getPrinterReadings = (config) => api.get("/printer-readings", config);
export const searchPrinterReadings = (query) => api.get(`/printer-readings?${query}`);
export const getScanCheck = (params) => api.get("/printer-readings/scan-check", { params });
export const createPrinterReading = (data) => api.post("/printer-readings", data);
export const updatePrinterReading = (id, data) => api.put(`/printer-readings/${id}`, data);
