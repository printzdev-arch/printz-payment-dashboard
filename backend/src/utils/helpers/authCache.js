const TtlCache = require("./ttlCache");

// Seconds the signed-in user / role grants are reused before being read from the database again.
// Changes to a user or role clear the matching entry at once (see the model hooks), so the TTL
// is only the worst case, for example when another server instance made the change.
const USER_TTL_MS = Number(process.env.AUTH_USER_CACHE_TTL_MS) || 30 * 1000;
const ROLE_TTL_MS = Number(process.env.AUTH_ROLE_CACHE_TTL_MS) || 60 * 1000;

const userCache = new TtlCache({ ttlMs: USER_TTL_MS, maxEntries: 1000 });
const roleCache = new TtlCache({ ttlMs: ROLE_TTL_MS, maxEntries: 200 });

const userKey = (id) => String(id);

module.exports = {
  userCache,
  roleCache,
  userKey,
  invalidateUser: (id) => id && userCache.delete(userKey(id)),
  invalidateAllUsers: () => userCache.clear(),
  invalidateRoles: () => {
    roleCache.clear();
    // A user's effective employee role is part of the cached user, so drop those too
    userCache.clear();
  },
};
