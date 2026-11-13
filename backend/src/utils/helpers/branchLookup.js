/**
 * Find a branch from an id, a name or a code (the way the readings, stock and printer screens send it).
 *
 * Those screens make about a dozen requests for one page and every one of them looked the same branch up again.
 * The answer is now kept for a few seconds (and shared by requests that arrive together), so a page load pays for
 * the lookup once. Branch create / update / delete clear it, so a change is seen at once.
 */
const mongoose = require("mongoose");

const TTL_MS = 20 * 1000;
const MAX_ENTRIES = 500;
const cache = new Map(); // key -> { at, branch } (branch may be null: "no such branch" is remembered too)
const inFlight = new Map();

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function lookup(trimmed) {
  const Branch = mongoose.model("Branch");
  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    const byId = await Branch.findById(trimmed).lean();
    if (byId) return byId;
  }
  const exact = new RegExp(`^${escapeRegex(trimmed)}$`, "i");
  return Branch.findOne({ $or: [{ name: exact }, { code: exact }] }).lean();
}

async function resolveBranch(identifier) {
  if (!identifier) return null;
  const trimmed = String(identifier).trim();
  if (!trimmed) return null;
  const key = trimmed.toLowerCase();

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.branch;

  if (inFlight.has(key)) return inFlight.get(key);
  const p = lookup(trimmed)
    .then((branch) => {
      if (cache.size >= MAX_ENTRIES) cache.clear();
      cache.set(key, { at: Date.now(), branch });
      return branch;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

const clearBranchLookupCache = () => cache.clear();

module.exports = { resolveBranch, clearBranchLookupCache };
