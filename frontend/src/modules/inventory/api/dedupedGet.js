import api from "../../../shared/services/api";

/**
 * GET that shares one network request between identical calls made at the same moment.
 *
 * The Account Sheet page asks for the same readings from the page itself and from each of its step panels when a date
 * is picked; this makes those calls one request instead of several. Nothing is kept once the request ends, so no
 * stale data is ever served, and any save (POST / PUT / PATCH / DELETE) forgets what is in flight so a refresh after
 * a save always goes to the server.
 */
const inFlight = new Map();

api.interceptors.response.use(
  (response) => {
    if (response?.config?.method && String(response.config.method).toLowerCase() !== "get") inFlight.clear();
    return response;
  },
  (error) => {
    if (error?.config?.method && String(error.config.method).toLowerCase() !== "get") inFlight.clear();
    return Promise.reject(error);
  }
);

export const dedupedGet = (url) => {
  const existing = inFlight.get(url);
  if (existing) return existing;
  const request = api.get(url).finally(() => {
    if (inFlight.get(url) === request) inFlight.delete(url);
  });
  inFlight.set(url, request);
  return request;
};
