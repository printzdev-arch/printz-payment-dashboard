/**
 * Small in-memory TTL cache for per-request auth lookups (enriched user, role grants).
 *
 * Entries expire after AUTH_CACHE_TTL_MS (default 30s) and the whole cache is cleared
 * whenever a User / Role / Permission / Employee / Branch document is written
 * (see `invalidationPlugin`), so changes to roles or accounts take effect immediately
 * on this instance. With several server instances, staleness is bounded by the TTL.
 *
 * Set AUTH_CACHE_TTL_MS=0 to disable caching.
 */
const TTL_MS = Number.isFinite(Number(process.env.AUTH_CACHE_TTL_MS))
  ? Number(process.env.AUTH_CACHE_TTL_MS)
  : 30000;
const MAX_ENTRIES = 1000;

const store = new Map(); // key -> { value, expires }
const inflight = new Map(); // key -> Promise (dedupes concurrent identical lookups)

const get = (key) => {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expires <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
};

const set = (key, value) => {
  if (store.size >= MAX_ENTRIES) {
    store.delete(store.keys().next().value);
  }
  store.set(key, { value, expires: Date.now() + TTL_MS });
};

/**
 * Return the cached value for `key`, or run `loader()` once and cache its result.
 * Null/undefined results are not cached.
 */
const remember = async (key, loader) => {
  if (TTL_MS <= 0) return loader();

  const cached = get(key);
  if (cached !== undefined) return cached;

  if (inflight.has(key)) return inflight.get(key);

  // `generation` guards against caching a result that was loaded before an invalidation
  const startGen = generation;
  const promise = (async () => {
    try {
      const value = await loader();
      if (value !== null && value !== undefined && startGen === generation) set(key, value);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
};

let generation = 0;

const clear = () => {
  generation += 1;
  store.clear();
  inflight.clear();
};

/**
 * Mongoose plugin: clears the cache after any write to the model.
 */
const invalidationPlugin = (schema) => {
  const docHooks = ["save", "deleteOne", "updateOne"];
  const queryHooks = [
    "findOneAndUpdate",
    "findOneAndDelete",
    "findOneAndReplace",
    "updateOne",
    "updateMany",
    "replaceOne",
    "deleteOne",
    "deleteMany",
  ];

  docHooks.forEach((name) => schema.post(name, { document: true, query: false }, clear));
  queryHooks.forEach((name) => schema.post(name, { document: false, query: true }, clear));
  schema.post("insertMany", clear);
};

module.exports = { remember, clear, invalidationPlugin, TTL_MS };
