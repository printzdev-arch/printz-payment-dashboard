import api from "../../../shared/services/api";

// For screens that build the request path at run time
export const getByEndpoint = (endpoint) => api.get(endpoint);
