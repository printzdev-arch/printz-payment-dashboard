/**
 * Tiny in-memory cache whose entries expire after a fixed time.
 *
 * Used to avoid repeating the same database lookups on every request (the signed-in user and the
 * role/permission grants). It lives in the memory of one server process, so with several server
 * instances each one keeps its own copy and changes show up everywhere within `ttlMs`.
 */
class TtlCache {
  constructor({ ttlMs = 30000, maxEntries = 500 } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.store = new Map();
  }

  get(key) {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key, value) {
    if (this.store.size >= this.maxEntries) {
      // Drop the oldest entry (Map keeps insertion order) so memory stays bounded
      this.store.delete(this.store.keys().next().value);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    return value;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  /** Return the cached value, or run `loader`, cache a non-null result and return it. */
  async wrap(key, loader) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await loader();
    if (value !== null && value !== undefined) this.set(key, value);
    return value;
  }
}

module.exports = TtlCache;
