const PermissionAudit = require("../models/PermissionAudit");
const { PAGE_ITEMS, actionsForPage, ACTIONS } = require("../constants/pageCatalog");

const LABELS = Object.fromEntries(PAGE_ITEMS.map((i) => [i.key, i.parentLabel ? `${i.parentLabel} › ${i.label}` : i.label]));

// What a person can do on each page, as { pageKey: [actions] }. A listed page with no entry keeps every action it has.
const effective = (pages, actions) => {
  const out = {};
  (Array.isArray(pages) ? pages : []).forEach((key) => {
    const own = actionsForPage(key);
    const listed = actions && Array.isArray(actions[key]) ? actions[key] : null;
    out[key] = listed ? ACTIONS.filter((a) => own.includes(a) && (a === "view" || listed.includes(a))) : own;
  });
  return out;
};

const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Pages whose actions differ between two states, ready to store. */
const diffChanges = (before, after) => {
  const b = effective(before.pages, before.actions);
  const a = effective(after.pages, after.actions);
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])];
  const changes = [];
  keys.forEach((key) => {
    const was = b[key] || [];
    const now = a[key] || [];
    if (!sameList(was, now)) changes.push({ page: key, label: LABELS[key] || key, before: was, after: now });
  });
  return changes;
};

const describe = (changes) => {
  if (changes.length === 0) return "No page or action changes";
  const opened = changes.filter((c) => c.before.length === 0).length;
  const closed = changes.filter((c) => c.after.length === 0).length;
  const edited = changes.length - opened - closed;
  const parts = [];
  if (opened) parts.push(`${opened} page${opened === 1 ? "" : "s"} added`);
  if (closed) parts.push(`${closed} page${closed === 1 ? "" : "s"} removed`);
  if (edited) parts.push(`${edited} page${edited === 1 ? "" : "s"} changed`);
  return parts.join(", ");
};

class PermissionAuditService {
  /**
   * Saves one audit entry. Never throws: a logging problem must not undo or block the change itself.
   * before / after: { pages: [keys], actions: { key: [..] } }
   */
  async record({ targetType, targetId, targetName, event = "UPDATED", actor = {}, before, after, ip = "" }) {
    try {
      const changes = diffChanges(before || { pages: [], actions: null }, after || { pages: [], actions: null });
      if (event === "UPDATED" && changes.length === 0) return null;
      return await PermissionAudit.create({
        targetType,
        targetId: String(targetId || ""),
        targetName: targetName || "",
        event,
        actorId: String(actor._id || actor.id || ""),
        actorName: actor.name || actor.email || "",
        summary: describe(changes),
        changes,
        ip,
      });
    } catch (err) {
      console.error("Could not save permission audit entry:", err && err.message);
      return null;
    }
  }

  async list({ targetType, search, from, to, page = 1, limit = 25 } = {}) {
    const q = {};
    if (targetType && ["ROLE", "EMPLOYEE"].includes(String(targetType).toUpperCase())) q.targetType = String(targetType).toUpperCase();
    if (search && String(search).trim()) {
      const escaped = String(search).trim().split("").map((ch) => (".*+?^${}()|[]\\".includes(ch) ? "\\" + ch : ch)).join("");
      const rx = new RegExp(escaped, "i");
      q.$or = [{ targetName: rx }, { actorName: rx }, { summary: rx }, { "changes.label": rx }];
    }
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(`${from}T00:00:00+05:30`);
      if (to) q.createdAt.$lte = new Date(`${to}T23:59:59.999+05:30`);
    }
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 25));
    const [items, total] = await Promise.all([
      PermissionAudit.find(q).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
      PermissionAudit.countDocuments(q),
    ]);
    return { items, total, page: p, limit: l };
  }
}

module.exports = new PermissionAuditService();
module.exports.diffChanges = diffChanges;
module.exports.effective = effective;
