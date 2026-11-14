import api from "../../../shared/services/api";
import { dedupedGet } from "./dedupedGet";

export const getJumboXeroxReadings = (config) => api.get("/jumbo-xerox/readings", config);
export const searchJumboXeroxReadings = (query) => dedupedGet(`/jumbo-xerox/readings?${query}`);
export const createJumboXeroxReading = (data) => api.post("/jumbo-xerox/readings", data);
export const updateJumboXeroxReading = (id, data) => api.put(`/jumbo-xerox/readings/${id}`, data);

export const getJumboXeroxMachines = (config) => api.get("/jumbo-xerox/machines", config);
export const searchJumboXeroxMachines = (query) => api.get(`/jumbo-xerox/machines?${query}`);
export const getJumboXeroxMachine = (id) => api.get(`/jumbo-xerox/machines/${id}`);
export const createJumboXeroxMachine = (data) => api.post("/jumbo-xerox/machines", data);
export const updateJumboXeroxMachine = (id, data) => api.put(`/jumbo-xerox/machines/${id}`, data);
export const deleteJumboXeroxMachine = (id) => api.delete(`/jumbo-xerox/machines/${id}`);

export const getJumboXeroxConfigurations = (config) => api.get("/jumbo-xerox/configurations", config);
