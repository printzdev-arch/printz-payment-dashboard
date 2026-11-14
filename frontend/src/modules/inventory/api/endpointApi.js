import api from "../../../shared/services/api";
import { dedupedGet } from "./dedupedGet";

// For screens that build the request path at run time
export const getByEndpoint = (endpoint) => dedupedGet(endpoint);
